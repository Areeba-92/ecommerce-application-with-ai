-- Order pricing is the database's business, not the browser's.
--
-- app/checkout/page.tsx inserts items/subtotal/shipping/total straight from
-- client-side cart state, and orders_insert_own only checks auth.uid() = user_id.
-- This trigger discards whatever the client sent for money and recomputes every
-- line from the live `products` table, so a tampered price has no effect. It also
-- forces a client-placed order to start pending/unpaid, which closes a second gap:
-- the INSERT grant is table-wide, so a client could otherwise insert a row already
-- marked confirmed/paid and skip payment entirely (orders_guard_payment_update
-- only ever sees UPDATEs, never this).
--
-- Mirrors the guard_order_payment_update pattern from the PayPal migration,
-- including its project_admin exemption so CLI/dashboard work is unaffected.
CREATE OR REPLACE FUNCTION public.enforce_order_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  -- Keep in sync with lib/shipping.ts. That copy decides what the UI displays;
  -- this one decides what is actually charged.
  free_shipping_threshold CONSTANT numeric := 75;
  flat_shipping_rate      CONSTANT numeric := 9.95;

  item              jsonb;
  product           products%ROWTYPE;
  item_qty          integer;
  rebuilt_items     jsonb   := '[]'::jsonb;
  computed_subtotal numeric := 0;
  computed_shipping numeric;
BEGIN
  IF current_user = 'project_admin' THEN
    RETURN NEW;
  END IF;

  -- A client-placed order always starts pending and unpaid. Every transition
  -- after this point belongs to orders_guard_payment_update.
  NEW.status         := 'pending';
  NEW.payment_status := 'unpaid';
  NEW.payment_method := 'paypal';

  IF NEW.items IS NULL
     OR jsonb_typeof(NEW.items) <> 'array'
     OR jsonb_array_length(NEW.items) = 0 THEN
    RAISE EXCEPTION 'order must contain at least one item';
  END IF;

  -- Validated item by item rather than with a join: a join would silently DROP
  -- an unknown productId instead of rejecting the order.
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    IF jsonb_typeof(item) <> 'object' THEN
      RAISE EXCEPTION 'invalid order item';
    END IF;

    SELECT * INTO product FROM products WHERE id = item->>'productId';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'unknown product: %', COALESCE(item->>'productId', '(null)');
    END IF;

    -- Digits only, which rejects negatives, decimals and junk in one check.
    -- A negative qty would otherwise drive the total down.
    IF item->>'qty' IS NULL OR (item->>'qty') !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'invalid quantity for product %', product.id;
    END IF;
    item_qty := (item->>'qty')::integer;
    IF item_qty < 1 OR item_qty > 999 THEN
      RAISE EXCEPTION 'invalid quantity for product %', product.id;
    END IF;

    IF NOT (product.sizes ? (item->>'size')) THEN
      RAISE EXCEPTION 'invalid size % for product %',
        COALESCE(item->>'size', '(null)'), product.id;
    END IF;

    computed_subtotal := computed_subtotal + (product.price * item_qty);

    -- Rebuilt from the database, preserving exactly the five camelCase keys
    -- app/profile/page.tsx renders. Client-sent name and price are discarded.
    rebuilt_items := rebuilt_items || jsonb_build_object(
      'productId', product.id,
      'name',      product.name,
      'size',      item->>'size',
      'qty',       item_qty,
      'price',     product.price
    );
  END LOOP;

  computed_subtotal := round(computed_subtotal, 2);
  computed_shipping := CASE WHEN computed_subtotal >= free_shipping_threshold
                            THEN 0
                            ELSE flat_shipping_rate
                       END;

  NEW.items    := rebuilt_items;
  NEW.subtotal := computed_subtotal;
  NEW.shipping := computed_shipping;
  NEW.total    := computed_subtotal + computed_shipping;

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_enforce_integrity
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_integrity();

-- Dead weight: RLS has no DELETE policy, so these grants are already inert.
-- Removed so the grant table matches the actual intent.
REVOKE DELETE ON orders FROM anon, authenticated;
