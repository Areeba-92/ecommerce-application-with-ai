-- The browser can no longer mark an order paid.
--
-- Previously `authenticated` held UPDATE on (payment_status, status) and
-- app/payment/return/ flipped an order to confirmed/paid with no proof money
-- moved — any signed-in user could "pay" for free, from the page or straight
-- through the REST API. PayPal.me has no server callback, so the client cannot
-- be the one to say "paid".
--
-- Now the client may only REPORT a payment (payment_reported_at, set once, on a
-- pending/unpaid order). Marking an order paid/confirmed is project_admin only
-- (InsForge dashboard / CLI), after checking the PayPal account.
--
-- orders_enforce_integrity (pricing) is deliberately untouched; the insert-side
-- reset of the new column lives in its own small trigger below.

ALTER TABLE orders ADD COLUMN payment_reported_at timestamptz;

REVOKE UPDATE ON orders FROM anon, authenticated;
GRANT UPDATE (payment_reported_at) ON orders TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_order_payment_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user = 'project_admin' THEN
    RETURN NEW;
  END IF;

  -- Belt and braces: the column grant already blocks these.
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    RAISE EXCEPTION 'payment status can only be changed by the store';
  END IF;

  IF OLD.status <> 'pending' OR OLD.payment_status <> 'unpaid' THEN
    RAISE EXCEPTION 'order is no longer pending payment';
  END IF;

  IF OLD.payment_reported_at IS NOT NULL THEN
    RAISE EXCEPTION 'payment already reported';
  END IF;

  IF NEW.payment_reported_at IS NULL THEN
    RAISE EXCEPTION 'invalid payment report';
  END IF;

  -- Server time, not whatever the client sent.
  NEW.payment_reported_at := now();
  RETURN NEW;
END;
$$;

-- The INSERT grant is table-wide, so a client could otherwise create an order
-- that already looks "reported".
CREATE OR REPLACE FUNCTION public.reset_order_payment_report()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user <> 'project_admin' THEN
    NEW.payment_reported_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_reset_payment_report
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION public.reset_order_payment_report();
