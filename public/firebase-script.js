// Firebase 初始化
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmb4nfpaFMv1Ix4hbMwU2JlYCq6I46ou4",
  authDomain: "internal-orders-765dd.firebaseapp.com",
  databaseURL: "https://internal-orders-765dd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "internal-orders-765dd",
  storageBucket: "internal-orders-765dd.firebasestorage.app",
  messagingSenderId: "778145240016",
  appId: "1:778145240016:web:b976e9bac38a86d3381fd5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export function pushOrder(order) {
  push(ref(db, 'orders'), order);
}

export function listenOrders(callback) {
  const ordersRef = ref(db, 'orders');
  onValue(ordersRef, snapshot => {
    const data = snapshot.val() || {};
    const ordersArray = Object.entries(data).map(([key, val]) => ({ id:key, ...val }));
    callback(ordersArray);
  });
}

export function updateOrderStatus(orderId, status) {
  update(ref(db, 'orders/' + orderId), { status });
}

export function deleteOrder(orderId) {
  remove(ref(db, 'orders/' + orderId));
}
