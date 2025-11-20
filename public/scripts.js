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

// 🚀 全局变量 (用于 Salesman Edit/Add Items 功能)
const form = document.getElementById("order-form"); 
const isSalesman = form !== null;
const ordersContainer = document.getElementById("orders-container");
const historyContainer = document.getElementById("history-container");

// Salesman 多商品状态
let currentItems = []; 
let renderItemList;   

// --- Salesman 功能 (多商品逻辑) ---
if (isSalesman) {
    const addItemBtn = document.getElementById("addItemBtn");
    const itemListContainer = document.getElementById("item-list-container");

    // 🚀 渲染当前商品列表的函数
    renderItemList = function() {
        itemListContainer.innerHTML = "";
        if (currentItems.length === 0) {
            itemListContainer.innerHTML = "<p class='no-items'>No items added yet. Click 'Add Item' above.</p>";
            return;
        }

        currentItems.forEach((item, index) => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "card item-preview";
            // 使用内联 flex 布局进行预览
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
        // 使用 ID 获取输入值，因为它们不在 form.elements 集合中
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
            alert("Please add at least one item to the order before submitting.");
            return;
        }

        const data = {
            customer: form.customer.value,
            poNumber: form.poNumber.value,
            delivery: form.delivery.value,
            orderItems: currentItems, // 🚀 提交多商品数组
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
    // 样式优化: 使用 CSS class 代替行内样式
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

    // 2. 商品列表 (Items)
    const itemsListContainer = document.createElement('div');
    itemsListContainer.className = 'items-list'; 
    itemsListContainer.innerHTML = "<b>Items:</b>";
    
    if (order.orderItems && Array.isArray(order.orderItems)) {
        order.orderItems.forEach(item => {
            const itemSpan = document.createElement('span');
            itemSpan.className = 'item-detail';
            // 🚀 协调显示多商品信息
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
    
    // 4. 操作区域
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'actions-container'; 
    
    if (!isHistory) {
        // Admin: 修改状态
        if (!isSalesmanPage) {
            const statusSelect = document.createElement("select");
            // 🚀 可访问性修复: 为 select 添加 title 属性
            statusSelect.title = "Change Order Status"; 
            
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

        // Salesman: Edit 
        if (isSalesmanPage) {
            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.addEventListener("click", () => {
              // 恢复基础表单数据
              form.customer.value = order.customer;
              form.poNumber.value = order.poNumber;
              form.delivery.value = order.delivery;
              
              // 恢复多商品数组并重新渲染列表
              currentItems = order.orderItems || []; 
              
              if (confirm("Order details will be loaded into the form. The old record will be deleted. Please use 'Add Item' if necessary before submitting.")) {
                  if (typeof renderItemList === 'function') {
                      renderItemList(); 
                  }
                  remove(ref(db, `orders/${key}`)); // 删除旧订单
              }
            });
            actionsContainer.appendChild(editBtn);
        }
        
        // Delete (移入历史)
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-btn";
        deleteBtn.addEventListener("click", () => {
          set(ref(db, `orders/${key}/deleted`), true);
        });
        actionsContainer.appendChild(deleteBtn);
        
    } else {
        // History Display
        const historyStatus = document.createElement('span');
        historyStatus.textContent = `Status: ${order.status}`;
        actionsContainer.appendChild(historyStatus);
    }
    
    div.appendChild(actionsContainer);
    return div;
}

// --- Admin & Salesman: 显示订单 (Firebase 监听器) ---
if (ordersContainer || historyContainer) {
    onValue(ref(db, "orders"), snapshot => {
      const data = snapshot.val();
      
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
          // 历史订单
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

      // 渲染分组的订单
      const statusOrder = ["Pending", "Ordered", "Completed", "Pending Payment"];

      statusOrder.forEach(status => {
        if (grouped[status].length > 0 && ordersContainer) {
            // 标题
            const groupHeader = document.createElement("h3");
            groupHeader.textContent = status;
            groupHeader.className = 'status-group-header';
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