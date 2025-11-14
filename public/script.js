// ---------------- Storage ----------------
function getOrders() {
  return JSON.parse(localStorage.getItem('internalOrders') || '[]');
}
function saveOrders(orders) {
  localStorage.setItem('internalOrders', JSON.stringify(orders));
}

// ---------------- Order Sound ----------------
function initOrderSound() {
  const audio = document.getElementById('orderSound');
  if(!audio) return;
  let lastPending = getOrders().filter(o=>o.status==='Pending').length;
  setInterval(()=>{
    const orders = getOrders();
    const pending = orders.filter(o=>o.status==='Pending').length;
    if(pending > lastPending) audio.play();
    lastPending = pending;
  },3000);
}

// ---------------- Salesman Page ----------------
function initSalesmanPage() {
  initOrderSound();
  const email = 'salesman@example.com';
  let orders = getOrders();
  const tbody = document.querySelector('#orderTable tbody');

  function render(){
    tbody.innerHTML='';
    const myOrders = orders.filter(o=>o.salesman===email);
    myOrders.forEach((o,i)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${o.customer}</td>
        <td>${o.item} x${o.quantity} ($${o.price})</td>
        <td>${o.status}</td>
        <td>
          ${o.status!=='Completed'?`<button class="mark" onclick="markOrdered(${i})">Mark Ordered</button>`:''}
          <button class="delete" onclick="deleteOrder(${i})">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.markOrdered = i=>{
    orders[i].status='Ordered';
    saveOrders(orders);
    render();
  };

  window.deleteOrder = i=>{
    orders.splice(i,1);
    saveOrders(orders);
    render();
  };

  document.querySelector('#addOrder').addEventListener('click',()=>{
    const customer=document.querySelector('#customerName').value.trim();
    const item=document.querySelector('#itemCode').value.trim();
    const quantity=parseInt(document.querySelector('#quantity').value,10);
    const price=parseFloat(document.querySelector('#price').value||0);
    if(!customer||!item||!quantity) return alert('Fill all fields');
    orders.push({salesman:email,customer,item,quantity,price,status:'Pending'});
    saveOrders(orders);
    render();
    document.querySelector('#customerName').value='';
    document.querySelector('#itemCode').value='';
    document.querySelector('#quantity').value='';
    document.querySelector('#price').value='';
  });

  render();
}

// ---------------- Admin Page ----------------
function initAdminPage(){
  initOrderSound();
  let orders = getOrders();
  const tbody = document.querySelector('#adminTable tbody');

  function render(){
    tbody.innerHTML='';
    const grouped = {};
    orders.forEach(o=>{
      const key = `${o.salesman}||${o.customer}`;
      if(!grouped[key]) grouped[key]=[];
      grouped[key].push(o);
    });
    Object.entries(grouped).forEach(([key,custOrders],index)=>{
      const [salesman,customer] = key.split('||');
      const itemsStr = custOrders.map(o=>`${o.item} x${o.quantity} ($${o.price})`).join(', ');
      const status = custOrders.every(o=>o.status==='Completed')?'Completed':
                     custOrders.every(o=>o.status==='Ordered')?'Ordered':'Pending';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${salesman}</td>
        <td>${customer}</td>
        <td>${itemsStr}</td>
        <td>${status}</td>
        <td>
          ${status!=='Completed'?`<button class="mark" onclick="markCompleted(${index})">Mark Completed</button>`:''}
          <button class="delete" onclick="deleteCustomer('${salesman}','${customer}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.markCompleted = index=>{
    const keys=Object.keys(orders.reduce((acc,o)=>{acc[`${o.salesman}||${o.customer}`]=true; return acc;},{}));
    const [salesman,customer]=keys[index].split('||');
    orders = orders.map(o=>o.salesman===salesman && o.customer===customer?{...o,status:'Completed'}:o);
    saveOrders(orders);
    render();
  };

  window.deleteCustomer = (salesman,customer)=>{
    orders=orders.filter(o=>!(o.salesman===salesman && o.customer===customer));
    saveOrders(orders);
    render();
  };

  setInterval(()=>{
    orders = getOrders();
    render();
  },2000);

  render();
}
