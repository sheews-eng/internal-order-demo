import { db } from './firebase-script.js';
import { ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const form = document.getElementById('orderForm');
const orderList = document.getElementById('orderList');
const audio = new Audio('ding.mp3');

if(form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const item = document.getElementById('item').value;
    const quantity = document.getElementById('quantity').value;
    push(ref(db, 'orders'), { item, quantity });
    form.reset();
    audio.play();
  });
}

if(orderList) {
  const ordersRef = ref(db, 'orders');
  onChildAdded(ordersRef, (data) => {
    const li = document.createElement('li');
    li.textContent = `${data.val().item} x ${data.val().quantity}`;
    orderList.appendChild(li);
    audio.play();
  });
}
