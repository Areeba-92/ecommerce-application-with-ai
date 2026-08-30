"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/store";
import QtyStepper from "@/components/QtyStepper";
import { money } from "@/lib/format";

const SHIPPING_THRESHOLD = 75;
const SHIPPING_FLAT = 9.95;

export default function CartPage() {
  const { items, remove, updateQty, subtotal } = useCart();

  if (items.length === 0) {
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

  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  const total = subtotal + shipping;

  return (
    <div className="container">
      <div className="listing-header">
        <h1 className="section__title">Your Cart</h1>
      </div>
      <div className="cart-layout">
        <div>
          {items.map((item) => (
            <div className="cart-line" key={`${item.productId}-${item.size}`}>
              <div className="cart-line__image">
                <Image src={item.image} alt={item.name} width={96} height={128} />
              </div>
              <div className="cart-line__meta">
                <span className="cart-line__name">{item.name}</span>
                <span className="cart-line__variant">Size: {item.size}</span>
                <QtyStepper
                  qty={item.qty}
                  onChange={(qty) => updateQty(item.productId, item.size, qty)}
                />
                <button
                  type="button"
                  className="cart-line__remove"
                  onClick={() => remove(item.productId, item.size)}
                >
                  Remove
                </button>
              </div>
              <div className="cart-line__price">
                <span>{money(item.price * item.qty)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="order-summary">
          <div className="order-summary__row">
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
          <Link
            href="/checkout"
            className="btn btn--primary btn--full"
            style={{ marginTop: "1.5rem", display: "inline-flex" }}
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
