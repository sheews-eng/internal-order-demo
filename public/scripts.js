import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

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
      item: form.item.value,
      description: form.description.value,
      price: parseFloat(form.price.value),
      delivery: form.delivery.value,
      units: parseInt(form.units.value),
      timestamp: Date.now()
    };

    const ordersRef = ref(db, "orders");
    push(ordersRef, data);

    form.reset();
  });
}

// Admin & Salesman: 实时显示订单
const ordersRef = ref(db, "orders");
onValue(ordersRef, snapshot => {
  const data = snapshot.val() || {};
  ordersContainer.innerHTML = ""; // 清空

  Object.entries(data).forEach(([key, order]) => {
    const div = document.createElement("div");
    div.className = "order";
    div.textContent = `
Customer: ${order.customer} | 
PO Number: ${order.poNumber} | 
Item: ${order.item} | 
Description: ${order.description} | 
Price: ${order.price} | 
Delivery: ${order.delivery} | 
Units: ${order.units}
    `;
    ordersContainer.appendChild(div);
  });

  // Admin 播放声音（只在新订单时）
  const newKeys = Object.keys(data).filter(k => !previousOrders[k]);
  if (newKeys.length > 0 && previousOrders && dingSound) {
    dingSound.play();
  }

  previousOrders = data;
});
