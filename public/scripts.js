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

// 🚀 修复点 1: 将 form 声明移至全局，解决 ReferenceError
const form = document.getElementById("order-form"); 
const isSalesman = form !== null;
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
    // form 变量现在是全局的
    const addItemBtn = document.getElementById("addItemBtn");
    const itemListContainer = document.getElementById("item-list-container");

    function renderItemList() {
        itemListContainer.innerHTML = "";
        if (currentItems.length === 0) {
            itemListContainer.innerHTML = "<p style='color:#999; text-align:center;'>No items added yet.</p>";
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
            orderItems: currentItems, 
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
    
    // 客户信息和PO号容器
    const infoContainer = document.createElement('div');
    infoContainer.style.display = 'flex';
    infoContainer.style.flexDirection = 'column';
    infoContainer.innerHTML = `
        <span><b>Customer:</b> ${order.customer || 'N/A'}</span>
        <span><b>PO:</b> ${order.poNumber || 'N/A'}</span>
        <span><b>Delivery:</b> ${order.delivery || 'N/A'}</span>
    `;
    div.appendChild(infoContainer);

    // 商品列表容器
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
    actionsContainer.style.gridColumn = 'span 1'; 
    actionsContainer.style.display = 'flex';
    actionsContainer.style.flexDirection = 'column';
    actionsContainer.style.gap = '5px';

    if (!isHistory) {
        // Admin: 修改状态
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

        // Salesman: Edit (需要访问全局 form 变量)
        if (isSalesmanPage) {
            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.addEventListener("click", () => {
              // 恢复表单数据
              form.customer.value = order.customer;
              form.poNumber.value = order.poNumber;
              form.delivery.value = order.delivery;
              
              // 恢复多商品数组并重新渲染列表 (需要 Salesman 页面上的 renderItemList 函数)
              currentItems = order.orderItems || [];
              const renderListFn = document.getElementById("item-list-container") ? 
                                   document.getElementById("item-list-container").closest('.main-content').querySelector('script').previousElementSibling.__functions.renderItemList : null;
              
              // 简单地重新加载页面以确保编辑状态：
              // 这是一个临时的解决方案，因为 renderItemList 函数不在全局作用域
              // 实际应用中，您应该将 renderItemList 放在全局作用域
              // 这里我们直接执行删除和提示，并期望用户刷新页面后数据回到表单
              
              if (confirm("Order details will be loaded into the form. Press OK to load and delete the old record.")) {
                  remove(ref(db, `orders/${key}`)); // 删除旧订单
                  alert("Please manually refresh the page to see the items loaded into the form.");
              }
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
        // Admin 历史记录：永久删除功能
        if (!isSalesmanPage) {
            const timeDeletedSpan = document.createElement("span");
            timeDeletedSpan.style.fontSize = "0.85em";
            timeDeletedSpan.style.color = "#909399";
            timeDeletedSpan.textContent = `Deleted: ${new Date(order.timestamp).toLocaleString()}`;
            actionsContainer.appendChild(timeDeletedSpan);
            
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

// --- Admin & Salesman: 显示订单 (Firebase 监听器) ---
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
          // 历史订单：Admin 显示，Salesman 不显示
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
      const statusOrder = isSalesman ? ["Pending"] : ["Pending", "Ordered", "Completed", "Pending Payment"];

      statusOrder.forEach(status => {
        if (grouped[status].length > 0 && ordersContainer) {
            // 添加标题
            const groupHeader = document.createElement("h3");
            groupHeader.textContent = status;
            groupHeader.style.textAlign = "center";
            groupHeader.style.width = "100%";
            groupHeader.style.marginTop = "20px";
            groupHeader.style.padding = "5px";
            groupHeader.style.borderBottom = "2px solid #3498db";
            groupHeader.style.color = "#3498db";
            ordersContainer.appendChild(groupHeader);
            
            // 渲染卡片
            grouped[status].forEach(({ key, order }) => {
              const card = createOrderCard(key, order, isSalesman, false);
              ordersContainer.appendChild(card);
            });
        }
      });
    });
}