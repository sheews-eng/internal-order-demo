import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// =========================================================
// 确保此配置与您的 Firebase 项目完全一致
// =========================================================
const firebaseConfig = {
  apiKey: "AIzaSyCmb4nfpaFMv1Ix4hbMwU2JlYCq6I46ou4",
  authDomain: "internal-orders-765dd.firebaseapp.com",
  databaseURL: "https://internal-orders-765dd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "internal-orders-765dd",
  storageBucket: "internal-orders-765dd.appspot.com",
  messagingSenderId: "778145240016",
  appId: "1:778145240016:web:b976e9bac38a86d3381fd5"
};
// =========================================================

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const form = document.getElementById("order-form"); 
const isSalesman = form !== null; // 通过检查表单是否存在来判断是 Salesman 还是 Admin
const ordersContainer = document.getElementById("orders-container");
const historyContainer = document.getElementById("history-container");
const searchInput = document.getElementById("orderSearch"); 

// Salesman 多商品状态
let currentItems = []; 
let renderItemList;   
let currentEditKey = null; 

// 存储当前折叠状态: { "StatusName": true/false (true=collapsed) }
let collapsedGroups = {}; 

// 🔔 Admin 警报声逻辑
let lastOrderCount = 0;
let audio;
if (!isSalesman) {
    // 确保 ding.mp3 文件位于网站根目录或当前脚本路径下
    audio = new Audio('/ding.mp3'); 
}

