import { db, ref, push, onChildAdded } from './firebase-script.js';

// Add order (Salesman page)
const orderForm = document.getElementById('orderForm');
if (orderForm) {
  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(orderForm);
    const orderData = {};
    formData.forEach((value, key) => orderData[key] = value);

    push(ref(db, 'orders'), orderData)
      .then(() => {
        orderForm.reset();
        const ding = document.getElementById('ding');
        ding && ding.play();
      })
      .catch(console.error);
  });
}

// Admin dashboard: listen for new orders
const ordersList = document.getElementById('ordersList');
if (ordersList) {
  const ding = document.getElementById('ding');

  onChildAdded(ref(db, 'orders'), (snapshot) => {
    const order = snapshot.val();
    const div = document.createElement('div');
    div.textContent = `Item: ${order.item}, Quantity: ${order.quantity}`;
    ordersList.appendChild(div);

    ding && ding.play();
  });
}
