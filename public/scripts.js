import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// =========================================================
// 🚨 IMPORTANT: 您的 Firebase 配置 
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

// 存储当前折叠状态
let collapsedGroups = {}; 
// 存储当前展开的详情行 Key
let expandedKey = null;

// 🔔 Admin 警报声逻辑
let lastOrderCount = 0;
let lastUrgentOrderCount = 0; 
let normalAudio;
let urgentAudio;
if (!isSalesman) {
    // 假设 ding.mp3 和 urgent.mp3 在根目录下
    normalAudio = new Audio('/ding.mp3'); 
    urgentAudio = new Audio('/urgent.mp3'); 
}

// --- 通用函数: 安全地获取价格值 ---
function getPriceValue(item) {
    let price = item.price;
    if (typeof price === 'string') {
        // 如果是字符串，移除 RM 前缀
        price = parseFloat(price.replace('RM ', '')) || 0;
    } else if (typeof price !== 'number') {
        // 如果既不是字符串也不是数字（可能是 undefined/null），则设为 0
        price = 0;
    }
    // 如果 price 已经是数字，则直接使用
    return price;
}

// --- Salesman 功能 (多商品/编辑逻辑) ---
if (isSalesman) {
    const addItemBtn = document.getElementById("addItemBtn");
    const itemListContainer = document.getElementById("item-list-container");
    const submitBtn = form.querySelector('.submit-order-btn');
    
    // 🌟 修复 const 赋值错误：使用 let 声明，允许后续重新赋值/扩展
    let updateFormUI = (isEditing) => {
        const existingCancel = form.querySelector('.cancel-edit-btn');
        if (existingCancel) existingCancel.remove();

        if (isEditing) {
            submitBtn.textContent = "Update Order";
            submitBtn.classList.add('update-mode');
            
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.textContent = 'Cancel Edit';
            cancelBtn.className = 'cancel-edit-btn';
            cancelBtn.addEventListener('click', resetForm);
            submitBtn.parentNode.insertBefore(cancelBtn, submitBtn);
        } else {
            submitBtn.textContent = "Submit Order";
            submitBtn.classList.remove('update-mode');
        }
    };
    
    // ✅ 重置表单: 使用 if 检查确保元素存在，再进行赋值
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

    // 渲染商品列表
    renderItemList = function() {
        itemListContainer.innerHTML = "";
        if (currentItems.length === 0) {
            itemListContainer.innerHTML = "<p class='no-items'>No items added yet. Click 'Add Item' above.</p>";
            return;
        }

        currentItems.forEach((item, index) => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "card item-preview editable-item";
            
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
    
    // 添加商品按钮
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

    
    // 提交/更新订单
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
        
        // 核心修复: 使用可选链 (?.) 和空值合并运算符 (?? "") 确保即使 form.fieldName 为 undefined 也不会报错
        const newSalesmanComment = form.salesmanComment?.value.trim() ?? ""; 
        const isUrgent = form.isUrgent?.checked ?? false; 

        // 获取现有订单数据，用于更新模式
        let existingOrderData = {};
        if (currentEditKey) {
            const existingRow = document.querySelector(`tr[data-key="${currentEditKey}"]`);
            if (existingRow) {
                existingOrderData.status = existingRow.dataset.status || "Pending";
                existingOrderData.deleted = existingRow.dataset.deleted === 'true';
                existingOrderData.timestamp = parseInt(existingRow.dataset.timestamp) || Date.now();
                existingOrderData.adminComment = existingRow.dataset.admincomment || "";
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
                })
                .catch(error => console.error("Update failed:", error));
        } else {
            const ordersRef = ref(db, "orders");
            push(ordersRef, data);
            resetForm();
        }
    });

    renderItemList(); 
    
    // 扩展 updateFormUI 逻辑以加载 Urgent 状态
    const originalUpdateFormUI = updateFormUI;
    updateFormUI = (isEditing) => {
        originalUpdateFormUI(isEditing);
        if (isEditing && currentEditKey) {
             const existingCard = document.querySelector(`tr[data-key="${currentEditKey}"]`);
             if (existingCard && form.isUrgent) {
                 form.isUrgent.checked = existingCard.dataset.isurgent === 'true';
             }
        }
    };
    
}

