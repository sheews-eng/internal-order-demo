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
    push(ordersRef, data);
    form.reset();
  });
}

// 编辑订单
function editOrder(key, order) {
  const customer = prompt("Customer:", order.customer);
  const poNumber = prompt("PO Number:", order.poNumber);
  const itemDesc = prompt("Item + Description:", order.itemDesc);
  const price = prompt("Price:", order.price);
  const delivery = prompt("Delivery:", order.delivery);
  const units = prompt("Units:", order.units);

  if (customer && poNumber && itemDesc) {
    update(ref(db, "orders/" + key), {
      customer, poNumber, itemDesc,
      price: parseFloat(price),
      delivery, units: parseInt(units)
    });
  }
}

// 删除订单并存入历史
function deleteOrder(key, order) {
  const timestamp = Date.now();
  set(ref(db, "history/" + timestamp), order);
  remove(ref(db, "orders/" + key));
}

// 实时显示订单
onValue(ordersRef, snapshot => {
  const data = snapshot.val();
  ordersContainer.innerHTML = "";
  if (data) {
    Object.entries(data).forEach(([key, order]) => {
      const div = document.createElement("div");
      div.className = "order";

      const info = document.createElement("div");
      info.textContent = `${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units}`;
      div.appendChild(info);

      if (isSalesman) {
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.onclick = () => editOrder(key, order);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = () => deleteOrder(key, order);

        div.appendChild(editBtn);
        div.appendChild(deleteBtn);
      } else { // Admin
        const statusSelect = document.createElement("select");
        ["Pending", "Ordered", "Completed", "Pending Payment"].forEach(s => {
          const opt = document.createElement("option");
          opt.value = s;
          opt.textContent = s;
          if (s === order.status) opt.selected = true;
          statusSelect.appendChild(opt);
        });
        statusSelect.onchange = () => update(ref(db, "orders/" + key), { status: statusSelect.value });
        div.appendChild(statusSelect);
      }

      ordersContainer.appendChild(div);
    });
  }
});

// 实时显示历史订单
onValue(historyRef, snapshot => {
  const data = snapshot.val();
  historyContainer.innerHTML = "";
  if (data) {
    Object.entries(data).forEach(([key, order]) => {
      const div = document.createElement("div");
      div.textContent = `${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units}`;
      historyContainer.appendChild(div);
    });
  }
});
