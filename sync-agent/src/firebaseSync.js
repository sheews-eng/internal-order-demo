import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import admin from "firebase-admin";

let initialized = false;

/**
 * Initialize Firebase Admin using GOOGLE_APPLICATION_CREDENTIALS or default ADC.
 */
export function initFirebase() {
  if (initialized) return admin.database();

  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!databaseURL) {
    throw new Error("FIREBASE_DATABASE_URL is required in .env");
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let credential;

  if (credPath) {
    const abs = resolve(credPath);
    if (!existsSync(abs)) {
      throw new Error(`Service account file not found: ${abs}`);
    }
    const sa = JSON.parse(readFileSync(abs, "utf8"));
    credential = admin.credential.cert(sa);
  } else {
    // Application Default Credentials (e.g. GOOGLE_APPLICATION_CREDENTIALS env set by OS)
    credential = admin.credential.applicationDefault();
  }

  admin.initializeApp({ credential, databaseURL });
  initialized = true;
  console.log(`[firebase] Connected to ${databaseURL}`);
  return admin.database();
}

/**
 * Write normalized stock items to RTDB stockItems/{itemCode}
 * and update stockMeta.
 *
 * @param {Array<{ itemCode: string, itemDesc: string, price: number, uom: string }>} items
 */
export async function syncStockToFirebase(items) {
  const db = initFirebase();
  const now = Date.now();

  /** @type {Record<string, object>} */
  const payload = {};
  for (const item of items) {
    const code = String(item.itemCode).trim();
    if (!code) continue;
    // RTDB keys cannot contain . # $ [ ]
    const safeKey = code.replace(/[.#$\[\]]/g, "_");
    payload[safeKey] = {
      itemCode: code,
      itemDesc: item.itemDesc || code,
      price: typeof item.price === "number" ? item.price : 0,
      uom: item.uom || "PCS",
      updatedAt: now,
    };
  }

  const stockRef = db.ref("stockItems");
  // Replace catalog snapshot so removed AutoCount items disappear
  await stockRef.set(payload);

  await db.ref("stockMeta").set({
    lastSyncAt: now,
    lastSyncStatus: "ok",
    lastSyncMessage: `Synced ${Object.keys(payload).length} item(s)`,
    itemCount: Object.keys(payload).length,
  });

  console.log(`[firebase] Wrote ${Object.keys(payload).length} item(s) to stockItems/`);
}

/**
 * Record a failed sync in stockMeta (does not wipe stockItems).
 * @param {string} message
 */
export async function recordSyncError(message) {
  try {
    const db = initFirebase();
    await db.ref("stockMeta").update({
      lastSyncAt: Date.now(),
      lastSyncStatus: "error",
      lastSyncMessage: String(message).slice(0, 500),
    });
  } catch (e) {
    console.error("[firebase] Failed to write stockMeta error:", e.message);
  }
}
