const TOKEN_KEY = "lumo-hello-token";
const PRO_KEY = "lumo-hello-pro";
const DEMO_TOKEN = "hello-demo-token";

const authStatus = document.querySelector("#auth-status");
const signInButton = document.querySelector("#sign-in");
const signOutButton = document.querySelector("#sign-out");
const errorEl = document.querySelector("#error");
const planStatus = document.querySelector("#plan-status");
const upgradeButton = document.querySelector("#upgrade");
const proPanel = document.querySelector("#pro-panel");
const proFeature = document.querySelector("#pro-feature");
const proBadge = document.querySelector("#pro-badge");
const premiumPerks = document.querySelector("#premium-perks");
const checkoutReceipt = document.querySelector("#checkout-receipt");

function currentToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function isSignedIn() {
  return currentToken() === DEMO_TOKEN;
}

function hasProFlag() {
  return localStorage.getItem(PRO_KEY) === "true";
}

// Paid access requires the demo session. A leftover Pro flag stays locked
// until the visitor is signed in.
function isPro() {
  return isSignedIn() && hasProFlag();
}

function showError(message) {
  errorEl.hidden = false;
  errorEl.textContent = message;
}

function clearError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

function renderAuth() {
  const signedIn = isSignedIn();
  authStatus.textContent = signedIn ? "Signed in" : "Signed out";
  signInButton.hidden = signedIn;
  signOutButton.hidden = !signedIn;
  renderBilling();
}

function renderBilling() {
  const pro = isPro();
  planStatus.textContent = pro ? "Pro" : "Free";
  planStatus.dataset.plan = pro ? "pro" : "free";
  proPanel.dataset.state = pro ? "unlocked" : "locked";
  proFeature.dataset.state = pro ? "unlocked" : "locked";
  proFeature.textContent = pro ? "Pro features — unlocked" : "Pro features — locked";
  proBadge.hidden = !pro;
  premiumPerks.hidden = !pro;
  if (pro) {
    checkoutReceipt.hidden = false;
    checkoutReceipt.textContent = "Checkout complete · Pro · $12/mo";
    upgradeButton.disabled = true;
    upgradeButton.textContent = "Pro active";
    return;
  }
  checkoutReceipt.hidden = true;
  checkoutReceipt.textContent = "";
  upgradeButton.disabled = false;
  upgradeButton.textContent = "Upgrade to Pro";
}

signInButton.addEventListener("click", () => {
  localStorage.setItem(TOKEN_KEY, DEMO_TOKEN);
  clearError();
  renderAuth();
});

signOutButton.addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  clearError();
  renderAuth();
});

upgradeButton.addEventListener("click", () => {
  if (!isSignedIn()) {
    showError("Sign in to upgrade to Pro.");
    renderBilling();
    return;
  }

  localStorage.setItem(PRO_KEY, "true");
  clearError();
  renderBilling();
});

renderAuth();
