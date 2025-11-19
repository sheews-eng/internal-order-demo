import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// Firebase 配置信息
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

// --- Helper: 创建订单卡片函数 (新增/重构) ---
function createOrderCard(key, order, isSalesmanPage) {
    const div = document.createElement("div");
    div.className = order.deleted ? "card history" : "card";
    if (!order.deleted) {
        div.style.backgroundColor = statusColors[order.status];
    }

    // 定义订单字段及其显示标签
    const fields = [
        { label: "Customer", key: "customer" },
        { label: "PO #", key: "poNumber" },
        { label: "Item + Desc", key: "itemDesc" },
        { label: "Price", key: "price" },
        { label: "Delivery", key: "delivery" },
        { label: "Units", key: "units" }
    ];

    // 1. 基础字段显示 (UX 改进: 添加字段标签)
    fields.forEach(f => {
        const span = document.createElement("span");
        // 使用 innerHTML 方便格式化字段标签
        span.innerHTML = `<span style="font-weight: bold; color: #555;">${f.label}:</span> ${order[f.key]}`;
        div.appendChild(span);
    });
    
    // 如果是已删除订单，直接显示所有信息并返回
    if (order.deleted) {
        // 在 history 视图中添加时间戳
        const timeSpan = document.createElement("span");
        timeSpan.style.fontSize = "0.85em";
        timeSpan.style.color = "#777";
        timeSpan.textContent = `Deleted: ${new Date(order.timestamp).toLocaleString()}`;
        div.appendChild(timeSpan);
        return div;
    }


    // 2. 状态和时间戳 (UX 改进: 突出显示状态和时间)
    const statusSpan = document.createElement("span");
    statusSpan.innerHTML = `<span style="font-weight: bold; color: #555;">Status:</span> <b style="color: #2c3e50;">${order.status}</b>`;
    div.appendChild(statusSpan);

    const timeSpan = document.createElement("span");
    timeSpan.style.fontSize = "0.85em";
    timeSpan.style.color = "#777";
    timeSpan.textContent = `Submitted: ${new Date(order.timestamp).toLocaleString()}`;
    div.appendChild(timeSpan);


    // 3. Admin 功能 (非销售员)
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
        statusSelect.style.marginTop = "8px"; // 增加间隔
        div.appendChild(statusSelect);
    }

    // 4. Salesman 功能
    if (isSalesmanPage) {
        const form = document.getElementById("order-form");
        
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.style.backgroundColor = "#f39c12";

        editBtn.addEventListener("click", () => {
          // 填充表单
          form.customer.value = order.customer;
          form.poNumber.value = order.poNumber;
          form.itemDesc.value = order.itemDesc;
          // 移除 "RM "
          form.price.value = order.price.replace("RM ", "");
          form.delivery.value = order.delivery;
          form.units.value = order.units;
          
          // 删除旧订单，准备提交新订单
          remove(ref(db, `orders/${key}`));
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.style.backgroundColor = "#e74c3c";
        
        deleteBtn.addEventListener("click", () => {
          // 标记订单为已删除
          set(ref(db, `orders/${key}/deleted`), true);
        });

        div.appendChild(editBtn);
        div.appendChild(deleteBtn);
    }
    
    return div;
}


// --- Salesman 功能 (保持不变) ---
if (isSalesman) {
  const form = document.getElementById("order-form");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const data = {
      customer: form.customer.value,
      poNumber: form.poNumber.value,
      itemDesc: form.itemDesc.value,
      // 保持价格格式化
      price: `RM ${parseFloat(form.price.value).toFixed(2)}`, 
      delivery: form.delivery.value,
      units: form.units.value,
      status: "Pending",
      deleted: false,
      timestamp: Date.now() // 记录时间戳
    };
    const ordersRef = ref(db, "orders");
    push(ordersRef, data);
    form.reset();
  });
}

// --- Admin & Salesman: 显示订单 (使用重构后的函数) ---
onValue(ref(db, "orders"), snapshot => {
  const data = snapshot.val();
  ordersContainer.innerHTML = "";
  historyContainer.innerHTML = "";

  if (!data) return;

  // 保持分组逻辑
  const grouped = {
    "Pending": [],
    "Ordered": [],
    "Completed": [],
    "Pending Payment": []
  };

  Object.entries(data).forEach(([key, order]) => {
    if (order.deleted) {
      // 使用 createOrderCard 显示历史订单
      historyContainer.appendChild(createOrderCard(key, order, isSalesman));
      return;
    }
    // 根据状态进行分组
    grouped[order.status].push({ key, order });
  });

  Object.keys(grouped).forEach(status => {
    grouped[status].forEach(({ key, order }) => {
        // 使用 createOrderCard 显示当前订单
        ordersContainer.appendChild(createOrderCard(key, order, isSalesman));
    });
  });
});