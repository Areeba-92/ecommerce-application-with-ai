-- Products: the catalogue is read-only for clients. RLS (SELECT-only policy)
-- already denied these writes, but the grants meant one mistaken permissive
-- policy would make prices editable by any user. SELECT is unchanged.
REVOKE INSERT, UPDATE, DELETE ON products FROM anon, authenticated;

-- Carts: same bounds the order trigger enforces on qty, so a cart can never
-- hold a quantity checkout would reject (or a negative subtotal).
ALTER TABLE carts ADD CONSTRAINT carts_quantity_range
  CHECK (quantity BETWEEN 1 AND 999);
