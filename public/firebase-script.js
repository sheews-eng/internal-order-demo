// Import Firebase SDK modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCmb4nfpaFMv1Ix4hbMwU2JlYCq6I46ou4",
  authDomain: "internal-orders-765dd.firebaseapp.com",
  databaseURL: "https://internal-orders-765dd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "internal-orders-765dd",
  storageBucket: "internal-orders-765dd.firebasestorage.app",
  messagingSenderId: "778145240016",
  appId: "1:778145240016:web:b976e9bac38a86d3381fd5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// If on salesman page
const orderForm = document.getElementById('orderForm');
if(orderForm){
  orderForm.addEventListener('submit', e => {
    e.preventDefault();
    const product = document.getElementById('product').value;
    const quantity = document.getElementById('quantity').value;
    push(ref(db, 'orders'), { product, quantity });
    document.getElementById('ding').play();
    orderForm.reset();
  });
}

// If on admin page
const ordersDiv = document.getElementById('orders');
if(ordersDiv){
  const ding = document.getElementById('ding');
  const ordersRef = ref(db, 'orders');
  onChildAdded(ordersRef, snapshot => {
    const order = snapshot.val();
    const p = document.createElement('p');
    p.textContent = `Product: ${order.product}, Quantity: ${order.quantity}`;
    ordersDiv.appendChild(p);
    ding.play();
  });
}
