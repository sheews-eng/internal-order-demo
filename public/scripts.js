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
      status: "Pending",
      timestamp: Date.now()
    };

    // 如果编辑模式，则更新原订单
    if (form.dataset.editKey) {
      const key = form.dataset.editKey;
      update(ref(db, "orders/" + key), data);
      delete form.dataset.editKey;
    } else {
      push(ordersRef, data);
    }

    form.reset();
  });
}

// ---- Render orders ----
function renderOrders(container, data, allowEditDelete = false, isAdmin = false) {
  container.innerHTML = "";
  if (!data) return;

  Object.entries(data).forEach(([key, order]) => {
    const div = document.createElement("div");
    div.className = "order";
    div.innerHTML = `
      ${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units} 
      ${isAdmin ? `
        Status: 
        <select class="status-select">
          <option value="Pending" ${order.status==="Pending"?"selected":""}>Pending</option>
          <option value="Ordered" ${order.status==="Ordered"?"selected":""}>Ordered</option>
          <option value="Completed" ${order.status==="Completed"?"selected":""}>Completed</option>
          <option value="Pending Payment" ${order.status==="Pending Payment"?"selected":""}>Pending Payment</option>
        </select>` : ""}
      ${allowEditDelete ? `
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>` : ""}
    `;

    // Edit
    if (allowEditDelete) {
      div.querySelector(".edit-btn").addEventListener("click", () => {
        form.customer.value = order.customer;
        form.poNumber.value = order.poNumber;
        form.itemDesc.value = order.itemDesc;
        form.price.value = order.price;
        form.delivery.value = order.delivery;
        form.units.value = order.units;
        form.dataset.editKey = key;
      });

      // Delete
      div.querySelector(".delete-btn").addEventListener("click", () => {
        push(deletedRef, { ...order, deletedAt: Date.now() });
        remove(ref(db, "orders/" + key));
      });
    }

    // Admin change status
    if (isAdmin) {
      div.querySelector(".status-select").addEventListener("change", (e) => {
        update(ref(db, "orders/" + key), { status: e.target.value });
      });
    }

    container.appendChild(div);
  });
}

// ---- Listen active orders ----
onValue(ordersRef, snapshot => {
  const data = snapshot.val();
  renderOrders(ordersContainer, data, !!form, !form);
});

// ---- Listen deleted orders ----
onValue(deletedRef, snapshot => {
  const data = snapshot.val();
  renderOrders(historyContainer, data, false, false);
});
