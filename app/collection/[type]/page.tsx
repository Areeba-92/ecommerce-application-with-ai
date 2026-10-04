import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import SortSelect from "@/components/SortSelect";
import { getProducts, type Collection, type SortOption } from "@/lib/api";

const COLLECTIONS: Record<Collection, { eyebrow: string; title: string }> = {
  featured: { eyebrow: "Curated", title: "Featured" },
  new: { eyebrow: "Just In", title: "New Arrivals" },
  trending: { eyebrow: "Most Loved", title: "Trending Now" },
};

function isCollection(value: string): value is Collection {
  return Object.hasOwn(COLLECTIONS, value);
}

interface CollectionPageProps {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const { type } = await params;
  if (!isCollection(type)) notFound();

  const { sort } = await searchParams;
  const activeSort = (sort as SortOption) || "featured";
  const products = await getProducts({ collection: type, sort: activeSort });
  const { eyebrow, title } = COLLECTIONS[type];

  return (
    <div className="container">
      <div className="listing-header">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="section__title">{title}</h1>
      </div>
      <div className="listing-toolbar">
        <div />
        <SortSelect current={activeSort} />
      </div>
      {products.length > 0 ? (
        <div className="grid grid--4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty-state">No products in this collection yet.</div>
      )}
    </div>
  );
}
