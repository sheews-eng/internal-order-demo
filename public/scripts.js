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

const ordersContainer = document.getElementById("orders-container");
const historyContainer = document.getElementById("history-container");

// 判断是否是Salesman页面
const orderForm = document.getElementById("order-form");
const isSalesman = orderForm !== null;

// Salesman 提交订单
if (isSalesman) {
  orderForm.addEventListener("submit", e => {
    e.preventDefault();
    const data = {
      customer: orderForm.customer.value,
      poNumber: orderForm.poNumber.value,
      itemDesc: orderForm.itemDesc.value,
      price: parseFloat(orderForm.price.value),
      delivery: orderForm.delivery.value,
      units: parseInt(orderForm.units.value),
      status: "Pending",
      deleted: false,
      timestamp: Date.now()
    };
    const ordersRef = ref(db, "orders");
    push(ordersRef, data);
    orderForm.reset();
  });
}

// 监听订单
const ordersRef = ref(db, "orders");
onValue(ordersRef, snapshot => {
  const data = snapshot.val();
  ordersContainer.innerHTML = "";
  historyContainer.innerHTML = "";

  if (data) {
    Object.entries(data).forEach(([key, order]) => {
      // 历史订单
      if (order.deleted) {
        const div = document.createElement("div");
        div.className = "history-order";
        div.textContent = `${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units}`;
        historyContainer.appendChild(div);
        return;
      }

      const div = document.createElement("div");
      div.className = "order";

      // 信息展示
      const infoDiv = document.createElement("div");
      infoDiv.className = "info";
      infoDiv.textContent = `${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units}`;

      // Salesman 编辑按钮
      if (isSalesman) {
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
        div.appendChild(editBtn);
      }

      // 删除按钮
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = () => {
        set(ref(db, `orders/${key}`), {...order, deleted:true});
      };

      div.appendChild(infoDiv);
      div.appendChild(deleteBtn);

      // Admin 状态管理
      if (!isSalesman) {
        const statusSelect = document.createElement("select");
        ["Pending","Ordered","Completed","Pending Payment"].forEach(s => {
          const option = document.createElement("option");
          option.value = s;
          option.textContent = s;
          if (order.status === s) option.selected = true;
          statusSelect.appendChild(option);
        });

        // 高亮样式
        div.classList.remove("pending","pending-payment");
        if(order.status === "Pending") div.classList.add("pending");
        if(order.status === "Pending Payment") div.classList.add("pending-payment");

        statusSelect.addEventListener("change", e => {
          set(ref(db, `orders/${key}/status`), e.target.value);
        });

        div.appendChild(statusSelect);
      }

      ordersContainer.appendChild(div);
    });
  }
});
