const TOKEN_KEY = "lumo-hello-token";
const PRO_KEY = "lumo-hello-pro";
const DEMO_TOKEN = "hello-demo-token";
const FREE_NOTE_LIMIT = 3;

const authStatus = document.querySelector("#auth-status");
const signInButton = document.querySelector("#sign-in");
const signOutButton = document.querySelector("#sign-out");
const form = document.querySelector("#create-form");
const nameInput = document.querySelector("#note-name");
const errorEl = document.querySelector("#error");
const list = document.querySelector("#notes");
const emptyEl = document.querySelector("#empty");
const planStatus = document.querySelector("#plan-status");
const noteAllowance = document.querySelector("#note-allowance");
const upgradeButton = document.querySelector("#upgrade");
const proPanel = document.querySelector("#pro-panel");
const proFeature = document.querySelector("#pro-feature");
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
  const count = list.querySelectorAll("li").length;
  planStatus.textContent = pro ? "Pro" : "Free";
  planStatus.dataset.plan = pro ? "pro" : "free";
  proPanel.dataset.state = pro ? "unlocked" : "locked";
  proFeature.dataset.state = pro ? "unlocked" : "locked";
  proFeature.textContent = pro
    ? "Unlimited notes — unlocked"
    : "Unlimited notes — locked";
  if (pro) {
    checkoutReceipt.hidden = false;
    checkoutReceipt.textContent = "Checkout complete · Pro · $12/mo";
    upgradeButton.disabled = true;
    upgradeButton.textContent = "Pro active";
    noteAllowance.textContent = "Unlimited notes are on.";
    return;
  }
  checkoutReceipt.hidden = true;
  checkoutReceipt.textContent = "";
  upgradeButton.disabled = false;
  upgradeButton.textContent = "Upgrade to Pro";
  const left = Math.max(0, FREE_NOTE_LIMIT - count);
  noteAllowance.textContent = `Free includes ${FREE_NOTE_LIMIT} notes. ${left} left.`;
}

function renderNotes(items) {
  list.replaceChildren();
  for (const item of items) {
    const li = document.createElement("li");
    li.dataset.id = item.id;
    li.textContent = item.name;
    list.append(li);
  }
  emptyEl.hidden = items.length !== 0;
  renderBilling();
}

async function refreshList() {
  const response = await fetch("/items");
  if (!response.ok) {
    showError("Could not load notes.");
    return;
  }
  const items = await response.json();
  if (!Array.isArray(items)) {
    showError("Could not load notes.");
    return;
  }
  renderNotes(items);
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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = nameInput.value;
  if (!isSignedIn()) {
    showError("Sign in to create a note.");
    return;
  }

  if (!isPro() && list.querySelectorAll("li").length >= FREE_NOTE_LIMIT) {
    showError("Free plan includes 3 notes. Upgrade to Pro for unlimited notes.");
    return;
  }

  clearError();
  const response = await fetch("/items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${currentToken()}`,
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    let message = "Could not create note.";
    try {
      const body = await response.json();
      if (body && typeof body.error === "string" && body.error.length > 0) {
        message = body.error;
      }
    } catch {
      // Keep the fallback message when the body is not JSON.
    }
    showError(message);
    return;
  }

  nameInput.value = "";
  await refreshList();
});

renderAuth();
refreshList();
