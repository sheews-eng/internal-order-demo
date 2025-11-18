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
      div.textContent = `${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units}`;

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.onclick = () => {
        orderForm.customer.value = order.customer;
        orderForm.poNumber.value = order.poNumber;
        orderForm.itemDesc.value = order.itemDesc;
        orderForm.price.value = order.price;
        orderForm.delivery.value = order.delivery;
        orderForm.units.value = order.units;
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = () => set(ref(db, `orders/${key}`), {...order, deleted:true});

      div.appendChild(editBtn);
      div.appendChild(deleteBtn);
      ordersContainer.appendChild(div);
    });
  } else { // Admin
    const containers = {
      "Pending": document.getElementById("pending-container"),
      "Ordered": document.getElementById("ordered-container"),
      "Completed": document.getElementById("completed-container"),
      "Pending Payment": document.getElementById("pending-payment-container")
    };

    Object.values(containers).forEach(c => c.innerHTML = "");

    Object.entries(data).forEach(([key, order]) => {
      if (order.deleted) return;

      const div = document.createElement("div");
      div.className = `card ${order.status.toLowerCase().replace(" ", "-")}`;
      div.textContent = `${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units}`;

      const statusSelect = document.createElement("select");
      ["Pending","Ordered","Completed","Pending Payment"].forEach(s => {
        const option = document.createElement("option");
        option.value = s;
        option.textContent = s;
        if (order.status === s) option.selected = true;
        statusSelect.appendChild(option);
      });

      statusSelect.onchange = (e) => set(ref(db, `orders/${key}/status`), e.target.value);

      div.appendChild(statusSelect);
      containers[order.status].appendChild(div);
    });
  }
});
