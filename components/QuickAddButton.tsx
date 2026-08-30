"use client";

import { useCart } from "@/lib/store";
import { useToast } from "@/components/Toast";
import type { Product } from "@/lib/data";

interface QuickAddButtonProps {
  product: Product;
}

// Adds the first available size for speed from the grid. Full size choice
// happens on the product detail page — this is the "quick" affordance.
export default function QuickAddButton({ product }: QuickAddButtonProps) {
  const { add } = useCart();
  const { showToast } = useToast();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    add({
      productId: product.id,
      name: product.name,
      image: product.images[0],
      size: product.sizes[0],
      price: product.price,
    });
    showToast(`${product.name} added to cart`);
  }

  return (
    <button
      type="button"
      className="btn btn--primary btn--sm btn--full"
      onClick={handleClick}
    >
      Quick Add
    </button>
  );
}
