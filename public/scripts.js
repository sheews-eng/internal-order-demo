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

// 页面类型判断
const isSalesman = document.getElementById("order-form") !== null;
const ordersContainer = document.getElementById("orders-container");
const historyContainer = document.getElementById("history-container");

const statusColors = {
  "Pending": "#fff3cd",
  "Ordered": "#d1ecf1",
  "Completed": "#d4edda",
  "Pending Payment": "#f8d7da"
};

// --- 提示音和状态变量 (用于管理员页面) ---
const notificationSound = new Audio('/ding.mp3');
let lastOrderCount = 0;
let isInitialLoad = true;
let currentItems = []; // Salesman: 用于存储临时添加的商品

// --- Admin 功能: 音频解锁逻辑 (仅限 Admin 页面) ---
if (!isSalesman) {
    document.addEventListener('click', function unlockAudio() {
        notificationSound.play().then(() => {
            console.log("Audio playback unlocked.");
            document.removeEventListener('click', unlockAudio);
        }).catch(error => {
            console.warn("Audio unlock failed, waiting for user interaction:", error);
        });
        notificationSound.pause();
        notificationSound.currentTime = 0;
    }, { once: true });
}

// --- Salesman 功能 (多商品逻辑) ---
if (isSalesman) {
    const form = document.getElementById("order-form");
    const addItemBtn = document.getElementById("addItemBtn");
    const itemListContainer = document.getElementById("item-list-container");

    function renderItemList() {
        itemListContainer.innerHTML = "";
        if (currentItems.length === 0) {
            itemListContainer.innerHTML = "<p style='color:#999;'>No items added yet.</p>";
            return;
        }

        currentItems.forEach((item, index) => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "card item-preview";
            itemDiv.style.borderLeft = "4px solid #3498db";
            itemDiv.innerHTML = `
                <span><b>Item:</b> ${item.itemDesc}</span>
                <span><b>Units:</b> ${item.units}</span>
                <span><b>Price/Unit:</b> ${item.price}</span>
            `;
            const removeBtn = document.createElement("button");
            removeBtn.textContent = "Remove";
            removeBtn.style.backgroundColor = "#e74c3c";
            removeBtn.style.width = "auto";
            removeBtn.addEventListener("click", () => {
                currentItems.splice(index, 1);
                renderItemList();
            });
            itemDiv.appendChild(removeBtn);
            itemListContainer.appendChild(itemDiv);
        });
    }

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

        // 重置商品输入字段
        document.getElementById("itemDesc").value = "";
        document.getElementById("units").value = "1";
        document.getElementById("price").value = "0.00";
        renderItemList();
    });
    
    // 提交订单
    form.addEventListener("submit", e => {
        e.preventDefault();

        if (currentItems.length === 0) {
            alert("Please add at least one item to the order.");
            return;
        }

        const data = {
            customer: form.customer.value,
            poNumber: form.poNumber.value,
            delivery: form.delivery.value,
            orderItems: currentItems, // 🚀 关键变更：多商品数组
            status: "Pending",
            deleted: false,
            timestamp: Date.now()
        };

        const ordersRef = ref(db, "orders");
        push(ordersRef, data);
        
        // 重置表单和商品列表
        form.customer.value = "";
        form.poNumber.value = "";
        form.delivery.value = "";
        currentItems = []; 
        renderItemList();
    });

    renderItemList(); // 初始渲染
}

