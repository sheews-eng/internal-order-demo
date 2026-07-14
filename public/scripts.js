/**
 * Internal Orders — main application script
 * Salesman + Admin pages share this module.
 *
 * Sections:
 *  1. Firebase init
 *  2. Theme / Toast / Modal / Money helpers
 *  3. Stock catalog (AutoCount sync)
 *  4. Salesman form (items, attachments, submit)
 *  5. Order cards, print, filter/render
 *  6. RTDB live listeners
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import {
    getStorage,
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// =========================================================
// 1. Firebase
// =========================================================
const firebaseConfig = {
    apiKey: "AIzaSyCmb4nfpaFMv1Ix4hbMwU2JlYCq6I46ou4",
    authDomain: "internal-orders-765dd.firebaseapp.com",
    databaseURL: "https://internal-orders-765dd-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "internal-orders-765dd",
    storageBucket: "internal-orders-765dd.firebasestorage.app",
    messagingSenderId: "778145240016",
    appId: "1:778145240016:web:b976e9bac38a86d3381fd5",
    measurementId: "G-H0FVWM7V1R",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

const form = document.getElementById("order-form");
const isSalesman = form !== null;
const ordersContainer = document.getElementById("orders-container");
const historyContainer = document.getElementById("history-container");
const searchInput = document.getElementById("orderSearch");

const STATUS_OPTIONS = [
    "Pending",
    "Ordered",
    "Follow Up",
    "Pending Payment",
    "Completed",
    "Cancelled",
];

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Salesman form state
let currentItems = [];
let renderItemList;
let updateFormUI;
let currentEditKey = null;
/** Snapshot of order fields preserved while editing */
let editingOrderSnapshot = null;
/** Last remote stock search results (for keyboard selection) */
let lastStockMatches = [];
let selectedItemCode = "";
/** Last remote customer search results */
let lastCustomerMatches = [];
/**
 * Pending / existing attachments for the form.
 * @type {Array<{
 *   id: string,
 *   name: string,
 *   url?: string,
 *   path?: string,
 *   size?: number,
 *   contentType?: string,
 *   uploadedAt?: number,
 *   file?: File,
 *   previewUrl?: string,
 *   isNew?: boolean
 * }>}
 */
let formAttachments = [];

let collapsedGroups = {};
let expandedKey = null;

// =========================================================
// 2a. Theme
// =========================================================
const THEME_KEY = "io-theme";

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}

function initThemeToggle() {
    const saved = localStorage.getItem(THEME_KEY) || "light";
    applyTheme(saved);
    const btn = document.getElementById("themeToggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
        const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next);
    });
}
initThemeToggle();

// =========================================================
// 2b. Toast
// =========================================================
function showToast(message, type = "info") {
    const root = document.getElementById("toast-root");
    if (!root) {
        console.log(`[toast:${type}]`, message);
        return;
    }
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
        el.classList.remove("show");
        setTimeout(() => el.remove(), 280);
    }, 3200);
}

// =========================================================
// 2c. Modal (reason prompts)
// =========================================================
/**
 * @param {{ title: string, message?: string, placeholder?: string, confirmLabel?: string, danger?: boolean }} opts
 * @returns {Promise<string|null>} reason text, or null if cancelled
 */
function promptReason(opts) {
    return new Promise((resolve) => {
        const root = document.getElementById("modal-root") || document.body;
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.innerHTML = `
            <div class="modal-card" role="dialog" aria-modal="true">
                <h3 class="modal-title">${escapeHtml(opts.title)}</h3>
                ${opts.message ? `<p class="modal-message">${escapeHtml(opts.message)}</p>` : ""}
                <label class="field modal-field">
                    <span>Reason (required)</span>
                    <textarea class="modal-reason" rows="3" placeholder="${escapeHtml(opts.placeholder || "Enter reason...")}"></textarea>
                </label>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
                    <button type="button" class="btn ${opts.danger ? "btn-danger" : "btn-primary"} modal-confirm">${escapeHtml(opts.confirmLabel || "Confirm")}</button>
                </div>
            </div>
        `;
        root.appendChild(overlay);

        const ta = overlay.querySelector(".modal-reason");
        const close = (value) => {
            overlay.remove();
            resolve(value);
        };
        overlay.querySelector(".modal-cancel").addEventListener("click", () => close(null));
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) close(null);
        });
        overlay.querySelector(".modal-confirm").addEventListener("click", () => {
            const reason = (ta.value || "").trim();
            if (!reason) {
                showToast("Please enter a reason.", "error");
                ta.focus();
                return;
            }
            close(reason);
        });
        setTimeout(() => ta.focus(), 50);
    });
}

// =========================================================
// 2d. Money & HTML helpers
// =========================================================
function getPriceValue(item) {
    let price = item?.price;
    if (typeof price === "string") {
        price = parseFloat(price.replace(/RM\s?/i, "").replace(/,/g, "")) || 0;
    } else if (typeof price !== "number") {
        price = 0;
    }
    return price;
}

