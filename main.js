const orderForm = document.getElementById('order-form');
const ordersList = document.getElementById('orders');
const salesmanFilter = document.getElementById('salesman-filter');
const deleteCompletedBtn = document.getElementById('delete-completed');
const markAllOrderedBtn = document.getElementById('mark-all-ordered');
const markAllCompletedBtn = document.getElementById('mark-all-completed');

let orders = JSON.parse(localStorage.getItem('orders')) || [];

// 渲染订单
function renderOrders(filterUser='') {
  if(!ordersList) return;
  ordersList.innerHTML = '';

  let filteredOrders = orders;

  if(filterUser) {
    filteredOrders = orders.filter(o => o.salesman === filterUser);
  } else if(salesmanFilter && salesmanFilter.value) {
    filteredOrders = orders.filter(o => o.salesman.includes(salesmanFilter.value));
  }

  filteredOrders.forEach((order, index) => {
    const li = document.createElement('li');
    li.className = order.status.toLowerCase();
    li.innerHTML = `
      <span>${isAdmin ? order.salesman + ' | ' : ''}${order.customer} - ${order.item} x${order.quantity} - ${order.status}</span>
      ${isAdmin || window.location.pathname.includes('salesman') ? `<div>
        <button onclick="advanceStatus(${index})">Next</button>
        <button onclick="deleteOrder(${index})">Delete</button>
      </div>` : ''}
    `;
    ordersList.appendChild(li);
  });

  localStorage.setItem('orders', JSON.stringify(orders));
}

// 添加订单（Salesman 页面）
if(orderForm){
  orderForm.addEventListener('submit', e => {
    e.preventDefault();
    const customer = document.getElementById('customer').value.trim();
    const item = document.getElementById('item').value.trim();
    const quantity = document.getElementById('quantity').value.trim();
    if(!customer || !item || !quantity) return;

    orders.push({
      customer,
      item,
      quantity,
      status: 'Pending',
      salesman: currentUserEmail
    });
    orderForm.reset();
    renderOrders(currentUserEmail);
  });
}

// 状态循环
function advanceStatus(index){
  const statusOrder = ['Pending','Ordered','Completed'];
  const current = orders[index].status;
  orders[index].status = statusOrder[(statusOrder.indexOf(current)+1) % statusOrder.length];
  renderOrders(isAdmin ? '' : currentUserEmail);
}

// 删除订单
function deleteOrder(index){
  orders.splice(index,1);
  renderOrders(isAdmin ? '' : currentUserEmail);
}

// 批量操作
if(deleteCompletedBtn) deleteCompletedBtn.addEventListener('click',()=>{
  orders = orders.filter(o=>o.status!=='Completed');
  renderOrders(isAdmin ? '' : currentUserEmail);
});

if(markAllOrderedBtn) markAllOrderedBtn.addEventListener('click',()=>{
  orders = orders.map(o=>({...o,status:'Ordered'}));
  renderOrders(isAdmin ? '' : currentUserEmail);
});

if(markAllCompletedBtn) markAllCompletedBtn.addEventListener('click',()=>{
  orders = orders.map(o=>({...o,status:'Completed'}));
  renderOrders(isAdmin ? '' : currentUserEmail);
});

// 管理员筛选 Salesman
if(salesmanFilter) salesmanFilter.addEventListener('input', ()=>{
  renderOrders('');
});
