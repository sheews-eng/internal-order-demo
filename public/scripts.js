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

// --- Salesman 状态: 用于存储多行商品数据 ---
let orderItems = [];

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

// --- Salesman Helper: 计算总价 ---
function calculateGrandTotal() {
    let total = orderItems.reduce((sum, item) => sum + item.units * parseFloat(item.pricePerUnit.replace('RM ', '')), 0);
    document.getElementById('grand-total').textContent = `RM ${total.toFixed(2)}`;
    return `RM ${total.toFixed(2)}`;
}

// --- Salesman Helper: 渲染商品列表 ---
function renderItemsList() {
    const container = document.getElementById('items-list-container');
    container.innerHTML = '';

    if (orderItems.length === 0) {
        container.innerHTML = '<p style="color: #e74c3c; text-align: center;">No items added yet. Use the form below.</p>';
        return;
    }

    orderItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'item-row';
        div.innerHTML = `
            <span class="item-desc">${item.itemDesc}</span>
            <span class="item-units">${item.units} units @</span>
            <span class="item-price">${item.pricePerUnit}</span>
            <button type="button" class="remove-item-btn" data-index="${index}">Remove</button>
        `;
        container.appendChild(div);
    });

    document.querySelectorAll('.remove-item-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            orderItems.splice(index, 1);
            renderItemsList();
            calculateGrandTotal();
        });
    });

    calculateGrandTotal();
}


// --- Helper: 创建订单卡片函数 (适配新的多商品结构) ---
function createOrderCard(key, order, isSalesmanPage) {
    const div = document.createElement("div");
    div.className = order.deleted ? "card history" : "card";
    if (!order.deleted) {
        div.style.backgroundColor = statusColors[order.status];
    }

    // 基础信息
    let cardContent = `
        <span><span style="font-weight: bold; color: #555;">Customer:</span> ${order.customer}</span>
        <span><span style="font-weight: bold; color: #555;">PO #:</span> ${order.poNumber}</span>
        <span><span style="font-weight: bold; color: #555;">Delivery:</span> ${order.delivery}</span>
        <span><span style="font-weight: bold; color: #555;">Grand Total:</span> <b>${order.grandTotal}</b></span>
        <hr style="border: 0; border-top: 1px dashed #ccc; margin: 5px 0;">
        <span><span style="font-weight: bold; color: #555;">Items:</span></span>
    `;
    
    // 商品列表
    if (order.orderItems && Array.isArray(order.orderItems)) {
        order.orderItems.forEach(item => {
            cardContent += `
                <span style="margin-left: 10px; font-size: 0.9em;">
                    - ${item.itemDesc} (${item.units} @ ${item.pricePerUnit})
                </span>
            `;
        });
    }


    div.innerHTML = cardContent; // 使用 innerHTML 插入内容
    
    
    // 检查是否为已删除订单
    if (order.deleted) {
        const timeSpan = document.createElement("span");
        timeSpan.style.fontSize = "0.85em";
        timeSpan.style.color = "#777";
        timeSpan.textContent = `Deleted: ${new Date(order.timestamp).toLocaleString()}`;
        div.appendChild(timeSpan);

        // 永久删除按钮
        const permDeleteBtn = document.createElement("button");
        permDeleteBtn.textContent = "Permanently Delete";
        permDeleteBtn.style.backgroundColor = "#c0392b";
        permDeleteBtn.style.marginTop = "10px";
        permDeleteBtn.style.width = "100%";

        permDeleteBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to permanently delete this order? This action cannot be undone.")) {
                remove(ref(db, `orders/${key}`));
            }
        });
        div.appendChild(permDeleteBtn);
        return div;
    }


    // 2. 状态和时间戳
    const statusSpan = document.createElement("span");
    statusSpan.innerHTML = `<span style="font-weight: bold; color: #555;">Status:</span> <b style="color: #2c3e50;">${order.status}</b>`;
    div.appendChild(statusSpan);

    const timeSpan = document.createElement("span");
    timeSpan.style.fontSize = "0.85em";
    timeSpan.style.color = "#777";
    timeSpan.textContent = `Submitted: ${new Date(order.timestamp).toLocaleString()}`;
    div.appendChild(timeSpan);


    // 3. Admin 功能
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
        statusSelect.style.marginTop = "8px";
        div.appendChild(statusSelect);
    }

    // 4. Salesman 功能 (Edit 逻辑需要全面重写，此处为占位)
    if (isSalesmanPage) {
        // 由于新的多商品结构，编辑逻辑过于复杂，这里暂时只提供 Delete 按钮
        
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.style.backgroundColor = "#e74c3c";
        
        deleteBtn.addEventListener("click", () => {
          set(ref(db, `orders/${key}/deleted`), true);
        });

        div.appendChild(deleteBtn);
    }
    
    return div;
}