/** Format as "RM 1,234.56" */
function formatMoney(n) {
    const num = Number(n) || 0;
    return `RM ${num.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calcOrderTotal(items) {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + getPriceValue(item) * (Number(item.units) || 0), 0);
}

function getOrderTotal(order) {
    if (typeof order?.totalAmount === "number" && !Number.isNaN(order.totalAmount)) {
        return order.totalAmount;
    }
    return calcOrderTotal(order?.orderItems || order?.items || []);
}

function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function uid() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

// =========================================================
// Tabs
// =========================================================
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

function switchTab(name) {
    tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    tabPanels.forEach((p) => p.classList.toggle("active", p.dataset.panel === name));
}

tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// =========================================================
// Admin alert sounds
// =========================================================
let lastOrderCount = 0;
let lastUrgentOrderCount = 0;
let normalAudio;
let urgentAudio;
if (!isSalesman) {
    normalAudio = new Audio("/ding.mp3");
    urgentAudio = new Audio("/urgent.mp3");
}

const activeCountEl = document.getElementById("activeCount");
const activeUrgentDotEl = document.getElementById("activeUrgentDot");

// =========================================================
// 3. AutoCount Express API (stock + customers)
// Base URL from public/config.js → window.IO_CONFIG.apiBase
// =========================================================
function getApiBase() {
    const cfg = window.IO_CONFIG || {};
    // Same-origin /api when using Cloudflare Pages Function proxy
    if (cfg.apiBase === "same-origin" || cfg.apiBase === "/api" || cfg.apiBase === "") {
        // Prefer empty → relative /api/... on Pages; local default if config missing
        if (cfg.apiBase === "" || cfg.apiBase === "same-origin" || cfg.apiBase === "/api") {
            return "";
        }
    }
    if (cfg.apiBase == null || cfg.apiBase === undefined) {
        const host = location.hostname || "";
        const isLocal = host === "localhost" || host === "127.0.0.1";
        return isLocal ? "http://localhost:3001" : "";
    }
    return String(cfg.apiBase).replace(/\/$/, "");
}

function getSearchMinChars() {
    return (window.IO_CONFIG && window.IO_CONFIG.searchMinChars) || 1;
}

function getSearchDebounceMs() {
    return (window.IO_CONFIG && window.IO_CONFIG.searchDebounceMs) || 250;
}

/**
 * GET /api/stock-items?q=...
 * Falls back to /inventory?keywords=... if clean API missing.
 * @returns {Promise<Array<{itemCode,itemDesc,price,uom}>>}
 */
async function searchStockItems(query, limit = 20) {
    const q = (query || "").trim();
    if (q.length < getSearchMinChars()) return [];

    const base = getApiBase();
    const url = `${base}/api/stock-items?q=${encodeURIComponent(q)}&limit=${limit}`;

    try {
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (res.ok) {
            const body = await res.json();
            const rows = Array.isArray(body.data) ? body.data : [];
            return rows.map((r) => ({
                itemCode: String(r.itemCode || r.ItemCode || "").trim(),
                itemDesc: String(r.itemDesc || r.Description || "").trim(),
                price: Number(r.price ?? r.CompPrice ?? r.Price1 ?? 0) || 0,
                uom: r.uom || r.UOM || "PCS",
            })).filter((r) => r.itemCode || r.itemDesc);
        }
        // Fallback: existing inventory endpoint
        if (res.status === 404) {
            const invUrl = `${base}/inventory?keywords=${encodeURIComponent(q)}`;
            const invRes = await fetch(invUrl, { headers: { Accept: "application/json" } });
            if (!invRes.ok) throw new Error(`inventory HTTP ${invRes.status}`);
            const invBody = await invRes.json();
            const rows = Array.isArray(invBody.data) ? invBody.data : [];
            return rows.slice(0, limit).map((r) => ({
                itemCode: String(r.ItemCode || "").trim(),
                itemDesc: String(r.Description || "").trim(),
                price: Number(r.CompPrice || r.Price1 || 0) || 0,
                uom: "PCS",
            }));
        }
        throw new Error(`stock-items HTTP ${res.status}`);
    } catch (err) {
        console.error("searchStockItems failed:", err);
        throw err;
    }
}

/**
 * GET /api/customers?q=...  (or /customer-lookup)
 * @returns {Promise<Array<{accNo,companyName,phone,attention,address}>>}
 */
async function searchCustomers(query, limit = 10) {
    const q = (query || "").trim();
    if (q.length < getSearchMinChars()) return [];

    const base = getApiBase();
    const url = `${base}/api/customers?q=${encodeURIComponent(q)}&limit=${limit}`;

    try {
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (res.ok) {
            const body = await res.json();
            return Array.isArray(body.data) ? body.data : [];
        }
        if (res.status === 404) {
            const legacy = `${base}/customer-lookup?keywords=${encodeURIComponent(q)}`;
            const lr = await fetch(legacy, { headers: { Accept: "application/json" } });
            if (!lr.ok) throw new Error(`customer-lookup HTTP ${lr.status}`);
            const body = await lr.json();
            return Array.isArray(body.data) ? body.data : [];
        }
        throw new Error(`customers HTTP ${res.status}`);
    } catch (err) {
        console.error("searchCustomers failed:", err);
        throw err;
    }
}

// =========================================================
// 4. Salesman form
// =========================================================
if (isSalesman) {
    const addItemBtn = document.getElementById("addItemBtn");
    const itemListContainer = document.getElementById("item-list-container");
    const submitBtn = form.querySelector(".submit-order-btn");
    const itemDescInput = document.getElementById("itemDesc");
    const itemCodeInput = document.getElementById("itemCode");
    const itemCodeHint = document.getElementById("itemCodeHint");
    const autocompleteList = document.getElementById("itemAutocompleteList");
    const orderTotalDisplay = document.getElementById("orderTotalDisplay");
    const orderItemCount = document.getElementById("orderItemCount");
    const attachmentInput = document.getElementById("attachmentInput");
    const attachmentPreview = document.getElementById("attachmentPreview");
    const companyInput = document.getElementById("company");
    const customerAutocompleteList = document.getElementById("customerAutocompleteList");
    let autocompleteActiveIndex = -1;
    let autocompleteDebounce = null;
    let customerActiveIndex = -1;
    let customerDebounce = null;
    let stockSearchError = "";

    function updateOrderTotalUI() {
        const total = calcOrderTotal(currentItems);
        const n = currentItems.length;
        if (orderTotalDisplay) orderTotalDisplay.textContent = formatMoney(total);
        if (orderItemCount) orderItemCount.textContent = `${n} item${n === 1 ? "" : "s"}`;
    }

    // --- Attachments UI ---
    function revokePreview(att) {
        if (att.previewUrl && att.previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(att.previewUrl);
        }
    }

    function clearAttachments() {
        formAttachments.forEach(revokePreview);
        formAttachments = [];
        renderAttachmentPreview();
    }

    function renderAttachmentPreview() {
        if (!attachmentPreview) return;
        attachmentPreview.innerHTML = "";
        if (!formAttachments.length) {
            attachmentPreview.innerHTML = `<p class="no-items">No photos attached.</p>`;
            return;
        }
        formAttachments.forEach((att) => {
            const card = document.createElement("div");
            card.className = "attachment-thumb";
            const src = att.previewUrl || att.url || "";
            card.innerHTML = `
                <img src="${escapeHtml(src)}" alt="${escapeHtml(att.name)}">
                <button type="button" class="attachment-remove" title="Remove">&times;</button>
                <span class="attachment-name">${escapeHtml(att.name)}</span>
            `;
            card.querySelector(".attachment-remove").addEventListener("click", async () => {
                if (att.path && !att.isNew) {
                    try {
                        await deleteObject(storageRef(storage, att.path));
                    } catch (e) {
                        console.warn("Storage delete skipped:", e.message);
                    }
                }
                revokePreview(att);
                formAttachments = formAttachments.filter((a) => a.id !== att.id);
                renderAttachmentPreview();
            });
            attachmentPreview.appendChild(card);
        });
    }

    if (attachmentInput) {
        attachmentInput.addEventListener("change", () => {
            const files = Array.from(attachmentInput.files || []);
            attachmentInput.value = "";
            for (const file of files) {
                if (formAttachments.length >= MAX_ATTACHMENTS) {
                    showToast(`Maximum ${MAX_ATTACHMENTS} images.`, "error");
                    break;
                }
                if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                    showToast(`Unsupported type: ${file.name}`, "error");
                    continue;
                }
                if (file.size > MAX_ATTACHMENT_BYTES) {
                    showToast(`${file.name} exceeds 5MB.`, "error");
                    continue;
                }
                formAttachments.push({
                    id: uid(),
                    name: file.name,
                    file,
                    previewUrl: URL.createObjectURL(file),
                    size: file.size,
                    contentType: file.type,
                    isNew: true,
                });
            }
            renderAttachmentPreview();
        });
    }

    async function uploadNewAttachments(orderKey) {
        const results = [];
        for (const att of formAttachments) {
            if (!att.isNew && att.url) {
                results.push({
                    id: att.id,
                    name: att.name,
                    url: att.url,
                    path: att.path || "",
                    size: att.size || 0,
                    contentType: att.contentType || "image/jpeg",
                    uploadedAt: att.uploadedAt || Date.now(),
                });
                continue;
            }
            if (!att.file) continue;
            const safeName = att.name.replace(/[^\w.\-]+/g, "_");
            const path = `order-attachments/${orderKey}/${att.id}_${safeName}`;
            const sRef = storageRef(storage, path);
            await uploadBytes(sRef, att.file, { contentType: att.contentType || att.file.type });
            const url = await getDownloadURL(sRef);
            results.push({
                id: att.id,
                name: att.name,
                url,
                path,
                size: att.size || att.file.size,
                contentType: att.contentType || att.file.type,
                uploadedAt: Date.now(),
            });
        }
        return results;
    }

    // --- Stock picker ---
    const clearItemPicker = () => {
        if (itemDescInput) itemDescInput.value = "";
        if (itemCodeInput) itemCodeInput.value = "";
        selectedItemCode = "";
        if (itemCodeHint) {
            itemCodeHint.hidden = true;
            itemCodeHint.textContent = "";
        }
        hideAutocomplete();
    };

    const setSelectedStock = (item) => {
        if (!item) return;
        selectedItemCode = item.itemCode || "";
        if (itemCodeInput) itemCodeInput.value = selectedItemCode;
        if (itemDescInput) itemDescInput.value = item.itemDesc || item.itemCode || "";
        const priceEl = document.getElementById("price");
        if (priceEl && typeof item.price === "number") {
            priceEl.value = item.price.toFixed(2);
        }
        if (itemCodeHint) {
            if (selectedItemCode) {
                itemCodeHint.hidden = false;
                itemCodeHint.innerHTML = `Selected: <code>${escapeHtml(selectedItemCode)}</code>${item.uom ? ` · ${escapeHtml(item.uom)}` : ""}`;
            } else {
                itemCodeHint.hidden = true;
                itemCodeHint.textContent = "";
            }
        }
        hideAutocomplete();
    };

    function hideAutocomplete() {
        if (!autocompleteList) return;
        autocompleteList.hidden = true;
        autocompleteList.innerHTML = "";
        autocompleteActiveIndex = -1;
        if (itemDescInput) itemDescInput.setAttribute("aria-expanded", "false");
    }

    function renderAutocomplete(matches, query, opts = {}) {
        if (!autocompleteList || !itemDescInput) return;
        autocompleteList.innerHTML = "";
        autocompleteActiveIndex = -1;
        lastStockMatches = matches || [];

        if (opts.loading) {
            const li = document.createElement("li");
            li.className = "autocomplete-empty";
            li.textContent = "Searching AutoCount stock…";
            autocompleteList.appendChild(li);
            autocompleteList.hidden = false;
            itemDescInput.setAttribute("aria-expanded", "true");
            return;
        }

        if (!matches.length) {
            const li = document.createElement("li");
            li.className = "autocomplete-empty";
            if (stockSearchError) {
                li.textContent = `API error: ${stockSearchError} (check apiBase / Express server)`;
            } else if (!(query || "").trim()) {
                li.textContent = "Type item code or description to search AutoCount…";
            } else {
                li.textContent = `No stock match for "${query}" — you can still type a custom description`;
            }
            autocompleteList.appendChild(li);
            autocompleteList.hidden = false;
            itemDescInput.setAttribute("aria-expanded", "true");
            return;
        }

        matches.forEach((item, idx) => {
            const li = document.createElement("li");
            li.className = "autocomplete-option";
            li.setAttribute("role", "option");
            li.dataset.index = String(idx);
            li.innerHTML = `
                <span class="opt-code">${escapeHtml(item.itemCode)}</span>
                <span class="opt-desc">${escapeHtml(item.itemDesc)}</span>
                <span class="opt-price">${formatMoney(item.price)}</span>
            `;
            li.addEventListener("mousedown", (e) => {
                e.preventDefault();
                setSelectedStock(item);
            });
            autocompleteList.appendChild(li);
        });
        autocompleteList.hidden = false;
        itemDescInput.setAttribute("aria-expanded", "true");
    }

    function highlightAutocompleteOption(index) {
        if (!autocompleteList) return;
        const options = autocompleteList.querySelectorAll(".autocomplete-option");
        options.forEach((el, i) => el.classList.toggle("active", i === index));
        if (index >= 0 && options[index]) options[index].scrollIntoView({ block: "nearest" });
    }

    async function runStockSearch(q) {
        const query = (q || "").trim();
        if (query.length < getSearchMinChars()) {
            stockSearchError = "";
            lastStockMatches = [];
            renderAutocomplete([], query);
            return;
        }
        renderAutocomplete([], query, { loading: true });
        try {
            const matches = await searchStockItems(query, 20);
            stockSearchError = "";
            renderAutocomplete(matches, query);
        } catch (err) {
            stockSearchError = err.message || String(err);
            lastStockMatches = [];
            renderAutocomplete([], query);
        }
    }

    if (itemDescInput && autocompleteList) {
        itemDescInput.addEventListener("input", () => {
            selectedItemCode = "";
            if (itemCodeInput) itemCodeInput.value = "";
            if (itemCodeHint) {
                itemCodeHint.hidden = true;
                itemCodeHint.textContent = "";
            }
            clearTimeout(autocompleteDebounce);
            autocompleteDebounce = setTimeout(() => {
                runStockSearch(itemDescInput.value);
            }, getSearchDebounceMs());
        });

        itemDescInput.addEventListener("focus", () => {
            if ((itemDescInput.value || "").trim()) runStockSearch(itemDescInput.value);
            else renderAutocomplete([], "");
        });

        itemDescInput.addEventListener("keydown", (e) => {
            if (autocompleteList.hidden) return;
            const options = autocompleteList.querySelectorAll(".autocomplete-option");
            if (!options.length) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                autocompleteActiveIndex = Math.min(options.length - 1, autocompleteActiveIndex + 1);
                highlightAutocompleteOption(autocompleteActiveIndex);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                autocompleteActiveIndex = Math.max(0, autocompleteActiveIndex - 1);
                highlightAutocompleteOption(autocompleteActiveIndex);
            } else if (e.key === "Enter" && autocompleteActiveIndex >= 0) {
                e.preventDefault();
                if (lastStockMatches[autocompleteActiveIndex]) {
                    setSelectedStock(lastStockMatches[autocompleteActiveIndex]);
                }
            } else if (e.key === "Escape") {
                hideAutocomplete();
            }
        });

        itemDescInput.addEventListener("blur", () => setTimeout(hideAutocomplete, 150));
    }

    // --- Customer (Debtor) autocomplete from AutoCount API ---
    function hideCustomerAutocomplete() {
        if (!customerAutocompleteList) return;
        customerAutocompleteList.hidden = true;
        customerAutocompleteList.innerHTML = "";
        customerActiveIndex = -1;
        if (companyInput) companyInput.setAttribute("aria-expanded", "false");
    }

    function setSelectedCustomer(c) {
        if (!c || !form) return;
        if (form.company) form.company.value = c.companyName || "";
        if (form.attn && c.attention) form.attn.value = c.attention;
        if (form.hp && c.phone) form.hp.value = c.phone;
        if (form.delivery && c.address && !(form.delivery.value || "").trim()) {
            form.delivery.value = c.address;
        }
        hideCustomerAutocomplete();
        showToast(`Customer: ${c.companyName || c.accNo}`, "success");
    }

    function renderCustomerAutocomplete(matches, query, opts = {}) {
        if (!customerAutocompleteList || !companyInput) return;
        customerAutocompleteList.innerHTML = "";
        customerActiveIndex = -1;
        lastCustomerMatches = matches || [];

        if (opts.loading) {
            const li = document.createElement("li");
            li.className = "autocomplete-empty";
            li.textContent = "Searching AutoCount customers…";
            customerAutocompleteList.appendChild(li);
            customerAutocompleteList.hidden = false;
            return;
        }

        if (!matches.length) {
            const li = document.createElement("li");
            li.className = "autocomplete-empty";
            li.textContent = (query || "").trim()
                ? `No customer match for "${query}"`
                : "Type company name or Debtor code…";
            customerAutocompleteList.appendChild(li);
            customerAutocompleteList.hidden = false;
            return;
        }

        matches.forEach((c, idx) => {
            const li = document.createElement("li");
            li.className = "autocomplete-option";
            li.dataset.index = String(idx);
            li.innerHTML = `
                <span class="opt-code">${escapeHtml(c.accNo || "")}</span>
                <span class="opt-desc">${escapeHtml(c.companyName || "")}</span>
                <span class="opt-price">${escapeHtml(c.phone || c.attention || "")}</span>
            `;
            li.addEventListener("mousedown", (e) => {
                e.preventDefault();
                setSelectedCustomer(c);
            });
            customerAutocompleteList.appendChild(li);
        });
        customerAutocompleteList.hidden = false;
        companyInput.setAttribute("aria-expanded", "true");
    }

    async function runCustomerSearch(q) {
        const query = (q || "").trim();
        if (query.length < getSearchMinChars()) {
            lastCustomerMatches = [];
            renderCustomerAutocomplete([], query);
            return;
        }
        renderCustomerAutocomplete([], query, { loading: true });
        try {
            const matches = await searchCustomers(query, 10);
            renderCustomerAutocomplete(matches, query);
        } catch (err) {
            renderCustomerAutocomplete([], query);
            const li = customerAutocompleteList?.querySelector(".autocomplete-empty");
            if (li) li.textContent = `API error: ${err.message || err}`;
        }
    }

    if (companyInput && customerAutocompleteList) {
        companyInput.addEventListener("input", () => {
            clearTimeout(customerDebounce);
            customerDebounce = setTimeout(() => runCustomerSearch(companyInput.value), getSearchDebounceMs());
        });
        companyInput.addEventListener("focus", () => {
            if ((companyInput.value || "").trim()) runCustomerSearch(companyInput.value);
        });
        companyInput.addEventListener("keydown", (e) => {
            if (customerAutocompleteList.hidden) return;
            const options = customerAutocompleteList.querySelectorAll(".autocomplete-option");
            if (!options.length) return;
            if (e.key === "ArrowDown") {
                e.preventDefault();
                customerActiveIndex = Math.min(options.length - 1, customerActiveIndex + 1);
                options.forEach((el, i) => el.classList.toggle("active", i === customerActiveIndex));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                customerActiveIndex = Math.max(0, customerActiveIndex - 1);
                options.forEach((el, i) => el.classList.toggle("active", i === customerActiveIndex));
            } else if (e.key === "Enter" && customerActiveIndex >= 0) {
                e.preventDefault();
                if (lastCustomerMatches[customerActiveIndex]) {
                    setSelectedCustomer(lastCustomerMatches[customerActiveIndex]);
                }
            } else if (e.key === "Escape") {
                hideCustomerAutocomplete();
            }
        });
        companyInput.addEventListener("blur", () => setTimeout(hideCustomerAutocomplete, 150));
    }

    updateFormUI = (isEditing) => {
        const existingCancel = form.querySelector(".cancel-edit-btn");
        if (existingCancel) existingCancel.remove();

        if (isEditing) {
            submitBtn.textContent = "Update Order";
            submitBtn.classList.add("update-mode");

            const cancelBtn = document.createElement("button");
            cancelBtn.type = "button";
            cancelBtn.textContent = "Cancel Edit";
            cancelBtn.className = "cancel-edit-btn btn btn-secondary";
            cancelBtn.addEventListener("click", resetForm);
            submitBtn.parentNode.insertBefore(cancelBtn, submitBtn);
        } else {
            submitBtn.textContent = "Submit Order";
            submitBtn.classList.remove("update-mode");
        }
    };

    const resetForm = () => {
        if (form.company) form.company.value = "";
        if (form.attn) form.attn.value = "";
        if (form.hp) form.hp.value = "";
        if (form.poNumber) form.poNumber.value = "";
        if (form.delivery) form.delivery.value = "";
        if (form.salesmanComment) form.salesmanComment.value = "";
        if (form.isUrgent) form.isUrgent.checked = false;

        currentItems = [];
        currentEditKey = null;
        editingOrderSnapshot = null;
        clearItemPicker();
        clearAttachments();
        document.getElementById("units").value = "1";
        document.getElementById("price").value = "0.00";
        renderItemList();
        updateFormUI(false);
    };

    renderItemList = function () {
        itemListContainer.innerHTML = "";
        if (currentItems.length === 0) {
            itemListContainer.innerHTML = "<p class='no-items'>No items added yet. Click 'Add Item' above.</p>";
            updateOrderTotalUI();
            return;
        }

        currentItems.forEach((item, index) => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "item-preview";

            const priceValue = getPriceValue(item);
            const lineTotal = priceValue * (item.units || 0);
            const codeLabel = item.itemCode
                ? `<div class="item-detail-row"><span class="item-code-hint" style="margin:0">Code: <code>${escapeHtml(item.itemCode)}</code></span></div>`
                : "";

            itemDiv.innerHTML = `
                ${codeLabel}
                <div class="item-detail-row">
                    <label>Item Description: <input type="text" value="${escapeHtml(item.itemDesc || "")}" data-field="itemDesc" data-index="${index}"></label>
                </div>
                <div class="item-detail-row">
                    <label>Units: <input type="number" value="${item.units}" data-field="units" data-index="${index}" min="1"></label>
                    <label>Price (RM): <input type="number" value="${priceValue.toFixed(2)}" data-field="price" data-index="${index}" step="0.01" min="0.01"></label>
                </div>
                <div class="item-line-total">Line: ${formatMoney(lineTotal)}</div>
            `;

            const removeBtn = document.createElement("button");
            removeBtn.textContent = "Remove";
            removeBtn.className = "remove-item-btn";
            removeBtn.addEventListener("click", () => {
                currentItems.splice(index, 1);
                renderItemList();
            });

            itemDiv.querySelectorAll("input").forEach((input) => {
                const sync = (e) => {
                    const idx = parseInt(e.target.dataset.index, 10);
                    const field = e.target.dataset.field;
                    let value = e.target.value;

                    if (field === "units") {
                        value = Math.max(1, parseInt(value, 10) || 1);
                        e.target.value = value;
                        currentItems[idx].units = value;
                    } else if (field === "price") {
                        value = parseFloat(value) || 0.01;
                        e.target.value = value.toFixed(2);
                        currentItems[idx].price = `RM ${value.toFixed(2)}`;
                    } else if (field === "itemDesc") {
                        currentItems[idx].itemDesc = value;
                    }
                    const lineEl = itemDiv.querySelector(".item-line-total");
                    if (lineEl) {
                        lineEl.textContent = `Line: ${formatMoney(getPriceValue(currentItems[idx]) * (currentItems[idx].units || 0))}`;
                    }
                    updateOrderTotalUI();
                };
                input.addEventListener("change", sync);
                input.addEventListener("input", sync);
            });

            const actionRow = document.createElement("div");
            actionRow.className = "item-action-row";
            actionRow.appendChild(removeBtn);
            itemDiv.appendChild(actionRow);
            itemListContainer.appendChild(itemDiv);
        });

        updateOrderTotalUI();
    };

    addItemBtn.addEventListener("click", () => {
        const itemDesc = document.getElementById("itemDesc").value.trim();
        const units = document.getElementById("units").value;
        const price = document.getElementById("price").value;
        const itemCode = (itemCodeInput?.value || selectedItemCode || "").trim();

        if (!itemDesc) {
            showToast("Please enter or select an item description.", "error");
            return;
        }
        if (units <= 0 || price <= 0) {
            showToast("Units and price must be greater than 0.", "error");
            return;
        }

        currentItems.push({
            itemCode: itemCode || undefined,
            itemDesc,
            units: parseInt(units, 10),
            price: `RM ${parseFloat(price).toFixed(2)}`,
        });

        clearItemPicker();
        document.getElementById("units").value = "1";
        document.getElementById("price").value = "0.00";
        renderItemList();
        showToast("Item added.", "success");
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (currentItems.length === 0) {
            showToast("Add at least one item before submitting.", "error");
            return;
        }
        const invalidItem = currentItems.find((item) => item.units <= 0 || getPriceValue(item) <= 0);
        if (invalidItem) {
            showToast("All item units and prices must be valid and non-zero.", "error");
            return;
        }

        const newSalesmanComment = form.salesmanComment?.value.trim() ?? "";
        const isUrgent = form.isUrgent?.checked ?? false;

        let existingOrderData = {};
        if (currentEditKey && editingOrderSnapshot) {
            existingOrderData = { ...editingOrderSnapshot };
        } else if (currentEditKey) {
            const existingCard = document.querySelector(`.order-card[data-key="${currentEditKey}"]`);
            if (existingCard) {
                existingOrderData.status = existingCard.dataset.status || "Pending";
                existingOrderData.deleted = existingCard.dataset.deleted === "true";
                existingOrderData.timestamp = parseInt(existingCard.dataset.timestamp, 10) || Date.now();
                existingOrderData.adminComment = existingCard.dataset.admincomment || "";
                existingOrderData.deleteReason = existingCard.dataset.deletereason || "";
                existingOrderData.cancelledReason = existingCard.dataset.cancelledreason || "";
            }
        }

        const orderItems = currentItems.map((item) => {
            const row = {
                itemDesc: item.itemDesc || "",
                units: item.units,
                price: item.price,
            };
            if (item.itemCode) row.itemCode = item.itemCode;
            return row;
        });

        const totalAmount = calcOrderTotal(orderItems);
        const orderKey = currentEditKey || push(ref(db, "orders")).key;

        submitBtn.disabled = true;
        const prevLabel = submitBtn.textContent;
        submitBtn.textContent = formAttachments.some((a) => a.isNew) ? "Uploading..." : "Saving...";

        try {
            const attachments = await uploadNewAttachments(orderKey);

            const data = {
                company: form.company?.value ?? "",
                attn: form.attn?.value ?? "",
                hp: form.hp?.value ?? "",
                poNumber: form.poNumber?.value ?? "",
                delivery: form.delivery?.value ?? "",
                orderItems,
                totalAmount,
                attachments,
                status: existingOrderData.status || "Pending",
                deleted: existingOrderData.deleted || false,
                timestamp: existingOrderData.timestamp || Date.now(),
                salesmanComment: newSalesmanComment,
                adminComment: existingOrderData.adminComment || "",
                isUrgent,
            };
            if (existingOrderData.deleteReason) data.deleteReason = existingOrderData.deleteReason;
            if (existingOrderData.cancelledReason) data.cancelledReason = existingOrderData.cancelledReason;
            if (existingOrderData.deletedAt) data.deletedAt = existingOrderData.deletedAt;

            await set(ref(db, `orders/${orderKey}`), data);
            showToast(currentEditKey ? "Order updated successfully." : "Order submitted successfully!", "success");
            resetForm();
            switchTab("active");
        } catch (err) {
            console.error("Save failed:", err);
            showToast(`Save failed: ${err.message || err}`, "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = prevLabel;
        }
    });

    renderItemList();
    renderAttachmentPreview();

    // expose for edit button
    window.__ioResetForm = resetForm;
    window.__ioLoadEdit = (order, key, items) => {
        currentEditKey = key;
        editingOrderSnapshot = {
            status: order.status || "Pending",
            deleted: !!order.deleted,
            timestamp: order.timestamp || Date.now(),
            adminComment: order.adminComment || "",
            deleteReason: order.deleteReason || "",
            cancelledReason: order.cancelledReason || "",
            deletedAt: order.deletedAt || null,
        };
        if (form.company) form.company.value = order.company || "";
        if (form.attn) form.attn.value = order.attn || "";
        if (form.hp) form.hp.value = order.hp || "";
        if (form.poNumber) form.poNumber.value = order.poNumber || "";
        if (form.delivery) form.delivery.value = order.delivery || "";
        if (form.salesmanComment) form.salesmanComment.value = order.salesmanComment || "";
        if (form.isUrgent) form.isUrgent.checked = order.isUrgent || false;

        currentItems = JSON.parse(JSON.stringify(items));
        formAttachments = (order.attachments || []).map((a) => ({
            id: a.id || uid(),
            name: a.name || "image",
            url: a.url,
            path: a.path,
            size: a.size,
            contentType: a.contentType,
            uploadedAt: a.uploadedAt,
            isNew: false,
        }));
        renderItemList();
        renderAttachmentPreview();
        updateFormUI(true);
    };
}

// =========================================================
// 5. Print order (A4-friendly)
// =========================================================
function printOrder(key, order) {
    const items = order.orderItems || order.items || [];
    const total = getOrderTotal(order);
    const rows = items
        .map((item, i) => {
            const unit = getPriceValue(item);
            const line = unit * (item.units || 0);
            return `<tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(item.itemCode || "—")}</td>
                <td>${escapeHtml(item.itemDesc || "N/A")}</td>
                <td class="num">${item.units || 0}</td>
                <td class="num">${formatMoney(unit)}</td>
                <td class="num">${formatMoney(line)}</td>
            </tr>`;
        })
        .join("");

    const attachments = order.attachments || [];
    const attHtml = attachments.length
        ? `<div class="print-att">
            <h3>Attachments (${attachments.length})</h3>
            <div class="print-att-grid">
              ${attachments.map((a) => `<div><img src="${escapeHtml(a.url)}" alt=""><div class="cap">${escapeHtml(a.name || "")}</div></div>`).join("")}
            </div>
          </div>`
        : "";

    const reasonBlock = [
        order.deleteReason ? `<p><strong>Delete reason:</strong> ${escapeHtml(order.deleteReason)}</p>` : "",
        order.cancelledReason ? `<p><strong>Cancel reason:</strong> ${escapeHtml(order.cancelledReason)}</p>` : "",
    ].join("");

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Order ${escapeHtml(order.poNumber || key)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Inter, Segoe UI, Arial, sans-serif; color: #111; font-size: 12px; margin: 0; }
  .sheet { max-width: 190mm; margin: 0 auto; }
  header { display: flex; justify-content: space-between; border-bottom: 2px solid #FF9012; padding-bottom: 12px; margin-bottom: 16px; }
  h1 { margin: 0; font-size: 18px; }
  .sub { color: #555; margin-top: 4px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; margin-bottom: 16px; }
  .meta div { padding: 4px 0; border-bottom: 1px dotted #ddd; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #f5f5f5; font-size: 11px; text-transform: uppercase; }
  td.num, th.num { text-align: right; }
  .total-box { margin-top: 12px; text-align: right; font-size: 16px; font-weight: 700; }
  .notes { margin-top: 16px; }
  .print-att-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .print-att-grid img { max-width: 120px; max-height: 90px; object-fit: cover; border: 1px solid #ddd; }
  .cap { font-size: 10px; color: #666; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #FEF3C7; font-size: 11px; font-weight: 700; }
  footer { margin-top: 24px; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 8px; }
  @media print { .no-print { display: none; } }
</style>
</head><body>
<div class="sheet">
  <header>
    <div>
      <h1>SSL Access Parts</h1>
      <div class="sub">Internal Order</div>
    </div>
    <div style="text-align:right">
      <div class="badge">${escapeHtml(order.status || "Pending")}${order.isUrgent ? " · URGENT" : ""}</div>
      <div class="sub" style="margin-top:6px">${new Date(order.timestamp || Date.now()).toLocaleString()}</div>
      <div class="sub">Ref: ${escapeHtml(key)}</div>
    </div>
  </header>
  <div class="meta">
    <div><strong>Company</strong><br>${escapeHtml(order.company || "N/A")}</div>
    <div><strong>P.O. Number</strong><br>${escapeHtml(order.poNumber || "N/A")}</div>
    <div><strong>ATTN</strong><br>${escapeHtml(order.attn || "N/A")}</div>
    <div><strong>H/P</strong><br>${escapeHtml(order.hp || "N/A")}</div>
    <div style="grid-column:1/-1"><strong>Delivery</strong><br>${escapeHtml(order.delivery || "N/A")}</div>
  </div>
  <table>
    <thead>
      <tr><th>#</th><th>Code</th><th>Description</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th></tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="6">No items</td></tr>`}</tbody>
  </table>
  <div class="total-box">Order Total: ${formatMoney(total)}</div>
  <div class="notes">
    <p><strong>Salesman comment:</strong> ${escapeHtml(order.salesmanComment || "—")}</p>
    <p><strong>Admin remark:</strong> ${escapeHtml(order.adminComment || "—")}</p>
    ${reasonBlock}
  </div>
  ${attHtml}
  <footer>Generated from Internal Orders · ${new Date().toLocaleString()}</footer>
  <p class="no-print" style="margin-top:16px"><button onclick="window.print()">Print</button></p>
