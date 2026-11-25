// Test data for Halden Outfitters: the seeded catalogue the tests rely on, the shop's documented
// price rules as an independent oracle, and the fixed values a checkout needs.
// Seed data lives in the shop repo (db/seed-data.js); every entry here is documented in tests/README.md.

export interface Product {
  slug: string;
  name: string;
  /** Price in cents, as seeded. */
  price: number;
  /** Stock on hand after seeding. */
  stock: number;
}

export const PRODUCTS = {
  tent: { slug: 'ridgeline-2p-tent', name: 'Ridgeline 2P Tent', price: 34900, stock: 14 },
  tarp: { slug: 'trail-tarp', name: 'Trail Tarp', price: 8900, stock: 22 },
  hammock: { slug: 'drift-hammock', name: 'Drift Hammock', price: 6400, stock: 3 },
  pad: { slug: 'loft-sleeping-pad', name: 'Loft Sleeping Pad', price: 14900, stock: 0 },
  pillow: { slug: 'camp-pillow', name: 'Camp Pillow', price: 3200, stock: 40 },
  stove: { slug: 'ember-stove', name: 'Ember Stove', price: 6900, stock: 25 },
  mug: { slug: 'insulated-mug', name: 'Insulated Mug', price: 2800, stock: 4 },
  filter: { slug: 'water-filter', name: 'Squeeze Water Filter', price: 4200, stock: 33 },
  daypack: { slug: 'daypack-22l', name: 'Daypack 22L', price: 11900, stock: 16 },
  dryBag: { slug: 'roll-top-dry-bag', name: 'Roll-top Dry Bag', price: 3400, stock: 50 },
  headlamp: { slug: 'headlamp-400', name: 'Headlamp 400', price: 4500, stock: 27 },
} as const satisfies Record<string, Product>;

export interface Coupon {
  code: string;
  kind: 'percent' | 'fixed';
  /** Percent, or cents for a fixed amount. */
  value: number;
}

export const COUPONS = {
  welcome10: { code: 'WELCOME10', kind: 'percent', value: 10 },
  save20: { code: 'SAVE20', kind: 'fixed', value: 2000 },
  trailhead15: { code: 'TRAILHEAD15', kind: 'percent', value: 15 },
} as const satisfies Record<string, Coupon>;

/** Codes the shop must refuse, with the reason it shows. */
export const REFUSED_COUPONS = [
  { code: 'TRAILHEAD15', why: 'used up', message: 'This code has been used up.' },
  { code: 'SPRING5', why: 'expired', message: 'This code has expired.' },
  { code: 'STAFF50', why: 'switched off', message: 'This code is no longer active.' },
  { code: 'NOPE99', why: 'unknown', message: 'That code is not valid.' },
] as const;

/** The seeded past orders, numbered as the seed script inserts them (order ids start at 1001, db/schema.sql). */
export const SEEDED_ORDERS = {
  /** Maya's delivered order: 1 × Ridgeline 2P Tent, 1 × Ember Stove, with TRAILHEAD15. */
  mayaTentAndStove: '1001',
} as const;

export const CARDS = {
  pays: '4242 4242 4242 4242',
  declined: '4000 0000 0000 0002',
} as const;

export const ADDRESS = {
  name: 'Maya Okafor',
  line1: '14 Larch Street',
  city: 'Portland',
  postcode: '97205',
  country: 'United States',
} as const;

// ---------- the price rules, as the shop's README states them ----------

const SHIPPING = 795;
const FREE_SHIPPING_FROM = 7500;
const TAX_PERCENT = 8;

/** Percent of an amount in cents, rounded half up to the cent. */
const percentOf = (cents: number, percent: number) => Math.round((cents * percent) / 100);

export interface Totals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}

/** What an order must cost. Written from the rules, not from the shop's code, so it can disagree with it. */
export function expectedTotals(lines: readonly { product: Product; qty?: number }[], coupon?: Coupon): Totals {
  const subtotal = lines.reduce((n, l) => n + l.product.price * (l.qty ?? 1), 0);
  const raw = !coupon ? 0 : coupon.kind === 'percent' ? percentOf(subtotal, coupon.value) : coupon.value;
  const discount = Math.min(raw, subtotal);
  const afterDiscount = subtotal - discount;
  const shipping = afterDiscount >= FREE_SHIPPING_FROM ? 0 : SHIPPING;
  const tax = percentOf(afterDiscount, TAX_PERCENT);
  return { subtotal, discount, shipping, tax, total: afterDiscount + shipping + tax };
}

/** Cents as the shop prints them: $1,234.56. */
export function usd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}
