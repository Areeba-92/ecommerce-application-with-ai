-- Abandoned checkouts: an order nobody pays for is cancelled after 24 hours.
--
-- Checkout creates a pending/unpaid order before the customer reaches PayPal,
-- so a customer who walks away leaves a pending order behind forever. There is
-- no cron on the free tier, so expiry is enforced in two places instead:
--
--   1. orders_guard_payment_update refuses a payment report on an order more
--      than 24h old. This is the rule that matters — it holds even if nothing
--      ever runs the clean-up below.
--   2. expire_stale_orders() flips the caller's own stale orders to
--      'cancelled'. The app calls it when the profile or payment page loads, so
--      the stored status catches up lazily. Admins can run the same UPDATE by
--      hand to sweep everyone.
--
-- Only orders that are pending, unpaid AND unreported expire. Once a customer
-- has reported payment the order waits for an admin, however long that takes.

ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'));

CREATE OR REPLACE FUNCTION public.guard_order_payment_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Keep in sync with expire_stale_orders() and ORDER_EXPIRY_HOURS in lib/orders.ts.
  expiry CONSTANT interval := interval '24 hours';
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

  IF OLD.created_at < now() - expiry THEN
    RAISE EXCEPTION 'order has expired';
  END IF;

  IF NEW.payment_reported_at IS NULL THEN
    RAISE EXCEPTION 'invalid payment report';
  END IF;

  -- Server time, not whatever the client sent.
  NEW.payment_reported_at := now();
  RETURN NEW;
END;
$$;

-- SECURITY DEFINER so it runs as its owner (project_admin), which the guard
-- trigger exempts. It is scoped to auth.uid() and takes no arguments, so a
-- caller can only ever cancel their OWN stale, unreported, unpaid orders.
CREATE OR REPLACE FUNCTION public.expire_stale_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE orders
     SET status = 'cancelled'
   WHERE user_id = auth.uid()
     AND status = 'pending'
     AND payment_status = 'unpaid'
     AND payment_reported_at IS NULL
     AND created_at < now() - interval '24 hours';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_stale_orders() TO authenticated;
