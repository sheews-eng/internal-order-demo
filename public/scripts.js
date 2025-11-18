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

const form = document.getElementById("order-form");
const ordersContainer = document.getElementById("orders-container");
const historyContainer = document.getElementById("history-container");

const ordersRef = ref(db, "orders");
const deletedRef = ref(db, "deletedOrders");

// ---- Salesman submit ----
if (form) {
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

    push(ordersRef, data);
    form.reset();
  });
}

// ---- Orders display ----
function renderOrders(container, data, allowDelete = false) {
  container.innerHTML = "";
  if (!data) return;

  Object.entries(data).forEach(([key, order]) => {
    const div = document.createElement("div");
    div.className = "order";
    div.innerHTML = `
      ${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units}
      ${allowDelete ? '<button class="delete-btn">Delete</button>' : ''}
    `;

    if (allowDelete) {
      div.querySelector(".delete-btn").addEventListener("click", () => {
        // Move to deletedOrders
        push(deletedRef, { ...order, deletedAt: Date.now() });
        remove(ref(db, "orders/" + key));
      });
    }

    container.appendChild(div);
  });
}

// ---- Listen for active orders ----
onValue(ordersRef, snapshot => {
  const data = snapshot.val();
  renderOrders(ordersContainer, data, !!form);
});

// ---- Listen for deleted orders ----
onValue(deletedRef, snapshot => {
  const data = snapshot.val();
  renderOrders(historyContainer, data, false);
});
