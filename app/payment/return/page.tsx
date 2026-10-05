"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { insforge, getCurrentUserOnce } from "@/lib/insforge";

type Phase = "checking" | "confirming" | "success" | "error";

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<div className="container" />}>
      <PaymentReturnInner />
    </Suspense>
  );
}

function PaymentReturnInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [phase, setPhase] = useState<Phase>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // No orderId is rendered directly below; nothing to do here.
    if (!orderId) return;

    getCurrentUserOnce().then(async ({ data }) => {
      if (!data.user) {
        router.replace(
          `/login?next=${encodeURIComponent(`/payment/return?orderId=${orderId}`)}`
        );
        return;
      }

      setPhase("confirming");

      // The browser can only REPORT a payment. Marking an order paid is the
      // store's job (dashboard/CLI) — the DB rejects any client attempt to set
      // payment_status, and stamps payment_reported_at with server time.
      const { error: updateError } = await insforge.database
        .from("orders")
        .update({ payment_reported_at: new Date().toISOString() })
        .eq("id", orderId)
        .select();

      if (!updateError) {
        setPhase("success");
        return;
      }

      // A repeat visit (double-click, back button) hits an order that's
      // already reported or paid — the DB guard rejects that update on
      // purpose, so treat it as success rather than a real failure.
      const { data: orderRow } = await insforge.database
        .from("orders")
        .select("id, status, payment_status, payment_reported_at")
        .eq("id", orderId)
        .single();

      if (orderRow?.payment_status === "paid" || orderRow?.payment_reported_at) {
        setPhase("success");
        return;
      }

      setErrorMessage(
        orderRow?.status === "cancelled" || /expired/i.test(updateError.message ?? "")
          ? "This order has expired and can no longer be paid. Please place a new order."
          : "Could not record your payment. Please try again."
      );
      setPhase("error");
    });
  }, [orderId, router]);

  if (!orderId) {
    return (
      <div className="container">
        <div className="empty-state">
          <p>Missing order reference.</p>
          <Link
            href="/profile"
            className="btn btn--primary"
          >
            Go to Profile
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "checking" || phase === "confirming") {
    return (
      <div className="container">
        <div className="loader" />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="container">
        <div className="confirmation">
          <span className="eyebrow">Payment Not Submitted</span>
          <h1 className="section__title">Something went wrong</h1>
          <p className="field__error" style={{ marginTop: "1rem" }}>
            {errorMessage}
          </p>
          <div style={{ marginTop: "2rem" }}>
            <Link href={`/payment/${orderId}`} className="btn btn--outline">
              Back to Payment
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="confirmation">
        <span className="eyebrow">Payment Submitted</span>
        <h1 className="section__title">Thank you — awaiting verification</h1>
        <p className="confirmation__order-number">{orderId}</p>
        <p className="dummy-note" style={{ marginTop: "1rem" }}>
          Your order is marked as payment reported. The store confirms it once
          the payment has been checked. On this demo site no real charge occurs.
        </p>
        <div style={{ marginTop: "2rem" }}>
          <Link href="/profile" className="btn btn--primary">
            View Order in Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
