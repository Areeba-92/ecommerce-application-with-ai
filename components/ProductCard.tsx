import Link from "next/link";
import ProductImage from "@/components/ProductImage";
import QuickAddButton from "@/components/QuickAddButton";
import { money } from "@/lib/format";
import type { Product } from "@/lib/data";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  // A product can be both new and discounted, so the badge kind has to be
  // decided here — a CSS :has() rule keyed off .compare would paint a "New"
  // badge in sale red.
  const badge = product.isNew
    ? { label: "New", kind: "new" as const }
    : product.compareAtPrice
    ? { label: "Sale", kind: "sale" as const }
    : null;

  return (
    <div className="product-card">
      <Link href={`/product/${product.id}`} className="product-card__media">
        {badge && (
          <span className={`product-card__badge product-card__badge--${badge.kind}`}>
            {badge.label}
          </span>
        )}
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="(max-width: 720px) 50vw, 25vw"
        />
        {product.images[1] && (
          <ProductImage
            src={product.images[1]}
            alt=""
            fill
            sizes="(max-width: 720px) 50vw, 25vw"
          />
        )}
        <div className="product-card__quick-add">
          <QuickAddButton product={product} />
        </div>
      </Link>
      <Link href={`/product/${product.id}`}>
        <div className="product-card__name">{product.name}</div>
        <div className="product-card__price">
          <span>{money(product.price)}</span>
          {product.compareAtPrice && (
            <span className="compare">{money(product.compareAtPrice)}</span>
          )}
        </div>
      </Link>
    </div>
  );
}
