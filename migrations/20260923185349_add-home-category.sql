-- Widen the product category vocabulary to admit non-apparel stock.
--
-- The catalogue being imported includes velvet prayer mats and framed wall art,
-- which are neither womenswear nor menswear. The original CHECK allowed only
-- ('women','men'), so these rows could not be inserted at all.
--
-- 'home' covers prayer mats and wall art. Existing rows are unaffected — this
-- only widens what is permitted.
ALTER TABLE products DROP CONSTRAINT products_category_check;
ALTER TABLE products ADD CONSTRAINT products_category_check
  CHECK (category IN ('women', 'men', 'home'));
