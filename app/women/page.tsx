import ProductCard from "@/components/ProductCard";
import FilterPills from "@/components/FilterPills";
import SortSelect from "@/components/SortSelect";
import { getProducts, getSubcategories, type SortOption } from "@/lib/api";

interface WomenPageProps {
  searchParams: Promise<{ sub?: string; sort?: string }>;
}

export default async function WomenPage({ searchParams }: WomenPageProps) {
  const { sub, sort } = await searchParams;
  const activeSort = (sort as SortOption) || "featured";

  const [subcategories, products] = await Promise.all([
    getSubcategories("women"),
    getProducts({ category: "women", subcategory: sub, sort: activeSort }),
  ]);

  return (
    <div className="container">
      <div className="listing-header">
        <span className="eyebrow">Women</span>
        <h1 className="section__title">Women&apos;s Collection</h1>
      </div>
      <div className="listing-toolbar">
        <FilterPills
          basePath="/women"
          subcategories={subcategories}
          activeSub={sub}
          sort={sort}
        />
        <SortSelect current={activeSort} />
      </div>
      {products.length > 0 ? (
        <div className="grid grid--4" style={{ paddingBottom: "4rem" }}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty-state">No products match these filters.</div>
      )}
    </div>
  );
}
