// scripts.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

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

const ordersContainer = document.getElementById("orders-container");
const historyContainer = document.getElementById("history-container");
const form = document.getElementById("order-form");

const isSalesman = form !== null;

// --------------------- Salesman: 新增 & 编辑 & 删除 ---------------------
if (isSalesman) {
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

    if (form.dataset.editId) {
      // 编辑现有订单
      const editRef = ref(db, `orders/${form.dataset.editId}`);
      set(editRef, data);
      delete form.dataset.editId;
    } else {
      // 新订单
      const ordersRef = ref(db, "orders");
      push(ordersRef, data);
    }

    form.reset();
  });
}

// --------------------- 显示订单 ---------------------
const ordersRef = ref(db, "orders");
onValue(ordersRef, snapshot => {
  const data = snapshot.val();
  ordersContainer.innerHTML = "";
  if (data) {
    Object.entries(data).forEach(([key, order]) => {
      const div = document.createElement("div");
      div.className = "order";

      if (isSalesman) {
        // Salesman 页面
        div.innerHTML = `
          ${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units} 
          <button data-edit="${key}">Edit</button>
          <button data-delete="${key}">Delete</button>
        `;

        div.querySelector(`[data-edit="${key}"]`).addEventListener("click", () => {
          form.customer.value = order.customer;
          form.poNumber.value = order.poNumber;
          form.itemDesc.value = order.itemDesc;
          form.price.value = order.price;
          form.delivery.value = order.delivery;
          form.units.value = order.units;
          form.dataset.editId = key;
        });

        div.querySelector(`[data-delete="${key}"]`).addEventListener("click", () => {
          const orderRef = ref(db, `orders/${key}`);
          push(ref(db, "history"), { ...order, deletedAt: Date.now() });
          set(orderRef, null);
        });
      } else {
        // Admin 页面
        const status = order.status || "Pending";
        div.innerHTML = `
          ${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units} 
          <select data-status="${key}">
            <option ${status==="Pending"?"selected":""}>Pending</option>
            <option ${status==="Ordered"?"selected":""}>Ordered</option>
            <option ${status==="Completed"?"selected":""}>Completed</option>
            <option ${status==="Pending Payment"?"selected":""}>Pending Payment</option>
          </select>
          <button data-delete="${key}">Delete</button>
        `;

        // 状态改变
        div.querySelector(`[data-status="${key}"]`).addEventListener("change", e => {
          const orderRef = ref(db, `orders/${key}`);
          set(orderRef, { ...order, status: e.target.value });
        });

        // 删除
        div.querySelector(`[data-delete="${key}"]`).addEventListener("click", () => {
          const orderRef = ref(db, `orders/${key}`);
          push(ref(db, "history"), { ...order, deletedAt: Date.now() });
          set(orderRef, null);
        });
      }

      ordersContainer.appendChild(div);
    });
  }
});

// --------------------- 显示历史删除订单 ---------------------
const historyRef = ref(db, "history");
onValue(historyRef, snapshot => {
  const historyData = snapshot.val();
  historyContainer.innerHTML = "";
  if (historyData) {
    Object.entries(historyData).forEach(([key, order]) => {
      const div = document.createElement("div");
      const date = new Date(order.deletedAt).toLocaleString();
      div.textContent = `${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units} | Deleted At: ${date}`;
      historyContainer.appendChild(div);
    });
  }
});
