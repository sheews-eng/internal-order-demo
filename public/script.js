import { db, ref, push, onValue, update, remove } from './firebase-script.js';

// 提示音
function initOrderSound(enableSound) {
  if(!enableSound) return;
  const audio = document.getElementById('orderSound');
  let lastCount = 0;

  const ordersRef = ref(db, 'orders');
  onValue(ordersRef, snapshot=>{
    const data = snapshot.val() || {};
    const pendingCount = Object.values(data).filter(o=>o.status==='Pending').length;
    if(pendingCount > lastCount && audio) audio.play();
    lastCount = pendingCount;
  });
}

// ---------------- Salesman 页面 ----------------
function initSalesmanPage(enableSound=false) {
  initOrderSound(enableSound);
  const tableBody = document.querySelector('#orderTable tbody');
  const ordersRef = ref(db, 'orders');

  const render = data=>{
    tableBody.innerHTML='';
    Object.entries(data).forEach(([key,o])=>{
      const tr = document.createElement('tr');
      tr.innerHTML=`
        <td>${o.customer}</td>
        <td>${o.item} x${o.quantity} ($${o.price})</td>
        <td>${o.status}</td>
        <td>
          <button onclick="advanceStatus('${key}')">Next</button>
          <button onclick="deleteOrder('${key}')">Delete</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  };

  onValue(ordersRef, snapshot=>{
    render(snapshot.val()||{});
  });

  window.addOrder = ()=>{
    const customer = document.querySelector('#customerName').value.trim();
    const item = document.querySelector('#itemCode').value.trim();
    const quantity = parseInt(document.querySelector('#quantity').value,10);
    const price = parseFloat(document.querySelector('#price').value||0);
    if(!customer || !item || !quantity || isNaN(price)) return alert('Fill all fields');

    push(ordersRef,{customer,item,quantity,price,status:'Pending'});
    document.querySelector('#customerName').value='';
    document.querySelector('#itemCode').value='';
    document.querySelector('#quantity').value='';
    document.querySelector('#price').value='';
  };

  window.advanceStatus = key=>{
    const statusOrder=['Pending','Ordered','Completed'];
    const orderRef = ref(db, `orders/${key}`);
    onValue(orderRef,snap=>{
      const current = snap.val()?.status || 'Pending';
      update(orderRef,{status:statusOrder[(statusOrder.indexOf(current)+1)%3]});
    },{onlyOnce:true});
  };

  window.deleteOrder = key=>{
    const orderRef = ref(db, `orders/${key}`);
    remove(orderRef);
  };

  document.querySelector('#addOrder').addEventListener('click', window.addOrder);
}

// ---------------- Admin 页面 ----------------
function initAdminPage(enableSound=false) {
  initOrderSound(enableSound);
  const tableBody = document.querySelector('#adminTable tbody');
  const ordersRef = ref(db, 'orders');

  const render = data=>{
    tableBody.innerHTML='';
    Object.entries(data).forEach(([key,o])=>{
      const tr = document.createElement('tr');
      tr.innerHTML=`
        <td>${o.salesman||'N/A'}</td>
        <td>${o.customer}</td>
        <td>${o.item} x${o.quantity} ($${o.price})</td>
        <td>${o.status}</td>
        <td>
          <button onclick="advanceStatus('${key}')">Next</button>
          <button onclick="deleteOrder('${key}')">Delete</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  };

  onValue(ordersRef, snapshot=>{
    render(snapshot.val()||{});
  });

  window.advanceStatus = key=>{
    const statusOrder=['Pending','Ordered','Completed'];
    const orderRef = ref(db, `orders/${key}`);
    onValue(orderRef,snap=>{
      const current = snap.val()?.status || 'Pending';
      update(orderRef,{status:statusOrder[(statusOrder.indexOf(current)+1)%3]});
    },{onlyOnce:true});
  };

  window.deleteOrder = key=>{
    const orderRef = ref(db, `orders/${key}`);
    remove(orderRef);
  };
}
