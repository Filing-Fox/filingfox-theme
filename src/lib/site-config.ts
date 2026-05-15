export type Niche = string;
export type Currency = string;

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

  niches: Niche[];
  itemsPerNiche: number;
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
