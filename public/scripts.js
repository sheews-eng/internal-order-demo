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

// 🚀 移除 statusColors 变量，改用 CSS 类
// const statusColors = { ... };

// --- Salesman 功能 ---
if (isSalesman) {
  const form = document.getElementById("order-form");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const data = {
      customer: form.customer.value,
      poNumber: form.poNumber.value,
      itemDesc: form.itemDesc.value,
      price: `RM ${parseFloat(form.price.value).toFixed(2)}`,
      delivery: form.delivery.value,
      // 🚀 修复 units 默认值问题，确保它是一个数字
      units: form.units.value,
      status: "Pending",
      deleted: false,
      timestamp: Date.now()
    };
    const ordersRef = ref(db, "orders");
    push(ordersRef, data);
    form.reset();
  });
}

// --- Admin & Salesman: 显示订单 ---
onValue(ref(db, "orders"), snapshot => {
  const data = snapshot.val();
  ordersContainer.innerHTML = "";
  historyContainer.innerHTML = "";

  if (!data) return;

  const grouped = {
    "Pending": [],
    "Ordered": [],
    "Completed": [],
    "Pending Payment": []
  };

  Object.entries(data).forEach(([key, order]) => {
    if (order.deleted) {
      const div = document.createElement("div");
      div.className = "card history";
      // 🚀 优化历史记录显示：增加标签
      div.innerHTML = `
        <span><b>Customer:</b> ${order.customer}</span>
        <span><b>PO:</b> ${order.poNumber}</span>
        <span><b>Item:</b> ${order.itemDesc}</span>
        <span><b>Price:</b> ${order.price}</span>
        <span><b>Units:</b> ${order.units}</span>
        <span><b>Delivery:</b> ${order.delivery}</span>
        <span><b>Status:</b> ${order.status}</span>
      `;
      historyContainer.appendChild(div);
      return;
    }
    grouped[order.status].push({ key, order });
  });

  Object.keys(grouped).forEach(status => {
    grouped[status].forEach(({ key, order }) => {
      const div = document.createElement("div");
      // 🚀 样式优化: 使用 CSS class 代替行内样式
      div.className = `card status-${status.replace(/\s+/g, '')}`; 

      const fieldLabels = {
        "customer": "Customer",
        "poNumber": "PO Number",
        "itemDesc": "Item + Desc",
        "price": "Price",
        "delivery": "Delivery",
        "units": "Units"
      };

      Object.keys(fieldLabels).forEach(f => {
        const span = document.createElement("span");
        // 🚀 不协调修复: 显示明确的标签和值
        span.innerHTML = `<b>${fieldLabels[f]}:</b> ${order[f] || 'N/A'}`; 
        div.appendChild(span);
      });
      
      // 添加时间戳
      const timeSpan = document.createElement("span");
      timeSpan.className = "timestamp";
      timeSpan.textContent = `Submitted: ${new Date(order.timestamp).toLocaleString()}`;
      div.appendChild(timeSpan);

      // Admin 可以修改状态
      if (!isSalesman) {
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
        div.appendChild(statusSelect);
      }

      // Edit + Delete (Salesman)
      if (isSalesman) {
        // 确保 form 变量在作用域内
        const form = document.getElementById("order-form"); 
        
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => {
          form.customer.value = order.customer;
          form.poNumber.value = order.poNumber;
          form.itemDesc.value = order.itemDesc;
          form.price.value = order.price.replace("RM ", "");
          form.delivery.value = order.delivery;
          form.units.value = order.units;
          remove(ref(db, `orders/${key}`)); // 删除旧订单
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => {
          set(ref(db, `orders/${key}/deleted`), true);
        });

        div.appendChild(editBtn);
        div.appendChild(deleteBtn);
      }

      ordersContainer.appendChild(div);
    });
  });
});