// --- Salesman 功能 (新增商品添加逻辑) ---
if (isSalesman) {
    const addItemBtn = document.getElementById('addItemBtn');
    const form = document.getElementById("order-form");

    // 绑定添加商品按钮
    addItemBtn.addEventListener('click', () => {
        const itemDesc = document.getElementById('addItemDesc').value;
        const price = parseFloat(document.getElementById('addPrice').value);
        const units = parseInt(document.getElementById('addUnits').value);

        if (itemDesc && !isNaN(price) && !isNaN(units) && price > 0 && units > 0) {
            orderItems.push({
                itemDesc: itemDesc,
                units: units,
                pricePerUnit: `RM ${price.toFixed(2)}`,
                totalPrice: `RM ${(price * units).toFixed(2)}`
            });

            // 重置添加商品表单
            document.getElementById('addItemDesc').value = '';
            document.getElementById('addPrice').value = '0.00';
            document.getElementById('addUnits').value = '1';

            renderItemsList();
        } else {
            alert("Please ensure all item details (description, price, units) are valid.");
        }
    });
    
    renderItemsList(); // 初始渲染空列表

    // 绑定最终订单提交
    form.addEventListener("submit", e => {
        e.preventDefault();

        if (orderItems.length === 0) {
            alert("Please add at least one item to the order before submitting.");
            return;
        }
        
        const grandTotal = calculateGrandTotal();

        const data = {
            customer: form.customer.value,
            poNumber: form.poNumber.value,
            delivery: form.delivery.value,
            orderItems: orderItems, // 新的商品列表数组
            grandTotal: grandTotal, // 新的总价
            status: "Pending", 
            deleted: false,
            timestamp: Date.now()
        };
        const ordersRef = ref(db, "orders");
        push(ordersRef, data);
        
        // 重置整个表单和商品列表
        form.reset();
        orderItems = [];
        renderItemsList();
    });
}

// --- Admin & Salesman: 显示订单 (包含提示音逻辑和新的分组逻辑) ---
onValue(ref(db, "orders"), snapshot => {
  const data = snapshot.val();
  ordersContainer.innerHTML = "";
  historyContainer.innerHTML = "";

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
      // Admin 页面：Pending, Completed, Pending Payment, Ordered.
      statusOrder = ["Pending", "Completed", "Pending Payment", "Ordered"];
      grouped = { "Pending": [], "Completed": [], "Pending Payment": [], "Ordered": [] };
  }

  // 2. 遍历数据并填充分组
  Object.entries(data).forEach(([key, order]) => {
    if (order.deleted) {
      historyContainer.appendChild(createOrderCard(key, order, isSalesman));
      return;
    }
    
    // 仅对当前页面需要的状态进行分组
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
          groupHeader.style.width = "100%";
          groupHeader.style.marginTop = "20px";
          groupHeader.style.padding = "5px";
          groupHeader.style.borderBottom = "2px solid #3498db";
          ordersContainer.appendChild(groupHeader);
          
          // 创建一个包裹卡片的容器
          const groupCardContainer = document.createElement("div");
          groupCardContainer.className = "card-container"; 
          
          grouped[status].forEach(({ key, order }) => {
              groupCardContainer.appendChild(createOrderCard(key, order, isSalesman));
          });
          
          ordersContainer.appendChild(groupCardContainer);
      }
  });
});