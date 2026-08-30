import { notFound } from "next/navigation";
import Gallery from "@/components/Gallery";
import AddToCart from "@/components/AddToCart";
import ProductCard from "@/components/ProductCard";
import { getProductById, getRelated } from "@/lib/api";
import { money } from "@/lib/format";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const related = await getRelated(id);

  return (
    <div className="container">
      <div className="product-detail">
        <Gallery images={product.images} name={product.name} />
        <div>
          <h1 className="product-info__name">{product.name}</h1>
          <div className="product-info__price">
            <span>{money(product.price)}</span>
            {product.compareAtPrice && (
              <span className="compare">{money(product.compareAtPrice)}</span>
            )}
          </div>
          <p className="product-info__desc">{product.description}</p>
          <AddToCart product={product} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="section section--tight">
          <div className="section__head">
            <div>
              <span className="eyebrow">You May Also Like</span>
              <h2 className="section__title">Related Products</h2>
            </div>
          </div>
          <div className="grid grid--4" style={{ paddingBottom: "4rem" }}>
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
