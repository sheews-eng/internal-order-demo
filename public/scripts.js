import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

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
const isAdmin = !isSalesman;

const ordersContainer = document.getElementById("orders-container");
let lastOrderCount = 0;

// Salesman 提交订单
if (isSalesman) {
  const form = document.getElementById("order-form");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const data = {
      customer: form.customer.value,
      item: form.item.value,
      description: form.description.value,
      price: parseFloat(form.price.value),
      delivery: form.delivery.value,
      timestamp: Date.now()
    };
    const ordersRef = ref(db, "orders");
    push(ordersRef, data);
    form.reset();
  });
}

// Admin & Salesman 实时显示订单
const ordersRef = ref(db, "orders");
onValue(ordersRef, snapshot => {
  const data = snapshot.val();
  const currentCount = data ? Object.keys(data).length : 0;

  // 🔊 Admin 新订单提示音
  if (isAdmin && currentCount > lastOrderCount) {
    const ding = document.getElementById("ding");
    ding.play().catch(e => console.log("Audio play blocked:", e));
  }

  lastOrderCount = currentCount;

  // 显示订单
  ordersContainer.innerHTML = "";
  if (data) {
    Object.entries(data).forEach(([key, order]) => {
      const div = document.createElement("div");
      div.className = "order";
      div.textContent = `${order.customer} | ${order.item} | ${order.description} | ${order.price} | ${order.delivery}`;
      ordersContainer.appendChild(div);
    });
  }
});
