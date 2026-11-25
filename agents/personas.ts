// The agents this suite runs with. `context` is what the shop calls things and reaches every model call,
// judges included; `system` is how one persona works and reaches only its act loop (see e2e's agents guide).
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { wrapLanguageModel, type LanguageModelMiddleware } from 'ai';
import type { E2EConfig } from 'e2e';
import { databaseTools } from '../tools/shop-tools.ts';
import { env } from '../utils/env.ts';

type Agents = NonNullable<E2EConfig['agents']>;
type AgentOptions = Agents[string];

const router = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY ?? '' });

// e2e marks the newest message as an Anthropic cache breakpoint. OpenRouter's adapter copies a tool message's
// marker onto every tool result in it, so a turn with several parallel tool calls (filling a form) sends more
// than the 4 breakpoints Anthropic allows. Keep the marker on the message's last tool result only.
const oneBreakpointPerToolMessage: LanguageModelMiddleware = {
  transformParams: async ({ params }) => ({
    ...params,
    prompt: params.prompt.map((message) => {
      const marker = message.providerOptions?.anthropic?.cacheControl;
      if (message.role !== 'tool' || marker === undefined) return message;
      const { cacheControl: _moved, ...anthropic } = message.providerOptions!.anthropic!;
      const last = message.content.length - 1;
      return {
        ...message,
        providerOptions: { ...message.providerOptions, anthropic },
        content: message.content.map((part, i) =>
          i === last ? { ...part, providerOptions: { ...part.providerOptions, anthropic: { ...part.providerOptions?.anthropic, cacheControl: marker } } } : part),
      };
    }),
  }),
};

const openrouter = (id: string) => wrapLanguageModel({ model: router(id), middleware: oneBreakpointPerToolMessage });

export const SHOP_CONTEXT = [
  'Halden Outfitters is a demo outdoor-gear web shop. Nothing is really for sale and nothing ships.',
  'Header: Shelter, Sleep, Camp kitchen and Packs open the shop by category; the person icon is "Your account"; the cart icon is "Cart".',
  'A product page has a quantity stepper ("One fewer", "One more") and an "Add to cart" button. Product cards have a quick "Add" button.',
  'The cart page lists items with a quantity stepper and "Remove", a "Discount code" field with an "Apply" button, and an "Order summary": Subtotal, Discount, Shipping, Tax (8%), Total, then "Check out".',
  'Checkout asks for a shipping address (Full name, Address, City, Postcode, Country) and a Card number, then a "Pay $…" button.',
  'Test cards: 4242 4242 4242 4242 pays; 4000 0000 0000 0002 is always declined.',
  'Prices: shipping is $7.95, free once the order is $75.00 or more after the discount. Tax is 8% of the discounted subtotal.',
  'Coupons: WELCOME10 is 10% off; SAVE20 is $20 off orders over $150; TRAILHEAD15 is 15% off orders over $100 but allows 3 uses and is used up; SPRING5 expired; STAFF50 is switched off.',
  'After paying, the order page shows the order number, its status (Paid, Shipped, Delivered, Cancelled), the items, an order history, and a Payment panel ending "Charged $… to the card ending 4242" (or "Refunded $…").',
  'A paid order has a "Cancel order" button; confirming refunds it in full and puts the items back in stock.',
  'Product pages show "Only N left" when 5 or fewer are in stock, and "Sold out" at 0.',
  'Staff use /admin: Overview, Orders, Products (inline price and stock editing), Coupons and the QA lab, where planted bugs are switched on and off.',
  'Demo accounts: maya@halden.test, jonas@halden.test and ari@halden.test are shoppers; admin@halden.test is staff. Their past orders are seed data, not bugs.',
].join('\n');

const exploring = { maxSteps: 40, maxModelCalls: 40 } as const;

const skepticSystem =
  'You are a meticulous QA engineer. Distrust every number on screen: recompute subtotals, discounts, shipping, tax and totals ' +
  'from the stated rules, and cross-check each value against every other place it appears (cart, checkout, order page, payment line, ' +
  'order list, product stock, admin). Report any mismatch, however small, with the exact values you saw.';

export const agents = {
  /** Drives agent steps in the test suite: fast and cheap, judged by its own checks. */
  default: {
    model: openrouter(env.model),
    context: SHOP_CONTEXT,
    system: 'You are a careful shopper testing this store. Use the labels on screen and finish each goal before stopping.',
  },

  // ---- explorers for `e2e explore` and the bug bash: one stance each, the same vocabulary ----

  /** Cross-checks every number. Eyes only: it sees what a customer sees. */
  skeptic: { model: openrouter(env.exploreModel), context: SHOP_CONTEXT, system: skepticSystem, ...exploring },

  /** Hunts discount mistakes: stacks, limits, minimums, expiry. */
  'bargain-hunter': {
    model: openrouter(env.exploreModel),
    context: SHOP_CONTEXT,
    system:
      'You are a bargain hunter. Try every coupon above, alone and with different baskets (one product, several products, ' +
      'under and over each minimum). Check the discount amount against the coupon\'s rule each time, and check it again on the order page after paying.',
    ...exploring,
  },

  /** Buys, then changes their mind. */
  'regretful-buyer': {
    model: openrouter(env.exploreModel),
    context: SHOP_CONTEXT,
    system:
      'You buy things and then cancel them. Before buying, note the stock shown on the product page. After paying, compare the order ' +
      'total with the amount charged. After cancelling, check the refund and go back to the product page to see whether the stock came back.',
    ...exploring,
  },

  /** Works the admin and checks nothing leaks into history. */
  'store-admin': {
    model: openrouter(env.exploreModel),
    context: SHOP_CONTEXT,
    system:
      'You are the store manager. Change prices, stock and coupons in the admin, then check that past orders, the order list and ' +
      'the overview still show what customers actually paid. History must never change when today\'s settings do.',
    ...exploring,
  },

  /** The skeptic with eyes in the database: same stance, plus the shop's business rules as a tool. */
  auditor: {
    model: openrouter(env.exploreModel),
    context: SHOP_CONTEXT,
    system:
      skepticSystem +
      ' After every order you place, cancel or change, call check_business_rules and get_order_record and compare the stored data ' +
      'with the screen. A broken rule is a bug even when the screen looks right; report it with the rule name and rows.',
    tools: databaseTools,
    ...exploring,
  },
} satisfies Record<string, AgentOptions>;
