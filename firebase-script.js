import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// ---------------- Firebase 配置 ----------------
const firebaseConfig = {
  apiKey: "AIzaSyCmb4nfpaFMv1Ix4hbMwU2JlYCq6I46ou4",
  authDomain: "internal-orders-765dd.firebaseapp.com",
  databaseURL: "https://internal-orders-765dd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "internal-orders-765dd",
  storageBucket: "internal-orders-765dd.firebasestorage.app",
  messagingSenderId: "778145240016",
  appId: "1:778145240016:web:b976e9bac38a86d3381fd5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ---------------- 通用函数 ----------------
function playSound() {
  const audio = document.getElementById('orderSound');
  if(audio) audio.play();
}

// ---------------- Salesman 页面 ----------------
export function initSalesmanPage() {
  const email = ""; // 可以加 Salesman email 校验
  const tableBody = document.querySelector('#orderTable tbody');

  const render = (orders) => {
    tableBody.innerHTML = '';
    orders.forEach(([key, o]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${o.customer}</td>
        <td>${o.item} x${o.quantity} ($${o.price})</td>
        <td>${o.status}</td>
        <td>
          ${o.status !== 'Completed' ? `<button onclick="markOrdered('${key}')">Mark Ordered</button>` : ''}
          <button onclick="deleteOrder('${key}')">Delete</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  };

  const ordersRef = ref(db,'orders');
  onValue(ordersRef, snapshot => {
    const ordersObj = snapshot.val() || {};
    const orders = Object.entries(ordersObj).filter(([k,v]) => v.salesman === email || email === "");
    render(orders);
    playSound();
  });

  // Add Order
  document.getElementById('addOrder').addEventListener('click',()=>{
    const customer = document.getElementById('customerName').value.trim();
    const item = document.getElementById('itemCode').value.trim();
    const quantity = parseInt(document.getElementById('quantity').value,10);
    const price = parseFloat(document.getElementById('price').value||0);
    if(!customer||!item||isNaN(quantity)) return alert('Fill all fields');

    push(ref(db,'orders'),{
      salesman: email || 'Salesman',
      customer,
      item,
      quantity,
      price,
      status:'Pending'
    });

    document.getElementById('customerName').value='';
    document.getElementById('itemCode').value='';
    document.getElementById('quantity').value='';
    document.getElementById('price').value='';
  });

  // 全局函数，供按钮使用
  window.markOrdered = (key) => update(ref(db,'orders/'+key),{status:'Ordered'});
  window.deleteOrder = (key) => remove(ref(db,'orders/'+key));
}

// ---------------- Admin 页面 ----------------
export function initAdminPage() {
  const tableBody = document.querySelector('#adminTable tbody');
  const ordersRef = ref(db,'orders');

  const render = (orders) => {
    tableBody.innerHTML = '';
    orders.forEach(([key, o])=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${o.salesman}</td>
        <td>${o.customer}</td>
        <td>${o.item} x${o.quantity} ($${o.price})</td>
        <td>${o.status}</td>
        <td>
          ${o.status !== 'Completed' ? `<button onclick="markCompleted('${key}')">Mark Completed</button>` : ''}
          <button onclick="deleteOrder('${key}')">Delete</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  };

  onValue(ordersRef, snapshot=>{
    const ordersObj = snapshot.val() || {};
    const orders = Object.entries(ordersObj);
    render(orders);
    playSound();
  });

  document.getElementById('markCompleted').addEventListener('click',()=>{
    onValue(ordersRef, snapshot=>{
      const ordersObj = snapshot.val() || {};
      Object.keys(ordersObj).forEach(key=>{
        update(ref(db,'orders/'+key),{status:'Completed'});
      });
    }, {onlyOnce:true});
  });

  document.getElementById('deleteCompleted').addEventListener('click',()=>{
    onValue(ordersRef, snapshot=>{
      const ordersObj = snapshot.val() || {};
      Object.entries(ordersObj).forEach(([key,o])=>{
        if(o.status==='Completed') remove(ref(db,'orders/'+key));
      });
    }, {onlyOnce:true});
  });

  const searchInput = document.getElementById('searchAdmin');
  if(searchInput){
    searchInput.addEventListener('input',(e)=>{
      const val = e.target.value.toLowerCase();
      onValue(ordersRef, snapshot=>{
        const ordersObj = snapshot.val() || {};
        const filtered = Object.entries(ordersObj).filter(([k,o])=>{
          return o.customer.toLowerCase().includes(val) || o.item.toLowerCase().includes(val) || o.salesman.toLowerCase().includes(val);
        });
        render(filtered);
      }, {onlyOnce:true});
    });
  }

  window.markCompleted = (key)=>update(ref(db,'orders/'+key),{status:'Completed'});
  window.deleteOrder = (key)=>remove(ref(db,'orders/'+key));
}
