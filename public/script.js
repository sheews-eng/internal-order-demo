// ---------------- Firebase 初始化 ----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// Firebase 配置
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

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 订单表单提交
const addOrderBtn = document.getElementById('addOrderBtn');
const dingAudio = new Audio('./ding.mp3');

addOrderBtn.addEventListener('click', () => {
  const name = document.getElementById('name').value.trim();
  const item = document.getElementById('item').value.trim();
  const quantity = parseInt(document.getElementById('quantity').value);

  if (!name || !item || !quantity) {
    alert('请填写完整订单信息');
    return;
  }

  const ordersRef = ref(db, 'orders');

  // push 新订单
  push(ordersRef, {
    name,
    item,
    quantity,
    timestamp: serverTimestamp()
  }).then(() => {
    dingAudio.play(); // 播放提示音
    alert('订单已提交');
    document.getElementById('orderForm').reset();
  }).catch(err => {
    console.error('提交失败:', err);
    alert('提交失败，请重试');
  });
});
