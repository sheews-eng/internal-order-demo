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

// 🔔 新功能 1: Admin 警报声逻辑
let lastOrderCount = 0;
let audio;
if (!isSalesman) {
    // 动态加载音频文件
    audio = new Audio('/ding.mp3'); 
}

// --- Salesman 功能 (多商品逻辑) ---
if (isSalesman) {
    const addItemBtn = document.getElementById("addItemBtn");
    const itemListContainer = document.getElementById("item-list-container");

    renderItemList = function() {
        itemListContainer.innerHTML = "";
        if (currentItems.length === 0) {
            itemListContainer.innerHTML = "<p class='no-items'>No items added yet. Click 'Add Item' above.</p>";
            return;
        }

        currentItems.forEach((item, index) => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "card item-preview";
            itemDiv.style.display = 'flex';
            itemDiv.style.justifyContent = 'space-between';
            itemDiv.style.alignItems = 'center';
            itemDiv.style.padding = '8px';

            itemDiv.innerHTML = `
                <span><b>Item:</b> ${item.itemDesc} (${item.units} x ${item.price})</span>
            `;
            const removeBtn = document.createElement("button");
            removeBtn.textContent = "Remove";
            removeBtn.className = "remove-item-btn";
            removeBtn.addEventListener("click", () => {
                currentItems.splice(index, 1);
                renderItemList();
            });
            itemDiv.appendChild(removeBtn);
            itemListContainer.appendChild(itemDiv);
        });
    }; 

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
    
    // 提交订单
    form.addEventListener("submit", e => {
        e.preventDefault();

        if (currentItems.length === 0) {
            alert("Please add at least one item to the order before submitting.");
            return;
        }

        const data = {
            customer: form.customer.value,
            poNumber: form.poNumber.value,
            delivery: form.delivery.value,
            orderItems: currentItems, 
            status: "Pending",
            deleted: false,
            timestamp: Date.now(),
            comment: "" // 💬 新增 Comment 字段
        };

        const ordersRef = ref(db, "orders");
        push(ordersRef, data);
        
        form.customer.value = "";
        form.poNumber.value = "";
        form.delivery.value = "";
        currentItems = []; 
        renderItemList();
    });

    renderItemList(); 
}

// --- Helper: 创建订单卡片 (适配所有新功能) ---
function createOrderCard(key, order, isSalesmanPage, isHistory = false) {
    const div = document.createElement("div");
    div.className = `card ${isHistory ? 'history' : ''} status-${order.status.replace(/\s+/g, '')}`;
    
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
    
    // 4. 💬 评论显示与输入 (新功能 3)
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
            
            // 状态选项：Completed 订单不能改回
            let statusOptions = ["Pending", "Ordered", "Completed", "Pending Payment"];
            if (isCompleted) {
                // 移除 Ordered 和 Pending Payment，Completed 订单不能改回
                statusOptions = statusOptions.filter(s => s === "Completed");
            }
            // Admin 不需要把状态设为 Pending (默认只有 Salesman 提交时是 Pending)
            statusOptions = statusOptions.filter(s => s !== "Pending");
            
            // 确保当前状态被包含在选项中
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

        // Salesman: Edit (新功能 5: Completed 限制)
        if (isSalesmanPage) {
            
            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.disabled = isCompleted; // 禁用
            editBtn.title = isCompleted ? "Completed orders cannot be edited." : "Edit Order";
            editBtn.addEventListener("click", () => {
              if (isCompleted) return; 

              // 恢复表单数据
              form.customer.value = order.customer;
              form.poNumber.value = order.poNumber;
              form.delivery.value = order.delivery;
              
              currentItems = order.orderItems || []; 
              
              if (confirm("Order details will be loaded into the form. The old record will be deleted.")) {
                  if (typeof renderItemList === 'function') {
                      renderItemList(); 
                  }
                  remove(ref(db, `orders/${key}`)); // 删除旧订单
              }
            });
            actionsContainer.appendChild(editBtn);
        }
        
        // Soft Delete (新功能 5: Completed 限制)
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-btn";
        
        deleteBtn.disabled = isCompleted; // 禁用
        deleteBtn.title = isCompleted ? "Completed orders must be permanently deleted by Admin from history." : "Soft Delete";

        deleteBtn.addEventListener("click", () => {
            if (deleteBtn.disabled) return;
            set(ref(db, `orders/${key}/deleted`), true);
        });
        actionsContainer.appendChild(deleteBtn);
        
    } else {
        // History Display
        // 🗑️ 新功能 4: Permanent Delete button for History (仅在 Admin 页面显示)
        if (!isSalesmanPage) {
            const permDeleteBtn = document.createElement("button");
            permDeleteBtn.textContent = "Permanent Delete";
            permDeleteBtn.className = "perm-delete-btn"; 
            permDeleteBtn.addEventListener("click", () => {
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
      
      // 🔔 新功能 1: 检查新订单并播放声音
      if (!isSalesman && data && audio) {
          const currentOrderCount = Object.keys(data).filter(key => !data[key].deleted).length;
          
          if (lastOrderCount > 0 && currentOrderCount > lastOrderCount) {
              // 尝试播放声音，如果浏览器政策阻止，则会捕获错误
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

      // ❌ 新功能 2: Admin Status Filter (Admin 不显示 Pending)
      let statusOrder = ["Pending", "Ordered", "Completed", "Pending Payment"];

      if (!isSalesman) {
          // Admin view: 排除 "Pending" 状态
          statusOrder = ["Ordered", "Completed", "Pending Payment"]; 
      }

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