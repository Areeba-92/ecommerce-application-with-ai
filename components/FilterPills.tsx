import Link from "next/link";

interface FilterPillsProps {
  basePath: string;
  subcategories: string[];
  activeSub?: string;
  sort?: string;
}

export default function FilterPills({
  basePath,
  subcategories,
  activeSub,
  sort,
}: FilterPillsProps) {
  function href(sub?: string) {
    const params = new URLSearchParams();
    if (sub) params.set("sub", sub);
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="filter-pills">
      <Link href={href()} className={`filter-pill ${!activeSub ? "is-active" : ""}`}>
        All
      </Link>
      {subcategories.map((s) => (
        <Link
          key={s}
          href={href(s)}
          className={`filter-pill ${activeSub === s ? "is-active" : ""}`}
        >
          {s}
        </Link>
      ))}
    </div>
  );
}
