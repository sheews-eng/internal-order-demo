import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// =========================================================
// 🚨 Firebase 配置
// =========================================================
const firebaseConfig = {
  apiKey: "AIzaSyCmb4nfpaFMv1Ix4hbMwU2JlYCq6I46ou4",
  authDomain: "internal-orders-765dd.firebaseapp.com",
  databaseURL: "https://internal-orders-765dd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "internal-orders-765dd",
  storageBucket: "internal-orders-765dd.firebasestorage.app",
  messagingSenderId: "778145240016",
  appId: "1:778145240016:web:b976e9bac38a86d3381fd5",
  measurementId: "G-H0FVWM7V1R"
};
// =========================================================

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const form = document.getElementById("order-form");
const isSalesman = form !== null;
const ordersContainer = document.getElementById("orders-container");
const historyContainer = document.getElementById("history-container");
const searchInput = document.getElementById("orderSearch");

// Salesman 多商品状态
let currentItems = [];
let renderItemList;
let currentEditKey = null;

// 存储当前折叠状态 / 展开的卡片
let collapsedGroups = {};
let expandedKey = null;

// =========================================================
// Tab switching (generic — works on both salesman.html and admin.html)
// =========================================================
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

function switchTab(name) {
    tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    tabPanels.forEach(p => p.classList.toggle('active', p.dataset.panel === name));
}

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// =========================================================
// 🔔 Admin 警报声逻辑
// =========================================================
let lastOrderCount = 0;
let lastUrgentOrderCount = 0;
let normalAudio;
let urgentAudio;
if (!isSalesman) {
    normalAudio = new Audio('/ding.mp3');
    urgentAudio = new Audio('/urgent.mp3');
}

const activeCountEl = document.getElementById('activeCount');
const activeUrgentDotEl = document.getElementById('activeUrgentDot');

// --- 通用函数: 安全地获取价格值 ---
function getPriceValue(item) {
    let price = item.price;
    if (typeof price === 'string') {
        price = parseFloat(price.replace('RM ', '')) || 0;
    } else if (typeof price !== 'number') {
        price = 0;
    }
    return price;
}

