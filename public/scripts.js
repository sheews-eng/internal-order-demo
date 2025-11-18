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

// 判断页面类型
const isSalesman = document.getElementById("order-form") !== null;
const ordersContainer = document.getElementById("orders-container");
const historyContainer = document.getElementById("history-container");

const ordersRef = ref(db, "orders");
const historyRef = ref(db, "history");

// ---------- Salesman: 提交订单 ----------
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
      status: "Pending",
      timestamp: Date.now()
    };
    push(ordersRef, data);
    form.reset();
  });
}

// ---------- 实时显示订单 ----------
onValue(ordersRef, snapshot => {
  const data = snapshot.val();
  if (!ordersContainer) return;
  ordersContainer.innerHTML = ""; // 清空
  if (data) {
    Object.entries(data).forEach(([key, order]) => {
      const div = document.createElement("div");
      div.className = "order " + (order.status ? order.status.replace(/\s/g, '') : '');
      div.dataset.id = key;

      // Salesman页面：编辑/删除按钮
      let content = `${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units}`;
      div.textContent = content;

      if (isSalesman) {
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.className = "edit";
        editBtn.onclick = () => editOrder(key, order);
        div.appendChild(editBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete";
        deleteBtn.onclick = () => deleteOrder(key, order);
        div.appendChild(deleteBtn);
      }

      // Admin页面：状态下拉
      if (!isSalesman) {
        const select = document.createElement("select");
        ["Pending","Ordered","Completed","Pending Payment"].forEach(status => {
          const option = document.createElement("option");
          option.value = status;
          option.textContent = status;
          if (order.status === status) option.selected = true;
          select.appendChild(option);
        });
        select.onchange = () => update(ref(db, `orders/${key}`), { status: select.value });
        div.appendChild(select);
      }

      ordersContainer.appendChild(div);
    });
  }
});

// ---------- 历史订单显示 ----------
onValue(historyRef, snapshot => {
  const data = snapshot.val();
  if (!historyContainer) return;
  historyContainer.innerHTML = "";
  if (data) {
    Object.values(data).forEach(order => {
      const div = document.createElement("div");
      div.className = "history-order";
      div.textContent = `${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units} | Deleted At: ${new Date(order.deletedAt).toLocaleString()}`;
      historyContainer.appendChild(div);
    });
  }
});

// ---------- Salesman: 删除订单 ----------
function deleteOrder(id, order) {
  remove(ref(db, `orders/${id}`));
  const historyData = { ...order, deletedAt: Date.now() };
  push(historyRef, historyData);
}

// ---------- Salesman: 编辑订单 ----------
function editOrder(id, order) {
  const form = document.getElementById("order-form");
  form.customer.value = order.customer;
  form.poNumber.value = order.poNumber;
  form.itemDesc.value = order.itemDesc;
  form.price.value = order.price;
  form.delivery.value = order.delivery;
  form.units.value = order.units;

  // 提交按钮改为更新
  const submitBtn = form.querySelector("button[type='submit']");
  submitBtn.textContent = "Update";

  form.onsubmit = e => {
    e.preventDefault();
    update(ref(db, `orders/${id}`), {
      customer: form.customer.value,
      poNumber: form.poNumber.value,
      itemDesc: form.itemDesc.value,
      price: parseFloat(form.price.value),
      delivery: form.delivery.value,
      units: parseInt(form.units.value)
    });
    form.reset();
    submitBtn.textContent = "Submit";

    // 恢复原本的提交事件
    form.onsubmit = null;
    form.addEventListener("submit", e => {
      e.preventDefault();
      const data = {
        customer: form.customer.value,
        poNumber: form.poNumber.value,
        itemDesc: form.itemDesc.value,
        price: parseFloat(form.price.value),
        delivery: form.delivery.value,
        units: parseInt(form.units.value),
        status: "Pending",
        timestamp: Date.now()
      };
      push(ordersRef, data);
      form.reset();
    });
  };
}