</div>
<script>window.onload=function(){setTimeout(function(){window.print()},200)}</script>
</body></html>`;

    const w = window.open("", "_blank");
    if (!w) {
        showToast("Pop-up blocked. Allow pop-ups to print.", "error");
        return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
}

// =========================================================
// 5b. Details panel + cards
// =========================================================
function buildDetailsPanel(key, order, isSalesmanPage, isHistory) {
    const itemsToRender = order.orderItems || order.items || [];
    const totalAmount = getOrderTotal(order);

    const itemsListHTML = itemsToRender
        .map((item) => {
            const itemDescDisplay = item.itemDesc || "N/A (No Description)";
            const codePrefix = item.itemCode ? `[${escapeHtml(item.itemCode)}] ` : "";
            const line = getPriceValue(item) * (item.units || 0);
            return `<span>${codePrefix}${escapeHtml(itemDescDisplay)} (${item.units} × ${escapeHtml(item.price || formatMoney(getPriceValue(item)))}) = ${formatMoney(line)}</span>`;
        })
        .join("");

    const adminCommentContent =
        order.adminComment && order.adminComment.trim() !== ""
            ? `<span class="comment-highlight">${escapeHtml(order.adminComment)}</span>`
            : "N/A";

    const salesmanCommentContent =
        order.salesmanComment && order.salesmanComment.trim() !== ""
            ? `<span class="comment-highlight">${escapeHtml(order.salesmanComment)}</span>`
            : "N/A";

    let adminCommentSection = "";
    if (!isSalesmanPage && !isHistory) {
        adminCommentSection = `
            <h4 class="mt">Admin Remark</h4>
            <textarea id="adminCommentInput_${key}" class="admin-comment-detail-input">${escapeHtml(order.adminComment || "")}</textarea>
            <button class="save-admin-comment-btn-detail" data-key="${key}">Save Remark</button>
        `;
    } else {
        adminCommentSection = `
            <h4 class="mt">Admin Remark</h4>
            <div class="comment-text">${adminCommentContent}</div>
        `;
    }

    const reasonsHTML = [
        order.deleteReason
            ? `<h4 class="mt">Delete / Archive Reason</h4><div class="comment-text reason-block">${escapeHtml(order.deleteReason)}</div>`
            : "",
        order.cancelledReason
            ? `<h4 class="mt">Cancelled Reason</h4><div class="comment-text reason-block">${escapeHtml(order.cancelledReason)}</div>`
            : "",
    ].join("");

    const attachments = order.attachments || [];
    const attachmentsHTML = attachments.length
        ? `<h4 class="mt">Attachments (${attachments.length})</h4>
           <div class="order-attachment-gallery">
             ${attachments
                 .map(
                     (a) =>
                         `<a href="${escapeHtml(a.url)}" target="_blank" rel="noopener" class="order-att-link" title="${escapeHtml(a.name || "")}">
                            <img src="${escapeHtml(a.url)}" alt="${escapeHtml(a.name || "attachment")}">
                          </a>`
                 )
                 .join("")}
           </div>`
        : "";

    let actionsHTML = "";
    const isCompleted = order.status === "Completed";
    const printBtn = `<button type="button" class="action-btn print-btn" data-key="${key}">Print</button>`;

    if (!isHistory) {
        if (!isSalesmanPage) {
            const statusSelectHTML = `<select id="statusSelect_${key}" title="Change Status">
                ${STATUS_OPTIONS.map((s) => `<option value="${s}" ${s === order.status ? "selected" : ""}>${s}</option>`).join("")}
            </select>`;
            actionsHTML = `
                ${statusSelectHTML}
                ${printBtn}
                <button class="action-btn delete-btn" data-key="${key}" ${isCompleted ? 'disabled title="Completed orders must be permanently deleted by Admin from history."' : ""}>Delete</button>
            `;
        } else {
            actionsHTML = `
                ${printBtn}
                <button class="action-btn edit-btn" data-key="${key}" ${isCompleted ? 'disabled title="Completed orders cannot be edited."' : ""}>Edit</button>
                <button class="action-btn delete-btn" data-key="${key}" ${isCompleted ? 'disabled title="Completed orders must be permanently deleted by Admin from history."' : ""}>Delete</button>
            `;
        }
    } else {
        const bits = [printBtn];
        if (!isSalesmanPage) {
            const timeDifference = Date.now() - (order.timestamp || 0);
            const twentyFourHours = 24 * 60 * 60 * 1000;
            const isTooSoon = isCompleted && timeDifference < twentyFourHours;
            const timeRemaining = isTooSoon ? twentyFourHours - timeDifference : 0;
            const hours = Math.floor(timeRemaining / 3600000);
            const minutes = Math.floor((timeRemaining % 3600000) / 60000);
            const title = isTooSoon
                ? `Must wait ${hours}h ${minutes}m (24 hours after completion) to permanently delete.`
                : "Permanently delete this order.";
            bits.push(
                `<button class="action-btn perm-delete-btn" data-key="${key}" ${isTooSoon ? "disabled" : ""} title="${title}">Permanent Delete</button>`
            );
        }
        actionsHTML = bits.join("");
    }

    const urgentFlag = order.isUrgent ? " - 🚨 URGENT" : "";

    const panel = document.createElement("div");
    panel.className = "order-card-details";
    panel.setAttribute("data-key", `details-${key}`);

    panel.innerHTML = `
        <div class="details-content-grid">
            <div class="details-info">
                <h4>Order Details</h4>
                <ul>
                    <li><strong>Date:</strong> ${new Date(order.timestamp).toLocaleString()}</li>
                    <li><strong>Company:</strong> ${escapeHtml(order.company || "N/A")}</li>
                    <li><strong>PO #:</strong> ${escapeHtml(order.poNumber || "N/A")}</li>
                    <li><strong>ATTN:</strong> ${escapeHtml(order.attn || "N/A")}</li>
                    <li><strong>H/P:</strong> ${escapeHtml(order.hp || "N/A")}</li>
                    <li><strong>Delivery:</strong> ${escapeHtml(order.delivery || "N/A")}</li>
                    <li><strong>Total:</strong> ${formatMoney(totalAmount)}</li>
                </ul>

                <h4 class="mt">Items (${itemsToRender.length})${urgentFlag}</h4>
                <div class="items-list-detail">${itemsListHTML || "<span>No items recorded.</span>"}</div>
                <div class="details-total-line">Total: <strong>${formatMoney(totalAmount)}</strong></div>

                ${attachmentsHTML}

                <h4 class="mt">Salesman Comment</h4>
                <div class="comment-text">${salesmanCommentContent}</div>
                ${reasonsHTML}
            </div>

            <div class="details-actions">
                ${adminCommentSection}
                <div class="action-row">${actionsHTML}</div>
            </div>
        </div>
    `;

    // Status change (admin)
    if (!isSalesmanPage && !isHistory) {
        const statusSelect = panel.querySelector(`#statusSelect_${key}`);
        if (statusSelect) {
            statusSelect.addEventListener("change", async (e) => {
                e.stopPropagation();
                const next = e.target.value;
                if (next === "Cancelled") {
                    const reason = await promptReason({
                        title: "Cancel order",
                        message: "Please provide a reason for cancelling this order.",
                        confirmLabel: "Set Cancelled",
                        danger: true,
                    });
                    if (!reason) {
                        e.target.value = order.status || "Pending";
                        return;
                    }
                    await update(ref(db, `orders/${key}`), {
                        status: "Cancelled",
                        cancelledReason: reason,
                    });
                    showToast("Order marked Cancelled.", "success");
                } else {
                    await set(ref(db, `orders/${key}/status`), next);
                    showToast(`Status → ${next}`, "success");
                }
            });
            statusSelect.addEventListener("click", (e) => e.stopPropagation());
        }

        const saveBtn = panel.querySelector(".save-admin-comment-btn-detail");
        if (saveBtn) {
            saveBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const commentInput = panel.querySelector(`#adminCommentInput_${key}`);
                set(ref(db, `orders/${key}/adminComment`), commentInput.value.trim());
                showToast("Remark saved.", "success");
            });
        }
    }

    const printBtnEl = panel.querySelector(".print-btn");
    if (printBtnEl) {
        printBtnEl.addEventListener("click", (e) => {
            e.stopPropagation();
            printOrder(key, order);
        });
    }

    // Soft delete with reason
    const deleteBtn = panel.querySelector(".delete-btn");
    if (deleteBtn && !isHistory) {
        deleteBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (deleteBtn.disabled) return;
            const reason = await promptReason({
                title: "Move order to history",
                message: "This archives the order. A reason is required for audit.",
                placeholder: "e.g. Duplicate / Customer cancelled / Wrong PO...",
                confirmLabel: "Archive",
                danger: true,
            });
            if (!reason) return;
            await update(ref(db, `orders/${key}`), {
                deleted: true,
                deleteReason: reason,
                deletedAt: Date.now(),
            });
            showToast("Order moved to history.", "success");
        });
    }

    // Edit (salesman)
    const editBtn = panel.querySelector(".edit-btn");
    if (editBtn && isSalesmanPage && !isHistory) {
        editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (editBtn.disabled) return;
            panel.classList.remove("open");
            expandedKey = null;
            if (typeof window.__ioLoadEdit === "function") {
                window.__ioLoadEdit(order, key, itemsToRender);
            }
            switchTab("new");
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // Permanent delete with reason
    const permDeleteBtn = panel.querySelector(".perm-delete-btn");
    if (permDeleteBtn) {
        permDeleteBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (permDeleteBtn.disabled) return;
            const reason = await promptReason({
                title: "Permanently delete order",
                message: "This cannot be undone. Enter a reason for the audit log (reason is not stored after delete — confirm carefully).",
                confirmLabel: "Delete forever",
                danger: true,
            });
            if (!reason) return;
            // Optional: could log to deletedOrders audit path before remove
            await set(ref(db, `deletedAudit/${key}`), {
                company: order.company || "",
                poNumber: order.poNumber || "",
                totalAmount: getOrderTotal(order),
                permDeleteReason: reason,
                deletedAt: Date.now(),
                originalTimestamp: order.timestamp || null,
            }).catch(() => {});
            await remove(ref(db, `orders/${key}`));
            showToast("Order permanently deleted.", "success");
        });
    }

    return panel;
}