// --- Salesman 功能 (多商品/编辑逻辑) ---
if (isSalesman) {
    const addItemBtn = document.getElementById("addItemBtn");
    const itemListContainer = document.getElementById("item-list-container");
    const submitBtn = form.querySelector('.submit-order-btn');

    let updateFormUI = (isEditing) => {
        const existingCancel = form.querySelector('.cancel-edit-btn');
        if (existingCancel) existingCancel.remove();

        if (isEditing) {
            submitBtn.textContent = "Update Order";
            submitBtn.classList.add('update-mode');

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.textContent = 'Cancel Edit';
            cancelBtn.className = 'cancel-edit-btn btn btn-secondary';
            cancelBtn.addEventListener('click', resetForm);
            submitBtn.parentNode.insertBefore(cancelBtn, submitBtn);
        } else {
            submitBtn.textContent = "Submit Order";
            submitBtn.classList.remove('update-mode');
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
        renderItemList();
        updateFormUI(false);
    };

    renderItemList = function () {
        itemListContainer.innerHTML = "";
        if (currentItems.length === 0) {
            itemListContainer.innerHTML = "<p class='no-items'>No items added yet. Click 'Add Item' above.</p>";
            return;
        }

        currentItems.forEach((item, index) => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "item-preview";

            const priceValue = getPriceValue(item);

            itemDiv.innerHTML = `
                <div class="item-detail-row">
                    <label>Item Description: <input type="text" value="${item.itemDesc || ''}" data-field="itemDesc" data-index="${index}"></label>
                </div>
                <div class="item-detail-row">
                    <label>Units: <input type="number" value="${item.units}" data-field="units" data-index="${index}" min="1"></label>
                    <label>Price (RM): <input type="number" value="${priceValue.toFixed(2)}" data-field="price" data-index="${index}" step="0.01" min="0.01"></label>
                </div>
            `;

            const removeBtn = document.createElement("button");
            removeBtn.textContent = "Remove";
            removeBtn.className = "remove-item-btn";
            removeBtn.addEventListener("click", () => {
                currentItems.splice(index, 1);
                renderItemList();
            });

            const inputFields = itemDiv.querySelectorAll('input');
            inputFields.forEach(input => {
                input.addEventListener('change', (e) => {
                    const idx = parseInt(e.target.dataset.index);
                    const field = e.target.dataset.field;
                    let value = e.target.value;

                    if (field === 'units') {
                        value = Math.max(1, parseInt(value) || 1);
                        e.target.value = value;
                        currentItems[idx].units = value;
                    } else if (field === 'price') {
                        value = parseFloat(value) || 0.01;
                        e.target.value = value.toFixed(2);
                        currentItems[idx].price = `RM ${value.toFixed(2)}`;
                    } else if (field === 'itemDesc') {
                        currentItems[idx].itemDesc = value;
                    }
                });
            });

            const actionRow = document.createElement('div');
            actionRow.className = 'item-action-row';
            actionRow.appendChild(removeBtn);

            itemDiv.appendChild(actionRow);
            itemListContainer.appendChild(itemDiv);
        });
    };

    addItemBtn.addEventListener("click", () => {
        const itemDesc = document.getElementById("itemDesc").value;
        const units = document.getElementById("units").value;
        const price = document.getElementById("price").value;

        if (units <= 0 || price <= 0) {
            console.warn("Please enter valid item units and price (must be greater than 0).");
            return;
        }

        currentItems.push({
            itemDesc: itemDesc,
            units: parseInt(units),
            price: `RM ${parseFloat(price).toFixed(2)}`
        });

        document.getElementById("itemDesc").value = "";
        document.getElementById("units").value = "1";
        document.getElementById("price").value = "0.00";
        renderItemList();
    });

    form.addEventListener("submit", e => {
        e.preventDefault();

        if (currentItems.length === 0) {
            console.warn("Please add at least one item to the order before submitting.");
            return;
        }

        const invalidItem = currentItems.find(item => item.units <= 0 || getPriceValue(item) <= 0);
        if (invalidItem) {
            console.warn("Please ensure all item units and prices are valid and non-zero.");
            return;
        }

        const newSalesmanComment = form.salesmanComment?.value.trim() ?? "";
        const isUrgent = form.isUrgent?.checked ?? false;

        let existingOrderData = {};
        if (currentEditKey) {
            const existingCard = document.querySelector(`.order-card[data-key="${currentEditKey}"]`);
            if (existingCard) {
                existingOrderData.status = existingCard.dataset.status || "Pending";
                existingOrderData.deleted = existingCard.dataset.deleted === 'true';
                existingOrderData.timestamp = parseInt(existingCard.dataset.timestamp) || Date.now();
                existingOrderData.adminComment = existingCard.dataset.admincomment || "";
            }
        }

        const data = {
            company: form.company?.value ?? "",
            attn: form.attn?.value ?? "",
            hp: form.hp?.value ?? "",
            poNumber: form.poNumber?.value ?? "",
            delivery: form.delivery?.value ?? "",

            orderItems: currentItems,
            status: existingOrderData.status || "Pending",
            deleted: existingOrderData.deleted || false,
            timestamp: existingOrderData.timestamp || Date.now(),

            salesmanComment: newSalesmanComment,
            adminComment: existingOrderData.adminComment || "",
            isUrgent: isUrgent
        };

        if (currentEditKey) {
            set(ref(db, `orders/${currentEditKey}`), data)
                .then(() => {
                    console.log(`Order ${currentEditKey} updated successfully.`);
                    resetForm();
                    switchTab('active');
                })
                .catch(error => console.error("Update failed:", error));
        } else {
            const ordersRef = ref(db, "orders");
            push(ordersRef, data);
            resetForm();
            switchTab('active');
        }
    });

    renderItemList();

    const originalUpdateFormUI = updateFormUI;
    updateFormUI = (isEditing) => {
        originalUpdateFormUI(isEditing);
        if (isEditing && currentEditKey) {
            const existingCard = document.querySelector(`.order-card[data-key="${currentEditKey}"]`);
            if (existingCard && form.isUrgent) {
                form.isUrgent.checked = existingCard.dataset.isurgent === 'true';
            }
        }
    };
}

