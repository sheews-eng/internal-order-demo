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

// 🚀 全局变量 (用于 Salesman Edit 功能)
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

    // 🚀 定义全局可访问的渲染函数
    renderItemList = function() {
        itemListContainer.innerHTML = "";
        if (currentItems.length === 0) {
            itemListContainer.innerHTML = "<p style='color:#999; text-align:center;'>No items added yet.</p>";
            return;
        }

        currentItems.forEach((item, index) => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "card item-preview";
            // 样式优化：移除行内 borderLeft，使用 CSS 类
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
            alert("Please add at least one item to the order.");
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
    // 样式优化：使用 CSS class 代替行内样式
    div.className = `card ${isHistory ? 'history' : ''} status-${order.status.replace(/\s+/g, '')}`;
    
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
    itemsListContainer.className = 'items-list'; // 新增 class
    itemsListContainer.innerHTML = "<b>Items:</b>";
    
    // 🚀 适配多商品数组 orderItems
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
    timeSpan.className = "timestamp"; // 使用 CSS 类
    timeSpan.textContent = `Submitted: ${new Date(order.timestamp).toLocaleString()}`;
    div.appendChild(timeSpan);
    
    // 操作区域
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'actions-container'; // 新增 class
    
    if (!isHistory) {
        // Admin: 修改状态
        if (!isSalesmanPage) {
            const statusSelect = document.createElement("select");
            statusSelect.title = "Change Order Status"; // 可访问性修复
            
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

        // Salesman: Edit (需要访问全局 currentItems 和 renderItemList)
        if (isSalesmanPage) {
            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.addEventListener("click", () => {
              // 恢复表单数据
              form.customer.value = order.customer;
              form.poNumber.value = order.poNumber;
              form.delivery.value = order.delivery;
              
              // 恢复多商品数组并重新渲染列表
              currentItems = order.orderItems || []; 
              
              if (confirm("Order details will be loaded into the form. Press OK to load and delete the old record. You must use the 'Add Item' button before submitting.")) {
                  if (typeof renderItemList === 'function') {
                      renderItemList(); // 🚀 使用全局函数
                  }
                  remove(ref(db, `orders/${key}`)); // 删除旧订单
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
            timeDeletedSpan.className = "timestamp";
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