import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

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

const ordersRef = ref(db, "orders");
const historyRef = ref(db, "history");

// Salesman: submit / edit / delete
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
    push(ordersRef, data);
    form.reset();
  });
}

// Render Orders
onValue(ordersRef, snapshot => {
  const data = snapshot.val();
  ordersContainer.innerHTML = "";
  if (data) {
    Object.entries(data).forEach(([key, order]) => {
      const div = document.createElement("div");
      div.className = "order";

      const info = document.createElement("div");
      info.className = "info";
      info.innerHTML = `
        <strong>${order.customer}</strong> | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units}
      `;

      const buttons = document.createElement("div");
      buttons.className = "buttons";

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "delete";
      deleteBtn.onclick = () => {
        push(historyRef, { ...order, deletedAt: Date.now() });
        remove(ref(db, "orders/" + key));
      };

      buttons.appendChild(deleteBtn);
      div.appendChild(info);
      div.appendChild(buttons);
      ordersContainer.appendChild(div);

      // Admin Status Dropdown
      if (!isSalesman) {
        const statusSelect = document.createElement("select");
        ["Pending","Ordered","Completed","Pending Payment"].forEach(s => {
          const option = document.createElement("option");
          option.value = s;
          option.textContent = s;
          if(order.status === s) option.selected = true;
          statusSelect.appendChild(option);
        });
        statusSelect.onchange = () => update(ref(db, "orders/" + key), {status: statusSelect.value});
        buttons.appendChild(statusSelect);
      }
    });
  }
});

// Render History
if (historyContainer) {
  onValue(historyRef, snapshot => {
    const data = snapshot.val();
    historyContainer.innerHTML = "";
    if (data) {
      Object.entries(data).forEach(([key, order]) => {
        const div = document.createElement("div");
        div.className = "history-order";
        div.textContent = `${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units}`;
        historyContainer.appendChild(div);
      });
    }
  });
}