// =========================================================
// Helper: build the expandable details panel for an order card
// =========================================================
function buildDetailsPanel(key, order, isSalesmanPage, isHistory) {
    const itemsToRender = order.orderItems || order.items || [];

    const totalAmount = itemsToRender.reduce((sum, item) => {
        const price = getPriceValue(item);
        return sum + (price * (item.units || 0));
    }, 0);

    const itemsListHTML = itemsToRender.map(item => {
        const itemDescDisplay = item.itemDesc || 'N/A (No Description)';
        return `<span>${itemDescDisplay} (${item.units} x ${item.price})</span>`;
    }).join('');

    const adminCommentContent = order.adminComment && order.adminComment.trim() !== ""
        ? `<span class="comment-highlight">${order.adminComment}</span>`
        : 'N/A';

    const salesmanCommentContent = order.salesmanComment && order.salesmanComment.trim() !== ""
        ? `<span class="comment-highlight">${order.salesmanComment}</span>`
        : 'N/A';

    let adminCommentSection = '';
    if (!isSalesmanPage && !isHistory) {
        adminCommentSection = `
            <h4 class="mt">Admin Remark</h4>
            <textarea id="adminCommentInput_${key}" class="admin-comment-detail-input">${order.adminComment || ''}</textarea>
            <button class="save-admin-comment-btn-detail" data-key="${key}">Save Remark</button>
        `;
    } else {
        adminCommentSection = `
            <h4 class="mt">Admin Remark</h4>
            <div class="comment-text">${adminCommentContent}</div>
        `;
    }

    let actionsHTML = '';
    const isCompleted = order.status === "Completed";

    if (!isHistory) {
        if (!isSalesmanPage) {
            const statusOptions = ["Pending", "Ordered", "Completed", "Pending Payment", "Follow Up"];
            const statusSelectHTML = `<select id="statusSelect_${key}" title="Change Status">
                ${statusOptions.map(s => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>`;

            actionsHTML = `
                ${statusSelectHTML}
                <button class="action-btn delete-btn" data-key="${key}" ${isCompleted ? 'disabled title="Completed orders must be permanently deleted by Admin from history."' : ''}>Delete</button>
            `;
        } else {
            actionsHTML = `
                <button class="action-btn edit-btn" data-key="${key}" ${isCompleted ? 'disabled title="Completed orders cannot be edited."' : ''}>Edit</button>
                <button class="action-btn delete-btn" data-key="${key}" ${isCompleted ? 'disabled title="Completed orders must be permanently deleted by Admin from history."' : ''}>Delete</button>
            `;
        }
    } else {
        if (!isSalesmanPage) {
            const timeDifference = Date.now() - order.timestamp;
            const twentyFourHours = 24 * 60 * 60 * 1000;
            const isTooSoon = isCompleted && (timeDifference < twentyFourHours);
            const timeRemaining = isTooSoon ? twentyFourHours - timeDifference : 0;
            const hours = Math.floor(timeRemaining / 3600000);
            const minutes = Math.floor((timeRemaining % 3600000) / 60000);
            const title = isTooSoon
                ? `Must wait ${hours}h ${minutes}m (24 hours after completion) to permanently delete.`
                : "Permanently delete this order.";

            actionsHTML = `
                <button class="action-btn perm-delete-btn" data-key="${key}" ${isTooSoon ? 'disabled' : ''} title="${title}">Permanent Delete</button>
            `;
        }
    }

    const urgentFlag = order.isUrgent ? ' - 🚨 URGENT' : '';

    const panel = document.createElement('div');
    panel.className = 'order-card-details';
    panel.setAttribute('data-key', `details-${key}`);

    panel.innerHTML = `
        <div class="details-content-grid">
            <div class="details-info">
                <h4>Order Details</h4>
                <ul>
                    <li><strong>Date:</strong> ${new Date(order.timestamp).toLocaleDateString()}</li>
                    <li><strong>Company:</strong> ${order.company || 'N/A'}</li>
                    <li><strong>PO #:</strong> ${order.poNumber || 'N/A'}</li>
                    <li><strong>ATTN:</strong> ${order.attn || 'N/A'}</li>
                    <li><strong>H/P:</strong> ${order.hp || 'N/A'}</li>
                    <li><strong>Delivery:</strong> ${order.delivery || 'N/A'}</li>
                </ul>

                <h4 class="mt">Items & Total (${itemsToRender.length} items)${urgentFlag}: RM ${totalAmount.toFixed(2)}</h4>
                <div class="items-list-detail">${itemsListHTML || '<span>No items recorded.</span>'}</div>

                <h4 class="mt">Salesman Comment</h4>
                <div class="comment-text">${salesmanCommentContent}</div>
            </div>

            <div class="details-actions">
                ${adminCommentSection}
                <div class="action-row">${actionsHTML}</div>
            </div>
        </div>
    `;

    if (!isSalesmanPage && !isHistory) {
        const statusSelect = panel.querySelector(`#statusSelect_${key}`);
        if (statusSelect) {
            statusSelect.addEventListener("change", (e) => {
                set(ref(db, `orders/${key}/status`), e.target.value);
            });
            statusSelect.addEventListener("click", (e) => e.stopPropagation());
        }

        const saveBtn = panel.querySelector(`.save-admin-comment-btn-detail`);
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const commentInput = panel.querySelector(`#adminCommentInput_${key}`);
                set(ref(db, `orders/${key}/adminComment`), commentInput.value.trim());
            });
        }
    }

    const deleteBtn = panel.querySelector('.delete-btn');
    if (deleteBtn && !isHistory) {
        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (deleteBtn.disabled) return;
            if (window.confirm("Are you sure you want to move this order to history (soft delete)?")) {
                set(ref(db, `orders/${key}/deleted`), true);
            }
        });
    }

    const editBtn = panel.querySelector('.edit-btn');
    if (editBtn && isSalesmanPage && !isHistory) {
        editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (editBtn.disabled) return;

            panel.classList.remove('open');
            expandedKey = null;

            currentEditKey = key;
            if (form.company) form.company.value = order.company || "";
            if (form.attn) form.attn.value = order.attn || "";
            if (form.hp) form.hp.value = order.hp || "";
            if (form.poNumber) form.poNumber.value = order.poNumber || "";
            if (form.delivery) form.delivery.value = order.delivery || "";
            if (form.salesmanComment) form.salesmanComment.value = order.salesmanComment || '';
            if (form.isUrgent) form.isUrgent.checked = order.isUrgent || false;

            currentItems = JSON.parse(JSON.stringify(itemsToRender));
            renderItemList();
            updateFormUI(true);

            switchTab('new');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const permDeleteBtn = panel.querySelector('.perm-delete-btn');
    if (permDeleteBtn) {
        permDeleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (permDeleteBtn.disabled) return;
            if (window.confirm("Are you sure you want to permanently delete this order? This action cannot be undone.")) {
                remove(ref(db, `orders/${key}`));
            }
        });
    }

    return panel;
}

