const orderForm = document.getElementById('order-form');
const ordersList = document.getElementById('orders');
const searchInput = document.getElementById('search');
const deleteCompletedBtn = document.getElementById('delete-completed');
const markAllOrderedBtn = document.getElementById('mark-all-ordered');
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
      li.className = order.status.toLowerCase();
      li.innerHTML = `
        <span>${order.customer} - ${order.item} - Qty: ${order.quantity} - ${order.status}</span>
        <div>
          <button onclick="advanceStatus(${index})">Next</button>
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

  // 每次提交都新建一条订单记录
  orders.push({ customer, item, quantity, status: 'Pending' });
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

// 状态循环: Pending → Ordered → Completed → Pending
function advanceStatus(index) {
  const statusOrder = ['Pending', 'Ordered', 'Completed'];
  const current = orders[index].status;
  const next = statusOrder[(statusOrder.indexOf(current)+1) % statusOrder.length];
  orders[index].status = next;
  renderOrders(searchInput.value);
}

// 批量操作
deleteCompletedBtn.addEventListener('click', () => {
  orders = orders.filter(o => o.status !== 'Completed');
  renderOrders(searchInput.value);
});

markAllOrderedBtn.addEventListener('click', () => {
  orders = orders.map(o => ({...o, status: 'Ordered'}));
  renderOrders(searchInput.value);
});

markAllCompletedBtn.addEventListener('click', () => {
  orders = orders.map(o => ({...o, status: 'Completed'}));
  renderOrders(searchInput.value);
});

// 初次渲染
renderOrders();
