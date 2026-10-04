/**
 * Permanently deletes the calling user's account.
 *
 * The InsForge SDK has no self-service "delete my user" call — the only way
 * to remove an auth user is the admin `DELETE /api/auth/users` endpoint — so
 * this runs server-side with the project API key. The key is read from a
 * server-only env var (no NEXT_PUBLIC_ prefix) and never reaches the browser.
 *
 * The caller's identity comes ONLY from their own access token, verified
 * against InsForge; the request body is ignored, so a user can never delete
 * anyone but themselves.
 *
 * `carts.user_id` and `orders.user_id` both reference auth.users ON DELETE
 * CASCADE, so deleting the auth user removes those rows. Legacy payment
 * receipts in the `payment-uploads` bucket aren't linked by a foreign key (nor
 * by orders.payment_receipt_url, which is null on every real order), so they
 * are matched on the object's `uploaded_by` and deleted first — if that fails
 * the account is left intact so the user can retry, rather than orphaning files.
 */
import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL;
const API_KEY = process.env.INSFORGE_API_KEY;
const RECEIPT_BUCKET = "payment-uploads";

export async function POST(request: Request) {
  if (!BASE_URL || !API_KEY) {
    console.error("Account deletion is not configured: INSFORGE_API_KEY is missing.");
    return NextResponse.json({ error: "Account deletion is unavailable right now." }, { status: 500 });
  }

  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const sessionRes = await fetch(`${BASE_URL}/api/auth/sessions/current`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const session = sessionRes.ok ? await sessionRes.json() : null;
  const userId: string | undefined = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
  }

  const admin = { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" };

  // 1. Receipts — every object in the bucket this user uploaded.
  const objectsUrl = `${BASE_URL}/api/storage/buckets/${RECEIPT_BUCKET}/objects`;
  const receiptKeys: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const listRes = await fetch(`${objectsUrl}?limit=1000&offset=${offset}`, {
      headers: admin,
      cache: "no-store",
    });
    if (!listRes.ok) {
      console.error("Account deletion: failed to list receipts", listRes.status, await listRes.text());
      return NextResponse.json({ error: "Could not delete your account. Please try again." }, { status: 502 });
    }
    const page: { data: { key: string; uploaded_by: string | null }[] } = await listRes.json();
    receiptKeys.push(...page.data.filter((o) => o.uploaded_by === userId).map((o) => o.key));
    if (page.data.length < 1000) break;
  }

  for (const key of receiptKeys) {
    const res = await fetch(`${objectsUrl}/${key.split("/").map(encodeURIComponent).join("/")}`, {
      method: "DELETE",
      headers: admin,
    });
    // 404 = already gone, which is the outcome we want anyway.
    if (!res.ok && res.status !== 404) {
      console.error("Account deletion: failed to delete receipt", key, res.status);
      return NextResponse.json({ error: "Could not delete your account. Please try again." }, { status: 502 });
    }
  }

  // 2. The auth user — cascades to carts and orders.
  const deleteRes = await fetch(`${BASE_URL}/api/auth/users`, {
    method: "DELETE",
    headers: admin,
    body: JSON.stringify({ userIds: [userId] }),
  });
  if (!deleteRes.ok) {
    console.error("Account deletion: failed to delete user", deleteRes.status, await deleteRes.text());
    return NextResponse.json({ error: "Could not delete your account. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
