"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { insforge, getCurrentUserOnce, notifyAuthChanged } from "@/lib/insforge";
import { money } from "@/lib/format";
import { useToast } from "@/components/Toast";

const CART_STORAGE_KEY = "haven-cart";
const CONFIRM_WORD = "DELETE";

const STATUSES = ["pending", "confirmed", "shipped", "delivered"] as const;
type Status = (typeof STATUSES)[number];
type PaymentStatus = "unpaid" | "paid";

interface OrderItem {
  productId: string;
  name: string;
  size: string;
  qty: number;
  price: number;
}

interface OrderRow {
  id: string;
  items: OrderItem[];
  total: number;
  status: Status;
  payment_status: PaymentStatus;
  created_at: string;
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`pill pill--${status}`}>
      {status === "paid" ? "Paid" : "Unpaid"}
    </span>
  );
}

function StatusTracker({ status }: { status: Status }) {
  const currentIndex = STATUSES.indexOf(status);
  return (
    <div className="status-tracker">
      {STATUSES.map((s, i) => (
        <div
          key={s}
          className={`status-tracker__step ${i <= currentIndex ? "is-complete" : ""} ${
            i === currentIndex ? "is-current" : ""
          }`}
        >
          <span className="status-tracker__dot" />
          <span className="status-tracker__label">{s}</span>
        </div>
      ))}
    </div>
  );
}

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !deleting) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleting, onClose]);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const token = await insforge.getHttpClient().getValidAccessToken();
      if (!token) throw new Error("Your session has expired. Sign in again.");

      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Could not delete your account. Please try again.");
      }

      // The user no longer exists, so signOut may fail server-side — the
      // local session is cleared either way.
      await insforge.auth.signOut().catch(() => {});
      try {
        localStorage.removeItem(CART_STORAGE_KEY);
      } catch {}
      notifyAuthChanged();
      showToast("Account deleted");
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete your account. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !deleting && onClose()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="delete-account-title" className="modal__title">
          Delete your account?
        </h2>
        <p className="modal__text">
          This is permanent and cannot be undone. Your account, saved cart and
          order history will be erased, and you won&apos;t be able to sign in
          with this email again unless you create a new account.
        </p>
        <div className="field">
          <label htmlFor="delete-confirm">
            Type <strong>{CONFIRM_WORD}</strong> to confirm
          </label>
          <input
            id="delete-confirm"
            type="text"
            autoComplete="off"
            autoFocus
            placeholder={CONFIRM_WORD}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={deleting}
          />
        </div>
        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
        <div className="modal__actions">
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--danger btn--sm"
            onClick={handleDelete}
            disabled={confirmText !== CONFIRM_WORD || deleting}
          >
            {deleting ? "Deleting…" : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUserOnce().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login?next=/profile");
        return;
      }
      setEmail(data.user.email);

      const { data: orderRows } = await insforge.database
        .from("orders")
        .select("id, items, total, status, payment_status, created_at")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false });

      setOrders((orderRows as OrderRow[]) ?? []);
      setLoading(false);
    });
  }, [router]);

  async function handleSignOut() {
    await insforge.auth.signOut();
    notifyAuthChanged();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="container">
      <div className="static-page static-page--wide">
        <div className="profile-header">
          <div>
            <span className="eyebrow">Account</span>
            <h1 className="section__title">Your Profile</h1>
            <p className="profile-header__email">{email}</p>
          </div>
          <button type="button" className="btn btn--outline btn--sm" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>

        <h2>Order History</h2>
        {orders.length === 0 ? (
          <p>You haven&apos;t placed any orders yet.</p>
        ) : (
          orders.map((order) => (
            <div className="order-history-card" key={order.id}>
              <div className="order-history-card__head">
                <div>
                  <div className="order-history-card__id">{order.id}</div>
                  <div className="order-history-card__meta">
                    {new Date(order.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <div
                  className="order-history-card__status"
                >
                  <PaymentBadge status={order.payment_status} />
                  <div className="order-history-card__meta">{money(order.total)}</div>
                </div>
              </div>

              <StatusTracker status={order.status} />

              {order.payment_status === "unpaid" && (
                <Link
                  href={`/payment/${order.id}`}
                  className="btn btn--outline btn--sm"
                  style={{ marginTop: "1rem", display: "inline-flex" }}
                >
                  Complete Payment
                </Link>
              )}

              <div className="order-history-card__items">
                {order.items.map((item, i) => (
                  <div key={`${item.productId}-${item.size}-${i}`}>
                    <span>
                      {item.name} × {item.qty} ({item.size})
                    </span>
                    <span>{money(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        <section className="danger-zone">
          <h2>Danger Zone</h2>
          <p>
            Permanently delete your account, saved cart and order history.
          </p>
          <button
            type="button"
            className="btn btn--danger btn--sm"
            onClick={() => setDeleteOpen(true)}
          >
            Delete Account
          </button>
        </section>
      </div>
      {deleteOpen && <DeleteAccountModal onClose={() => setDeleteOpen(false)} />}
    </div>
  );
}
