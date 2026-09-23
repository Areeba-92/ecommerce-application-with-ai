-- Hardening pass over enforce_order_integrity (previous migration). Same design,
-- four gaps closed:
--
--   1. SET search_path — without it the function resolves `products` through the
--      caller's search_path, the standard "function search_path mutable" finding.
--   2. created_at / payment_receipt_url are now forced. The INSERT grant is
--      table-wide, so a client could otherwise backdate its own order history or
--      write an arbitrary receipt URL.
--   3. A line-item cap, so one request can't ask the loop to price 10k lines.
--   4. qty must be a JSON *number*. The previous digits-only text check accepted
--      the string "2"; harmless arithmetically, but the real checkout always
--      sends a number, so anything else is malformed input.
CREATE OR REPLACE FUNCTION public.enforce_order_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Keep in sync with lib/shipping.ts. That copy decides what the UI displays;
  -- this one decides what is actually charged.
  free_shipping_threshold CONSTANT numeric := 75;
  flat_shipping_rate      CONSTANT numeric := 9.95;
  max_line_items          CONSTANT integer := 50;

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

  -- A client-placed order always starts pending and unpaid, and never gets to
  -- choose its own timestamp or receipt. Every transition after this point
  -- belongs to orders_guard_payment_update.
  NEW.status              := 'pending';
  NEW.payment_status      := 'unpaid';
  NEW.payment_method      := 'paypal';
  NEW.payment_receipt_url := NULL;
  NEW.created_at          := now();

  IF NEW.items IS NULL
     OR jsonb_typeof(NEW.items) <> 'array'
     OR jsonb_array_length(NEW.items) = 0 THEN
    RAISE EXCEPTION 'order must contain at least one item';
  END IF;

  IF jsonb_array_length(NEW.items) > max_line_items THEN
    RAISE EXCEPTION 'order has too many line items';
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

    -- Must be a JSON number, and digits only once stringified: rejects negatives,
    -- decimals, strings and junk. A negative qty would drive the total down.
    IF jsonb_typeof(item->'qty') IS DISTINCT FROM 'number'
       OR (item->>'qty') !~ '^[0-9]+$' THEN
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
    -- Adding a key to the checkout insert means adding it here too, or it is
    -- silently dropped.
    rebuilt_items := rebuilt_items || jsonb_build_object(
      'productId', product.id,
      'name',      product.name,
      'size',      item->>'size',
      'qty',       item_qty,
      'price',     round(product.price, 2)
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
  NEW.total    := round(computed_subtotal + computed_shipping, 2);

  RETURN NEW;
END;
$$;
