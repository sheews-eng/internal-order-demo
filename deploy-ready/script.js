// ----------------------
// Firebase Database Setup
// ----------------------
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const db = getDatabase(); // 使用 firebase-script.js 里初始化的 app
const ordersRef = ref(db, "orders");

// ----------------------
// Salesman Page Logic
// ----------------------
const orderForm = document.getElementById("orderForm");
if (orderForm) {
  orderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const item = e.target.item.value.trim();
    const quantity = e.target.quantity.value.trim();

    if (!item || !quantity) return;

    try {
      await push(ordersRef, {
        item,
        quantity: Number(quantity),
        timestamp: Date.now()
      });
      e.target.reset();
      alert("Order added successfully!");
    } catch (err) {
      console.error("Error adding order:", err);
      alert("Failed to add order. Check console.");
    }
  });
}

// ----------------------
// Admin Page Logic
// ----------------------
const ordersList = document.getElementById("ordersList");
const ding = document.getElementById("ding");

if (ordersList) {
  // 清空当前列表
  ordersList.innerHTML = "";

  // 监听新增订单
  onChildAdded(ordersRef, (snapshot) => {
    const order = snapshot.val();
    const div = document.createElement("div");
    div.textContent = `Item: ${order.item}, Quantity: ${order.quantity}, Time: ${new Date(order.timestamp).toLocaleString()}`;
    ordersList.prepend(div);

    // 播放提示音
    if (ding) {
      ding.currentTime = 0;
      ding.play().catch(err => console.warn("Audio play failed:", err));
    }
  });
}
