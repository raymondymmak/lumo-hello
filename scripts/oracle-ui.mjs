/**
 * Held-out UI check for Track B.
 * Drives the real Notes page in headless Chromium. Does not import src/ or test/.
 * Exit 0 only when a signed-out Create shows a visible error and the note list
 * stays unchanged (including when it was already empty).
 */
import { chromium } from "playwright";

const port = process.env.PORT || "3847";
const base = `http://127.0.0.1:${port}`;
const attemptedName = `signed-out-${Date.now()}`;

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function sameNotes(left, right) {
  return left.length === right.length && left.every((name, index) => name === right[index]);
}

async function readApiNotes(page) {
  const response = await page.request.get(`${base}/items`);
  if (!response.ok()) {
    fail(`GET /items returned ${response.status()}`);
  }
  let body;
  try {
    body = await response.json();
  } catch {
    fail("GET /items did not return JSON");
  }
  if (!Array.isArray(body)) {
    fail(`GET /items must return a JSON array, got ${JSON.stringify(body)}`);
  }
  return body.map((item) => (item && typeof item.name === "string" ? item.name : ""));
}

async function readUiNotes(page) {
  const texts = await page.locator("#notes li").allTextContents();
  return texts.map((text) => text.trim());
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

  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  const status = (await page.locator("#auth-status").innerText()).trim();
  if (status !== "Signed out") {
    fail(`expected the page to say "Signed out" before Create, got "${status}"`);
  }

  const apiBefore = await readApiNotes(page);
  const uiBefore = await readUiNotes(page);
  if (!sameNotes(uiBefore, apiBefore)) {
    fail(
      `notes on screen do not match GET /items before Create. ui=${JSON.stringify(uiBefore)} api=${JSON.stringify(apiBefore)}`,
    );
  }

  await page.locator("#note-name").fill(attemptedName);
  await page.locator("#create").click();

  const alert = page.locator("#error");
  try {
    await alert.waitFor({ state: "visible", timeout: 5000 });
  } catch {
    fail("signed-out Create did not show a visible error");
  }

  const message = (await alert.innerText()).trim();
  if (!message) {
    fail("signed-out Create error element is visible but empty");
  }

  const deadline = Date.now() + 1000;
  let uiAfter = await readUiNotes(page);
  while (Date.now() < deadline) {
    if (!sameNotes(uiAfter, uiBefore) || uiAfter.includes(attemptedName)) {
      fail(
        `list changed after signed-out Create. before=${JSON.stringify(uiBefore)} after=${JSON.stringify(uiAfter)}`,
      );
    }
    await page.waitForTimeout(100);
    uiAfter = await readUiNotes(page);
  }

  if (!(await alert.isVisible())) {
    fail("the error disappeared; signed-out Create must leave a visible error");
  }
  if (!sameNotes(uiAfter, uiBefore)) {
    fail(
      `list changed after signed-out Create. before=${JSON.stringify(uiBefore)} after=${JSON.stringify(uiAfter)}`,
    );
  }
  if (uiAfter.includes(attemptedName)) {
    fail(`list contains the rejected name "${attemptedName}"`);
  }

  const apiAfter = await readApiNotes(page);
  if (!sameNotes(apiAfter, apiBefore) || apiAfter.includes(attemptedName)) {
    fail(
      `GET /items changed after signed-out Create. before=${JSON.stringify(apiBefore)} after=${JSON.stringify(apiAfter)}`,
    );
  }

  await page.reload({ waitUntil: "networkidle" });
  const uiReloaded = await readUiNotes(page);
  if (uiReloaded.includes(attemptedName) || !sameNotes(uiReloaded, uiBefore)) {
    fail(
      `after reload the list is not the pre-create list. before=${JSON.stringify(uiBefore)} after=${JSON.stringify(uiReloaded)}`,
    );
  }

  console.log(
    `PASS: ui-signed-out-create showed "${message}" and list stayed unchanged (${uiBefore.length} row(s))`,
  );
} finally {
  await browser.close();
}