// --- Helper: 创建详情行 ---
function createDetailsRow(key, order, isSalesmanPage, isHistory) {
    // 兼容旧的 'items' 字段
    const itemsToRender = order.orderItems || order.items || []; 
    
    const totalAmount = (itemsToRender).reduce((sum, item) => {
        const price = getPriceValue(item);
        return sum + (price * (item.units || 0));
    }, 0);
    
    const itemsListHTML = (itemsToRender).map(item => {
        const itemDescDisplay = item.itemDesc || 'N/A (No Description)';
        // 使用 item.price (RM XX.XX) 保持显示一致性
        return `<span>${itemDescDisplay} (${item.units} x ${item.price})</span>`; 
    }).join('');

    let adminCommentSection = '';
    const adminCommentContent = order.adminComment && order.adminComment.trim() !== "" 
        ? `<span class="comment-highlight">${order.adminComment}</span>` 
        : 'N/A';
    
    // 🌟 1. Salesman Comment 恢复高亮
    const salesmanCommentContent = order.salesmanComment && order.salesmanComment.trim() !== "" 
        ? `<span class="comment-highlight">${order.salesmanComment}</span>` 
        : 'N/A';


    if (!isSalesmanPage && !isHistory) {
        // Admin Page: 可编辑输入框
        adminCommentSection = `
            <h4>Admin Remark</h4>
            <textarea id="adminCommentInput_${key}" class="admin-comment-detail-input">${order.adminComment || ''}</textarea>
            <button class="save-admin-comment-btn-detail" data-key="${key}">Save Remark</button>
        `;
    } else {
        // Salesman Page / History: 只显示
        adminCommentSection = `
            <h4>Admin Remark:</h4>
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

    // colspan 总是 6 (Admin/History 视图)
    // ⚠️ 注意：这里必须是 6，因为 Admin/History 视图有 6 列，而 Salesman 视图在 createOrderRow 被设置为 3 列，但详情行必须跨越 Admin 视图的完整宽度。
    const colspanCount = isSalesmanPage && !isHistory ? 3 : 6; 
    
    const detailRow = document.createElement('tr');
    detailRow.className = 'details-row';
    detailRow.setAttribute('data-key', `details-${key}`);
    detailRow.style.display = 'none';
    
    const urgentFlag = order.isUrgent ? ' - 🚨 URGENT' : '';
    
    detailRow.innerHTML = `
        <td colspan="${colspanCount}">
            <div class="details-content">
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

                    <h4 style="margin-top: 15px;">Items & Total (${itemsToRender.length} items)${urgentFlag}: RM ${totalAmount.toFixed(2)}</h4>
                    <div class="items-list-detail">${itemsListHTML || '<span>No items recorded.</span>'}</div>
                    
                    <h4 style="margin-top: 15px;">Salesman Comment:</h4>
                    <div class="comment-text">${salesmanCommentContent}</div>
                </div>
                
                <div class="details-actions">
                    ${adminCommentSection}
                    <div style="margin-top: 10px;">${actionsHTML}</div>
                </div>
            </div>
        </td>
    `;
    
    if (!isSalesmanPage && !isHistory) {
        const statusSelect = detailRow.querySelector(`#statusSelect_${key}`);
        if (statusSelect) {
            statusSelect.addEventListener("change", (e) => {
                set(ref(db, `orders/${key}/status`), e.target.value);
            });
        }
        
        const saveBtn = detailRow.querySelector(`.save-admin-comment-btn-detail`);
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const commentInput = detailRow.querySelector(`#adminCommentInput_${key}`);
                set(ref(db, `orders/${key}/adminComment`), commentInput.value.trim());
            });
        }
    }
    
    // Delete/Move to History
    const deleteBtn = detailRow.querySelector('.delete-btn');
    if (deleteBtn && !isHistory) {
        deleteBtn.addEventListener("click", () => {
            if (deleteBtn.disabled) return;
            if (window.confirm("Are you sure you want to move this order to history (soft delete)?")) {
                set(ref(db, `orders/${key}/deleted`), true);
            }
        });
    }

    // Salesman Edit button handler
    const editBtn = detailRow.querySelector('.edit-btn');
    if (editBtn && isSalesmanPage && !isHistory) {
        editBtn.addEventListener("click", () => {
            if (editBtn.disabled) return; 
            
            // 隐藏详情行
            document.querySelector(`tr[data-key="details-${key}"]`)?.style.setProperty('display', 'none');
            expandedKey = null;

            // 加载数据到表单
            currentEditKey = key; 
            if (form.company) form.company.value = order.company || "";
            if (form.attn) form.attn.value = order.attn || "";
            if (form.hp) form.hp.value = order.hp || "";
            if (form.poNumber) form.poNumber.value = order.poNumber || "";
            if (form.delivery) form.delivery.value = order.delivery || "";
            if (form.salesmanComment) form.salesmanComment.value = order.salesmanComment || '';
            
            if (form.isUrgent) form.isUrgent.checked = order.isUrgent || false;
            
            currentItems = JSON.parse(JSON.stringify(itemsToRender)); // 深拷贝
            renderItemList(); 
            updateFormUI(true); 
            
            // 滚动到表单顶部
            form.scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    // Permanent Delete (Admin Only, in History)
    const permDeleteBtn = detailRow.querySelector('.perm-delete-btn');
    if (permDeleteBtn) {
        permDeleteBtn.addEventListener("click", () => {
            if (permDeleteBtn.disabled) return;
            if (window.confirm("Are you sure you want to permanently delete this order? This action cannot be undone.")) {
                remove(ref(db, `orders/${key}`));
            }
        });
    }

    return detailRow;
}


// --- Helper: 创建表格主行 ---
function createOrderRow(key, order, isSalesmanPage, isHistory) {
    const urgentClass = order.isUrgent && !isHistory ? 'status-urgent' : ''; 
    const tr = document.createElement('tr');
    tr.className = `status-${(order.status || '').replace(/\s+/g, '')} ${order.adminComment && order.adminComment.trim() !== "" ? 'has-comment' : ''} ${urgentClass}`;
    
    tr.setAttribute('data-key', key);
    tr.setAttribute('data-status', order.status || 'Pending');
    tr.setAttribute('data-admincomment', order.adminComment || ''); 
    tr.setAttribute('data-isurgent', order.isUrgent || false); 
    tr.setAttribute('data-deleted', order.deleted || false);
    tr.setAttribute('data-timestamp', order.timestamp);
    
    const urgentDisplay = order.isUrgent && !isHistory ? '🚨 ' : '';

    // 🌟 2. Salesman Active Orders 只显示 Date, Company, Status
    if (isSalesmanPage && !isHistory) {
        tr.innerHTML = `
            <td>${new Date(order.timestamp).toLocaleDateString()}</td>
            <td>${order.company || 'N/A'}</td>
            <td>${urgentDisplay}${order.status}</td>
        `;
    } else {
        // Admin / History 视图显示全部 6 列
        tr.innerHTML = `
            <td>${new Date(order.timestamp).toLocaleDateString()}</td>
            <td>${order.company || 'N/A'}</td>
            <td>${order.poNumber || 'N/A'}</td>
            <td>${order.attn || 'N/A'}</td>
            <td>${order.delivery || 'N/A'}</td>
            <td>${urgentDisplay}${order.status}</td>
        `;
    }
    
    // 点击行展开/折叠详情
    tr.addEventListener('click', () => {
        const detailRow = document.querySelector(`tr[data-key="details-${key}"]`);
        
        if (expandedKey === key) {
            detailRow.style.setProperty('display', 'none');
            expandedKey = null;
        } else {
            // 折叠所有其他详情行
            document.querySelectorAll('.details-row').forEach(row => {
                row.style.setProperty('display', 'none');
            });
            
            if (detailRow) {
                detailRow.style.removeProperty('display');
                expandedKey = key;
            }
        }
    });
    
    return tr;
}

// 筛选和渲染函数 (表格模式)
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
        // 确保只处理活动订单或历史订单
        if (isHistory !== isDeleted) return false;

        // 搜索过滤 (仅对活动订单有效)
        if (!isHistory) {
            const searchString = `${order.company || ''} ${order.poNumber || ''} ${order.attn || ''}`.toLowerCase();
            if (searchTerm && !searchString.includes(searchTerm)) {
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
             // 如果状态不明确，归类为 Pending
             grouped["Pending"].push({ key, order });
        }
    });

    let statusOrder = ["Pending", "Ordered", "Follow Up", "Pending Payment", "Completed"];
    if (isHistory) {
        statusOrder = ["History"];
        // 历史订单统一归类
        grouped["History"] = filteredOrders.map(([key, order]) => ({ key, order }));
    }

    // 🌟 根据页面类型设置表头
    const fullTableHeaders = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Company</th>
                <th>PO #</th>
                <th>ATTN</th>
                <th>Delivery Location</th>
                <th>Status</th>
            </tr>
        </thead>
    `;
    
    // 🌟 Salesman Active Headers (3列)
    const salesmanTableHeaders = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Company</th>
                <th>Status</th>
            </tr>
        </thead>
    `;
    
    const renderTable = (groupData, isHistoryTable) => {
        if (groupData.length === 0) return;
        
        const table = document.createElement('table');
        // 为 Salesman 的 Active Order 表格添加 salesman-table 类
        const isSalesmanActive = isSalesman && !isHistoryTable;
        const tableClass = isSalesmanActive ? 'salesman-table' : ''; 
        
        table.className = `orders-table ${isHistoryTable ? 'history-table' : ''} ${tableClass}`;
        
        // 🌟 3. 使用正确的表头
        table.innerHTML = isSalesmanActive ? salesmanTableHeaders : fullTableHeaders;
        
        const tbody = document.createElement('tbody');
        
        // 按时间戳倒序排列
        groupData.sort((a, b) => b.order.timestamp - a.order.timestamp);
        
        groupData.forEach(({ key, order }) => {
            // 在这里调用 createOrderRow 时，会根据 isSalesman 属性决定渲染 3 列还是 6 列
            tbody.appendChild(createOrderRow(key, order, isSalesman, isHistoryTable)); 
            // 详情行会根据当前是否是 Salesman Active 视图来决定 colspan
            tbody.appendChild(createDetailsRow(key, order, isSalesman, isHistoryTable)); 
        });
        table.appendChild(tbody);
        return table;
    };


    // 渲染历史订单
    if (isHistory) {
        if (grouped["History"].length === 0) {
            container.innerHTML = "<p class='no-items'>No deleted orders found in history.</p>";
            return;
        }
        container.appendChild(renderTable(grouped["History"], true));
        return;
    }


    // 渲染活动订单 (按状态分组)
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'order-group-container';
    
    let ordersFound = false;
    statusOrder.forEach(status => {
        if (grouped[status].length > 0) {
            ordersFound = true;
            
            const groupHeader = document.createElement("h3");
            groupHeader.textContent = `${status} (${grouped[status].length})`;
            groupHeader.className = 'status-group-header';
            
            const table = renderTable(grouped[status], false);

            if (collapsedGroups[status]) {
                groupHeader.classList.add('collapsed');
                table.style.display = 'none';
            }

            groupHeader.addEventListener('click', () => {
                const isCollapsed = groupHeader.classList.toggle('collapsed');
                table.style.display = isCollapsed ? 'none' : 'table';
                collapsedGroups[status] = isCollapsed; 
            });
            
            tableWrapper.appendChild(groupHeader);
            tableWrapper.appendChild(table);
        }
    });
    
    container.appendChild(tableWrapper);
    
    if (!ordersFound) {
        container.innerHTML = "<p class='no-items'>No active orders match the search criteria.</p>";
    }
}

