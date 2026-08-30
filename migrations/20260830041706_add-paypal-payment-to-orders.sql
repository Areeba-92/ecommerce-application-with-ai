-- PayPal payments: add payment tracking columns, move status vocabulary from
-- 'paid' to 'confirmed', and let a user mark their own pending order as paid.

ALTER TABLE orders
  ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid')),
  ADD COLUMN payment_method text NOT NULL DEFAULT 'paypal';

ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered'));

-- Narrow the default broad UPDATE grant down to just the two payment columns —
-- everything else about an order (items, total, address, user_id) stays immutable
-- from the client once placed.
REVOKE UPDATE ON orders FROM anon, authenticated;
GRANT UPDATE (payment_status, status) ON orders TO authenticated;

CREATE POLICY orders_update_own ON orders
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Even with the column grant, enforce the only legal client-side transition is
-- pending/unpaid -> confirmed/paid (one-way, one-shot). Admin/CLI work (marking
-- shipped/delivered) runs as project_admin and is exempted.
CREATE OR REPLACE FUNCTION public.guard_order_payment_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user = 'project_admin' THEN
    RETURN NEW;
  END IF;

  IF OLD.status <> 'pending' OR OLD.payment_status <> 'unpaid' THEN
    RAISE EXCEPTION 'order is no longer pending payment';
  END IF;

  IF NEW.status <> 'confirmed' OR NEW.payment_status <> 'paid' THEN
    RAISE EXCEPTION 'invalid payment transition';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_guard_payment_update
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION public.guard_order_payment_update();
