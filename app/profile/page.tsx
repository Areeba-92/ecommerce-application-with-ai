"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { insforge, getCurrentUserOnce, notifyAuthChanged } from "@/lib/insforge";
import { money } from "@/lib/format";

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
  const paid = status === "paid";
  return (
    <span
      style={{
        fontSize: "0.68rem",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "0.2rem 0.55rem",
        borderRadius: "999px",
        border: `1px solid ${paid ? "var(--color-success)" : "var(--color-error)"}`,
        color: paid ? "var(--color-success)" : "var(--color-error)",
      }}
    >
      {paid ? "Paid" : "Unpaid"}
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

export default function ProfilePage() {
  const router = useRouter();
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
    return <div className="container" />;
  }

  return (
    <div className="container">
      <div className="static-page" style={{ maxWidth: "none" }}>
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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                  }}
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
      </div>
    </div>
  );
}