// =========================================================
// Helper: build one order card (header + collapsed details)
// =========================================================
function createOrderCard(key, order, isSalesmanPage, isHistory) {
    const status = order.status || 'Pending';
    const statusClass = status.replace(/\s+/g, '');
    const isUrgentActive = order.isUrgent && !isHistory;

    const card = document.createElement('div');
    card.className = `order-card ${isUrgentActive ? 'urgent' : ''}`;
    card.setAttribute('data-key', key);
    card.setAttribute('data-status', status);
    card.setAttribute('data-admincomment', order.adminComment || '');
    card.setAttribute('data-isurgent', order.isUrgent || false);
    card.setAttribute('data-deleted', order.deleted || false);
    card.setAttribute('data-timestamp', order.timestamp);

    const metaParts = [];
    metaParts.push(new Date(order.timestamp).toLocaleDateString());
    if (!isSalesmanPage || isHistory) {
        if (order.poNumber) metaParts.push(`PO ${order.poNumber}`);
        if (order.attn) metaParts.push(order.attn);
    }
    if (order.adminComment && order.adminComment.trim() !== "") {
        metaParts.push(`<span class="has-comment-flag">Remark added</span>`);
    }

    const main = document.createElement('div');
    main.className = 'order-card-main';
    main.innerHTML = `
        <div class="order-card-top">
            <span class="order-card-company">
                ${isUrgentActive ? '<span class="order-card-urgent-flag">🚨 URGENT</span>' : ''}${order.company || 'N/A'}
            </span>
            <span class="pill pill-${statusClass}">${status}</span>
        </div>
        <div class="order-card-meta">${metaParts.map(p => `<span>${p}</span>`).join('')}</div>
    `;

    card.appendChild(main);

    const detailsPanel = buildDetailsPanel(key, order, isSalesmanPage, isHistory);
    card.appendChild(detailsPanel);

    main.addEventListener('click', () => {
        if (expandedKey === key) {
            detailsPanel.classList.remove('open');
            expandedKey = null;
        } else {
            document.querySelectorAll('.order-card-details.open').forEach(p => p.classList.remove('open'));
            detailsPanel.classList.add('open');
            expandedKey = key;
        }
    });

    return card;
}

