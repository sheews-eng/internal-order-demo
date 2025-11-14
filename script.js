// ---------------- 通用 ----------------
function getStorageKey() { return 'internalOrders'; }
function loadOrders() { return JSON.parse(localStorage.getItem(getStorageKey()) || '[]'); }
function saveOrders(orders) { localStorage.setItem(getStorageKey(), JSON.stringify(orders)); }

// ---------------- 提示音 ----------------
function initOrderSound(enableSound){
  if(!enableSound) return;
  const audio = document.getElementById('orderSound');
  let lastCount = loadOrders().length;
  setInterval(()=>{
    const orders = loadOrders();
    if(orders.length > lastCount && audio) audio.play();
    lastCount = orders.length;
  },2000); // 每2秒检查新订单
}

// ---------------- Salesman 页面 ----------------
function initSalesmanPage(enableSound=false){
  initOrderSound(enableSound);
  const tableBody = document.querySelector('#orderTable tbody');
  let orders = loadOrders();

  const render = () => {
    tableBody.innerHTML = '';
    const grouped = orders.reduce((acc,o)=>{
      if(!acc[o.customer]) acc[o.customer]=[];
      acc[o.customer].push(o);
      return acc;
    }, {});
    Object.entries(grouped).forEach(([customer, items])=>{
      const tr = document.createElement('tr');
      const itemsStr = items.map(o=>`${o.item} x${o.quantity} ($${o.price})`).join(', ');
      const status = items.every(o=>o.status==='Completed')?'Completed':items.every(o=>o.status==='Ordered')?'Ordered':'Pending';
      tr.innerHTML = `<td>${customer}</td>
                      <td>${itemsStr}</td>
                      <td>${status}</td>
                      <td>
                        ${status!=='Completed'?`<button onclick="markCustomerOrdered('${customer}')">Mark Ordered</button>`:''}
                        <button onclick="deleteCustomerOrders('${customer}')">Delete Orders</button>
                      </td>`;
      tableBody.appendChild(tr);
    });
  };

  window.markCustomerOrdered = (customer)=>{
    orders = orders.map(o=>o.customer===customer?{...o,status:'Ordered'}:o);
    saveOrders(orders);
    render();
  };

  window.deleteCustomerOrders = (customer)=>{
    orders = orders.filter(o=>o.customer!==customer);
    saveOrders(orders);
    render();
  };

  document.querySelector('#addOrder').addEventListener('click',()=>{
    const customer = document.querySelector('#customerName').value.trim();
    const item = document.querySelector('#itemCode').value.trim();
    const quantity = parseInt(document.querySelector('#quantity').value,10);
    const price = parseFloat(document.querySelector('#price').value||0);
    if(!customer || !item || !quantity || isNaN(price)) return alert('Fill all fields');

    orders.push({customer,item,quantity,price,status:'Pending'});
    saveOrders(orders);
    render();

    // 播放提示音
    const audio = document.getElementById('orderSound');
    if(audio) audio.play();

    document.querySelector('#customerName').value='';
    document.querySelector('#itemCode').value='';
    document.querySelector('#quantity').value='';
    document.querySelector('#price').value='';
  });

  document.querySelector('#search').addEventListener('input',(e)=>{
    const val=e.target.value.toLowerCase();
    tableBody.querySelectorAll('tr').forEach(tr=>{
      tr.style.display=Array.from(tr.children).some(td=>td.textContent.toLowerCase().includes(val))?'':'none';
    });
  });

  render();
}

// ---------------- Admin 页面 ----------------
function initAdminPage(enableSound=false){
  initOrderSound(enableSound);
  const tableBody = document.querySelector('#adminTable tbody');

  const render = ()=>{
    tableBody.innerHTML='';
    const orders = loadOrders();
    const grouped = orders.reduce((acc,o)=>{
      const key=o.customer;
      if(!acc[key]) acc[key]=[];
      acc[key].push(o);
      return acc;
    },{});

    Object.entries(grouped).forEach(([customer, items], index)=>{
      const tr=document.createElement('tr');
      const itemsStr = items.map(o=>`${o.item} x${o.quantity} ($${o.price})`).join(', ');
      const status = items.every(o=>o.status==='Completed')?'Completed':items.every(o=>o.status==='Ordered')?'Ordered':'Pending';
      tr.innerHTML=`<td>-</td>
                    <td>${customer}</td>
                    <td>${itemsStr}</td>
                    <td>${status}</td>
                    <td>
                      ${status!=='Completed'?`<button onclick="markCustomerCompleted('${customer}')">Mark Completed</button>`:''}
                      <button onclick="deleteCustomerOrders('${customer}')">Delete Orders</button>
                    </td>`;
      tableBody.appendChild(tr);
    });
  };

  window.markCustomerCompleted=(customer)=>{
    const orders = loadOrders().map(o=>o.customer===customer?{...o,status:'Completed'}:o);
    saveOrders(orders);
    render();
  };

  window.deleteCustomerOrders=(customer)=>{
    const orders = loadOrders().filter(o=>o.customer!==customer);
    saveOrders(orders);
    render();
  };

  document.querySelector('#markCompleted').addEventListener('click',()=>{
    const orders = loadOrders().map(o=>({...o,status:'Completed'}));
    saveOrders(orders);
    render();
  });

  document.querySelector('#deleteCompleted').addEventListener('click',()=>{
    const orders = loadOrders().filter(o=>o.status!=='Completed');
    saveOrders(orders);
    render();
  });

  document.querySelector('#searchAdmin').addEventListener('input',(e)=>{
    const val=e.target.value.toLowerCase();
    tableBody.querySelectorAll('tr').forEach(tr=>{
      tr.style.display=Array.from(tr.children).some(td=>td.textContent.toLowerCase().includes(val))?'':'none';
    });
  });

  render();

  // 自动刷新 admin 页面每2秒
  setInterval(render,2000);
}
