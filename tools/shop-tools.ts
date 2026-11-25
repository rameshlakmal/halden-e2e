// Project tools: what an agent may ask the shop's database mid-step.
// Both are read-only, so they take no action slot and never break the replay cache.
import { tool } from 'ai';
import { defineTool } from 'e2e/agent';
import { z } from 'zod';
import { checkRules, orderRecord } from '../utils/shop-db.ts';

export const checkBusinessRules = defineTool(
  tool({
    description:
      'Run the shop\'s business rules against its database and list every rule that is broken, with the rows that break it. ' +
      'Rules cover order totals, discounts, shipping, tax, payments, refunds, stock movements and coupon limits. ' +
      'Call it after placing, cancelling or editing something to see whether the data behind the screen is right.',
    inputSchema: z.object({}),
    execute: async () => {
      const broken = await checkRules();
      return broken.length === 0
        ? { ok: true, broken: [] }
        : { ok: false, broken: broken.map((b) => ({ rule: b.rule, rows: b.rows.slice(0, 5) })) };
    },
  }),
  { mutates: false },
);

export const getOrderRecord = defineTool(
  tool({
    description:
      'Read one order as the database stores it: status, subtotal, discount, shipping, tax, total, the card payment ' +
      '(amount and status) and each line (unit price, quantity, line total). Use it to compare what the screen shows with what was stored.',
    inputSchema: z.object({ orderId: z.string().regex(/^\d+$/).describe('The order number, without the # sign') }),
    execute: async ({ orderId }) => (await orderRecord(orderId)) ?? { error: `There is no order #${orderId}.` },
  }),
  { mutates: false },
);

/** The tools that give an agent eyes in the database. */
export const databaseTools = { check_business_rules: checkBusinessRules, get_order_record: getOrderRecord };
