/**
 * Shipping rule, shared by the cart and checkout pages.
 *
 * NOTE: these values are mirrored in the `enforce_order_integrity` trigger
 * (migrations/20260923151447_enforce-order-integrity.sql). That SQL copy is
 * what actually gets charged — this one only decides what the UI displays.
 * Change both together.
 */
export const FREE_SHIPPING_THRESHOLD = 75;
export const FLAT_SHIPPING_RATE = 9.95;

export function shippingFor(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;
}
