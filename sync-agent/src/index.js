import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { fetchStockItems } from "./autocountClient.js";
import { syncStockToFirebase, recordSyncError } from "./firebaseSync.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const once = process.argv.includes("--once");

async function runSync() {
  const started = new Date().toISOString();
  console.log(`\n=== AutoCount → Firebase stock sync @ ${started} ===`);
  try {
    const items = await fetchStockItems();
    if (!items.length) {
      console.warn("[sync] No items returned — catalog not updated");
      await recordSyncError("No items returned from AutoCount/mock");
      return;
    }
    await syncStockToFirebase(items);
    console.log("[sync] Done.");
  } catch (err) {
    console.error("[sync] Failed:", err.message || err);
    await recordSyncError(err.message || String(err));
    if (once) process.exitCode = 1;
  }
}

const intervalMin = Math.max(1, parseInt(process.env.SYNC_INTERVAL_MINUTES || "15", 10) || 15);

if (once) {
  await runSync();
  process.exit(process.exitCode || 0);
} else {
  console.log(`[sync] Running every ${intervalMin} minute(s). Ctrl+C to stop.`);
  await runSync();
  setInterval(runSync, intervalMin * 60 * 1000);
}
