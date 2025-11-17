// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// Firebase config
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

const role = window.PAGE_ROLE;

// -------------------- SALESMAN --------------------
if (role === "SALESMAN") {
  const btn = document.getElementById("addOrder");

  btn.addEventListener("click", () => {
    const customer = document.getElementById('customerName').value.trim();
    const item = document.getElementById('itemCode').value.trim();
    const qty = document.getElementById('quantity').value.trim();
    const price = document.getElementById('price').value.trim();

    if (!customer || !item || !qty) {
      alert("Please fill all fields");
      return;
    }

    push(ref(db, "orders"), {
      salesman: window.USER_EMAIL,
      customer,
      item,
      quantity: qty,
      price,
      status: "Pending",
      timestamp: Date.now()
    });

    document.getElementById('customerName').value='';
    document.getElementById('itemCode').value='';
    document.getElementById('quantity').value='';
    document.getElementById('price').value='';
  });
}

// -------------------- ADMIN --------------------
if (role === "ADMIN") {
  const table = document.querySelector("#adminTable tbody");
  const ding = document.getElementById("orderSound");
  let lastCount = 0;

  const ordersRef = ref(db, "orders");

  onValue(ordersRef, snapshot => {
    const orders = [];
    snapshot.forEach(s => orders.push(s.val()));

    // 播放提示音（有新增订单）
    if (orders.length > lastCount) {
      ding.play();
    }
    lastCount = orders.length;

    // 渲染表格
    table.innerHTML = "";
    orders.forEach(o => {
      const row = `<tr>
        <td>${o.salesman}</td>
        <td>${o.customer}</td>
        <td>${o.item} x${o.quantity} ($${o.price})</td>
        <td>${o.status}</td>
      </tr>`;
      table.innerHTML += row;
    });
  });
}
