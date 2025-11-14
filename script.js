// ---------------- 通用 ----------------
function getStorageKey() { return 'internalOrders'; }
function loadOrders() { return JSON.parse(localStorage.getItem(getStorageKey()) || '[]'); }
function saveOrders(orders) { localStorage.setItem(getStorageKey(), JSON.stringify(orders)); }

// ---------------- 提示音 ----------------
let audio;
function initOrderSound(enableSound) {
  if (!enableSound) return;
  audio = document.getElementById('orderSound');

  // 自动播放需要用户先点击按钮解锁
  const btn = document.getElementById('enableSound');
  if (btn) {
    btn.addEventListener('click', () => {
      audio.play().then(()=>audio.pause());
      btn.style.display = 'none';
      alert('Sound enabled!');
    });
  }

  let lastPendingCount = loadOrders().filter(o => o.status === 'Pending').length;

  setInterval(() => {
    const orders = loadOrders();
    const pendingCount = orders.filter(o => o.status === 'Pending').length;
    if (pendingCount > lastPendingCount && audio) audio.play().catch(()=>{});
    lastPendingCount = pendingCount;
  }, 5000);
}

// ---------------- Salesman 页面 ----------------
function initSalesmanPage(enableSound=false) {
  initOrderSound(enableSound);

  const email = window.CF_ACCESS_EMAIL || '';
  let orders = loadOrders();

  const tableBody = document.querySelector('#orderTable tbody');

  const render = () => {
    tableBody.innerHTML = '';

    const myOrders = orders.filter(o => o.salesman === email);
    const grouped = myOrders.reduce((acc, o) => {
      if (!acc[o.customer]) acc[o.customer] = [];
      acc[o.customer].push(o);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([customer, custOrders]) => {
      const tr = document.createElement('tr');
      const itemsStr = custOrders.map(o => `${o.item} x${o.quantity} ($${o.price})`).join(', ');
      const status = custOrders.every(o => o.status === 'Completed') ? 'Completed' :
                     custOrders.every(o => o.status === 'Ordered') ? 'Ordered' : 'Pending';
      tr.innerHTML = `
        <td>${customer}</td>
        <td>${itemsStr}</td>
        <td>${status}</td>
        <td>
          ${status !== 'Completed' ? `<button onclick="markCustomerOrdered('${customer}')">Mark Ordered</button>` : ''}
          <button onclick="deleteCustomerOrders('${customer}')">Delete Orders</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  };

  window.markCustomerOrdered = (customer) => {
    orders = orders.map(o => o.salesman===email && o.customer===customer ? {...o, status:'Ordered'} : o);
    saveOrders(orders);
    render();
  };

  window.deleteCustomerOrders = (customer) => {
    orders = orders.filter(o => !(o.salesman===email && o.customer===customer));
    saveOrders(orders);
    render();
  };

  document.querySelector('#addOrder').addEventListener('click', () => {
    const customer = document.querySelector('#customerName').value.trim();
    const item = document.querySelector('#itemCode').value.trim();
    const quantity = parseInt(document.querySelector('#quantity').value, 10);
    const price = parseFloat(document.querySelector('#price').value || 0);
    if(!customer || !item || !quantity || isNaN(price)) return alert('Fill all fields');

    orders.push({salesman: email, customer, item, quantity, price, status:'Pending'});
    saveOrders(orders);
    render();

    // 播放提示音
    if(audio) audio.play().catch(()=>{});

    // 清空输入
    document.querySelector('#customerName').value='';
    document.querySelector('#itemCode').value='';
    document.querySelector('#quantity').value='';
    document.querySelector('#price').value='';
  });

  document.querySelector('#search').addEventListener('input', e => {
    const val = e.target.value.toLowerCase();
    tableBody.querySelectorAll('tr').forEach(tr => {
      tr.style.display = Array.from(tr.children).some(td => td.textContent.toLowerCase().includes(val)) ? '' : 'none';
    });
  });

  render();
}

// ---------------- Admin 页面 ----------------
function initAdminPage(enableSound=false) {
  initOrderSound(enableSound);

  let orders = loadOrders();
  const tableBody = document.querySelector('#adminTable tbody');

  const render = () => {
    tableBody.innerHTML = '';

    const grouped = orders.reduce((acc, o) => {
      const key = `${o.salesman}||${o.customer}`;
      if(!acc[key]) acc[key] = [];
      acc[key].push(o);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([key, custOrders], index) => {
      const [salesman, customer] = key.split('||');
      const itemsStr = custOrders.map(o => `${o.item} x${o.quantity} ($${o.price})`).join(', ');
      const status = custOrders.every(o => o.status === 'Completed') ? 'Completed' :
                     custOrders.every(o => o.status === 'Ordered') ? 'Ordered' : 'Pending';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${salesman}</td>
        <td>${customer}</td>
        <td>${itemsStr}</td>
        <td>${status}</td>
        <td>
          ${status !== 'Completed' ? `<button onclick="markCompleted(${index})">Mark Completed</button>` : ''}
          <button onclick="deleteCustomerOrders('${salesman}','${customer}')">Delete Orders</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  };

  window.markCompleted = (index) => {
    const keys = Object.keys(orders.reduce((acc, o) => { acc[`${o.salesman}||${o.customer}`]=true; return acc; }, {}));
    const [salesman, customer] = keys[index].split('||');
    orders = orders.map(o => o.salesman===salesman && o.customer===customer ? {...o, status:'Completed'} : o);
    saveOrders(orders);
    render();
  };

  window.deleteCustomerOrders = (salesman, customer) => {
    orders = orders.filter(o => !(o.salesman===salesman && o.customer===customer));
    saveOrders(orders);
    render();
  };

  document.querySelector('#markCompleted').addEventListener('click', () => {
    orders = orders.map(o => ({...o, status:'Completed'}));
    saveOrders(orders);
    render();
  });

  document.querySelector('#deleteCompleted').addEventListener('click', () => {
    orders = orders.filter(o => o.status!=='Completed');
    saveOrders(orders);
    render();
  });

  document.querySelector('#searchAdmin').addEventListener('input', e => {
    const val = e.target.value.toLowerCase();
    tableBody.querySelectorAll('tr').forEach(tr => {
      tr.style.display = Array.from(tr.children).some(td => td.textContent.toLowerCase().includes(val)) ? '' : 'none';
    });
  });

  render();
}