function createOrderCard(key, order, isSalesmanPage, isHistory) {
    const status = order.status || "Pending";
    const statusClass = status.replace(/\s+/g, "");
    const isUrgentActive = order.isUrgent && !isHistory;
    const total = getOrderTotal(order);

    const card = document.createElement("div");
    card.className = `order-card ${isUrgentActive ? "urgent" : ""}`;
    card.setAttribute("data-key", key);
    card.setAttribute("data-status", status);
    card.setAttribute("data-admincomment", order.adminComment || "");
    card.setAttribute("data-isurgent", order.isUrgent || false);
    card.setAttribute("data-deleted", order.deleted || false);
    card.setAttribute("data-timestamp", order.timestamp);
    card.setAttribute("data-deletereason", order.deleteReason || "");
    card.setAttribute("data-cancelledreason", order.cancelledReason || "");

    const metaParts = [];
    metaParts.push(new Date(order.timestamp).toLocaleDateString());
    if (!isSalesmanPage || isHistory) {
        if (order.poNumber) metaParts.push(`PO ${escapeHtml(order.poNumber)}`);
        if (order.attn) metaParts.push(escapeHtml(order.attn));
    }
    if (order.adminComment && order.adminComment.trim() !== "") {
        metaParts.push(`<span class="has-comment-flag">Remark</span>`);
    }
    if ((order.attachments || []).length) {
        metaParts.push(`<span class="has-attach-flag">📎 ${(order.attachments || []).length}</span>`);
    }

    const main = document.createElement("div");
    main.className = "order-card-main";
    main.innerHTML = `
        <div class="order-card-top">
            <span class="order-card-company">
                ${isUrgentActive ? '<span class="order-card-urgent-flag">🚨 URGENT</span>' : ""}${escapeHtml(order.company || "N/A")}
            </span>
            <span class="pill pill-${statusClass}">${escapeHtml(status)}</span>
        </div>
        <div class="order-card-bottom">
            <div class="order-card-meta">${metaParts.map((p) => `<span>${p}</span>`).join("")}</div>
            <div class="order-card-total">${formatMoney(total)}</div>
        </div>
    `;

    card.appendChild(main);
    const detailsPanel = buildDetailsPanel(key, order, isSalesmanPage, isHistory);
    card.appendChild(detailsPanel);

    main.addEventListener("click", () => {
        if (expandedKey === key) {
            detailsPanel.classList.remove("open");
            expandedKey = null;
        } else {
            document.querySelectorAll(".order-card-details.open").forEach((p) => p.classList.remove("open"));
            detailsPanel.classList.add("open");
            expandedKey = key;
        }
    });

    return card;
}

