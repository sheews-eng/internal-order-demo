import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, set } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

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

const isSalesman = document.getElementById("order-form") !== null;
const ordersContainer = document.getElementById("orders-container");
const historyContainer = document.getElementById("history-container");
const dingSound = document.getElementById("ding-sound");
let previousOrders = {};

// Salesman: 提交订单
if (isSalesman) {
  const form = document.getElementById("order-form");
  form.addEventListener("submit", e => {
    e.preventDefault();

    const data = {
      customer: form.customer.value,
      poNumber: form.poNumber.value,
      itemDesc: form.itemDesc.value,
      price: parseFloat(form.price.value),
      delivery: form.delivery.value,
      units: parseInt(form.units.value),
      timestamp: Date.now()
    };

    push(ref(db, "orders"), data);
    form.reset();
  });
}

// Admin & Salesman: 实时显示订单
const ordersRef = ref(db, "orders");
const historyRef = ref(db, "history");

onValue(ordersRef, snapshot => {
  const data = snapshot.val() || {};
  ordersContainer.innerHTML = "";

  Object.entries(data).forEach(([key, order]) => {
    const div = document.createElement("div");
    div.className = "order";
    div.innerHTML = `
      <strong>${order.customer}</strong> | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units}
      ${!isSalesman ? `<button data-key="${key}" class="delete-btn">Delete</button>` : ""}
    `;
    ordersContainer.appendChild(div);
  });

  // 播放提示音
  const newKeys = Object.keys(data).filter(k => !previousOrders[k]);
  if (newKeys.length > 0 && previousOrders && dingSound) {
    dingSound.play();
  }

  previousOrders = data;

  // 删除订单
  if (!isSalesman) {
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.onclick = async () => {
        const key = btn.dataset.key;
        const order = data[key];

        // 移动到 history
        await push(historyRef, order);
        // 删除原订单
        await remove(ref(db, "orders/" + key));
      };
    });
  }
});

// 显示历史订单
onValue(historyRef, snapshot => {
  const data = snapshot.val() || {};
  if (historyContainer) {
    historyContainer.innerHTML = "";
    Object.entries(data).forEach(([key, order]) => {
      const div = document.createElement("div");
      div.className = "order-history";
      div.textContent = `
        ${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units}
      `;
      historyContainer.appendChild(div);
    });
  }
});
