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
      div.className = "card";
      div.style.backgroundColor = statusColors[status];

      const fields = ["customer", "poNumber", "itemDesc", "price", "delivery", "units"];
      fields.forEach(f => {
        const span = document.createElement("span");
        span.textContent = `${order[f]}`;
        div.appendChild(span);
      });

      // Admin 可以修改状态
      if (!isSalesman) {
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
        div.appendChild(statusSelect);
      }

      // Edit + Delete (Salesman)
      if (isSalesman) {
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
