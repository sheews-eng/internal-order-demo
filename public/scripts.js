// scripts.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// Firebase 配置
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

// 判断页面类型
const isSalesman = document.getElementById("order-form") !== null;
const ordersContainer = document.getElementById("orders-container");

// ------------------ Salesman ------------------
if (isSalesman) {
  const form = document.getElementById("order-form");
  form.addEventListener("submit", e => {
    e.preventDefault();

    const data = {
      customer: form.elements['customer'].value,
      poNumber: form.elements['poNumber'].value,
      itemDesc: form.elements['itemDesc'].value, // Item + Description 合并
      price: parseFloat(form.elements['price'].value),
      delivery: form.elements['delivery'].value,
      units: parseInt(form.elements['units'].value),
      timestamp: Date.now()
    };

    // push 到 orders
    push(ref(db, "orders"), data);

    form.reset();
  });
}

// ------------------ Admin & Salesman 实时显示订单 ------------------
const ordersRef = ref(db, "orders");
onValue(ordersRef, snapshot => {
  const data = snapshot.val();
  if (!ordersContainer) return;
  ordersContainer.innerHTML = ""; // 清空容器

  if (data) {
    Object.entries(data).forEach(([key, order]) => {
      const div = document.createElement("div");
      div.className = "order";

      // 显示内容
      div.innerHTML = `
        <b>${order.customer}</b> | PO: ${order.poNumber} | ${order.itemDesc} | Price: ${order.price} | Delivery: ${order.delivery} | Units: ${order.units}
      `;

      // Admin 可删除
      if (!isSalesman) {
        const btn = document.createElement("button");
        btn.textContent = "Delete";
        btn.style.marginLeft = "10px";
        btn.addEventListener("click", () => {
          // 移到 orders_history
          const historyRef = ref(db, "orders_history/" + key);
          set(historyRef, { ...order, deletedAt: Date.now() }).then(() => {
            remove(ref(db, "orders/" + key));
          });
        });
        div.appendChild(btn);
      }

      ordersContainer.appendChild(div);
    });
  }
});

// ------------------ 可选：显示删除历史 ------------------
// Admin 页面可以添加一个 history-container
const historyContainer = document.getElementById("history-container");
if (historyContainer) {
  const historyRef = ref(db, "orders_history");
  onValue(historyRef, snapshot => {
    const history = snapshot.val();
    historyContainer.innerHTML = "";
    if (history) {
      Object.entries(history).forEach(([key, order]) => {
        const div = document.createElement("div");
        div.className = "order-history";
        div.textContent = `[DELETED] ${order.customer} | PO: ${order.poNumber} | ${order.itemDesc} | Price: ${order.price} | Delivery: ${order.delivery} | Units: ${order.units} | DeletedAt: ${new Date(order.deletedAt).toLocaleString()}`;
        historyContainer.appendChild(div);
      });
    }
  });
}