// =========================================================
// Filter, group, and render orders as cards
// =========================================================
function filterAndRenderOrders(allData, container, isSalesman, isHistory) {
    if (!allData || !container) return;

    const searchTerm = isHistory ? '' : (searchInput ? searchInput.value.toLowerCase().trim() : '');
    container.innerHTML = "";

    const grouped = {
        "Pending": [],
        "Ordered": [],
        "Follow Up": [],
        "Pending Payment": [],
        "Completed": []
    };

    const filteredOrders = Object.entries(allData).filter(([key, order]) => {
        const isDeleted = order.deleted;
        if (isHistory !== isDeleted) return false;

        if (!isHistory) {
            const baseSearchString = `${order.company || ''} ${order.poNumber || ''} ${order.attn || ''}`.toLowerCase();
            const itemsToRender = order.orderItems || order.items || [];
            const itemSearchString = itemsToRender.map(item => (item.itemDesc || '')).join(' ').toLowerCase();
            const combinedSearchString = `${baseSearchString} ${itemSearchString}`;

            if (searchTerm && !combinedSearchString.includes(searchTerm)) {
                return false;
            }
        }
        return true;
    });

    filteredOrders.forEach(([key, order]) => {
        const status = order.status || "Pending";
        if (grouped[status]) {
            grouped[status].push({ key, order });
        } else {
            grouped["Pending"].push({ key, order });
        }
    });

    let statusOrder = ["Pending", "Ordered", "Follow Up", "Pending Payment", "Completed"];
    if (isHistory) {
        statusOrder = ["History"];
        grouped["History"] = filteredOrders.map(([key, order]) => ({ key, order }));
    }

    const renderGroup = (groupData, isHistoryGroup) => {
        if (groupData.length === 0) return null;

        const wrap = document.createElement('div');
        groupData
            .sort((a, b) => b.order.timestamp - a.order.timestamp)
            .forEach(({ key, order }) => {
                wrap.appendChild(createOrderCard(key, order, isSalesman, isHistoryGroup));
            });
        return wrap;
    };

    if (isHistory) {
        if (grouped["History"].length === 0) {
            container.innerHTML = "<p class='no-items'>No deleted orders found in history.</p>";
            return;
        }
        container.appendChild(renderGroup(grouped["History"], true));
        return;
    }

    let ordersFound = false;
    statusOrder.forEach(status => {
        if (grouped[status].length > 0) {
            ordersFound = true;

            const dotClass = status.replace(/\s+/g, '');
            const groupHeader = document.createElement("h3");
            groupHeader.className = 'status-group-header';
            groupHeader.innerHTML = `<span class="group-dot ${dotClass}"></span> ${status} (${grouped[status].length})`;

            const groupBody = renderGroup(grouped[status], false);

            if (collapsedGroups[status]) {
                groupHeader.classList.add('collapsed');
                groupBody.style.display = 'none';
            }

            groupHeader.addEventListener('click', () => {
                const isCollapsed = groupHeader.classList.toggle('collapsed');
                groupBody.style.display = isCollapsed ? 'none' : 'block';
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
// Firebase 监听器
// =========================================================
if (ordersContainer || historyContainer) {
    let allOrdersData = null;
    const twentyFourHours = 24 * 60 * 60 * 1000;

    onValue(ref(db, "orders"), snapshot => {
        const newOrdersData = snapshot.val();

        // 自动软删除逻辑 (Admin 页面自动执行)
        if (newOrdersData) {
            Object.entries(newOrdersData).forEach(([key, order]) => {
                if (order.status === "Completed" && !order.deleted) {
                    const completionTime = order.timestamp;
                    const timeDifference = Date.now() - completionTime;

                    if (timeDifference >= twentyFourHours) {
                        set(ref(db, `orders/${key}/deleted`), true)
                            .then(() => console.log(`Auto-deleted (moved to history): Order ${key}`))
                            .catch(e => console.error("Auto-delete failed:", e));
                    }
                }
            });
        }

        // 计算激活订单数量 + 徽章
        let activeOrders = [];
        if (newOrdersData) {
            activeOrders = Object.values(newOrdersData).filter(order => !order.deleted);
        }
        const currentOrderCount = activeOrders.length;
        const currentUrgentOrderCount = activeOrders.filter(order => order.isUrgent).length;

        if (activeCountEl) activeCountEl.textContent = currentOrderCount ? `(${currentOrderCount})` : '';
        if (activeUrgentDotEl) activeUrgentDotEl.classList.toggle('show', currentUrgentOrderCount > 0);

        // 警报声逻辑 (Admin Only)
        if (!isSalesman && newOrdersData) {
            if (lastOrderCount > 0 && currentOrderCount > lastOrderCount) {
                if (currentUrgentOrderCount > lastUrgentOrderCount && urgentAudio) {
                    urgentAudio.play().catch(e => console.log("Urgent audio play failed:", e));
                } else if (normalAudio) {
                    normalAudio.play().catch(e => console.log("Normal audio play failed:", e));
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
        searchInput.addEventListener('input', () => {
            filterAndRenderOrders(allOrdersData, ordersContainer, isSalesman, false);
        });
    }
}
