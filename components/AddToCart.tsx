"use client";

import { useState } from "react";
import SizeSelector from "@/components/SizeSelector";
import QtyStepper from "@/components/QtyStepper";
import { useCart } from "@/lib/store";
import { useToast } from "@/components/Toast";
import type { Product } from "@/lib/data";

interface AddToCartProps {
  product: Product;
}

export default function AddToCart({ product }: AddToCartProps) {
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState(false);
  const { add } = useCart();
  const { showToast } = useToast();

  function handleAdd() {
    if (!size) {
      setError(true);
      return;
    }
    add(
      {
        productId: product.id,
        name: product.name,
        image: product.images[0],
        size,
        price: product.price,
      },
      qty
    );
    showToast(`${product.name} added to cart`);
  }

  return (
    <>
      <SizeSelector
        sizes={product.sizes}
        selected={size}
        onSelect={(s) => {
          setSize(s);
          setError(false);
        }}
      />
      {error && <p className="product-info__note">Please select a size.</p>}
      <div className="product-actions">
        <QtyStepper qty={qty} onChange={setQty} />
        <button type="button" className="btn btn--primary" onClick={handleAdd}>
          Add to Cart
        </button>
      </div>
    </>
  );
}
