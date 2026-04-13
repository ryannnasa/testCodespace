#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATIC_PORT="${STATIC_PORT:-8000}"
STATIC_PID=""
PROXY_PID=""

port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"${port}" -sTCP:LISTEN -n -P >/dev/null 2>&1
    return $?
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltn | grep -q ":${port} "
    return $?
  fi

  return 1
}

cleanup() {
  if [[ -n "${STATIC_PID}" ]] && kill -0 "${STATIC_PID}" 2>/dev/null; then
    kill "${STATIC_PID}" 2>/dev/null || true
  fi

  if [[ -n "${PROXY_PID}" ]] && kill -0 "${PROXY_PID}" 2>/dev/null; then
    kill "${PROXY_PID}" 2>/dev/null || true
  fi

}

trap cleanup EXIT INT TERM

cd "${ROOT_DIR}"

if port_in_use "${STATIC_PORT}"; then
  printf 'Static server already running on port %s (reusing).\n' "${STATIC_PORT}"
else
  ROOT_DIR="${ROOT_DIR}" STATIC_PORT="${STATIC_PORT}" node "${ROOT_DIR}/scripts/dev-static-server.js" &
  STATIC_PID=$!
fi

if port_in_use 8081; then
  printf 'Decap proxy already running on port 8081 (reusing).\n'
else
  npx --yes decap-server &
  PROXY_PID=$!
fi

printf 'Site local: http://localhost:%s\n' "${STATIC_PORT}"
printf 'Admin local: http://localhost:%s/admin/live.html\n' "${STATIC_PORT}"
printf 'Proxy Decap: http://localhost:8081\n'
printf 'Save API: http://localhost:%s/api/write-files\n' "${STATIC_PORT}"

ADMIN_URL="http://localhost:${STATIC_PORT}/admin/live.html"
if [[ "${CODESPACES:-}" == "true" && -n "${CODESPACE_NAME:-}" && -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]]; then
  ADMIN_URL="https://${CODESPACE_NAME}-${STATIC_PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/admin/live.html"
fi

if [[ -n "${BROWSER:-}" ]]; then
  "${BROWSER}" "${ADMIN_URL}" >/dev/null 2>&1 || true
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${ADMIN_URL}" >/dev/null 2>&1 || true
fi

PIDS=()
if [[ -n "${STATIC_PID}" ]]; then
  PIDS+=("${STATIC_PID}")
fi
if [[ -n "${PROXY_PID}" ]]; then
  PIDS+=("${PROXY_PID}")
fi

if ((${#PIDS[@]} > 0)); then
  wait -n "${PIDS[@]}"
fi
