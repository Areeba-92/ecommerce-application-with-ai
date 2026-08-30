"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/store";
import { money } from "@/lib/format";
import { insforge, getCurrentUserOnce } from "@/lib/insforge";

const SHIPPING_THRESHOLD = 75;
const SHIPPING_FLAT = 9.95;

const REQUIRED_FIELDS = [
  "name",
  "email",
  "phone",
  "address",
  "city",
  "zip",
  "country",
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  const total = subtotal + shipping;

  useEffect(() => {
    getCurrentUserOnce().then(({ data }) => {
      if (!data.user) {
        router.replace("/login?next=/checkout");
        return;
      }
      setUserId(data.user.id);
      setAuthChecked(true);
    });
  }, [router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;

    setSubmitError(null);
    const form = e.currentTarget;
    const data = new FormData(form);

    const newErrors: Record<string, boolean> = {};
    REQUIRED_FIELDS.forEach((field) => {
      const value = data.get(field);
      if (!value || String(value).trim() === "") newErrors[field] = true;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    const { data: orderRows, error: orderError } = await insforge.database
      .from("orders")
      .insert([
        {
          user_id: userId,
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            size: item.size,
            qty: item.qty,
            price: item.price,
          })),
          subtotal,
          shipping,
          total,
          contact: {
            name: data.get("name"),
            email: data.get("email"),
            phone: data.get("phone"),
          },
          shipping_address: {
            address: data.get("address"),
            city: data.get("city"),
            zip: data.get("zip"),
            country: data.get("country"),
          },
        },
      ])
      .select();

    if (orderError || !orderRows?.[0]) {
      setSubmitting(false);
      setSubmitError("Could not place your order. Please try again.");
      return;
    }

    clear();
    router.push(`/payment/${orderRows[0].id}`);
  }

  if (!authChecked) {
    return <div className="container" />;
  }

  if (items.length === 0 && !submitting) {
    return (
      <div className="container">
        <div className="empty-state">
          <p>Your cart is empty.</p>
          <Link
            href="/women"
            className="btn btn--primary"
            style={{ marginTop: "1.5rem", display: "inline-flex" }}
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="listing-header">
        <h1 className="section__title">Checkout</h1>
      </div>
      <form className="checkout-layout" onSubmit={handleSubmit} noValidate>
        <div>
          <div className="checkout-section">
            <h2 className="checkout-section__title">Contact</h2>
            <div className="field-row">
              <div className={`field ${errors.name ? "field--error" : ""}`}>
                <label htmlFor="name">Full Name</label>
                <input id="name" name="name" type="text" />
                {errors.name && <span className="field__error">Required</span>}
              </div>
              <div className={`field ${errors.email ? "field--error" : ""}`}>
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" />
                {errors.email && <span className="field__error">Required</span>}
              </div>
            </div>
            <div className={`field ${errors.phone ? "field--error" : ""}`}>
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" type="tel" />
              {errors.phone && <span className="field__error">Required</span>}
            </div>
          </div>

          <div className="checkout-section">
            <h2 className="checkout-section__title">Shipping Address</h2>
            <div className={`field ${errors.address ? "field--error" : ""}`}>
              <label htmlFor="address">Address</label>
              <input id="address" name="address" type="text" />
              {errors.address && <span className="field__error">Required</span>}
            </div>
            <div className="field-row">
              <div className={`field ${errors.city ? "field--error" : ""}`}>
                <label htmlFor="city">City</label>
                <input id="city" name="city" type="text" />
                {errors.city && <span className="field__error">Required</span>}
              </div>
              <div className={`field ${errors.zip ? "field--error" : ""}`}>
                <label htmlFor="zip">ZIP / Postal Code</label>
                <input id="zip" name="zip" type="text" />
                {errors.zip && <span className="field__error">Required</span>}
              </div>
            </div>
            <div className={`field ${errors.country ? "field--error" : ""}`}>
              <label htmlFor="country">Country</label>
              <input id="country" name="country" type="text" />
              {errors.country && <span className="field__error">Required</span>}
            </div>
          </div>

          <div className="checkout-section">
            <h2 className="checkout-section__title">Payment</h2>
            <p className="dummy-note">
              You&apos;ll pay via PayPal on the next step, after placing your order.
            </p>
          </div>
        </div>

        <div className="order-summary">
          {items.map((item) => (
            <div className="order-summary__row" key={`${item.productId}-${item.size}`}>
              <span>
                {item.name} × {item.qty} ({item.size})
              </span>
              <span>{money(item.price * item.qty)}</span>
            </div>
          ))}
          <div
            className="order-summary__row"
            style={{
              marginTop: "0.75rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="order-summary__row">
            <span>Shipping</span>
            <span>{shipping === 0 ? "Free" : money(shipping)}</span>
          </div>
          <div className="order-summary__row total">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
          {submitError && (
            <p className="field__error" style={{ marginTop: "1rem" }}>
              {submitError}
            </p>
          )}
          <button
            type="submit"
            className="btn btn--primary btn--full"
            style={{ marginTop: "1.5rem" }}
            disabled={submitting}
          >
            {submitting ? "Placing Order…" : "Place Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
