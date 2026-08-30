"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { insforge, getCurrentUserOnce } from "@/lib/insforge";
import { money } from "@/lib/format";

const PAYPAL_ME_URL = process.env.NEXT_PUBLIC_PAYPAL_ME_URL;
const AUTO_REDIRECT_DELAY_MS = 2500;

interface OrderRow {
  id: string;
  total: number;
  status: string;
  payment_status: string;
}

export default function PaymentPage() {
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getCurrentUserOnce().then(async ({ data }) => {
      if (!data.user) {
        router.replace(`/login?next=${encodeURIComponent(`/payment/${orderId}`)}`);
        return;
      }

      const { data: orderRow } = await insforge.database
        .from("orders")
        .select("id, total, status, payment_status")
        .eq("id", orderId)
        .single();

      if (!orderRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setOrder(orderRow as OrderRow);
      setLoading(false);
    });
  }, [orderId, router]);

  const payPalUrl =
    PAYPAL_ME_URL && order
      ? `${PAYPAL_ME_URL.replace(/\/$/, "")}/${Number(order.total).toFixed(2)}`
      : null;

  useEffect(() => {
    if (!payPalUrl) return;
    const timer = setTimeout(() => {
      window.location.href = payPalUrl;
    }, AUTO_REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [payPalUrl]);

  if (loading) {
    return <div className="container" />;
  }

  if (notFound) {
    return (
      <div className="container">
        <div className="empty-state">
          <p>We couldn&apos;t find that order.</p>
          <Link
            href="/profile"
            className="btn btn--primary"
            style={{ marginTop: "1.5rem", display: "inline-flex" }}
          >
            Go to Profile
          </Link>
        </div>
      </div>
    );
  }

  if (order && order.payment_status === "paid") {
    return (
      <div className="container">
        <div className="confirmation">
          <span className="eyebrow">Already Paid</span>
          <h1 className="section__title">This order is already confirmed</h1>
          <p className="confirmation__order-number">{order.id}</p>
          <div style={{ marginTop: "2rem" }}>
            <Link href="/profile" className="btn btn--primary">
              View in Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const returnHref = `/payment/return?orderId=${orderId}`;

  return (
    <div className="container">
      <div className="confirmation">
        <span className="eyebrow">Order Placed</span>
        <h1 className="section__title">Complete Your Payment</h1>
        <p className="confirmation__order-number">{order?.id}</p>
        <p style={{ marginTop: "1rem", fontSize: "1.4rem" }}>
          {money(order?.total ?? 0)}
        </p>

        {payPalUrl ? (
          <>
            <p style={{ marginTop: "1rem", color: "var(--color-text-muted)" }}>
              Redirecting you to PayPal to complete your payment…
            </p>
            <div
              style={{
                marginTop: "2rem",
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <a href={payPalUrl} className="btn btn--primary">
                Continue to PayPal
              </a>
              <Link href={returnHref} className="btn btn--outline">
                I&apos;ve paid — return to store
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="dummy-note" style={{ marginTop: "1rem" }}>
              Demo mode — no PayPal.me handle is configured for this
              environment. The button below simulates a successful payment;
              no real charge occurs.
            </p>
            <div style={{ marginTop: "2rem" }}>
              <Link href={returnHref} className="btn btn--primary">
                Simulate Payment (Demo)
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
