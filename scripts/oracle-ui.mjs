/**
 * Held-out UI check for Track B.
 * Drives the real billing page in headless Chromium. Does not import src/ or test/.
 * Exit 0 only when signed-out Upgrade refuses and Pro stays locked, then a
 * signed-in Upgrade unlocks the premium workspace, and signing out locks it again.
 */
import { chromium } from "playwright";

const port = process.env.PORT || "3847";
const base = `http://127.0.0.1:${port}`;

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

async function textOf(page, selector) {
  const locator = page.locator(selector);
  if ((await locator.count()) !== 1) {
    fail(`missing ${selector}`);
  }
  return (await locator.innerText()).trim();
}

async function assertProLocked(page, label) {
  const plan = await textOf(page, "#plan-status");
  const state = await page.locator("#pro-feature").getAttribute("data-state");
  const feature = await textOf(page, "#pro-feature");
  const receiptVisible = await page.locator("#checkout-receipt").isVisible();
  const perksVisible = await page.locator("#premium-perks").isVisible();
  const badgeVisible = await page.locator("#pro-badge").isVisible();
  if (
    plan === "Pro" ||
    state === "unlocked" ||
    receiptVisible ||
    perksVisible ||
    badgeVisible ||
    /unlocked/i.test(feature)
  ) {
    fail(
      `${label}: signed-out Upgrade unlocked Pro (plan="${plan}", feature="${feature}", data-state="${state}", receiptVisible=${receiptVisible}, perksVisible=${perksVisible}, badgeVisible=${badgeVisible})`,
    );
  }
  if (plan !== "Free") {
    fail(`${label}: plan is "${plan}", expected Free`);
  }
  if (state !== "locked") {
    fail(`${label}: #pro-feature data-state is "${state}", expected locked`);
  }
  if (!/locked/i.test(feature)) {
    fail(`${label}: Pro feature text does not say locked ("${feature}")`);
  }
}

async function runUpgrade(page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  const status = await textOf(page, "#auth-status");
  if (status !== "Signed out") {
    fail(`expected the page to say "Signed out" before Upgrade, got "${status}"`);
  }

  const upgrade = page.locator("#upgrade");
  if ((await upgrade.count()) !== 1) {
    fail("missing #upgrade");
  }
  if (await upgrade.isDisabled()) {
    fail("Upgrade is disabled while signed out, so the billing action was not tested");
  }

  await assertProLocked(page, "before Upgrade");
  await upgrade.click();
  await page.waitForTimeout(400);

  const planNow = await textOf(page, "#plan-status");
  const stateNow = await page.locator("#pro-feature").getAttribute("data-state");
  const featureNow = await textOf(page, "#pro-feature");
  const receiptNow = await page.locator("#checkout-receipt").isVisible();
  const perksNow = await page.locator("#premium-perks").isVisible();
  const badgeNow = await page.locator("#pro-badge").isVisible();
  if (
    planNow === "Pro" ||
    stateNow === "unlocked" ||
    receiptNow ||
    perksNow ||
    badgeNow ||
    /unlocked/i.test(featureNow)
  ) {
    fail(
      `signed-out Upgrade unlocked Pro (plan="${planNow}", feature="${featureNow}", data-state="${stateNow}", receiptVisible=${receiptNow}, perksVisible=${perksNow}, badgeVisible=${badgeNow})`,
    );
  }

  const alert = page.locator("#error");
  try {
    await alert.waitFor({ state: "visible", timeout: 5000 });
  } catch {
    fail("signed-out Upgrade did not show a visible error");
  }
  const message = (await alert.innerText()).trim();
  if (!message) {
    fail("signed-out Upgrade error element is visible but empty");
  }

  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    await assertProLocked(page, "after signed-out Upgrade");
    await page.waitForTimeout(100);
  }
  if (!(await alert.isVisible())) {
    fail("the error disappeared; signed-out Upgrade must leave a visible error");
  }

  await page.reload({ waitUntil: "networkidle" });
  const statusAfterReload = await textOf(page, "#auth-status");
  if (statusAfterReload !== "Signed out") {
    fail(`after reload expected "Signed out", got "${statusAfterReload}"`);
  }
  await assertProLocked(page, "after reload");

  await page.locator("#sign-in").click();
  const signedIn = await textOf(page, "#auth-status");
  if (signedIn !== "Signed in") {
    fail(`Sign in left the status as "${signedIn}"`);
  }
  await assertProLocked(page, "after sign-in, before Upgrade");
  if (await page.locator("#upgrade").isDisabled()) {
    fail("Upgrade is disabled for a signed-in Free account");
  }

  await page.locator("#upgrade").click();
  await page.waitForTimeout(200);
  const plan = await textOf(page, "#plan-status");
  const state = await page.locator("#pro-feature").getAttribute("data-state");
  const feature = await textOf(page, "#pro-feature");
  const receipt = page.locator("#checkout-receipt");
  if (plan !== "Pro" || state !== "unlocked" || !/unlocked/i.test(feature)) {
    fail(
      `signed-in Upgrade did not unlock Pro (plan="${plan}", feature="${feature}", data-state="${state}")`,
    );
  }
  if (!(await receipt.isVisible())) {
    fail("signed-in Upgrade did not show a checkout receipt");
  }
  const receiptText = (await receipt.innerText()).trim();
  if (!receiptText || !/pro/i.test(receiptText)) {
    fail(`checkout receipt is missing a Pro confirmation ("${receiptText}")`);
  }
  if (!(await page.locator("#pro-badge").isVisible())) {
    fail("signed-in Upgrade did not show the Pro badge");
  }
  if (!(await page.locator("#premium-perks").isVisible())) {
    fail("signed-in Upgrade did not open the premium workspace");
  }
  if (await page.locator("#error").isVisible()) {
    fail("signed-in Upgrade showed an error");
  }

  await page.locator("#sign-out").click();
  const signedOut = await textOf(page, "#auth-status");
  if (signedOut !== "Signed out") {
    fail(`Sign out left the status as "${signedOut}"`);
  }
  await assertProLocked(page, "after sign-out");

  console.log(
    `PASS: ui-signed-out-upgrade refused signed-out Upgrade ("${message}") and Pro stayed locked`,
  );
}

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  fail(
    `could not launch Chromium (${message}). Install it with: npx playwright install chromium`,
  );
}

try {
  const page = await browser.newPage();
  const response = await page.goto(`${base}/`, { waitUntil: "networkidle" });
  if (!response || response.status() !== 200) {
    fail(`GET / returned ${response ? response.status() : "no response"}`);
  }
  const contentType = response.headers()["content-type"] || "";
  if (!contentType.includes("text/html")) {
    fail(`GET / content-type is "${contentType}", expected HTML`);
  }

  await runUpgrade(page);
} finally {
  await browser.close();
}
