const TOKEN_KEY = "lumo-hello-token";
const DEMO_TOKEN = "hello-demo-token";

const authStatus = document.querySelector("#auth-status");
const signInButton = document.querySelector("#sign-in");
const signOutButton = document.querySelector("#sign-out");
const form = document.querySelector("#create-form");
const nameInput = document.querySelector("#note-name");
const errorEl = document.querySelector("#error");
const list = document.querySelector("#notes");
const emptyEl = document.querySelector("#empty");

function currentToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function isSignedIn() {
  return currentToken() === DEMO_TOKEN;
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
}

function appendOptimisticNote(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const li = document.createElement("li");
  li.textContent = trimmed;
  list.append(li);
  emptyEl.hidden = true;
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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = nameInput.value;
  if (!isSignedIn()) {
    // DEMO — Track A circular oracle. DO NOT MERGE.
    // The error is decoration. The row is painted before any request, so the
    // list looks updated while POST /items is never sent. Vitest does not
    // click Create, so `npm test` stays green. Track B's ui-signed-out-create
    // oracle is what catches the extra <li>.
    showError("Sign in to create a note.");
    appendOptimisticNote(name);
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