// --- Firebase 监听器 ---
if (ordersContainer || historyContainer) {
    let allOrdersData = null; 
    const twentyFourHours = 24 * 60 * 60 * 1000; 

    onValue(ref(db, "orders"), snapshot => {
      const newOrdersData = snapshot.val();
      
      // 🚨 自动软删除逻辑 (Admin 页面自动执行)
      if (newOrdersData) {
          Object.entries(newOrdersData).forEach(([key, order]) => {
              // 检查：如果订单已完成且未被删除
              if (order.status === "Completed" && !order.deleted) {
                  // 确保 order.timestamp 是数字
                  const completionTime = order.timestamp;
                  const timeDifference = Date.now() - completionTime;

                  if (timeDifference >= twentyFourHours) {
                      // 订单完成超过 24 小时，自动软删除
                      set(ref(db, `orders/${key}/deleted`), true)
                          .then(() => console.log(`Auto-deleted (moved to history): Order ${key}`))
                          .catch(e => console.error("Auto-delete failed:", e));
                  }
              }
          });
      }

      // 警报声逻辑 (Admin Only)
      if (!isSalesman && newOrdersData) {
          const activeOrders = Object.values(newOrdersData).filter(order => !order.deleted);
          const currentOrderCount = activeOrders.length;
          const currentUrgentOrderCount = activeOrders.filter(order => order.isUrgent).length; 
          
          if (lastOrderCount > 0 && currentOrderCount > lastOrderCount) {
              
              if (currentUrgentOrderCount > lastUrgentOrderCount && urgentAudio) {
                  // 优先播放紧急警报
                  urgentAudio.play().catch(e => console.log("Urgent audio play failed:", e)); 
              } else if (normalAudio) {
                  // 播放普通警报
                  normalAudio.play().catch(e => console.log("Normal audio play failed:", e)); 
              }
          }
          
          lastOrderCount = currentOrderCount;
          lastUrgentOrderCount = currentUrgentOrderCount; 
      }
      
      allOrdersData = newOrdersData;
      
      // 1. 渲染活动订单 (表格模式)
      if (ordersContainer) {
          filterAndRenderOrders(allOrdersData, ordersContainer, isSalesman, false);
      }
      
      // 2. 渲染历史订单 (表格模式)
      if (historyContainer) {
          filterAndRenderOrders(allOrdersData, historyContainer, isSalesman, true);
      }
    });

    // 搜索输入事件监听器
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            filterAndRenderOrders(allOrdersData, ordersContainer, isSalesman, false);
        });
    }
}