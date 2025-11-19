import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmb4nfpaFMv1Ix4hbMwU2JlYCq6I46ou4",
  authDomain: "internal-orders-765dd.firebaseapp.com",
  databaseURL: "https://internal-orders-765dd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "internal-orders-765dd",
  storageBucket: "internal-orders-765dd.appspot.com",
  messagingSenderId: "778145240016",
  appId: "1:778145240016:web:b976e9bac38a86d3381fd5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 页面类型判断
const isSalesman = document.getElementById("order-form") !== null;
const ordersContainer = document.getElementById("orders-container");
const historyContainer = document.getElementById("history-container");

const statusColors = {
  "Pending": "#fff3cd",
  "Ordered": "#d1ecf1",
  "Completed": "#d4edda",
  "Pending Payment": "#f8d7da"
};

// --- 提示音和状态变量 (用于管理员页面) ---
const notificationSound = new Audio('/ding.mp3');
let lastOrderCount = 0;
let isInitialLoad = true;

// --- Admin 功能: 音频解锁逻辑 (仅限 Admin 页面) ---
if (!isSalesman) {
    document.addEventListener('click', function unlockAudio() {
        const promptElement = document.getElementById('audio-prompt-text'); // 假设 Admin 页面有一个提示元素
        
        notificationSound.play().then(() => {
            console.log("Audio playback unlocked.");
            if (promptElement) {
                promptElement.style.display = 'none';
            }
            document.removeEventListener('click', unlockAudio);
        }).catch(error => {
            console.warn("Audio unlock failed, waiting for user interaction:", error);
        });
        
        notificationSound.pause();
        notificationSound.currentTime = 0;
    }, { once: true });
}

// --- Salesman 功能 ---
if (isSalesman) {
  const form = document.getElementById("order-form");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const data = {
      customer: form.customer.value,
      poNumber: form.poNumber.value,
      itemDesc: form.itemDesc.value,
      price: `RM ${parseFloat(form.price.value).toFixed(2)}`,
      delivery: form.delivery.value,
      units: form.units.value,
      status: "Pending",
      deleted: false,
      timestamp: Date.now()
    };
    const ordersRef = ref(db, "orders");
    push(ordersRef, data);
    form.reset();
  });
}

// --- Admin & Salesman: 显示订单 (添加 Null 检查和提示音逻辑) ---
// ⚠️ 全局安全检查：只有当页面上存在订单容器或历史容器时，才启动监听器
if (ordersContainer || historyContainer) {
    onValue(ref(db, "orders"), snapshot => {
      const data = snapshot.val();
      
      const currentTotalOrders = data ? Object.keys(data).length : 0;
      
      // --- 提示音逻辑 ---
      if (!isSalesman && !isInitialLoad && currentTotalOrders > lastOrderCount) {
        notificationSound.play().catch(error => {
            console.warn("Could not play notification sound. User interaction may be required:", error);
        });
      }

      lastOrderCount = currentTotalOrders;
      isInitialLoad = false;
      // -------------------------

      // ⚠️ Null 检查：仅当元素存在时才清除内容
      if (ordersContainer) ordersContainer.innerHTML = "";
      if (historyContainer) historyContainer.innerHTML = "";

      if (!data) return;

      const grouped = {
        "Pending": [],
        "Ordered": [],
        "Completed": [],
        "Pending Payment": []
      };

      Object.entries(data).forEach(([key, order]) => {
        if (order.deleted) {
          const div = document.createElement("div");
          div.className = "card history";
          div.textContent = `${order.customer} | ${order.poNumber} | ${order.itemDesc} | ${order.price} | ${order.delivery} | ${order.units} | ${order.status}`;
          // ⚠️ Null 检查
          if (historyContainer) historyContainer.appendChild(div);
          return;
        }
        
        if (grouped[order.status]) { // 确保状态是有效的
            grouped[order.status].push({ key, order });
        }
      });

      Object.keys(grouped).forEach(status => {
        grouped[status].forEach(({ key, order }) => {
          const div = document.createElement("div");
          div.className = "card";
          div.style.backgroundColor = statusColors[status];

          const fields = ["customer", "poNumber", "itemDesc", "price", "delivery", "units"];
          fields.forEach(f => {
            const span = document.createElement("span");
            // 添加字段标签以提高可读性
            const label = f.charAt(0).toUpperCase() + f.slice(1) + ": ";
            span.innerHTML = `<b>${label}</b>${order[f]}`;
            div.appendChild(span);
          });
          
          // 添加时间戳显示
          const timeSpan = document.createElement("span");
          timeSpan.style.fontSize = "0.85em";
          timeSpan.style.color = "#777";
          timeSpan.textContent = `Submitted: ${new Date(order.timestamp).toLocaleString()}`;
          div.appendChild(timeSpan);


          // Admin 可以修改状态
          if (!isSalesman) {
            const statusSelect = document.createElement("select");
            ["Pending", "Ordered", "Completed", "Pending Payment"].forEach(s => {
              const option = document.createElement("option");
              option.value = s;
              option.textContent = s;
              if (s === order.status) option.selected = true;
              statusSelect.appendChild(option);
            });
            statusSelect.addEventListener("change", () => {
              set(ref(db, `orders/${key}/status`), statusSelect.value);
            });
            statusSelect.style.marginTop = "8px";
            div.appendChild(statusSelect);
          }

          // Edit + Delete (Salesman)
          if (isSalesman) {
            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.style.backgroundColor = "#f39c12"; // Yellow for edit
            editBtn.addEventListener("click", () => {
              form.customer.value = order.customer;
              form.poNumber.value = order.poNumber;
              form.itemDesc.value = order.itemDesc;
              form.price.value = order.price.replace("RM ", "");
              form.delivery.value = order.delivery;
              form.units.value = order.units;
              remove(ref(db, `orders/${key}`)); // 删除旧订单
            });

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "Delete";
            deleteBtn.style.backgroundColor = "#e74c3c"; // Red for delete
            deleteBtn.addEventListener("click", () => {
              set(ref(db, `orders/${key}/deleted`), true);
            });

            div.appendChild(editBtn);
            div.appendChild(deleteBtn);
          }
          
          // ⚠️ Null 检查：仅当元素存在时才添加子元素
          if (ordersContainer) ordersContainer.appendChild(div);
        });
      });
    });
}