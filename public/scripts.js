import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// Firebase 配置信息
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
  "Pending": "#fff3cd", // Yellowish
  "Ordered": "#d1ecf1", // Cyan
  "Completed": "#d4edda", // Greenish
  "Pending Payment": "#f8d7da" // Reddish
};

// --- 提示音和状态变量 (用于管理员页面) ---
const notificationSound = new Audio('/ding.mp3'); 
let lastOrderCount = 0;
let isInitialLoad = true;

// --- 音频解锁逻辑 (仅限 Admin 页面) ---
if (!isSalesman) {
    document.addEventListener('click', function unlockAudio() {
        const promptElement = document.getElementById('audio-prompt-text');
        
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


// --- Helper: 创建订单卡片函数 (重构/优化 UX) ---
function createOrderCard(key, order, isSalesmanPage) {
    const div = document.createElement("div");
    div.className = order.deleted ? "card history" : "card";
    if (!order.deleted) {
        div.style.backgroundColor = statusColors[order.status];
    }

    // 定义订单字段及其显示标签
    const fields = [
        { label: "Customer", key: "customer" },
        { label: "PO #", key: "poNumber" },
        { label: "Item + Desc", key: "itemDesc" },
        { label: "Price", key: "price" },
        { label: "Delivery", key: "delivery" },
        { label: "Units", key: "units" }
    ];

    // 1. 基础字段显示 (UX 改进: 添加字段标签)
    fields.forEach(f => {
        const span = document.createElement("span");
        span.innerHTML = `<span style="font-weight: bold; color: #555;">${f.label}:</span> ${order[f.key]}`;
        div.appendChild(span);
    });
    
    // 如果是已删除订单，直接显示所有信息并返回
    if (order.deleted) {
        // 在 history 视图中添加时间戳
        const timeSpan = document.createElement("span");
        timeSpan.style.fontSize = "0.85em";
        timeSpan.style.color = "#777";
        timeSpan.textContent = `Deleted: ${new Date(order.timestamp).toLocaleString()}`;
        div.appendChild(timeSpan);

        // 新增：永久删除按钮 (对 Salesman 和 Admin 均可见)
        const permDeleteBtn = document.createElement("button");
        permDeleteBtn.textContent = "Permanently Delete";
        permDeleteBtn.style.backgroundColor = "#c0392b"; // 深红色
        permDeleteBtn.style.marginTop = "10px";
        permDeleteBtn.style.width = "100%"; // 按钮占满宽度

        permDeleteBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to permanently delete this order? This action cannot be undone.")) {
                remove(ref(db, `orders/${key}`));
            }
        });
        div.appendChild(permDeleteBtn);
        return div;
    }


    // 2. 状态和时间戳 (UX 改进: 突出显示状态和时间)
    const statusSpan = document.createElement("span");
    statusSpan.innerHTML = `<span style="font-weight: bold; color: #555;">Status:</span> <b style="color: #2c3e50;">${order.status}</b>`;
    div.appendChild(statusSpan);

    const timeSpan = document.createElement("span");
    timeSpan.style.fontSize = "0.85em";
    timeSpan.style.color = "#777";
    timeSpan.textContent = `Submitted: ${new Date(order.timestamp).toLocaleString()}`;
    div.appendChild(timeSpan);


    // 3. Admin 功能 (非销售员)
    if (!isSalesmanPage) {
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
        statusSelect.style.marginTop = "8px"; // 增加间隔
        div.appendChild(statusSelect);
    }

    // 4. Salesman 功能
    if (isSalesmanPage) {
        const form = document.getElementById("order-form");
        
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.style.backgroundColor = "#f39c12"; // 橙色

        editBtn.addEventListener("click", () => {
          // 填充表单
          form.customer.value = order.customer;
          form.poNumber.value = order.poNumber;
          form.itemDesc.value = order.itemDesc;
          form.price.value = order.price.replace("RM ", "");
          form.delivery.value = order.delivery;
          
          // 修复：确保设置到 number 输入框的值是数字
          form.units.value = parseInt(order.units) || 1; 
          
          // 删除旧订单，准备提交新订单
          remove(ref(db, `orders/${key}`));
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.style.backgroundColor = "#e74c3c"; // 红色
        
        deleteBtn.addEventListener("click", () => {
          // 标记订单为已删除
          set(ref(db, `orders/${key}/deleted`), true);
        });

        div.appendChild(editBtn);
        div.appendChild(deleteBtn);
    }
    
    return div;
}


// --- Salesman 功能 (提交时强制数字类型) ---
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
      // 强制将 units 转换为整数进行存储
      units: parseInt(form.units.value) || 1, 
      status: "Pending",
      deleted: false,
      timestamp: Date.now() // 记录时间戳
    };
    const ordersRef = ref(db, "orders");
    push(ordersRef, data);
    form.reset();
  });
}

// --- Admin & Salesman: 显示订单 (包含提示音逻辑和新的分组逻辑) ---
onValue(ref(db, "orders"), snapshot => {
  const data = snapshot.val();
  ordersContainer.innerHTML = "";
  historyContainer.innerHTML = "";

  // 计算当前订单总数 (用于提示音)
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

  if (!data) return;

  // 1. 定义分组和显示顺序 (根据页面类型)
  let grouped = {};
  let statusOrder = [];

  if (isSalesman) {
      // Salesman 页面：保持原有顺序和所有状态
      statusOrder = ["Pending", "Ordered", "Completed", "Pending Payment"];
      grouped = { "Pending": [], "Ordered": [], "Completed": [], "Pending Payment": [] };
  } else { 
      // Admin 页面：按要求分组和排序，排除 Pending
      statusOrder = ["Completed", "Pending Payment", "Ordered"];
      grouped = { "Completed": [], "Pending Payment": [], "Ordered": [] };
  }

  // 2. 遍历数据并填充分组
  Object.entries(data).forEach(([key, order]) => {
    if (order.deleted) {
      historyContainer.appendChild(createOrderCard(key, order, isSalesman));
      return;
    }
    
    // 仅对当前页面需要的状态进行分组 (Admin 页面会跳过 Pending)
    if (grouped[order.status]) {
      grouped[order.status].push({ key, order });
    }
  });

  // 3. 按分组顺序显示订单 (使用 Header 分组)
  statusOrder.forEach(status => {
      if (grouped[status].length > 0) {
          // 创建一个标题 (Header)
          const groupHeader = document.createElement("h3");
          groupHeader.textContent = status;
          groupHeader.style.textAlign = "center";
          groupHeader.style.width = "100%"; // 确保标题独占一行
          groupHeader.style.marginTop = "20px";
          groupHeader.style.padding = "5px";
          groupHeader.style.borderBottom = "2px solid #3498db";
          ordersContainer.appendChild(groupHeader);
          
          // 创建一个包裹卡片的容器，确保卡片能像之前一样布局
          const groupCardContainer = document.createElement("div");
          // 重用 .card-container 样式
          groupCardContainer.className = "card-container"; 
          
          grouped[status].forEach(({ key, order }) => {
              groupCardContainer.appendChild(createOrderCard(key, order, isSalesman));
          });
          
          ordersContainer.appendChild(groupCardContainer);
      }
  });
});