import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// ===== Firebase 配置 =====
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

// ===== 页面元素 =====
const isSalesman = document.getElementById("order-form") !== null;
const ordersContainer = document.getElementById("orders-container");
const historyContainer = document.getElementById("history-container");

// ===== Salesman: 提交订单 =====
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
      timestamp: Date.now(),
      status: "Pending"  // 默认状态
    };
    const ordersRef = ref(db, "orders");
    push(ordersRef, data);
    form.reset();
  });
}

// ===== Admin & Salesman: 实时显示订单 =====
const ordersRef = ref(db, "orders");
const historyRef = ref(db, "history");

onValue(ordersRef, snapshot => {
  const data = snapshot.val();
  ordersContainer.innerHTML = ""; // 清空
  if (data) {
    Object.entries(data).forEach(([key, order]) => {
      const div = document.createElement("div");
      div.className = "order";

      const info = document.createElement("div");
      info.className = "info";
      info.innerHTML = `
        ${order.customer} | ${order.poNumber || ""} | ${order.itemDesc} | 
        ${order.price} | ${order.delivery} | ${order.units} | Status: 
      `;
      div.appendChild(info);

      // ===== Salesman Buttons =====
      if (isSalesman) {
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.className = "edit";
        editBtn.onclick = () => editOrder(key, order);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete";
        deleteBtn.onclick = () => deleteOrder(key, order);

        div.appendChild(editBtn);
        div.appendChild(deleteBtn);
      }

      // ===== Admin: 状态下拉选择 =====
      if (!isSalesman) {
        const statusSelect = document.createElement("select");
        statusSelect.className = "status";
        ["Pending", "Ordered", "Completed", "Pending Payment"].forEach(s => {
          const option = document.createElement("option");
          option.value = s;
          option.textContent = s;
          if (s === order.status) option.selected = true;
          statusSelect.appendChild(option);
        });
        statusSelect.onchange = () => update(ref(db, "orders/" + key), { status: statusSelect.value });
        div.appendChild(statusSelect);
      }

      ordersContainer.appendChild(div);
    });
  }
});

// ===== Salesman: 编辑订单 =====
function editOrder(key, order) {
  const customer = prompt("Customer:", order.customer);
  if (customer === null) return;
  const poNumber = prompt("PO Number:", order.poNumber || "");
  if (poNumber === null) return;
  const itemDesc = prompt("Item + Description:", order.itemDesc);
  if (itemDesc === null) return;
  const price = prompt("Price:", order.price);
  if (price === null) return;
  const delivery = prompt("Delivery:", order.delivery);
  if (delivery === null) return;
  const units = prompt("Units:", order.units);
  if (units === null) return;

  update(ref(db, "orders/" + key), {
    customer,
    poNumber,
    itemDesc,
    price: parseFloat(price),
    delivery,
    units: parseInt(units)
  });
}

// ===== Salesman: 删除订单 =====
function deleteOrder(key, order) {
  // 保存到历史
  const historyRefPush = push(historyRef);
  set(historyRefPush, order).then(() => {
    // 删除原订单
    remove(ref(db, "orders/" + key));
  });
}

// ===== Admin & Salesman: 显示历史 =====
onValue(historyRef, snapshot => {
  const data = snapshot.val();
  historyContainer.innerHTML = "";
  if (data) {
    Object.values(data).forEach(order => {
      const div = document.createElement("div");
      div.className = "history-order";
      div.textContent = `${order.customer} | ${order.poNumber || ""} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units}`;
      historyContainer.appendChild(div);
    });
  }
});
