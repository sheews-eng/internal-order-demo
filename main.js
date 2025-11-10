const orderForm = document.getElementById('order-form');
const ordersList = document.getElementById('orders');
const searchInput = document.getElementById('search');
const deleteCompletedBtn = document.getElementById('delete-completed');
const markAllCompletedBtn = document.getElementById('mark-all-completed');

let orders = JSON.parse(localStorage.getItem('orders')) || [];

// 渲染订单
function renderOrders(filter='') {
  ordersList.innerHTML = '';
  orders
    .filter(o => 
      o.customer.toLowerCase().includes(filter.toLowerCase()) ||
      o.item.toLowerCase().includes(filter.toLowerCase())
    )
    .forEach((order, index) => {
      const li = document.createElement('li');
      li.className = order.completed ? 'completed' : '';
      li.innerHTML = `
        <span>${order.customer} - ${order.item} - Qty: ${order.quantity}</span>
        <div>
          <button onclick="toggleComplete(${index})">${order.completed ? 'Undo' : 'Complete'}</button>
          <button onclick="deleteOrder(${index})">Delete</button>
        </div>
      `;
      ordersList.appendChild(li);
    });
  localStorage.setItem('orders', JSON.stringify(orders));
}

// 添加订单
orderForm.addEventListener('submit', e => {
  e.preventDefault();
  const customer = document.getElementById('customer').value.trim();
  const item = document.getElementById('item').value.trim();
  const quantity = document.getElementById('quantity').value.trim();
  if(!customer || !item || !quantity) return;

  orders.push({ customer, item, quantity, completed: false });
  orderForm.reset();
  renderOrders(searchInput.value);
});

// 搜索订单
searchInput.addEventListener('input', () => {
  renderOrders(searchInput.value);
});

// 删除订单
function deleteOrder(index) {
  orders.splice(index, 1);
  renderOrders(searchInput.value);
}

// 切换完成状态
function toggleComplete(index) {
  orders[index].completed = !orders[index].completed;
  renderOrders(searchInput.value);
}

// 批量操作
deleteCompletedBtn.addEventListener('click', () => {
  orders = orders.filter(o => !o.completed);
  renderOrders(searchInput.value);
});

markAllCompletedBtn.addEventListener('click', () => {
  orders = orders.map(o => ({...o, completed: true}));
  renderOrders(searchInput.value);
});

// 初次渲染
renderOrders();
