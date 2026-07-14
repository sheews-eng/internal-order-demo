/**
 * Runtime config for Internal Orders frontend.
 *
 * Architecture:
 * - Express AutoCount API (C:\API BACKUP) talks to SQL Server AED_SSL
 * - Cloudflare Pages hosts this UI (e.g. https://74f97afe.internal-order-demo.pages.dev)
 * - On Pages, stock/customer calls go to same-origin /api/* → Pages Function proxies to ORIGIN_API_BASE
 * - Locally, default is http://localhost:3001
 *
 * Override anytime:
 *   localStorage.setItem('io-api-base', 'https://your-express-or-tunnel')
 *   location.reload()
 */
(function () {
  const fromStorage = (() => {
    try {
      return localStorage.getItem("io-api-base");
    } catch {
      return null;
    }
  })();

  const host = (typeof location !== "undefined" && location.hostname) || "";
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "" ||
    host === "0.0.0.0";

  // Local: talk to Express on :3001
  // Production (pages.dev / custom domain): same-origin → /api/* Pages Function proxy
  //   (set CF env ORIGIN_API_BASE to your Express public URL / Cloudflare Tunnel)
  const DEFAULT_API_BASE = isLocal ? "http://localhost:3001" : "";

  const raw = fromStorage != null && fromStorage !== "" ? fromStorage : DEFAULT_API_BASE;

  window.IO_CONFIG = {
    /** Empty string = same origin (/api/stock-items on Pages) */
    apiBase: String(raw).replace(/\/$/, ""),
    searchMinChars: 1,
    searchDebounceMs: 250,
    pagesUrl: "https://74f97afe.internal-order-demo.pages.dev",
  };
})();
