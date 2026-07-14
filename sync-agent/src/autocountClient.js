import { MOCK_STOCK_ITEMS } from "./mockStock.js";

/**
 * Normalize a raw API row using configured field names.
 * @param {Record<string, unknown>} row
 * @param {{ code: string, desc: string, price: string, uom: string }} fields
 */
function mapRow(row, fields) {
  const itemCode = String(row[fields.code] ?? row.itemCode ?? row.ItemCode ?? "").trim();
  const itemDesc = String(row[fields.desc] ?? row.itemDesc ?? row.Description ?? "").trim();
  let price = row[fields.price] ?? row.price ?? row.Price ?? 0;
  if (typeof price === "string") {
    price = parseFloat(price.replace(/[^\d.-]/g, "")) || 0;
  }
  if (typeof price !== "number" || Number.isNaN(price)) price = 0;
  const uom = String(row[fields.uom] ?? row.uom ?? row.UOM ?? "PCS").trim() || "PCS";

  if (!itemCode && !itemDesc) return null;
  return {
    itemCode: itemCode || itemDesc.slice(0, 32),
    itemDesc: itemDesc || itemCode,
    price,
    uom,
  };
}

/**
 * Extract array of items from common response envelopes.
 * @param {unknown} body
 * @returns {unknown[]}
 */
function extractList(body) {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return [];
  const o = /** @type {Record<string, unknown>} */ (body);
  for (const key of ["data", "items", "Items", "result", "Result", "records", "value"]) {
    if (Array.isArray(o[key])) return /** @type {unknown[]} */ (o[key]);
  }
  // Nested data.items
  if (o.data && typeof o.data === "object") {
    const d = /** @type {Record<string, unknown>} */ (o.data);
    for (const key of ["items", "Items", "records", "value"]) {
      if (Array.isArray(d[key])) return /** @type {unknown[]} */ (d[key]);
    }
  }
  return [];
}

/**
 * Fetch and normalize stock items from AutoCount Integrator / local API.
 * Uses AUTOCOUNT_MOCK=1 for sample data.
 *
 * @returns {Promise<Array<{ itemCode: string, itemDesc: string, price: number, uom: string }>>}
 */
export async function fetchStockItems() {
  if (process.env.AUTOCOUNT_MOCK === "1" || process.env.AUTOCOUNT_MOCK === "true") {
    console.log("[autocount] MOCK mode — using sample stock items");
    return MOCK_STOCK_ITEMS.map((i) => ({ ...i }));
  }

  const baseUrl = (process.env.AUTOCOUNT_BASE_URL || "").replace(/\/$/, "");
  const path = process.env.AUTOCOUNT_STOCK_PATH || "/api/stock/items";
  if (!baseUrl) {
    throw new Error(
      "AUTOCOUNT_BASE_URL is not set. Set it in .env, or use AUTOCOUNT_MOCK=1 for sample data."
    );
  }

  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    Accept: "application/json",
  };

  const apiKey = process.env.AUTOCOUNT_API_KEY || "";
  const keyHeader = process.env.AUTOCOUNT_API_KEY_HEADER || "X-Api-Key";
  if (apiKey) headers[keyHeader] = apiKey;

  const basicUser = process.env.AUTOCOUNT_BASIC_USER || "";
  const basicPass = process.env.AUTOCOUNT_BASIC_PASS || "";
  if (basicUser) {
    const token = Buffer.from(`${basicUser}:${basicPass}`).toString("base64");
    headers.Authorization = `Basic ${token}`;
  }

  console.log(`[autocount] GET ${url}`);
  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `AutoCount stock API failed: HTTP ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}`
    );
  }

  const body = await res.json();
  const list = extractList(body);
  if (list.length === 0) {
    console.warn(
      "[autocount] Response had no item array. Check AUTOCOUNT_STOCK_PATH and response shape. Body keys:",
      body && typeof body === "object" ? Object.keys(body) : typeof body
    );
  }

  const fields = {
    code: process.env.AUTOCOUNT_FIELD_CODE || "ItemCode",
    desc: process.env.AUTOCOUNT_FIELD_DESC || "Description",
    price: process.env.AUTOCOUNT_FIELD_PRICE || "Price",
    uom: process.env.AUTOCOUNT_FIELD_UOM || "UOM",
  };

  const mapped = [];
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const item = mapRow(/** @type {Record<string, unknown>} */ (row), fields);
    if (item) mapped.push(item);
  }

  console.log(`[autocount] Mapped ${mapped.length} stock item(s)`);
  return mapped;
}
