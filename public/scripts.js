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

const orderForm = document.getElementById("order-form");
const isSalesman = orderForm !== null;

if (isSalesman) {
  orderForm.addEventListener("submit", e => {
    e.preventDefault();
    const data = {
      customer: orderForm.customer.value,
      poNumber: orderForm.poNumber.value,
      itemDesc: orderForm.itemDesc.value,
      price: orderForm.price.value || "RM",
      delivery: orderForm.delivery.value,
      units: orderForm.units.value || "unit",
      status: "Pending",
      deleted: false,
      timestamp: Date.now()
    };
    push(ref(db, "orders"), data);
    orderForm.reset();
  });
}

onValue(ref(db, "orders"), snapshot => {
  const data = snapshot.val();
  if (!data) return;

  if (isSalesman) {
    const ordersContainer = document.getElementById("orders-container");
    const historyContainer = document.getElementById("history-container");
    ordersContainer.innerHTML = "";
    historyContainer.innerHTML = "";

    Object.entries(data).forEach(([key, order]) => {
      if (order.deleted) {
        const div = document.createElement("div");
        div.className = "card history";
        div.textContent = `${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units}`;
        historyContainer.appendChild(div);
        return;
      }

      const div = document.createElement("div");
      div.className = "card pending";

      // Inline editable fields
      const fields = ["customer", "poNumber", "itemDesc", "price", "delivery", "units"];
      fields.forEach(f => {
        const input = document.createElement("input");
        input.value = order[f];
        input.className = `inline-${f}`;
        input.addEventListener("change", () => {
          set(ref(db, `orders/${key}/${f}`), input.value);
        });
        div.appendChild(input);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = () => set(ref(db, `orders/${key}`), { ...order, deleted: true });

      div.appendChild(deleteBtn);
      ordersContainer.appendChild(div);
    });
  }
});
