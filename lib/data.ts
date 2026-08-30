import { GENERATED_PRODUCTS } from "./generated-products";

export interface Product {
  id: string;
  name: string;
  category: "women" | "men";
  subcategory: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  sizes: string[];
  images: [string, string];
  featured?: boolean;
  isNew?: boolean;
  trending?: boolean;
}

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];

function unsplash(id: string, w = 900): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
}

export const CATEGORIES: Record<"women" | "men", string[]> = {
  women: ["Abayas", "Hijabs", "Jilbabs", "Modest Dresses", "Prayer Wear", "Accessories"],
  men: ["Thobes/Kanduras", "Jubbahs", "Prayer Wear", "Bottoms", "Accessories"],
};

export const BASE_PRODUCTS: Product[] = [
  // --- Women ---
  {
    id: "open-front-abaya",
    name: "Open-Front Abaya",
    category: "women",
    subcategory: "Abayas",
    price: 148,
    description:
      "Flowing open-front abaya in a soft neutral tone, worn over a matching underdress with a coordinating hijab. Relaxed drape, floor-length hem.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1752794673269-dc356838c5fd"),
      unsplash("photo-1613005798967-632017e477c8"),
    ],
    featured: true,
    isNew: true,
  },
  {
    id: "embroidered-lace-abaya",
    name: "Embroidered Lace Abaya",
    category: "women",
    subcategory: "Abayas",
    price: 198,
    compareAtPrice: 245,
    description:
      "Statement black abaya finished with intricate floral bead embroidery at the collar and lace-trimmed cuffs.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1750190321916-fdad2bbf6931"),
      unsplash("photo-1772474500365-c2c520545f44"),
    ],
    featured: true,
  },
  {
    id: "beaded-trim-occasion-abaya",
    name: "Beaded Trim Occasion Abaya",
    category: "women",
    subcategory: "Abayas",
    price: 212,
    description:
      "Occasion-ready abaya with hand-beaded floral trim along the neckline and sleeve cuffs, finished with a jeweled clasp.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1772474500365-c2c520545f44"),
      unsplash("photo-1750190321916-fdad2bbf6931"),
    ],
    trending: true,
  },
  {
    id: "minimalist-prayer-abaya",
    name: "Minimalist Prayer Abaya",
    category: "women",
    subcategory: "Prayer Wear",
    price: 118,
    description:
      "Unembellished, easy-drape abaya designed for prayer and everyday modest wear. Soft matte fabric with a relaxed fit.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1613005798967-632017e477c8"),
      unsplash("photo-1542380841-5eef57349ca1"),
    ],
    isNew: true,
  },
  {
    id: "silk-shawl-hijab",
    name: "Silk Shawl Hijab",
    category: "women",
    subcategory: "Hijabs",
    price: 38,
    description:
      "Lightweight silk-blend shawl hijab with a soft drape and rich saturated color. Finished edges, no-slip weave.",
    sizes: ["One Size"],
    images: [
      unsplash("photo-1569245087840-dcf487ddbad5"),
      unsplash("photo-1564640130169-e9672b4e9506"),
    ],
    featured: true,
  },
  {
    id: "everyday-jilbab",
    name: "Everyday Jilbab",
    category: "women",
    subcategory: "Jilbabs",
    price: 132,
    description:
      "Relaxed, single-layer jilbab in a breathable weave — an easy throw-on for daily wear over regular clothing.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1544059529-9a9a0a4ef94f"),
      unsplash("photo-1568277007085-036ae7010f7e"),
    ],
    trending: true,
  },
  {
    id: "everyday-jersey-hijab",
    name: "Everyday Jersey Hijab",
    category: "women",
    subcategory: "Hijabs",
    price: 28,
    description:
      "Stretch jersey hijab that holds its shape all day without pins. Breathable and fade-resistant.",
    sizes: ["One Size"],
    images: [
      unsplash("photo-1564640130169-e9672b4e9506"),
      unsplash("photo-1569245087840-dcf487ddbad5"),
    ],
    isNew: true,
  },
  {
    id: "wheat-field-jilbab-coat",
    name: "Wheat Field Jilbab Coat",
    category: "women",
    subcategory: "Jilbabs",
    price: 168,
    compareAtPrice: 210,
    description:
      "Full-length jilbab coat with a relaxed A-line silhouette and matching scarf. Ideal layered over daywear.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1568277007085-036ae7010f7e"),
      unsplash("photo-1544059529-9a9a0a4ef94f"),
    ],
    featured: true,
  },
  {
    id: "garden-modest-maxi-dress",
    name: "Garden Modest Maxi Dress",
    category: "women",
    subcategory: "Modest Dresses",
    price: 142,
    description:
      "Floor-length maxi dress with long sleeves and a modest neckline, cut from a soft breathable cotton-blend.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1561442748-c50715dc32f6"),
      unsplash("photo-1600013476945-381eaba8022d"),
    ],
    trending: true,
  },
  {
    id: "chiffon-niqab",
    name: "Chiffon Niqab",
    category: "women",
    subcategory: "Accessories",
    price: 22,
    description:
      "Single-layer chiffon niqab with a comfortable elastic fit and soft, breathable drape.",
    sizes: ["One Size"],
    images: [
      unsplash("photo-1542380841-5eef57349ca1"),
      unsplash("photo-1613005798967-632017e477c8"),
    ],
  },
  {
    id: "embroidered-kaftan-dress",
    name: "Embroidered Kaftan Dress",
    category: "women",
    subcategory: "Modest Dresses",
    price: 158,
    description:
      "Relaxed kaftan dress in brushed cotton with hand-embroidered trim along the placket and cuffs.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1600013476945-381eaba8022d"),
      unsplash("photo-1561442748-c50715dc32f6"),
    ],
    isNew: true,
  },

  // --- Men ---
  {
    id: "classic-white-thobe",
    name: "Classic White Thobe",
    category: "men",
    subcategory: "Thobes/Kanduras",
    price: 118,
    description:
      "Crisp white thobe with a classic collar and button placket, paired here with a matching ghutra.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1616147147027-60d49d3582c4"),
      unsplash("photo-1780776489912-aa89b69b8c59"),
    ],
    featured: true,
  },
  {
    id: "heritage-family-thobe",
    name: "Heritage Family Thobe",
    category: "men",
    subcategory: "Thobes/Kanduras",
    price: 128,
    description:
      "Traditional-cut thobe in a breathable cotton blend, styled for everyday and Eid wear.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1625236466493-72842ceec47b"),
      unsplash("photo-1616147147027-60d49d3582c4"),
    ],
    trending: true,
  },
  {
    id: "everyday-kandura",
    name: "Everyday Kandura",
    category: "men",
    subcategory: "Thobes/Kanduras",
    price: 132,
    description:
      "Relaxed-fit kandura with a mandarin collar, finished with a matching ghutra headscarf.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1780776489912-aa89b69b8c59"),
      unsplash("photo-1625236466493-72842ceec47b"),
    ],
    isNew: true,
  },
  {
    id: "wool-bisht-cloak",
    name: "Wool Bisht Cloak",
    category: "men",
    subcategory: "Jubbahs",
    price: 268,
    compareAtPrice: 320,
    description:
      "Formal bisht cloak in fine wool with gold-trimmed edges, worn open over a thobe for special occasions.",
    sizes: ["M", "L", "XL"],
    images: [
      unsplash("photo-1756412066323-a336d2becc10"),
      unsplash("photo-1616147147027-60d49d3582c4"),
    ],
    featured: true,
  },
  {
    id: "sunset-prayer-thobe",
    name: "Sunset Prayer Thobe",
    category: "men",
    subcategory: "Prayer Wear",
    price: 108,
    description:
      "Simple, loose-fit thobe designed for ease of movement during prayer, in a breathable lightweight weave.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1578507435314-e39e7852eddd"),
      unsplash("photo-1743450675048-03e0c6b13720"),
    ],
    isNew: true,
  },
  {
    id: "congregation-prayer-set",
    name: "Congregation Prayer Set",
    category: "men",
    subcategory: "Prayer Wear",
    price: 112,
    description:
      "Everyday prayer thobe with a matching kufi cap, suited for mosque and home prayer alike.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1781193231010-91e2f91975fc"),
      unsplash("photo-1743450675048-03e0c6b13720"),
    ],
    trending: true,
  },
  {
    id: "jummah-prayer-garment",
    name: "Jummah Prayer Garment",
    category: "men",
    subcategory: "Prayer Wear",
    price: 118,
    description:
      "Friday-prayer-ready thobe in a crisp finish, cut for comfortable sitting and movement.",
    sizes: DEFAULT_SIZES,
    images: [
      unsplash("photo-1743450675048-03e0c6b13720"),
      unsplash("photo-1781193231010-91e2f91975fc"),
    ],
  },
  {
    id: "wrapped-head-turban",
    name: "Wrapped Head Turban",
    category: "men",
    subcategory: "Accessories",
    price: 32,
    description:
      "Hand-wrapped cotton turban-style headscarf, pre-styled with a soft drape at the shoulder.",
    sizes: ["One Size"],
    images: [
      unsplash("photo-1520451160208-a741e481c527"),
      unsplash("photo-1757141975040-208d061b21e8"),
    ],
    isNew: true,
  },
  {
    id: "classic-kufi-cap",
    name: "Classic Kufi Cap",
    category: "men",
    subcategory: "Accessories",
    price: 24,
    description:
      "Structured kufi cap in a fine knit, an everyday essential for prayer and daily wear.",
    sizes: ["One Size"],
    images: [
      unsplash("photo-1757141975040-208d061b21e8"),
      unsplash("photo-1520451160208-a741e481c527"),
    ],
    featured: true,
  },
];

// Backend-swap seam: this line merges the hand-authored demo catalogue with
// listings imported via `npm run import-listings`. To go fully "generated"
// (e.g. once real inventory replaces the demo set), swap the export below to
// `export const PRODUCTS: Product[] = GENERATED_PRODUCTS;` — do not delete
// BASE_PRODUCTS, just disconnect it here.
export const PRODUCTS: Product[] = [...BASE_PRODUCTS, ...GENERATED_PRODUCTS];

export function subcategoriesFor(category: "women" | "men"): string[] {
  const active = new Set(
    PRODUCTS.filter((p) => p.category === category).map((p) => p.subcategory)
  );
  const curated = CATEGORIES[category].filter((sub) => active.has(sub));
  const extra = [...active].filter((sub) => !CATEGORIES[category].includes(sub));
  return [...curated, ...extra];
}
