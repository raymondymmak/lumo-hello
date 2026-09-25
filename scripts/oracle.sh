#!/usr/bin/env bash
# Held-out Track B oracle for lumo-hello.
# Talks to a real HTTP server with curl. Does not import the app or its tests.
# Exit 0 only when the MACHINE statements in lumo/criteria.json hold.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3847}"
BASE="http://127.0.0.1:${PORT}"
TOKEN="hello-demo-token"
STATE_DIR="${TMPDIR:-/tmp}/lumo-hello-${PORT}"
STARTED_BY_US=0
CMD=""

mkdir -p "$STATE_DIR"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

pass() {
  echo "PASS: $*"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"
}

server_is_up() {
  local code
  code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 1 "${BASE}/health" 2>/dev/null || true)"
  [[ "$code" == "200" ]]
}

ensure_server() {
  if server_is_up; then
    return 0
  fi
  echo "Starting lumo-hello on ${BASE}..."
  PORT="$PORT" nohup node "${ROOT}/src/server.js" >"${STATE_DIR}/server.log" 2>&1 &
  echo $! >"${STATE_DIR}/server.pid"
  STARTED_BY_US=1
  local _i
  for _i in $(seq 1 50); do
    if server_is_up; then
      return 0
    fi
    sleep 0.1
  done
  echo "Server log:" >&2
  cat "${STATE_DIR}/server.log" >&2 || true
  fail "server did not become healthy at ${BASE}/health"
}

stop_if_we_started() {
  if [[ "$STARTED_BY_US" != "1" ]]; then
    return 0
  fi
  if [[ -f "${STATE_DIR}/server.pid" ]]; then
    local pid
    pid="$(cat "${STATE_DIR}/server.pid")"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
    rm -f "${STATE_DIR}/server.pid"
  fi
  STARTED_BY_US=0
}

# Usage: http_json METHOD URL OUTFILE [curl args...]
# Sets global HTTP_CODE. Response body is written to OUTFILE.
http_json() {
  local method="$1"
  local url="$2"
  local outfile="$3"
  shift 3
  HTTP_CODE="$(curl -sS -o "$outfile" -w "%{http_code}" --max-time 5 -X "$method" "$url" "$@")"
}

assert_created_demo() {
  local body="$1"
  jq -e '
    (.id | type) == "string" and
    (.id | length) > 0 and
    (.name | type) == "string" and
    .name == "demo"
  ' "$body" >/dev/null || fail "create response must be JSON with string id and name \"demo\"; got: $(cat "$body")"
}

unauth_create() {
  ensure_server
  local body
  body="$(mktemp)"
  http_json POST "${BASE}/items" "$body" \
    -H "Content-Type: application/json" \
    -d '{"name":"unauth"}'
  if [[ "$HTTP_CODE" =~ ^2 ]]; then
    fail "unauth-create returned ${HTTP_CODE}, which is 2xx; expected 401. body=$(cat "$body")"
  fi
  if [[ "$HTTP_CODE" != "401" ]]; then
    fail "unauth-create expected 401, got ${HTTP_CODE}. body=$(cat "$body")"
  fi
  pass "unauth-create returned 401"
}

auth_create() {
  ensure_server
  local body
  body="$(mktemp)"
  http_json POST "${BASE}/items" "$body" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{"name":"demo"}'
  if [[ "$HTTP_CODE" != "201" ]]; then
    fail "auth-create expected 201, got ${HTTP_CODE}. body=$(cat "$body")"
  fi
  assert_created_demo "$body"
  local id
  id="$(jq -er '.id' "$body")"
  pass "auth-create returned 201 id=${id} name=demo"
}

get_item() {
  ensure_server
  local created
  created="$(mktemp)"
  http_json POST "${BASE}/items" "$created" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{"name":"demo"}'
  if [[ "$HTTP_CODE" != "201" ]]; then
    fail "get-item could not create an item (expected 201, got ${HTTP_CODE}). body=$(cat "$created")"
  fi
  assert_created_demo "$created"
  local id id_uri fetched got_name got_id
  id="$(jq -er '.id' "$created")"
  id_uri="$(jq -nr --arg id "$id" '$id | @uri')"
  fetched="$(mktemp)"
  http_json GET "${BASE}/items/${id_uri}" "$fetched"
  if [[ "$HTTP_CODE" != "200" ]]; then
    fail "get-item expected 200 for id ${id}, got ${HTTP_CODE}. body=$(cat "$fetched")"
  fi
  got_name="$(jq -er '.name' "$fetched" 2>/dev/null || true)"
  got_id="$(jq -er '.id' "$fetched" 2>/dev/null || true)"
  if [[ "$got_name" != "demo" ]]; then
    fail "get-item name is '${got_name}', expected demo (the name just created). body=$(cat "$fetched")"
  fi
  if [[ "$got_id" != "$id" ]]; then
    fail "get-item id is '${got_id}', expected the created id '${id}'"
  fi
  pass "get-item returned 200 id=${id} name=demo"
}

usage() {
  echo "Usage: scripts/oracle.sh {unauth-create|auth-create|get-item|all}" >&2
  exit 2
}

main() {
  require_cmd curl
  require_cmd jq
  require_cmd node
  CMD="${1:-}"
  case "$CMD" in
    unauth-create) unauth_create ;;
    auth-create) auth_create ;;
    get-item) get_item ;;
    all)
      unauth_create
      auth_create
      get_item
      ;;
    *) usage ;;
  esac
}

trap '[[ "$CMD" == "all" ]] && stop_if_we_started' EXIT

main "$@"
