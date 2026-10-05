import { insforge } from "./insforge";

// An unpaid order nobody reports payment for is cancelled after this long.
// The database is what enforces it (guard_order_payment_update and
// expire_stale_orders() in migrations/*_expire-abandoned-orders.sql) — keep
// the two in sync. This copy only drives what the UI shows.
export const ORDER_EXPIRY_HOURS = 24;

/** Cancels the signed-in user's own expired orders. Best-effort: the DB
 * already refuses payment on them, so a failure here only delays the label. */
export async function expireStaleOrders() {
  try {
    await insforge.database.rpc("expire_stale_orders");
  } catch {}
}
