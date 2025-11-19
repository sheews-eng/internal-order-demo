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

// 🚀 优化点: 状态颜色不再需要，因为我们使用 CSS 类
// const statusColors = {
//   "Pending": "#fff3cd",
//   "Ordered": "#d1ecf1",
//   "Completed": "#d4edda",
//   "Pending Payment": "#f8d7da"
// };

// 页面类型判断
const isSalesman = document.getElementById("order-form") !== null;
const ordersContainer = document.getElementById("orders-container");
const historyContainer = document.getElementById("history-container");

// --- Salesman 功能 ---
if (isSalesman) {
  const form = document.getElementById("order-form");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const data = {
      customer: form.customer.value,
      poNumber: form.poNumber.value,
      itemDesc: form.itemDesc.value,
      // 确保价格格式正确
      price: `RM ${parseFloat(form.price.value).toFixed(2)}`,
      delivery: form.delivery.value,
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
      div.textContent = `${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units} | ${order.status}`;
      historyContainer.appendChild(div);
      return;
    }
    grouped[order.status].push({ key, order });
  });

  Object.keys(grouped).forEach(status => {
    grouped[status].forEach(({ key, order }) => {
      const div = document.createElement("div");
      // 🚀 优化点 4: 使用 CSS class 代替行内样式，并添加状态 class
      div.className = `card status-${status.replace(/\s+/g, '')}`; 
      
      const fields = ["customer", "poNumber", "itemDesc", "price", "delivery", "units"];
      fields.forEach(f => {
        const span = document.createElement("span");
        span.textContent = `${f}: ${order[f]}`; // 增加字段名方便查看
        div.appendChild(span);
      });

      // Admin 可以修改状态
      if (!isSalesman) {
        const statusSelect = document.createElement("select");
        // 🚀 优化点 5: 为 select 添加 title 属性，提高可访问性
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
        // 确保 form 变量在作用域内 (在此版本中它已在 if (isSalesman) 块内)
        const form = document.getElementById("order-form"); 
        
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => {
          form.customer.value = order.customer;
          form.poNumber.value = order.poNumber;
          form.itemDesc.value = order.itemDesc;
          // 移除 RM 和空格以正确设置 input[type="number"] 的值
          form.price.value = order.price.replace("RM ", "");
          form.delivery.value = order.delivery;
          // 由于 units 原始值为 'unit'，现在应该能正确处理数字
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