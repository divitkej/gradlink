/**
 * Creates the Stripe Products and Prices for every GradLink plan, in AED,
 * from the amounts in lib/pricing.ts, and prints the Wrangler commands that
 * store their ids.
 *
 *   npm run stripe:setup
 *
 * Reads STRIPE_SECRET_KEY from .dev.vars or the environment. Safe to re-run:
 * each Price has a lookup key, and an existing Price with the same amount is
 * reused. When an amount in lib/pricing.ts changes, a new Price is created and
 * takes over the lookup key; subscribers already on the old Price keep it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Stripe from "stripe";
import { ROOT, loadDevVars } from "./load-env.mjs";

loadDevVars();
const key = process.env.STRIPE_SECRET_KEY;
if (!key || key.startsWith("<")) {
  console.error("\nSTRIPE_SECRET_KEY is not set. Add it to .dev.vars or pass it inline.\n");
  process.exit(1);
}

// Read PRICES_AED from lib/pricing.ts so the page and Stripe can't drift apart.
const source = readFileSync(join(ROOT, "lib", "pricing.ts"), "utf8");
const block = source.match(/PRICES_AED = \{([\s\S]*?)\}/);
if (!block) throw new Error("PRICES_AED not found in lib/pricing.ts");
const aed = Object.fromEntries(
  [...block[1].matchAll(/(\w+):\s*(\d+)/g)].map(([, name, amount]) => [name, Number(amount)]),
);

const PLANS = [
  { env: "STRIPE_PRICE_PRO", product: "pro", lookup: "gradlink_pro_annual", nickname: "Placement Pro, yearly", amount: aed.annualList, years: 1 },
  { env: "STRIPE_PRICE_PRO_FOUNDING", product: "pro", lookup: "gradlink_pro_annual_founding", nickname: "Placement Pro, yearly, founding price", amount: aed.annualFounding, years: 1 },
  { env: "STRIPE_PRICE_PRO_2Y", product: "pro", lookup: "gradlink_pro_two_year", nickname: "Placement Pro, two years", amount: aed.twoYear, years: 2 },
  { env: "STRIPE_PRICE_PRO_3Y", product: "pro", lookup: "gradlink_pro_three_year", nickname: "Placement Pro, three years", amount: aed.threeYear, years: 3 },
  { env: "STRIPE_PRICE_EXTRA_CAMPUS", product: "campus", lookup: "gradlink_extra_campus", nickname: "Extra campus, yearly", amount: aed.extraCampus, years: 1 },
  { env: "STRIPE_PRICE_EVENT_PASS", product: "pass", lookup: "gradlink_event_pass", nickname: "Event Pass", amount: aed.eventPass, years: 0 },
];
for (const p of PLANS) if (!Number.isInteger(p.amount)) throw new Error(`No amount for ${p.lookup} in lib/pricing.ts`);

const PRODUCTS = {
  pro: { name: "GradLink Placement Pro", description: "Unlimited events, the full outcome report and CSV exports." },
  campus: { name: "GradLink extra campus", description: "Placement Pro for one more campus." },
  pass: { name: "GradLink Event Pass", description: "One event with the full outcome report and CSV export." },
};

const stripe = new Stripe(key);

async function product(id) {
  const found = await stripe.products.search({ query: `metadata['gradlink']:'${id}'` });
  if (found.data[0]) return found.data[0].id;
  const created = await stripe.products.create({ ...PRODUCTS[id], metadata: { gradlink: id } });
  return created.id;
}

const productIds = {};
for (const id of Object.keys(PRODUCTS)) productIds[id] = await product(id);

const out = [];
for (const p of PLANS) {
  const unit = p.amount * 100; // AED has two decimal places: amounts are in fils.
  const existing = (await stripe.prices.list({ lookup_keys: [p.lookup], active: true, limit: 1 })).data[0];
  const same = existing && existing.unit_amount === unit && existing.currency === "aed" &&
    (p.years ? existing.recurring?.interval === "year" && existing.recurring.interval_count === p.years : !existing.recurring);
  const price = same ? existing : await stripe.prices.create({
    product: productIds[p.product],
    currency: "aed",
    unit_amount: unit,
    nickname: p.nickname,
    lookup_key: p.lookup,
    transfer_lookup_key: Boolean(existing),
    ...(p.years ? { recurring: { interval: "year", interval_count: p.years } } : {}),
  });
  console.log(`${same ? "kept   " : "created"} ${p.nickname.padEnd(40)} AED ${p.amount.toLocaleString("en-US").padStart(6)}  ${price.id}`);
  out.push(`printf '%s' '${price.id}' | npx wrangler secret put ${p.env}`);
}

console.log("\nStore the ids in the Worker (and the same NAME=id lines in .dev.vars for local use):\n");
console.log(out.join("\n"));
