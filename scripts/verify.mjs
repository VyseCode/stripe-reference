import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3221";
const JAR = "/tmp/opencode/stripe-verify-jar.txt";
writeFileSync(JAR, "");

let passed = 0;
let failed = 0;
const failures = [];

function assert(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function request(method, path, body, options = {}) {
  const args = ["-sS"];
  if (!options.noAuth) args.push("-b", JAR, "-c", JAR);
  for (const [key, value] of Object.entries(options.headers ?? {})) {
    args.push("-H", `${key}: ${value}`);
  }
  if (body !== undefined) {
    args.push("-H", "Content-Type: application/json", "--data", JSON.stringify(body));
  }
  args.push("-X", method, "-w", "\n%{http_code}", `${BASE}${path}`);
  const output = execFileSync("curl", args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  const split = output.lastIndexOf("\n");
  const status = Number(output.slice(split + 1).trim());
  const text = output.slice(0, split);
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status, text, json };
}

function statusIs(name, result, expected) {
  assert(name, result.status === expected, `expected ${expected}, got ${result.status}`);
}

function main() {
  console.log(`Verification target: ${BASE}\n`);

  const login = request("POST", "/api/auth/login", {
    email: "owner@ledgerline.dev",
    password: "password123",
  });
  statusIs("auth: login", login, 200);

  const me = request("GET", "/api/auth/me");
  statusIs("auth: me", me, 200);
  assert("auth: session user is owner", me.json?.user?.email === "owner@ledgerline.dev");

  const anon = request("GET", "/api/auth/me", undefined, { noAuth: true });
  assert("auth: anonymous me has null user", anon.json?.user === null);

  const anonPage = request("GET", "/customers", undefined, { noAuth: true });
  assert("page: anonymous /customers redirects", anonPage.status === 307 || anonPage.status === 308);

  console.log("\n— Slice 1: CRUD —");

  const customers = request("GET", "/api/customers");
  statusIs("customers: list", customers, 200);
  assert("customers: seeded 8", customers.json?.total === 8, `total=${customers.json?.total}`);
  assert("customers: no password serialized", !customers.text.includes("password"));

  const page2 = request("GET", "/api/customers?limit=2&page=2&sort=name");
  statusIs("customers: paginated list", page2, 200);
  assert("customers: limit=2 returns 2", page2.json?.customers?.length === 2);
  assert("customers: page metadata", page2.json?.page === 2 && page2.json?.limit === 2);

  const search = request("GET", "/api/customers?search=harbor");
  assert("customers: search finds Harbor & Finch", search.json?.total === 1, `total=${search.json?.total}`);

  const emptySearch = request("GET", "/api/customers?search=zzzznotfound");
  assert("customers: empty search returns 0", emptySearch.json?.total === 0);

  const detail = request("GET", "/api/customers/cust_001");
  statusIs("customers: detail by pid", detail, 200);
  assert("customers: detail name", detail.json?.customer?.name === "Harbor & Finch");

  statusIs("customers: detail 404", request("GET", "/api/customers/not-a-real-id"), 404);

  statusIs("customers: create", request("POST", "/api/customers", {
    name: "Juniper Supply", email: "billing@junipersupply.com", currency: "usd",
  }), 201);
  statusIs("customers: duplicate email 409", request("POST", "/api/customers", {
    name: "Juniper Supply Two", email: "billing@junipersupply.com",
  }), 409);
  statusIs("customers: invalid email 400", request("POST", "/api/customers", {
    name: "Bad Email", email: "not-an-email",
  }), 400);
  statusIs("customers: anonymous create 401", request("POST", "/api/customers", {
    name: "Anonymous", email: "anon@example.com",
  }, { noAuth: true }), 401);

  const created = request("GET", "/api/customers?search=juniper");
  const createdId = created.json?.customers?.[0]?.id ?? "";
  statusIs("customers: patch", request("PATCH", `/api/customers/${createdId}`, {
    description: "Wholesale nursery supplier",
  }), 200);
  statusIs("customers: delete", request("DELETE", `/api/customers/${createdId}`), 200);
  statusIs("customers: get after delete 404", request("GET", `/api/customers/${createdId}`), 404);
  const withSub = request("DELETE", "/api/customers/cust_001");
  statusIs("customers: delete blocked by active subscription 409", withSub, 409);
  const badPatch = request("PATCH", "/api/customers/cust_001", { unexpected: true });
  statusIs("customers: strict patch 400", badPatch, 400);

  const methods = request("GET", "/api/payment-methods");
  statusIs("payment methods: list", methods, 200);
  assert("payment methods: seeded 10", methods.json?.total === 10, `total=${methods.json?.total}`);
  const customerMethods = request("GET", "/api/payment-methods?customer=cust_001");
  assert("payment methods: filter by customer", customerMethods.json?.total === 2, `total=${customerMethods.json?.total}`);
  const nestedMethods = request("GET", "/api/customers/cust_001/payment-methods");
  statusIs("payment methods: nested list", nestedMethods, 200);
  assert("payment methods: nested has 2", nestedMethods.json?.paymentMethods?.length === 2);
  statusIs("payment methods: create", request("POST", "/api/payment-methods", {
    customer: "cust_007", brand: "visa", last4: "8181", expMonth: 4, expYear: 2030,
  }), 201);
  statusIs("payment methods: bad last4 400", request("POST", "/api/payment-methods", {
    customer: "cust_007", brand: "visa", last4: "81", expMonth: 4, expYear: 2030,
  }), 400);
  statusIs("payment methods: missing customer 404", request("POST", "/api/payment-methods", {
    customer: "cust_missing", brand: "visa", last4: "8181", expMonth: 4, expYear: 2030,
  }), 404);
  const newMethod = request("GET", "/api/payment-methods?customer=cust_007");
  const methodId = newMethod.json?.paymentMethods?.find((m) => m.last4 === "8181")?.id ?? "";
  statusIs("payment methods: set default", request("PATCH", `/api/payment-methods/${methodId}`, { isDefault: true }), 200);
  statusIs("payment methods: delete", request("DELETE", `/api/payment-methods/${methodId}`), 200);
  statusIs("payment methods: delete 404", request("DELETE", `/api/payment-methods/${methodId}`), 404);

  const products = request("GET", "/api/products");
  statusIs("products: list", products, 200);
  assert("products: seeded 4", products.json?.total === 4);
  statusIs("products: create", request("POST", "/api/products", {
    name: "Trailhead Reports", description: "Scheduled PDF exports",
  }), 201);
  const productSearch = request("GET", "/api/products?search=trailhead");
  const productId = productSearch.json?.products?.[0]?.id ?? "";
  statusIs("products: patch", request("PATCH", `/api/products/${productId}`, { description: "Weekly exports" }), 200);
  statusIs("products: archive", request("DELETE", `/api/products/${productId}`), 200);
  statusIs("products: get 404", request("GET", "/api/products/bogus-id"), 404);

  const prices = request("GET", "/api/prices");
  statusIs("prices: list", prices, 200);
  assert("prices: seeded 7", prices.json?.total === 7);
  const filteredPrices = request("GET", "/api/prices?search=prod_001");
  assert("prices: filter by product", filteredPrices.json?.total === 2, `total=${filteredPrices.json?.total}`);
  statusIs("prices: create", request("POST", "/api/prices", {
    product: "prod_001", unitAmountMinor: 7900, currency: "usd", interval: "month",
  }), 201);
  const priceSearch = request("GET", "/api/prices?search=prod_001");
  const priceId = priceSearch.json?.prices?.find((p) => p.unitAmountMinor === 7900)?.id ?? "";
  statusIs("prices: patch archive", request("PATCH", `/api/prices/${priceId}`, { active: false }), 200);
  statusIs("prices: negative amount 400", request("POST", "/api/prices", {
    product: "prod_001", unitAmountMinor: -1, interval: "month",
  }), 400);

  const keys = request("GET", "/api/api-keys");
  statusIs("api keys: list", keys, 200);
  assert("api keys: seeded 3", keys.json?.apiKeys?.length === 3);
  assert("api keys: masked only", keys.json?.apiKeys?.every((k) => k.masked.includes("••••") && !("hash" in k)));

  const adminKey = "ll_admin_a1b2c3d4e5f60718293a4b5c6d7e8f90";
  const writeKey = "ll_write_b2c3d4e5f60718293a4b5c6d7e8f90a1";
  const readKey = "ll_read_c3d4e5f60718293a4b5c6d7e8f90a1b2";
  const adminBearer = { Authorization: `Bearer ${adminKey}` };
  const writeBearer = { Authorization: `Bearer ${writeKey}` };
  const readBearer = { Authorization: `Bearer ${readKey}` };

  statusIs("admin: no key 401", request("GET", "/api/admin/metrics", undefined, { noAuth: true }), 401);
  statusIs("admin: invalid key 401", request("GET", "/api/admin/metrics", undefined, { noAuth: true, headers: { Authorization: "Bearer ll_nope" } }), 401);
  statusIs("admin: read key 403", request("GET", "/api/admin/metrics", undefined, { noAuth: true, headers: readBearer }), 403);
  statusIs("admin: write key 403", request("GET", "/api/admin/metrics", undefined, { noAuth: true, headers: writeBearer }), 403);
  statusIs("admin: admin key 200", request("GET", "/api/admin/metrics", undefined, { noAuth: true, headers: adminBearer }), 200);

  const newKey = request("POST", "/api/api-keys", { name: "CI reporting", scope: "read" });
  statusIs("api keys: create 201", newKey, 201);
  assert("api keys: token returned once", typeof newKey.json?.token === "string" && newKey.json.token.startsWith("ll_read_"));
  statusIs("api keys: revoke 200", request("DELETE", `/api/api-keys/${newKey.json.apiKey.id}`), 200);
  statusIs("api keys: double revoke 409", request("DELETE", `/api/api-keys/${newKey.json.apiKey.id}`), 409);

  console.log("\n— Slice 3: subscriptions and checkout —");

  const subs = request("GET", "/api/subscriptions");
  statusIs("subscriptions: list", subs, 200);
  assert("subscriptions: seeded 6", subs.json?.total === 6, `total=${subs.json?.total}`);
  const activeSubs = request("GET", "/api/subscriptions?status=active");
  assert("subscriptions: active filter", activeSubs.json?.total === 3, `total=${activeSubs.json?.total}`);
  const pastDueSubs = request("GET", "/api/subscriptions?status=past_due");
  assert("subscriptions: past_due filter", pastDueSubs.json?.total === 1);
  const trialingSubs = request("GET", "/api/subscriptions?status=trialing");
  assert("subscriptions: trialing filter", trialingSubs.json?.total === 1);
  const canceledSubs = request("GET", "/api/subscriptions?status=canceled");
  assert("subscriptions: canceled filter", canceledSubs.json?.total === 1);
  statusIs("subscriptions: detail by pid", request("GET", "/api/subscriptions/sub_001"), 200);
  statusIs("subscriptions: detail 404", request("GET", "/api/subscriptions/nope"), 404);

  statusIs("subscriptions: one-time price rejected 400", request("POST", "/api/subscriptions", {
    customer: "cust_007", price: "price_003",
  }), 400);
  statusIs("subscriptions: duplicate active rejected 409", request("POST", "/api/subscriptions", {
    customer: "cust_001", price: "price_001",
  }), 409);
  statusIs("subscriptions: missing customer 404", request("POST", "/api/subscriptions", {
    customer: "cust_none", price: "price_001",
  }), 404);
  statusIs("subscriptions: anonymous create 401", request("POST", "/api/subscriptions", {
    customer: "cust_007", price: "price_001",
  }, { noAuth: true }), 401);

  const cancelSub = request("POST", "/api/subscriptions", {
    customer: "cust_007", price: "price_001",
  });
  statusIs("subscriptions: create for cancellation", cancelSub, 201);
  const cancelId = cancelSub.json?.subscription?.id ?? "";
  const atPeriodEnd = request("POST", `/api/subscriptions/${cancelId}/cancel`, { atPeriodEnd: true });
  statusIs("subscriptions: cancel at period end", atPeriodEnd, 200);
  assert("subscriptions: stays active until period end", atPeriodEnd.json?.subscription?.status === "active" && atPeriodEnd.json?.subscription?.cancelAtPeriodEnd === true);
  const cycled = request("POST", `/api/subscriptions/${cancelId}/cycle`, {});
  statusIs("subscriptions: cycle after cancel", cycled, 200);
  assert("subscriptions: canceled after period end", cycled.json?.subscription?.status === "canceled" && cycled.json?.invoice === null);
  statusIs("subscriptions: cycle on canceled 409", request("POST", `/api/subscriptions/${cancelId}/cycle`, {}), 409);

  const paySub = request("POST", "/api/subscriptions", {
    customer: "cust_008", price: "price_001",
  });
  statusIs("subscriptions: create for failed payment", paySub, 201);
  const payId = paySub.json?.subscription?.id ?? "";
  const cycle = request("POST", `/api/subscriptions/${payId}/cycle`, {});
  statusIs("subscriptions: cycle generates invoice", cycle, 200);
  assert("subscriptions: cycle invoice is open", cycle.json?.invoice?.status === "open");
  statusIs("subscriptions: second cycle advances period", request("POST", `/api/subscriptions/${payId}/cycle`, {}), 200);
  const failedPay = request("POST", `/api/subscriptions/${payId}/payment`, { outcome: "failure" });
  statusIs("subscriptions: failed payment", failedPay, 200);
  assert("subscriptions: failed payment sets past_due", failedPay.json?.subscription?.status === "past_due");
  assert("subscriptions: failed payment has decline code", failedPay.json?.charge?.failureCode === "card_declined");
  statusIs("subscriptions: cycle blocked while past_due 409", request("POST", `/api/subscriptions/${payId}/cycle`, {}), 409);
  const retry = request("POST", `/api/subscriptions/${payId}/payment`, { outcome: "success" });
  statusIs("subscriptions: retry payment", retry, 200);
  assert("subscriptions: retry restores active", retry.json?.subscription?.status === "active");
  assert("subscriptions: retry marks invoice paid", retry.json?.invoice?.status === "paid");

  const checkouts = request("GET", "/api/checkout/sessions");
  statusIs("checkout: list", checkouts, 200);
  assert("checkout: seeded 6", checkouts.json?.total === 6);
  const openCheckouts = request("GET", "/api/checkout/sessions?status=open");
  assert("checkout: open filter", openCheckouts.json?.total === 2, `total=${openCheckouts.json?.total}`);
  statusIs("checkout: detail", request("GET", "/api/checkout/sessions/cs_001"), 200);
  statusIs("checkout: detail 404", request("GET", "/api/checkout/sessions/nope"), 404);

  const newCheckout = request("POST", "/api/checkout/sessions", {
    customer: "cust_007", price: "price_003", outcome: "success",
  });
  statusIs("checkout: create", newCheckout, 201);
  const checkoutId = newCheckout.json?.checkoutSession?.id ?? "";
  const completed = request("POST", `/api/checkout/sessions/${checkoutId}/complete`, { outcome: "success" });
  statusIs("checkout: complete success", completed, 200);
  assert("checkout: session complete", completed.json?.checkoutSession?.status === "complete");
  assert("checkout: invoice paid", completed.json?.invoice?.status === "paid");
  assert("checkout: charge ref present", typeof completed.json?.charge?.chargeRef === "string");
  statusIs("checkout: double complete 409", request("POST", `/api/checkout/sessions/${checkoutId}/complete`, {}), 409);

  const failCheckout = request("POST", "/api/checkout/sessions", {
    customer: "cust_007", price: "price_003", outcome: "failure",
  });
  const failId = failCheckout.json?.checkoutSession?.id ?? "";
  const failedCheckout = request("POST", `/api/checkout/sessions/${failId}/complete`, {});
  statusIs("checkout: complete failure", failedCheckout, 200);
  assert("checkout: failed session has no invoice", failedCheckout.json?.invoice === null);
  assert("checkout: failed session status", failedCheckout.json?.checkoutSession?.status === "failed");

  const subCheckout = request("POST", "/api/checkout/sessions", {
    customer: "cust_008", price: "price_004",
  });
  const subCheckoutId = subCheckout.json?.checkoutSession?.id ?? "";
  const subCompleted = request("POST", `/api/checkout/sessions/${subCheckoutId}/complete`, {});
  assert("checkout: subscription mode creates subscription", Boolean(subCompleted.json?.subscription?.id));

  console.log("\n— Pages —");
  for (const path of [
    "/dashboard", "/customers", "/customers/cust_001", "/products", "/prices", "/api-keys",
    "/subscriptions", "/subscriptions/sub_001", "/checkout", "/checkout/cs_001",
  ]) {
    statusIs(`page: ${path}`, request("GET", path), 200);
  }
  for (const path of ["/login", "/register"]) {
    statusIs(`page: ${path} (anonymous)`, request("GET", path, undefined, { noAuth: true }), 200);
  }
  statusIs("page: unknown customer 404", request("GET", "/customers/no-such-customer"), 404);
  statusIs("page: unknown subscription 404", request("GET", "/subscriptions/no-such-sub"), 404);
  statusIs("page: unknown checkout 404", request("GET", "/checkout/no-such-session"), 404);
  statusIs("page: unknown route 404", request("GET", "/definitely-not-a-page"), 404);

  console.log(`\nVERIFICATION: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log("Failures:");
    for (const failure of failures) console.log(`  - ${failure}`);
  }
  process.exit(failed === 0 ? 0 : 1);
}

main();
