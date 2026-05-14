export type Niche =
  | "apparel"
  | "home-goods"
  | "electronics-accessories"
  | "beauty-personal-care"
  | "sports-outdoors";

export type Currency = "USD" | "EUR" | "GBP" | "PKR" | "AED" | "CAD" | "AUD";

export interface SiteSocial {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
}

export interface SiteConfig {
  domain: string;
  siteName: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  hours?: string;
  social?: SiteSocial;

  niche: Niche;
  productCount: number;
  featuredSlugs?: string[];
  priceMultiplier?: number;
  currency: Currency;

  brand: {
    primary: string;
    primaryFg: string;
    accent: string;
    logo: string;
    favicon?: string;
  };

  orders: {
    workerUrl: string;
    turnstileSiteKey: string;
  };

  legal?: {
    companyName?: string;
    ein?: string;
  };
}

export function currencyFormatter(currency: Currency, locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
}
