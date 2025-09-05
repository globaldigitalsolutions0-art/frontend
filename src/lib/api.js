// src/api.js
export const API_BASE =
  (import.meta.env.VITE_API_BASE || "http://localhost:3001").replace(/\/$/, "");

export function api(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

export async function getJSON(path, init) {
  const res = await fetch(api(path), init);
  // If we accidentally hit the Vite dev server (HTML), bail with a clear error
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(
      `Expected JSON from ${api(path)}, got: ${ct || "unknown"}\n` + text.slice(0, 200)
    );
  }
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
