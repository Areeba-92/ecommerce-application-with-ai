"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { insforge, getCurrentUserOnce } from "@/lib/insforge";

type Phase = "checking" | "confirming" | "success" | "error" | "missing";

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
    if (!orderId) {
      setPhase("missing");
      return;
    }

    getCurrentUserOnce().then(async ({ data }) => {
      if (!data.user) {
        router.replace(
          `/login?next=${encodeURIComponent(`/payment/return?orderId=${orderId}`)}`
        );
        return;
      }

      setPhase("confirming");

      const { error: updateError } = await insforge.database
        .from("orders")
        .update({ payment_status: "paid", status: "confirmed" })
        .eq("id", orderId)
        .select();

      if (!updateError) {
        setPhase("success");
        return;
      }

      // A repeat visit (double-click, back button) hits an order that's
      // already confirmed — the DB guard rejects that update on purpose, so
      // treat "already paid" as success rather than a real failure.
      const { data: orderRow } = await insforge.database
        .from("orders")
        .select("id, payment_status")
        .eq("id", orderId)
        .single();

      if (orderRow?.payment_status === "paid") {
        setPhase("success");
        return;
      }

      setErrorMessage(updateError.message || "Could not confirm your payment.");
      setPhase("error");
    });
  }, [orderId, router]);

  if (phase === "checking" || phase === "confirming") {
    return <div className="container" />;
  }

  if (phase === "missing") {
    return (
      <div className="container">
        <div className="empty-state">
          <p>Missing order reference.</p>
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

  if (phase === "error") {
    return (
      <div className="container">
        <div className="confirmation">
          <span className="eyebrow">Payment Not Confirmed</span>
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
        <span className="eyebrow">Payment Confirmed</span>
        <h1 className="section__title">Thank you — your payment was received</h1>
        <p className="confirmation__order-number">{orderId}</p>
        <div style={{ marginTop: "2rem" }}>
          <Link href="/profile" className="btn btn--primary">
            View Order in Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