// --- Salesman 功能 (多商品/编辑逻辑) ---
if (isSalesman) {
    const addItemBtn = document.getElementById("addItemBtn");
    const itemListContainer = document.getElementById("item-list-container");
    const submitBtn = form.querySelector('.submit-order-btn');
    
    // 切换提交按钮文本和显示/隐藏取消按钮
    const updateFormUI = (isEditing) => {
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
    
    // 重置表单和 UI
    const resetForm = () => {
        form.company.value = "";
        form.attn.value = "";
        form.hp.value = "";
        form.poNumber.value = "";
        form.delivery.value = "";
        form.salesmanComment.value = ""; 
        currentItems = [];
        currentEditKey = null;
        renderItemList();
        updateFormUI(false);
    };

    // 核心修改: renderItemList 函数 - 使商品列表项目可编辑
    renderItemList = function() {
        itemListContainer.innerHTML = "";
        if (currentItems.length === 0) {
            itemListContainer.innerHTML = "<p class='no-items'>No items added yet. Click 'Add Item' above.</p>";
            return;
        }

        currentItems.forEach((item, index) => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "card item-preview editable-item";
            
            // 将价格字符串 "RM X.XX" 转换为数字 X.XX，便于输入框使用
            const priceValue = parseFloat(item.price.replace('RM ', ''));

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

        // 允许 itemDesc 为空，但 units 和 price 必须大于 0
        if (units <= 0 || price <= 0) {
            alert("Please enter valid item units and price (must be greater than 0).");
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
            alert("Please add at least one item to the order before submitting.");
            return;
        }
        
        // 只检查 units 和 price
        const invalidItem = currentItems.find(item => item.units <= 0 || parseFloat(item.price.replace('RM ', '')) <= 0);
        if (invalidItem) {
            alert("Please ensure all item units and prices are valid and non-zero.");
            return;
        }
        
        // 获取 Salesman Comment
        const newSalesmanComment = form.salesmanComment.value.trim();

        // 获取正在编辑的订单的现有数据（用于保留状态/时间戳/AdminComment）
        const existingCard = document.querySelector(`.card[data-key="${currentEditKey}"]`);
        
        const data = {
            // 核心更新: 字段名称
            company: form.company.value,
            attn: form.attn.value,
            hp: form.hp.value,
            poNumber: form.poNumber.value,
            delivery: form.delivery.value,
            orderItems: currentItems, 
            status: currentEditKey ? (existingCard?.dataset?.status || "Pending") : "Pending", 
            deleted: currentEditKey ? (existingCard?.dataset?.deleted === 'true') : false, 
            timestamp: currentEditKey ? (parseInt(existingCard?.dataset?.timestamp) || Date.now()) : Date.now(), 
            
            salesmanComment: newSalesmanComment, 
            adminComment: currentEditKey ? (existingCard?.dataset?.admincomment || "") : "" 
        };
        
        if (currentEditKey) {
            // 更新现有订单
            set(ref(db, `orders/${currentEditKey}`), data)
                .then(() => {
                    alert(`Order ${currentEditKey} updated successfully.`);
                    resetForm();
                })
                .catch(error => console.error("Update failed:", error));
        } else {
            // 提交新订单
            const ordersRef = ref(db, "orders");
            push(ordersRef, data);
            resetForm();
        }
    });

    renderItemList(); 
}

// --- Helper: 创建订单卡片 ---
function createOrderCard(key, order, isSalesmanPage, isHistory = false) {
    const hasAdminCommentClass = order.adminComment && order.adminComment.trim() !== "" ? 'has-comment' : '';
    const div = document.createElement("div");
    div.className = `card ${isHistory ? 'history' : ''} status-${order.status.replace(/\s+/g, '')} ${hasAdminCommentClass}`;
    
    div.setAttribute('data-key', key);
    div.setAttribute('data-status', order.status);
    div.setAttribute('data-timestamp', order.timestamp);
    div.setAttribute('data-deleted', order.deleted);
    div.setAttribute('data-admincomment', order.adminComment || ''); 
    div.setAttribute('data-salesmancomment', order.salesmanComment || ''); 

    // 1. 基本信息
    const infoContainer = document.createElement('div');
    infoContainer.className = 'order-info';
    infoContainer.innerHTML = `
        <span><b>Company:</b> ${order.company || 'N/A'}</span>
        <span><b>ATTN:</b> ${order.attn || 'N/A'}</span>
        <span><b>H/P:</b> ${order.hp || 'N/A'}</span>
        <span><b>PO Number:</b> ${order.poNumber || 'N/A'}</span>
        <span><b>Delivery:</b> ${order.delivery || 'N/A'}</span>
    `;
    div.appendChild(infoContainer);

    // 2. 商品列表
    const itemsListContainer = document.createElement('div');
    itemsListContainer.className = 'items-list'; 
    itemsListContainer.innerHTML = "<b>Items:</b>";
    
    if (order.orderItems && Array.isArray(order.orderItems)) {
        order.orderItems.forEach(item => {
            const itemSpan = document.createElement('span');
            itemSpan.className = 'item-detail';
            const itemDescDisplay = item.itemDesc || 'N/A (No Description)';
            itemSpan.innerHTML = `${itemDescDisplay} (${item.units} x ${item.price})`;
            itemsListContainer.appendChild(itemSpan);
        });
    } else {
         itemsListContainer.innerHTML += "<span class='item-detail'>N/A</span>";
    }
    div.appendChild(itemsListContainer);
    
    // 3. 时间戳
    const timeSpan = document.createElement("span");
    timeSpan.className = "timestamp"; 
    timeSpan.textContent = `Submitted: ${new Date(order.timestamp).toLocaleString()}`;
    div.appendChild(timeSpan);
    
    // 4. 评论显示区域 (双字段显示)
    const commentsDisplayContainer = document.createElement('div');
    commentsDisplayContainer.className = 'comments-display-container';
    
    // Salesman Comment (普通显示)
    const scText = document.createElement('span');
    scText.className = 'salesman-comment-text';
    scText.innerHTML = `<b>Salesman Comment:</b> <span>${order.salesmanComment || 'N/A'}</span>`; 
    commentsDisplayContainer.appendChild(scText);

    // Admin Comment (高亮)
    const acText = document.createElement('span');
    acText.className = 'admin-comment-text';
    const adminComment = order.adminComment && order.adminComment.trim() !== "";
    const acContentHTML = adminComment
        ? `<span class="comment-content-highlight">${order.adminComment}</span>` 
        : 'N/A';
    acText.innerHTML = `<b>Admin Remark:</b> ${acContentHTML}`; 
    commentsDisplayContainer.appendChild(acText);

    div.appendChild(commentsDisplayContainer);
    
    // 5. Admin Comment 输入区域
    const commentInputContainer = document.createElement('div');
    commentInputContainer.className = 'comment-input-container';

    // 只有 Admin Page 且非历史订单才显示 Admin 备注输入框
    if (!isSalesmanPage && !isHistory) { 
        const commentInput = document.createElement('textarea');
        commentInput.placeholder = "Add or edit Admin Remark...";
        commentInput.value = order.adminComment || '';
        commentInput.className = 'comment-input';
        
        const saveCommentBtn = document.createElement('button');
        saveCommentBtn.textContent = "Save Admin Remark";
        saveCommentBtn.className = 'save-admin-comment-btn';
        saveCommentBtn.addEventListener('click', () => {
            // 保存到 adminComment 字段
            set(ref(db, `orders/${key}/adminComment`), commentInput.value.trim());
        });

        commentInputContainer.appendChild(commentInput);
        commentInputContainer.appendChild(saveCommentBtn);
    }

    if (commentInputContainer.children.length > 0) {
         div.appendChild(commentInputContainer);
    }
    
    // 6. 操作区域
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'actions-container'; 
    
    const isCompleted = order.status === "Completed";
    
    if (!isHistory) {
        // Admin: 修改状态 
        if (!isSalesmanPage) {
            const statusSelect = document.createElement("select");
            statusSelect.title = "Change Order Status"; 
            
            // 订单所有可能的状态 (Completed现在可以改回)
            const statusOptions = ["Pending", "Ordered", "Completed", "Pending Payment", "Follow Up"]; 
            
            statusOptions.forEach(s => {
              const option = document.createElement("option");
              option.value = s;
              option.textContent = s;
              if (s === order.status) option.selected = true;
              statusSelect.appendChild(option);
            });
            
            statusSelect.addEventListener("change", () => {
                set(ref(db, `orders/${key}/status`), statusSelect.value);
            });
            actionsContainer.appendChild(statusSelect);
        }

        // Salesman: Edit (Completed 限制不变)
        if (isSalesmanPage) {
            
            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.disabled = isCompleted; 
            editBtn.title = isCompleted ? "Completed orders cannot be edited." : "Edit Order";
            editBtn.addEventListener("click", () => {
              if (isCompleted) return; 
              
              currentEditKey = key; 
              // 载入字段
              form.company.value = order.company;
              form.attn.value = order.attn;
              form.hp.value = order.hp;
              form.poNumber.value = order.poNumber;
              form.delivery.value = order.delivery;
              form.salesmanComment.value = order.salesmanComment || '';
              
              // Deep copy the array to avoid reference issues
              currentItems = JSON.parse(JSON.stringify(order.orderItems || [])); 
              renderItemList(); 
              updateFormUI(true); 
              
              form.scrollIntoView({ behavior: 'smooth' });
            });
            actionsContainer.appendChild(editBtn);
        }
        
        // Soft Delete (Completed 限制不变)
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-btn";
        
        deleteBtn.disabled = isCompleted; 
        deleteBtn.title = isCompleted ? "Completed orders must be permanently deleted by Admin from history." : "Soft Delete";

        deleteBtn.addEventListener("click", () => {
            if (deleteBtn.disabled) return;
            set(ref(db, `orders/${key}/deleted`), true);
        });
        actionsContainer.appendChild(deleteBtn);
        
    } else {
        // History Display
        // Permanent Delete button for History (Admin 24小时限制不变)
        if (!isSalesmanPage) {
            const permDeleteBtn = document.createElement("button");
            permDeleteBtn.textContent = "Permanent Delete";
            permDeleteBtn.className = "perm-delete-btn"; 
            
            const timeDifference = Date.now() - order.timestamp;
            const twentyFourHours = 24 * 60 * 60 * 1000;
            const isTooSoon = isCompleted && (timeDifference < twentyFourHours);
            
            // 24小时永久删除限制
            permDeleteBtn.disabled = isTooSoon;
            if (isTooSoon) {
                const timeRemaining = twentyFourHours - timeDifference;
                const hours = Math.floor(timeRemaining / 3600000);
                const minutes = Math.floor((timeRemaining % 3600000) / 60000);
                permDeleteBtn.title = `Must wait ${hours}h ${minutes}m (24 hours after completion) to permanently delete.`;
            } else {
                permDeleteBtn.title = "Permanently delete this order.";
            }

            permDeleteBtn.addEventListener("click", () => {
                if (permDeleteBtn.disabled) return;
                if (confirm("Are you sure you want to permanently delete this order? This action cannot be undone.")) {
                    remove(ref(db, `orders/${key}`));
                }
            });
            actionsContainer.appendChild(permDeleteBtn);
        }
    }
    
    div.appendChild(actionsContainer);
    return div;
}

// 筛选和渲染函数
function filterAndRenderOrders(allData, ordersContainer, isSalesman) {
    if (!allData || !ordersContainer) return;

    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    ordersContainer.innerHTML = "";
    
    // 1. 根据状态分组订单 (只处理未删除的订单)
    const grouped = {
        "Pending": [],
        "Ordered": [],
        "Follow Up": [], 
        "Pending Payment": [],
        "Completed": []
    };

    Object.entries(allData).forEach(([key, order]) => {
        if (order.deleted) return;

        // 搜索逻辑：检查 company, poNumber, attn
        const searchString = `${order.company || ''} ${order.poNumber || ''} ${order.attn || ''}`.toLowerCase();
        if (searchTerm && !searchString.includes(searchTerm)) {
            return; // 不符合搜索条件，跳过
        }

        const status = order.status || "Pending";
        if (grouped[status]) { 
            grouped[status].push({ key, order });
        } else {
             grouped["Pending"].push({ key, order });
        }
    });

    // 2. 渲染每个组
    let statusOrder = ["Pending", "Ordered", "Follow Up", "Pending Payment", "Completed"];

    statusOrder.forEach(status => {
        if (grouped[status].length > 0) {
            
            // 创建可折叠的头部
            const groupWrapper = document.createElement("div");
            groupWrapper.className = `status-group-wrapper status-${status.replace(/\s+/g, '')}`;
            
            const groupHeader = document.createElement("h3");
            groupHeader.textContent = `${status} (${grouped[status].length})`;
            groupHeader.className = 'status-group-header';
            
            const cardsContainer = document.createElement("div");
            cardsContainer.className = 'cards-list-inner'; 
            
            // 检查并设置折叠状态
            if (collapsedGroups[status]) {
                groupHeader.classList.add('collapsed');
                cardsContainer.style.display = 'none';
            }

            // 头部点击事件：切换折叠状态
            groupHeader.addEventListener('click', () => {
                const isCollapsed = groupHeader.classList.toggle('collapsed');
                cardsContainer.style.display = isCollapsed ? 'none' : 'flex';
                collapsedGroups[status] = isCollapsed; // 存储当前状态
            });
            
            groupWrapper.appendChild(groupHeader);
            
            // 按时间戳降序排列 (最新订单在前)
            grouped[status].sort((a, b) => b.order.timestamp - a.order.timestamp);

            grouped[status].forEach(({ key, order }) => {
              const card = createOrderCard(key, order, isSalesman, false);
              cardsContainer.appendChild(card);
            });
            
            groupWrapper.appendChild(cardsContainer);
            ordersContainer.appendChild(groupWrapper);
        }
    });
}

// --- Firebase 监听器 ---
if (ordersContainer || historyContainer) {
    let allOrdersData = null; // 存储完整数据

    onValue(ref(db, "orders"), snapshot => {
      allOrdersData = snapshot.val();
      
      // 警报声逻辑 (使用完整数据)
      if (!isSalesman && allOrdersData && audio) {
          const currentOrderCount = Object.keys(allOrdersData).filter(key => !allOrdersData[key].deleted).length;
          
          if (lastOrderCount > 0 && currentOrderCount > lastOrderCount) {
              audio.play().catch(e => console.log("Audio play failed (user needs to interact first):", e)); 
          }
          lastOrderCount = currentOrderCount;
      }
      
      if (ordersContainer) {
          // 渲染活动订单 (包含筛选和分组)
          filterAndRenderOrders(allOrdersData, ordersContainer, isSalesman);
      }
      
      if (historyContainer) {
          // 渲染历史订单 (不包含筛选)
          historyContainer.innerHTML = "";
          if (allOrdersData) {
              Object.entries(allOrdersData).forEach(([key, order]) => {
                  if (order.deleted) {
                      const card = createOrderCard(key, order, isSalesman, true);
                      historyContainer.appendChild(card);
                  }
              });
          }
      }
    });

    // 搜索输入事件监听器
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            // 每次输入都重新筛选和渲染，使用已存储的完整数据
            filterAndRenderOrders(allOrdersData, ordersContainer, isSalesman);
        });
    }
}