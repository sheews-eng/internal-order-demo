// ---------------- Firebase 初始化 ----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

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

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ---------------- 通用函数 ----------------
function playSound() {
  const audio = document.getElementById('orderSound');
  if(audio) audio.play();
}

// ---------------- Salesman 页面 ----------------
export function initSalesmanPage(enableSound=false) {
  const email = ''; // 可选：填写 sales email 或通过 CF Access 注入
  const customerInput = document.getElementById('customerName');
  const itemInput = document.getElementById('itemCode');
  const qtyInput = document.getElementById('quantity');
  const priceInput = document.getElementById('price');
  const addBtn = document.getElementById('addOrder');
  const tableBody = document.querySelector('#orderTable tbody');
  const searchInput = document.getElementById('search');

  // 监听数据库 Orders
  const ordersRef = ref(db, 'orders');
  onValue(ordersRef, (snapshot) => {
    const data = snapshot.val() || {};
    renderOrders(data);
  });

  function renderOrders(data) {
    tableBody.innerHTML = '';
    const orders = Object.values(data).filter(o => o.salesman === email || !email);

    const grouped = {};
    orders.forEach(o => {
      if(!grouped[o.customer]) grouped[o.customer] = [];
      grouped[o.customer].push(o);
    });

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
  }

  window.markCustomerOrdered = (customer) => {
    const ordersSnap = ref(db, 'orders');
    onValue(ordersSnap, (snapshot) => {
      const data = snapshot.val() || {};
      Object.entries(data).forEach(([key, o]) => {
        if(o.salesman === email && o.customer === customer) {
          set(ref(db, `orders/${key}/status`), 'Ordered');
        }
      });
    }, {onlyOnce:true});
  };

  window.deleteCustomerOrders = (customer) => {
    const ordersSnap = ref(db, 'orders');
    onValue(ordersSnap, (snapshot) => {
      const data = snapshot.val() || {};
      Object.entries(data).forEach(([key, o]) => {
        if(o.salesman === email && o.customer === customer) {
          set(ref(db, `orders/${key}`), null);
        }
      });
    }, {onlyOnce:true});
  };

  addBtn.addEventListener('click', () => {
    const customer = customerInput.value.trim();
    const item = itemInput.value.trim();
    const quantity = parseInt(qtyInput.value, 10);
    const price = parseFloat(priceInput.value || 0);
    if(!customer || !item || !quantity || isNaN(price)) return alert('Fill all fields');

    const newOrderRef = push(ref(db, 'orders'));
    set(newOrderRef, {
      salesman: email,
      customer,
      item,
      quantity,
      price,
      status: 'Pending'
    }).then(() => {
      if(enableSound) playSound();
      customerInput.value = '';
      itemInput.value = '';
      qtyInput.value = '';
      priceInput.value = '';
    });
  });

  // 搜索过滤
  searchInput.addEventListener('input', e => {
    const val = e.target.value.toLowerCase();
    tableBody.querySelectorAll('tr').forEach(tr => {
      tr.style.display = Array.from(tr.children).some(td=>td.textContent.toLowerCase().includes(val)) ? '' : 'none';
    });
  });
}

// ---------------- Admin 页面 ----------------
export function initAdminPage(enableSound=false) {
  const tableBody = document.querySelector('#adminTable tbody');
  const markCompletedBtn = document.getElementById('markCompleted');
  const deleteCompletedBtn = document.getElementById('deleteCompleted');
  const searchInput = document.getElementById('searchAdmin');

  const ordersRef = ref(db, 'orders');
  onValue(ordersRef, (snapshot) => {
    const data = snapshot.val() || {};
    renderAdmin(data);
    if(enableSound) playSound();
  });

  function renderAdmin(data) {
    tableBody.innerHTML = '';
    const grouped = {};
    Object.values(data).forEach(o => {
      const key = `${o.salesman}||${o.customer}`;
      if(!grouped[key]) grouped[key] = [];
      grouped[key].push(o);
    });

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
          ${status !== 'Completed' ? `<button onclick="markCompleted('${salesman}','${customer}')">Mark Completed</button>` : ''}
          <button onclick="deleteCustomerOrders('${salesman}','${customer}')">Delete Orders</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  window.markCompleted = (salesman, customer) => {
    onValue(ordersRef, (snapshot) => {
      const data = snapshot.val() || {};
      Object.entries(data).forEach(([key, o]) => {
        if(o.salesman===salesman && o.customer===customer) {
          set(ref(db, `orders/${key}/status`), 'Completed');
        }
      });
    }, {onlyOnce:true});
  };

  window.deleteCustomerOrders = (salesman, customer) => {
    onValue(ordersRef, (snapshot) => {
      const data = snapshot.val() || {};
      Object.entries(data).forEach(([key, o]) => {
        if(o.salesman===salesman && o.customer===customer) {
          set(ref(db, `orders/${key}`), null);
        }
      });
    }, {onlyOnce:true});
  };

  markCompletedBtn.addEventListener('click', () => {
    onValue(ordersRef, (snapshot) => {
      const data = snapshot.val() || {};
      Object.entries(data).forEach(([key]) => {
        set(ref(db, `orders/${key}/status`), 'Completed');
      });
    }, {onlyOnce:true});
  });

  deleteCompletedBtn.addEventListener('click', () => {
    onValue(ordersRef, (snapshot) => {
      const data = snapshot.val() || {};
      Object.entries(data).forEach(([key, o]) => {
        if(o.status==='Completed') set(ref(db, `orders/${key}`), null);
      });
    }, {onlyOnce:true});
  });

  searchInput.addEventListener('input', e => {
    const val = e.target.value.toLowerCase();
    tableBody.querySelectorAll('tr').forEach(tr => {
      tr.style.display = Array.from(tr.children).some(td=>td.textContent.toLowerCase().includes(val)) ? '' : 'none';
    });
  });
}
