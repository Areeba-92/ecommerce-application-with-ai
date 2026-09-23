import ProductCard from "@/components/ProductCard";
import FilterPills from "@/components/FilterPills";
import SortSelect from "@/components/SortSelect";
import { getProducts, getSubcategories, type SortOption } from "@/lib/api";

interface HomeLivingPageProps {
  searchParams: Promise<{ sub?: string; sort?: string }>;
}

// Route is /home-living rather than /home so it can't collide with the site root.
export default async function HomeLivingPage({ searchParams }: HomeLivingPageProps) {
  const { sub, sort } = await searchParams;
  const activeSort = (sort as SortOption) || "featured";

  const [subcategories, products] = await Promise.all([
    getSubcategories("home"),
    getProducts({ category: "home", subcategory: sub, sort: activeSort }),
  ]);

  return (
    <div className="container">
      <div className="listing-header">
        <span className="eyebrow">Home</span>
        <h1 className="section__title">Home &amp; Worship</h1>
      </div>
      <div className="listing-toolbar">
        <FilterPills
          basePath="/home-living"
          subcategories={subcategories}
          activeSub={sub}
          sort={sort}
        />
        <SortSelect current={activeSort} />
      </div>
      {products.length > 0 ? (
        <div className="grid grid--4">
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