// =========================================================
// 5c. Filter / group / render
// =========================================================
function filterAndRenderOrders(allData, container, isSalesmanPage, isHistory) {
    if (!allData || !container) return;

    const searchTerm = isHistory ? "" : searchInput ? searchInput.value.toLowerCase().trim() : "";
    container.innerHTML = "";

    const grouped = {
        Pending: [],
        Ordered: [],
        "Follow Up": [],
        "Pending Payment": [],
        Completed: [],
        Cancelled: [],
    };

    const filteredOrders = Object.entries(allData).filter(([, order]) => {
        const isDeleted = order.deleted;
        if (isHistory !== !!isDeleted) return false;

        if (!isHistory && searchTerm) {
            const itemsToRender = order.orderItems || order.items || [];
            const total = getOrderTotal(order);
            const moneyStr = formatMoney(total).toLowerCase();
            const rawTotal = total.toFixed(2);
            const totalInt = String(Math.floor(total));
            const base = `${order.company || ""} ${order.poNumber || ""} ${order.attn || ""} ${order.hp || ""}`.toLowerCase();
            const itemsStr = itemsToRender
                .map((item) => `${item.itemCode || ""} ${item.itemDesc || ""}`)
                .join(" ")
                .toLowerCase();
            const combined = `${base} ${itemsStr} ${moneyStr} ${rawTotal} ${totalInt} rm ${total}`;
            if (!combined.includes(searchTerm)) return false;
        }
        return true;
    });

    filteredOrders.forEach(([key, order]) => {
        const status = order.status || "Pending";
        if (grouped[status]) grouped[status].push({ key, order });
        else grouped.Pending.push({ key, order });
    });

    let statusOrder = ["Pending", "Ordered", "Follow Up", "Pending Payment", "Completed", "Cancelled"];
    if (isHistory) {
        statusOrder = ["History"];
        grouped.History = filteredOrders.map(([key, order]) => ({ key, order }));
    }

    const renderGroup = (groupData, isHistoryGroup) => {
        if (groupData.length === 0) return null;
        const wrap = document.createElement("div");
        groupData
            .sort((a, b) => b.order.timestamp - a.order.timestamp)
            .forEach(({ key, order }) => {
                wrap.appendChild(createOrderCard(key, order, isSalesmanPage, isHistoryGroup));
            });
        return wrap;
    };

    if (isHistory) {
        if (!grouped.History.length) {
            container.innerHTML = "<p class='no-items'>No deleted orders found in history.</p>";
            return;
        }
        container.appendChild(renderGroup(grouped.History, true));
        return;
    }

    let ordersFound = false;
    statusOrder.forEach((status) => {
        if (grouped[status].length > 0) {
            ordersFound = true;
            const dotClass = status.replace(/\s+/g, "");
            const groupHeader = document.createElement("h3");
            groupHeader.className = "status-group-header";
            groupHeader.innerHTML = `<span class="group-dot ${dotClass}"></span> ${status} (${grouped[status].length})`;
            const groupBody = renderGroup(grouped[status], false);

            if (collapsedGroups[status]) {
                groupHeader.classList.add("collapsed");
                groupBody.style.display = "none";
            }

            groupHeader.addEventListener("click", () => {
                const isCollapsed = groupHeader.classList.toggle("collapsed");
                groupBody.style.display = isCollapsed ? "none" : "block";
                collapsedGroups[status] = isCollapsed;
            });

            container.appendChild(groupHeader);
            container.appendChild(groupBody);
        }
    });

    if (!ordersFound) {
        container.innerHTML = "<p class='no-items'>No active orders match the search criteria.</p>";
    }
}

