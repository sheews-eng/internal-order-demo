import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmb4nfpaFMv1Ix4hbMwU2JlYCq6I46ou4",
  authDomain: "internal-orders-765dd.firebaseapp.com",
  databaseURL: "https://internal-orders-765dd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "internal-orders-765dd",
  storageBucket: "internal-orders-765dd.appspot.com",
  messagingSenderId: "778145240016",
  appId: "1:778145240016:web:b976e9bac38a86d3381fd5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const form = document.getElementById("order-form"); 
const isSalesman = form !== null;
const ordersContainer = document.getElementById("orders-container");
const historyContainer = document.getElementById("history-container");

// Salesman 多商品状态
let currentItems = []; 
let renderItemList;   
let currentEditKey = null; 

// 🔔 Admin 警报声逻辑
let lastOrderCount = 0;
let audio;
if (!isSalesman) {
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
        form.customer.value = "";
        form.poNumber.value = "";
        form.delivery.value = "";
        currentItems = [];
        currentEditKey = null;
        renderItemList();
        updateFormUI(false);
    };

    // 🚀 核心修改: renderItemList 函数 - 使商品列表项目可编辑
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
                    <label>Item Description: <input type="text" value="${item.itemDesc}" data-field="itemDesc" data-index="${index}"></label>
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
                    // 不需要重新渲染整个列表，只需更新 currentItems
                    // console.log('Item updated:', currentItems[idx]);
                });
            });

            const actionRow = document.createElement('div');
            actionRow.className = 'item-action-row';
            actionRow.appendChild(removeBtn);

            itemDiv.appendChild(actionRow);
            itemListContainer.appendChild(itemDiv);
        });
    }; 
    // -------------------------------------------------------------

    addItemBtn.addEventListener("click", () => {
        const itemDesc = document.getElementById("itemDesc").value;
        const units = document.getElementById("units").value;
        const price = document.getElementById("price").value;

        if (!itemDesc || units <= 0 || price <= 0) {
            alert("Please enter valid item details, units, and price.");
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
        
        // 确保所有商品项的描述都不为空
        const invalidItem = currentItems.find(item => !item.itemDesc || item.units <= 0 || parseFloat(item.price.replace('RM ', '')) <= 0);
        if (invalidItem) {
            alert("Please ensure all item descriptions, units, and prices are valid and non-zero.");
            return;
        }


        // 获取正在编辑的订单的现有数据（用于保留状态/时间戳）
        const existingCard = document.querySelector(`.card[data-key="${currentEditKey}"]`);
        
        const data = {
            customer: form.customer.value,
            poNumber: form.poNumber.value,
            delivery: form.delivery.value,
            orderItems: currentItems, 
            status: currentEditKey ? (existingCard?.dataset?.status || "Pending") : "Pending", 
            deleted: currentEditKey ? (existingCard?.dataset?.deleted === 'true') : false, 
            timestamp: currentEditKey ? (parseInt(existingCard?.dataset?.timestamp) || Date.now()) : Date.now(), 
            comment: currentEditKey ? (existingCard?.dataset?.comment || "") : "" 
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

// --- Helper: 创建订单卡片 (逻辑不变) ---
function createOrderCard(key, order, isSalesmanPage, isHistory = false) {
    const div = document.createElement("div");
    div.className = `card ${isHistory ? 'history' : ''} status-${order.status.replace(/\s+/g, '')}`;
    
    div.setAttribute('data-key', key);
    div.setAttribute('data-status', order.status);
    div.setAttribute('data-timestamp', order.timestamp);
    div.setAttribute('data-deleted', order.deleted);
    div.setAttribute('data-comment', order.comment || '');

    // 1. 基本信息
    const infoContainer = document.createElement('div');
    infoContainer.className = 'order-info';
    infoContainer.innerHTML = `
        <span><b>Customer:</b> ${order.customer || 'N/A'}</span>
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
            itemSpan.innerHTML = `${item.itemDesc} (${item.units} x ${item.price})`;
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
    
    // 4. 评论显示与输入
    const commentContainer = document.createElement('div');
    commentContainer.className = 'comment-container';
    
    const commentText = document.createElement('span');
    commentText.innerHTML = `<b>Comment:</b> ${order.comment || 'N/A'}`;
    commentContainer.appendChild(commentText);

    if (!isSalesmanPage && !isHistory) {
        // Admin: Add/Edit Comment area
        const commentInput = document.createElement('textarea');
        commentInput.placeholder = "Add or edit comment...";
        commentInput.value = order.comment || '';
        commentInput.className = 'comment-input';
        
        const saveCommentBtn = document.createElement('button');
        saveCommentBtn.textContent = "Save Comment";
        saveCommentBtn.className = 'save-comment-btn';
        saveCommentBtn.addEventListener('click', () => {
            set(ref(db, `orders/${key}/comment`), commentInput.value.trim());
        });

        commentContainer.appendChild(commentInput);
        commentContainer.appendChild(saveCommentBtn);
    }
    div.appendChild(commentContainer);
    
    // 5. 操作区域
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'actions-container'; 
    
    const isCompleted = order.status === "Completed";
    
    if (!isHistory) {
        // Admin: 修改状态
        if (!isSalesmanPage) {
            const statusSelect = document.createElement("select");
            statusSelect.title = "Change Order Status"; 
            
            let statusOptions = ["Ordered", "Completed", "Pending Payment"]; 
            
            if (isCompleted) {
                statusOptions = statusOptions.filter(s => s === "Completed");
            }
            
            if (!statusOptions.includes(order.status)) {
                statusOptions.unshift(order.status);
            }

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

        // Salesman: Edit (Completed 限制)
        if (isSalesmanPage) {
            
            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.disabled = isCompleted; 
            editBtn.title = isCompleted ? "Completed orders cannot be edited." : "Edit Order";
            editBtn.addEventListener("click", () => {
              if (isCompleted) return; 
              
              currentEditKey = key; 
              form.customer.value = order.customer;
              form.poNumber.value = order.poNumber;
              form.delivery.value = order.delivery;
              
              // Deep copy the array to avoid reference issues
              currentItems = JSON.parse(JSON.stringify(order.orderItems || [])); 
              renderItemList(); 
              updateFormUI(true); 
              
              form.scrollIntoView({ behavior: 'smooth' });
            });
            actionsContainer.appendChild(editBtn);
        }
        
        // Soft Delete (Completed 限制)
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
        // Permanent Delete button for History (Admin 24小时限制)
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

// --- Admin & Salesman: 显示订单 (Firebase 监听器) ---
if (ordersContainer || historyContainer) {
    onValue(ref(db, "orders"), snapshot => {
      const data = snapshot.val();
      
      // 🔔 检查新订单并播放声音
      if (!isSalesman && data && audio) {
          const currentOrderCount = Object.keys(data).filter(key => !data[key].deleted).length;
          
          if (lastOrderCount > 0 && currentOrderCount > lastOrderCount) {
              audio.play().catch(e => console.log("Audio play failed (user needs to interact first):", e)); 
          }
          lastOrderCount = currentOrderCount;
      }
      
      if (ordersContainer) ordersContainer.innerHTML = "";
      if (historyContainer) historyContainer.innerHTML = "";

      if (!data) return;

      const grouped = {
        "Pending": [],
        "Ordered": [],
        "Completed": [],
        "Pending Payment": []
      };

      Object.entries(data).forEach(([key, order]) => {
        if (order.deleted) {
          if (historyContainer) { 
              const card = createOrderCard(key, order, isSalesman, true);
              historyContainer.appendChild(card);
          }
          return;
        }
        
        if (grouped[order.status]) { 
            grouped[order.status].push({ key, order });
        }
      });

      // 订单状态排序
      let statusOrder = ["Pending", "Ordered", "Completed", "Pending Payment"];

      statusOrder.forEach(status => {
        if (grouped[status].length > 0 && ordersContainer) {
            const groupHeader = document.createElement("h3");
            groupHeader.textContent = status;
            groupHeader.className = 'status-group-header';
            ordersContainer.appendChild(groupHeader);
            
            grouped[status].forEach(({ key, order }) => {
              const card = createOrderCard(key, order, isSalesman, false);
              ordersContainer.appendChild(card);
            });
        }
      });
    });
}