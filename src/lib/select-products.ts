import type { Niche } from "./site-config";

export interface Product {
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  niche: Niche;
  category: string;
  images: string[];
  shortDesc: string;
  longDescMd: string;
  specs: Record<string, string>;
  tags: string[];
}

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickDeterministic<T>(items: T[], count: number, seedKey: string): T[] {
  if (count >= items.length) return [...items];
  const rng = mulberry32(fnv1a(seedKey));
  const indexed = items.map((item, i) => ({ item, key: rng() * 1e9 + i / 1e9 }));
  indexed.sort((a, b) => a.key - b.key);
  return indexed.slice(0, count).map((x) => x.item);
}

export interface SelectOpts {
  productCount: number;
  seed: string;
  priceMultiplier?: number;
  featuredSlugs?: string[];
}

export function selectProducts(catalog: Product[], opts: SelectOpts): Product[] {
  const featured = (opts.featuredSlugs ?? [])
    .map((slug) => catalog.find((p) => p.slug === slug))
    .filter((p): p is Product => Boolean(p));

  const featuredSet = new Set(featured.map((p) => p.slug));
  const pool = catalog.filter((p) => !featuredSet.has(p.slug));

  const remainder = Math.max(0, opts.productCount - featured.length);
  const picked = pickDeterministic(pool, remainder, opts.seed);

  const out = [...featured, ...picked];
  const mult = opts.priceMultiplier ?? 1;
  return out.map((p) => ({
    ...p,
    price: roundPrice(p.price * mult),
    compareAtPrice: p.compareAtPrice ? roundPrice(p.compareAtPrice * mult) : undefined,
  }));
}

function roundPrice(n: number): number {
  return Math.round(n * 100) / 100;
}

export function groupByCategory(products: Product[]): Record<string, Product[]> {
  const out: Record<string, Product[]> = {};
  for (const p of products) {
    (out[p.category] ||= []).push(p);
  }
  return out;
}
