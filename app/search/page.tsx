import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/api";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const products = q ? await getProducts({ query: q }) : [];

  return (
    <div className="container">
      <div className="listing-header">
        <span className="eyebrow">Search</span>
        <h1 className="section__title">
          {q ? `Results for “${q}”` : "Search"}
        </h1>
      </div>
      {products.length > 0 ? (
        <div className="grid grid--4" style={{ paddingBottom: "4rem" }}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {q
            ? "No products matched your search."
            : "Enter a search term to get started."}
        </div>
      )}
    </div>
  );
}
