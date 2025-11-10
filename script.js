// 获取 Cloudflare Access 邮箱
async function getUserEmail() {
  try {
    const resp = await fetch('/cdn-cgi/access/get-identity');
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.email;
  } catch {
    return null;
  }
}

// 本地存储 key
function getStorageKey() {
  return 'internalOrders';
}

// 读取本地订单
function loadOrders() {
  return JSON.parse(localStorage.getItem(getStorageKey()) || '[]');
}

// 保存订单
function saveOrders(orders) {
  localStorage.setItem(getStorageKey(), JSON.stringify(orders));
}

// Salesman 页面初始化
function initSalesmanPage() {
  const email = window.CF_ACCESS_EMAIL || '';
  const orders = loadOrders().filter(o => o.salesman === email);

  const tableBody = document.querySelector('#orderTable tbody');
  const render = () => {
    tableBody.innerHTML = '';
    orders.forEach((o, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${o.customer}</td><td>${o.item}</td><td>${o.quantity}</td>
                      <td>${o.status}</td>
                      <td><button onclick="markOrdered(${i})">Mark Ordered</button></td>`;
      tableBody.appendChild(tr);
    });
  };

  window.markOrdered = (i) => {
    orders[i].status = 'Ordered';
    saveOrders([...loadOrders().filter(o=>o.salesman!==email), ...orders]);
    render();
  };

  document.querySelector('#addOrder').addEventListener('click', () => {
    const customer = document.querySelector('#customerName').value;
    const item = document.querySelector('#itemCode').value;
    const quantity = parseInt(document.querySelector('#quantity').value, 10);
    if (!customer || !item || !quantity) return alert('Fill all fields');
    orders.push({salesman: email, customer, item, quantity, status:'Pending'});
    saveOrders([...loadOrders().filter(o=>o.salesman!==email), ...orders]);
    render();
  });

  document.querySelector('#search').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    tableBody.querySelectorAll('tr').forEach(tr=>{
      tr.style.display = Array.from(tr.children).some(td=>td.textContent.toLowerCase().includes(val)) ? '' : 'none';
    });
  });

  render();
}

// Admin 页面初始化
function initAdminPage() {
  const orders = loadOrders();
  const tableBody = document.querySelector('#adminTable tbody');
  const render = () => {
    tableBody.innerHTML = '';
    orders.forEach((o, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${o.salesman}</td><td>${o.customer}</td><td>${o.item}</td><td>${o.quantity}</td>
                      <td>${o.status}</td>
                      <td><button onclick="markCompleted(${i})">Mark Completed</button></td>`;
      tableBody.appendChild(tr);
    });
  };

  window.markCompleted = (i) => {
    orders[i].status = 'Completed';
    saveOrders(orders);
    render();
  };

  document.querySelector('#markCompleted').addEventListener('click', () => {
    orders.forEach(o => o.status='Completed');
    saveOrders(orders);
    render();
  });

  document.querySelector('#deleteCompleted').addEventListener('click', () => {
    const remaining = orders.filter(o => o.status!=='Completed');
    saveOrders(remaining);
    render();
  });

  document.querySelector('#searchAdmin').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    tableBody.querySelectorAll('tr').forEach(tr=>{
      tr.style.display = Array.from(tr.children).some(td=>td.textContent.toLowerCase().includes(val)) ? '' : 'none';
    });
  });

  render();
}
