// Admin & Salesman: 实时显示订单
const ordersRef = ref(db, "orders");
let previousOrders = {};

onValue(ordersRef, snapshot => {
  const data = snapshot.val() || {};
  const ordersContainer = document.getElementById("orders-container");
  const dingSound = document.getElementById("ding-sound");

  ordersContainer.innerHTML = ""; // 清空

  Object.entries(data).forEach(([key, order]) => {
    const div = document.createElement("div");
    div.className = "order";
    div.textContent = `
Customer: ${order.customer} | 
PO Number: ${order.poNumber} | 
Item: ${order.item} | 
Description: ${order.description} | 
Price: ${order.price} | 
Delivery: ${order.delivery} | 
Units: ${order.units}
    `;
    ordersContainer.appendChild(div);
  });

  // 检查是否有新订单
  const newKeys = Object.keys(data).filter(k => !previousOrders[k]);
  if (newKeys.length > 0 && previousOrders) {
    dingSound.play();
  }

  previousOrders = data;
});
