// ---------------- Firebase 初始化 ----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, onChildAdded } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmb4nfpaFMv1Ix4hbMwU2JlYCq6I46ou4",
  authDomain: "internal-orders-765dd.firebaseapp.com",
  databaseURL: "https://internal-orders-765dd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "internal-orders-765dd",
  storageBucket: "internal-orders-765dd.firebasestorage.app",
  messagingSenderId: "778145240016",
  appId: "1:778145240016:web:b976e9bac38a86d3381fd5",
  measurementId: "G-H0FVWM7V1R"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const ordersRef = ref(db, 'orders');

const tableBody = document.getElementById('ordersTableBody');
const dingAudio = new Audio('./ding.mp3');

// 监听新增订单
onChildAdded(ordersRef, (snapshot) => {
  const orderId = snapshot.key;
  const order = snapshot.val();

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${orderId}</td>
    <td>${order.name || ''}</td>
    <td>${order.item || ''}</td>
    <td>${order.quantity || ''}</td>
    <td>${new Date(order.timestamp || Date.now()).toLocaleString()}</td>
  `;
  tableBody.prepend(tr); // 最新订单在最上方

  dingAudio.play(); // 播放提示音
});
