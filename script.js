// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyCmb4nfpaFMv1Ix4hbMwU2JlYCq6I46ou4",
  authDomain: "internal-orders-765dd.firebaseapp.com",
  databaseURL: "https://internal-orders-765dd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "internal-orders-765dd",
  storageBucket: "internal-orders-765dd.appspot.com",
  messagingSenderId: "778145240016",
  appId: "1:778145240016:web:b976e9bac38a86d3381fd5",
  measurementId: "G-H0FVWM7V1R"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ---------------- 通用提示音 ----------------
function initOrderSound(enableSound){
  if(!enableSound) return;
  const audio = document.getElementById('orderSound');
  let lastPendingCount = 0;

  db.ref('orders').on('value', snapshot=>{
    const orders = snapshot.val() || {};
    const pendingCount = Object.values(orders).filter(o=>o.status==='Pending').length;
    if(pendingCount > lastPendingCount) audio.play();
    lastPendingCount = pendingCount;
  });
}

// ---------------- Salesman 页面 ----------------
function initSalesmanPage(enableSound=false){
  initOrderSound(enableSound);

  const email = window.CF_ACCESS_EMAIL || '';
  const tableBody = document.querySelector('#orderTable tbody');

  const render = () => {
    db.ref('orders').once('value').then(snapshot=>{
      const allOrders = snapshot.val() || {};
      const myOrders = Object.values(allOrders).filter(o=>o.salesman===email);
      tableBody.innerHTML='';

      const grouped = {};
      myOrders.forEach(o=>{
        if(!grouped[o.customer]) grouped[o.customer]=[];
        grouped[o.customer].push(o);
      });

      Object.entries(grouped).forEach(([customer, custOrders])=>{
        const tr = document.createElement('tr');
        const itemsStr = custOrders.map(o=>`${o.item} x${o.quantity} ($${o.price})`).join(', ');
        const status = custOrders.every(o=>o.status==='Completed')?'Completed':
                       custOrders.every(o=>o.status==='Ordered')?'Ordered':'Pending';
        tr.innerHTML = `
          <td>${customer}</td>
          <td>${itemsStr}</td>
          <td>${status}</td>
          <td>
            ${status!=='Completed'?`<button onclick="markCustomerOrdered('${customer}','${email}')">Mark Ordered</button>`:''}
            <button onclick="deleteCustomerOrders('${customer}','${email}')">Delete Orders</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    });
  };

  window.markCustomerOrdered = (customer,email)=>{
    db.ref('orders').once('value').then(snapshot=>{
      const allOrders = snapshot.val() || {};
      Object.entries(allOrders).forEach(([key,o])=>{
        if(o.customer===customer && o.salesman===email) db.ref('orders/'+key+'/status').set('Ordered');
      });
      render();
    });
  };

  window.deleteCustomerOrders = (customer,email)=>{
    db.ref('orders').once('value').then(snapshot=>{
      const allOrders = snapshot.val() || {};
      Object.entries(allOrders).forEach(([key,o])=>{
        if(o.customer===customer && o.salesman===email) db.ref('orders/'+key).remove();
      });
      render();
    });
  };

  document.querySelector('#addOrder').addEventListener('click',()=>{
    const customer = document.querySelector('#customerName').value.trim();
    const item = document.querySelector('#itemCode').value.trim();
    const quantity = parseInt(document.querySelector('#quantity').value,10);
    const price = parseFloat(document.querySelector('#price').value || 0);
    if(!customer || !item || !quantity || isNaN(price)) return alert('Fill all fields');

    const newKey = db.ref('orders').push().key;
    db.ref('orders/'+newKey).set({salesman:email,customer,item,quantity,price,status:'Pending'})
      .then(()=>{
        render();
        document.querySelector('#customerName').value='';
        document.querySelector('#itemCode').value='';
        document.querySelector('#quantity').value='';
        document.querySelector('#price').value='';
      });
  });

  render();
  // 实时更新
  db.ref('orders').on('value',render);
}

// ---------------- Admin 页面 ----------------
function initAdminPage(enableSound=false){
  initOrderSound(enableSound);
  const tableBody = document.querySelector('#adminTable tbody');

  const render = ()=>{
    db.ref('orders').once('value').then(snapshot=>{
      const allOrders = snapshot.val() || {};
      tableBody.innerHTML='';

      const grouped = {};
      Object.values(allOrders).forEach(o=>{
        const key = o.salesman+'||'+o.customer;
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
            ${status!=='Completed'?`<button onclick="markCompleted('${salesman}','${customer}')">Mark Completed</button>`:''}
            <button onclick="deleteCustomerOrders('${salesman}','${customer}')">Delete Orders</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    });
  };

  window.markCompleted = (salesman,customer)=>{
    db.ref('orders').once('value').then(snapshot=>{
      const allOrders = snapshot.val() || {};
      Object.entries(allOrders).forEach(([key,o])=>{
        if(o.salesman===salesman && o.customer===customer) db.ref('orders/'+key+'/status').set('Completed');
      });
      render();
    });
  };

  window.deleteCustomerOrders = (salesman,customer)=>{
    db.ref('orders').once('value').then(snapshot=>{
      const allOrders = snapshot.val() || {};
      Object.entries(allOrders).forEach(([key,o])=>{
        if(o.salesman===salesman && o.customer===customer) db.ref('orders/'+key).remove();
      });
      render();
    });
  };

  document.querySelector('#markCompleted').addEventListener('click',()=>{
    db.ref('orders').once('value').then(snapshot=>{
      const allOrders = snapshot.val() || {};
      Object.entries(allOrders).forEach(([key,o])=>{
        db.ref('orders/'+key+'/status').set('Completed');
      });
      render();
    });
  });

  document.querySelector('#deleteCompleted').addEventListener('click',()=>{
    db.ref('orders').once('value').then(snapshot=>{
      const allOrders = snapshot.val() || {};
      Object.entries(allOrders).forEach(([key,o])=>{
        if(o.status==='Completed') db.ref('orders/'+key).remove();
      });
      render();
    });
  });

  document.querySelector('#searchAdmin').addEventListener('input',e=>{
    const val = e.target.value.toLowerCase();
    tableBody.querySelectorAll('tr').forEach(tr=>{
      tr.style.display = Array.from(tr.children).some(td=>td.textContent.toLowerCase().includes(val))?'':'none';
    });
  });

  render();
  db.ref('orders').on('value',render);
}
