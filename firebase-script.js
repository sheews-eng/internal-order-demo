// firebase-script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyCmb4nfpaFMv1Ix4hbMwU2JlYCq6I46ou4",
  authDomain: "internal-orders-765dd.firebaseapp.com",
  databaseURL: "https://internal-orders-765dd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "internal-orders-765dd",
  storageBucket: "internal-orders-765dd.appspot.com",
  messagingSenderId: "778145240016",
  appId: "1:778145240016:web:b976e9bac38a86d3381fd5",
  measurementId: "G-H0FVWM7V1R"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ----------------- 公共方法 -----------------
export function pushOrder(order) {
  push(ref(db, 'orders'), order);
}

export function listenOrders(callback) {
  const ordersRef = ref(db, 'orders');
  onValue(ordersRef, snapshot => {
    const data = snapshot.val() || {};
    const orders = Object.entries(data).map(([id, val]) => ({ id, ...val }));
    callback(orders);
  });
}

export function updateOrderStatus(id, status) {
  update(ref(db, 'orders/' + id), { status });
}

export function deleteOrder(id) {
  remove(ref(db, 'orders/' + id));
}