// --- Helper: 创建订单卡片 (适配新的多商品结构) ---
function createOrderCard(key, order, isSalesmanPage, isHistory = false) {
    const div = document.createElement("div");
    div.className = `card ${isHistory ? 'history' : ''}`;
    div.style.borderLeft = isHistory ? '5px solid #909399' : `5px solid ${statusColors[order.status]}`;
    
    // 客户信息和PO号
    const infoContainer = document.createElement('div');
    infoContainer.innerHTML = `
        <span><b>Customer:</b> ${order.customer || 'N/A'}</span>
        <span><b>PO:</b> ${order.poNumber || 'N/A'}</span>
        <span><b>Delivery:</b> ${order.delivery || 'N/A'}</span>
    `;
    div.appendChild(infoContainer);

    // 商品列表
    const itemsListContainer = document.createElement('div');
    itemsListContainer.style.display = 'flex';
    itemsListContainer.style.flexDirection = 'column';
    itemsListContainer.innerHTML = "<b>Items:</b>";
    
    if (order.orderItems && Array.isArray(order.orderItems)) {
        order.orderItems.forEach(item => {
            const itemSpan = document.createElement('span');
            itemSpan.style.marginLeft = '10px';
            itemSpan.innerHTML = `${item.itemDesc} (${item.units} x ${item.price})`;
            itemsListContainer.appendChild(itemSpan);
        });
    } else {
         itemsListContainer.innerHTML += "<span>N/A</span>";
    }
    div.appendChild(itemsListContainer);
    
    // 时间戳
    const timeSpan = document.createElement("span");
    timeSpan.style.fontSize = "0.85em";
    timeSpan.style.color = isHistory ? "#909399" : "#777";
    timeSpan.textContent = `Submitted: ${new Date(order.timestamp).toLocaleString()}`;
    div.appendChild(timeSpan);
    
    // 操作区域
    const actionsContainer = document.createElement('div');
    actionsContainer.style.gridColumn = 'span 1'; // 确保操作区域在最右侧

    if (!isHistory) {
        // Admin: 修改状态 (历史记录中不显示)
        if (!isSalesmanPage) {
            const statusSelect = document.createElement("select");
            ["Pending", "Ordered", "Completed", "Pending Payment"].forEach(s => {
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

        // Salesman: Edit (历史记录中不显示)
        if (isSalesmanPage) {
            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.addEventListener("click", () => {
              // 恢复表单数据 (需要重新设计多商品编辑逻辑，此处只做基础填充)
              form.customer.value = order.customer;
              form.poNumber.value = order.poNumber;
              form.delivery.value = order.delivery;
              currentItems = order.orderItems || [];
              renderItemList();
              remove(ref(db, `orders/${key}`)); // 删除旧订单
            });
            actionsContainer.appendChild(editBtn);
        }
        
        // Salesman/Admin: Delete (移入历史)
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.style.backgroundColor = "#e74c3c";
        deleteBtn.addEventListener("click", () => {
          set(ref(db, `orders/${key}/deleted`), true);
        });
        actionsContainer.appendChild(deleteBtn);
        
    } else {
        // 🚀 Admin 历史记录：永久删除功能
        if (!isSalesmanPage) {
            const permDeleteBtn = document.createElement("button");
            permDeleteBtn.textContent = "Permanent Delete";
            permDeleteBtn.style.backgroundColor = "#8c1b1b"; 
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

// --- Admin & Salesman: 显示订单 ---
if (ordersContainer || historyContainer) {
    onValue(ref(db, "orders"), snapshot => {
      const data = snapshot.val();
      
      const currentTotalOrders = data ? Object.keys(data).length : 0;
      
      // --- 提示音逻辑 ---
      if (!isSalesman && !isInitialLoad && currentTotalOrders > lastOrderCount) {
        notificationSound.play().catch(error => {
            console.warn("Could not play notification sound. User interaction may be required:", error);
        });
      }

      lastOrderCount = currentTotalOrders;
      isInitialLoad = false;
      // -------------------------

      // 仅当元素存在时才清除内容
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
          // 🚀 历史订单：Admin 显示，Salesman 不显示
          if (!isSalesman && historyContainer) { 
              const card = createOrderCard(key, order, isSalesman, true);
              historyContainer.appendChild(card);
          }
          return;
        }
        
        if (grouped[order.status]) { 
            grouped[order.status].push({ key, order });
        }
      });

      // 渲染分组的订单
      Object.keys(grouped).forEach(status => {
        // Salesman 侧只显示 Pending 订单
        if (isSalesman && status !== "Pending") return;

        grouped[status].forEach(({ key, order }) => {
          const card = createOrderCard(key, order, isSalesman, false);
          if (ordersContainer) ordersContainer.appendChild(card);
        });
      });
    });
}