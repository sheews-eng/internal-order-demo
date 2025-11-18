import { db, ref, push, onValue } from './firebase-script.js';

// Salesman - Add Order
const addOrderBtn = document.getElementById('addOrder');
if(addOrderBtn){
  addOrderBtn.addEventListener('click', () => {
    const item = document.getElementById('item').value.trim();
    const quantity = document.getElementById('quantity').value.trim();
    if(item && quantity){
      push(ref(db, 'orders'), { item, quantity, timestamp: Date.now() });
      document.getElementById('ding').play();
      document.getElementById('item').value = '';
      document.getElementById('quantity').value = '';
    }
  });
}

// Admin Dashboard - Real-time Orders
const ordersList = document.getElementById('ordersList');
if(ordersList){
  onValue(ref(db, 'orders'), (snapshot) => {
    const data = snapshot.val();
    ordersList.innerHTML = '';
    if(data){
      Object.values(data).forEach(order => {
        const div = document.createElement('div');
        div.textContent = `${order.item} - ${order.quantity}`;
        ordersList.appendChild(div);
      });
    } else {
      ordersList.textContent = 'No orders yet.';
    }
  });
}
