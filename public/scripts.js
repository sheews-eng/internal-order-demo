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

// DOM
const form = document.getElementById("order-form");
const ordersContainer = document.getElementById("orders-container");
const historyContainer = document.getElementById("history-container");
const ding = document.getElementById("ding");

// 判断页面类型
const isSalesman = form !== null;

// Salesman: 提交订单
if (isSalesman) {
  form.addEventListener("submit", e => {
    e.preventDefault();

    const data = {
      customer: form.elements['customer'].value,
      poNumber: form.elements['poNumber'].value,
      itemDesc: form.elements['itemDesc'].value,
      price: parseFloat(form.elements['price'].value),
      delivery: form.elements['delivery'].value,
      units: parseInt(form.elements['units'].value),
      timestamp: Date.now()
    };

    const ordersRef = ref(db, "orders");
    push(ordersRef, data);

    form.reset();
  });
}

// Firebase refs
const ordersRef = ref(db, "orders");
const historyRef = ref(db, "history");

// 渲染订单
function renderOrders(dataObj) {
  ordersContainer.innerHTML = "";
  if (!dataObj) return;

  Object.entries(dataObj).forEach(([key, order]) => {
    const div = document.createElement("div");
    div.className = "order";
    div.innerHTML = `
      ${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units} 
      <button data-key="${key}">Delete</button>
    `;
    ordersContainer.appendChild(div);

    // Delete 功能
    div.querySelector("button").addEventListener("click", () => {
      // 保存到 history
      const historyEntryRef = push(historyRef);
      set(historyEntryRef, {
        ...order,
        deletedAt: Date.now()
      });
      // 删除订单
      remove(ref(db, `orders/${key}`));
    });
  });
}

// 渲染历史
function renderHistory(dataObj) {
  historyContainer.innerHTML = "";
  if (!dataObj) return;

  Object.entries(dataObj).forEach(([key, order]) => {
    const div = document.createElement("div");
    div.className = "history-order";
    div.textContent = `${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units} | Deleted at: ${new Date(order.deletedAt).toLocaleString()}`;
    historyContainer.appendChild(div);
  });
}

// 监听实时订单 & 历史
let firstLoad = true;
onValue(ordersRef, snapshot => {
  const data = snapshot.val();
  renderOrders(data);

  if (!firstLoad && data) {
    // 播放声音
    ding.play().catch(()=>{}); 
  }
  firstLoad = false;
});
onValue(historyRef, snapshot => renderHistory(snapshot.val()));
