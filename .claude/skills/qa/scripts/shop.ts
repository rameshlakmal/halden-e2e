// The shop under test, for the QA team. Talks to the local test database only (assertTestDatabase).
//
// Lead only (prepares a run; never tell testers which bugs are on):
//   node .claude/skills/qa/scripts/shop.ts reset [--bugs key,key]   reseed the shop, then switch exactly these bugs on
//   node .claude/skills/qa/scripts/shop.ts bugs                     which planted bugs are on now
// Anyone (read-only oracles, the same ones the `auditor` persona gets as tools):
//   node .claude/skills/qa/scripts/shop.ts rules                    every business rule that is broken right now, with rows
//   node .claude/skills/qa/scripts/shop.ts order <id>               one order as the database stores it
//   node .claude/skills/qa/scripts/shop.ts stock <slug>             stock on hand for a product
//   node .claude/skills/qa/scripts/shop.ts latest-order             the newest order's number
import { BUG_KEYS, type BugKey } from '../../../../utils/env.ts';
import { checkRules, closeDb, enabledBugs, latestOrderId, orderRecord, resetShop, ruleNames, setBugs, stockOf } from '../../../../utils/shop-db.ts';
import { args } from './lib/qa.ts';

const a = args();
const [command, value] = a._;

function parseBugs(list: string): BugKey[] {
  const keys = list.split(',').map((k) => k.trim()).filter(Boolean);
  for (const k of keys) if (!BUG_KEYS.includes(k as BugKey)) throw new Error(`Unknown bug "${k}". Known: ${BUG_KEYS.join(', ')}`);
  return keys as BugKey[];
}

try {
  switch (command) {
    case 'reset': {
      await resetShop();
      const bugs = typeof a.bugs === 'string' ? parseBugs(a.bugs) : [];
      await setBugs(bugs);
      console.log(`Shop reseeded. Planted bugs on: ${bugs.length}.`);
      break;
    }
    case 'bugs':
      console.log(JSON.stringify({ enabled: await enabledBugs() }));
      break;
    case 'rules': {
      const broken = await checkRules();
      const total = (await ruleNames()).length;
      console.log(JSON.stringify({ rules: total, broken: broken.map((b) => ({ rule: b.rule, rows: b.rows.slice(0, 5), more: Math.max(0, b.rows.length - 5) })) }, null, 2));
      break;
    }
    case 'order':
      if (!value) throw new Error('Usage: shop.ts order <id>');
      console.log(JSON.stringify((await orderRecord(value)) ?? { error: `There is no order #${value}.` }, null, 2));
      break;
    case 'stock':
      if (!value) throw new Error('Usage: shop.ts stock <slug>');
      console.log(JSON.stringify({ slug: value, stock: await stockOf(value) }));
      break;
    case 'latest-order':
      console.log(JSON.stringify({ id: await latestOrderId() }));
      break;
    default:
      console.error('Usage: shop.ts reset [--bugs k,k] | bugs | rules | order <id> | stock <slug> | latest-order');
      process.exitCode = 2;
  }
} finally {
  await closeDb();
}