// =========================================================
// 6. RTDB listeners
// =========================================================
if (ordersContainer || historyContainer) {
    let allOrdersData = null;
    const twentyFourHours = 24 * 60 * 60 * 1000;

    onValue(ref(db, "orders"), (snapshot) => {
        const newOrdersData = snapshot.val();

        // Auto soft-delete completed orders after 24h (by order timestamp)
        if (newOrdersData) {
            Object.entries(newOrdersData).forEach(([key, order]) => {
                if (order.status === "Completed" && !order.deleted) {
                    const timeDifference = Date.now() - (order.timestamp || 0);
                    if (timeDifference >= twentyFourHours) {
                        update(ref(db, `orders/${key}`), {
                            deleted: true,
                            deleteReason: order.deleteReason || "Auto-archived 24h after completion",
                            deletedAt: Date.now(),
                        }).catch((e) => console.error("Auto-delete failed:", e));
                    }
                }
            });
        }

        let activeOrders = [];
        if (newOrdersData) {
            activeOrders = Object.values(newOrdersData).filter((order) => !order.deleted);
        }
        const currentOrderCount = activeOrders.length;
        const currentUrgentOrderCount = activeOrders.filter((order) => order.isUrgent).length;

        if (activeCountEl) activeCountEl.textContent = currentOrderCount ? `(${currentOrderCount})` : "";
        if (activeUrgentDotEl) activeUrgentDotEl.classList.toggle("show", currentUrgentOrderCount > 0);

        if (!isSalesman && newOrdersData) {
            if (lastOrderCount > 0 && currentOrderCount > lastOrderCount) {
                if (currentUrgentOrderCount > lastUrgentOrderCount && urgentAudio) {
                    urgentAudio.play().catch(() => {});
                } else if (normalAudio) {
                    normalAudio.play().catch(() => {});
                }
            }
            lastOrderCount = currentOrderCount;
            lastUrgentOrderCount = currentUrgentOrderCount;
        }

        allOrdersData = newOrdersData;

        if (ordersContainer) {
            filterAndRenderOrders(allOrdersData, ordersContainer, isSalesman, false);
        }
        if (historyContainer) {
            filterAndRenderOrders(allOrdersData, historyContainer, isSalesman, true);
        }
    });

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            filterAndRenderOrders(allOrdersData, ordersContainer, isSalesman, false);
        });
    }
}
