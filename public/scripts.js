import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// =========================================================
// 🚨 IMPORTANT: 您的 Firebase 配置 
// =========================================================
const firebaseConfig = {
  apiKey: "AIzaSyCmb4nfpaFMv1Ix4hbMwU2JlYCq6I46ou4",
  authDomain: "internal-orders-765dd.firebaseapp.com",
  databaseURL: "https://internal-orders-765dd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "internal-orders-765dd",
  storageBucket: "internal-orders-765dd.firebasestorage.app",
  messagingSenderId: "778145240016",
  appId: "1:778145240016:web:b976e9bac38a86d3381fd5",
  measurementId: "G-H0FVWM7V1R" 
};
// =========================================================

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const ordersRef = ref(db, 'orders');

const form = document.getElementById("order-form");
const items = []; // Current items for the new order
let editingOrderId = null; // Store the ID of the order being edited

const ordersContainer = document.getElementById('orders-container');
const historyContainer = document.getElementById('history-container');
const isSalesman = !!form; // Check if it's the salesman page

// Notification logic
let lastOrderCount = 0;
let lastUrgentOrderCount = 0;
const normalAudio = isSalesman ? null : new Audio('ding.mp3');
const urgentAudio = isSalesman ? null : new Audio('urgent.mp3'); 

// --- Utility Functions ---

function clearForm() {
    if (form) form.reset(); 
    items.length = 0;
    renderItemList();
    editingOrderId = null;
    
    const submitBtn = document.querySelector('.submit-order-btn');
    const cancelBtn = document.querySelector('.cancel-edit-btn');
    if (submitBtn) {
        submitBtn.textContent = 'Submit Order';
        submitBtn.classList.remove('update-mode');
    }
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }
}

function renderItemList() {
    const container = document.getElementById('item-list-container');
    if (!container) return; 
    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = '<p class="no-items text-muted">No items added yet.</p>';
        return;
    }

    items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'editable-item mb-2'; 

        const units = item.units || 0;
        const price = item.price || 0;

        const displayHtml = `
            <div class="row align-items-center">
                <div class="col-6 col-md-6">
                    <strong>${item.itemDesc || 'N/A'}</strong>
                </div>
                <div class="col-3 col-md-2 text-end">
                    Units: ${units}
                </div>
                <div class="col-3 col-md-2 text-end">
                    RM ${parseFloat(price).toFixed(2)}
                </div>
                <div class="col-12 col-md-2 text-end item-action-row mt-2 mt-md-0">
                    <button type="button" class="btn btn-sm btn-danger remove-item-btn" data-index="${index}">Remove</button>
                </div>
            </div>
        `;
        
        itemDiv.innerHTML = displayHtml;
        container.appendChild(itemDiv);
    });

    // Add event listeners for removal
    container.querySelectorAll('.remove-item-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            items.splice(index, 1);
            renderItemList();
        });
    });
}

// --- Order Rendering (Table) ---

function renderDetailsRow(order, isSalesman) {
    const tr = document.createElement('tr');
    tr.className = 'details-row';
    tr.id = `details-${order.id}`;

    const td = document.createElement('td');
    td.setAttribute('colspan', '6');

    const statusOptions = ['Pending', 'Ordered', 'Completed', 'PendingPayment', 'FollowUp'];

    // 修复点：兼容历史数据 order.orderItems 和新的 order.items
    const itemsToRender = order.items || order.orderItems || []; 

    // Item List HTML (基于 itemsToRender)
    const itemsHtml = itemsToRender.map(item => {
        const units = item.units || 0;
        const price = item.price || 0;
        return `<span>${item.itemDesc || 'N/A'} (${units} x RM ${parseFloat(price).toFixed(2)})</span>`;
    }).join('');


    // Admin Controls HTML (only if not salesman page)
    const adminControlsHtml = !isSalesman ? `
        <div class="details-actions">
            <h5 class="h6 text-primary">Admin Control</h5>
            <div class="mb-3">
                <label for="statusSelect_${order.id}" class="form-label">Status:</label>
                <select id="statusSelect_${order.id}" class="form-select mb-2">
                    ${statusOptions.map(status => 
                        `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`
                    ).join('')}
                </select>
                <button class="btn btn-sm btn-info w-100 mb-2 update-status-btn" data-id="${order.id}">Update Status</button>
            </div>
            
            <div class="mb-3">
                <label for="adminComment_${order.id}" class="form-label">Admin Comment:</label>
                <textarea id="adminComment_${order.id}" class="form-control admin-comment-detail-input mb-2">${order.adminComment || ''}</textarea>
                <button class="btn btn-sm btn-primary w-100 save-admin-comment-btn-detail" data-id="${order.id}">Save Comment</button>
            </div>

            <hr class="my-2">
            
            ${order.deleted ? `
                <button class="btn btn-sm btn-success w-100 restore-btn" data-id="${order.id}">Restore Order</button>
                <button class="btn btn-sm btn-danger w-100 mt-2 perm-delete-btn" data-id="${order.id}">Permanent Delete</button>
            ` : `
                <button class="btn btn-sm btn-danger w-100 delete-btn mt-2" data-id="${order.id}">Delete Order</button>
            `}
        </div>
    ` : `
        <div class="details-actions">
            <h5 class="h6 text-primary">Actions</h5>
            ${order.deleted ? '' : `<button class="btn btn-sm btn-warning w-100 mb-2 edit-btn" data-id="${order.id}">Edit Order</button>`}
        </div>
    `;


    td.innerHTML = `
        <div class="details-content">
            <div class="details-info">
                <h5 class="h6 text-secondary">Order Details</h5>
                <p><strong>Date:</strong> ${order.date || 'N/A'}</p>
                <p><strong>H/P:</strong> ${order.hp || 'N/A'}</p>
                <p><strong>Urgent:</strong> ${order.isUrgent ? '<span class="text-danger fw-bold">YES</span>' : 'No'}</p>
                
                <h5 class="h6 text-secondary mt-3">Items</h5>
                <div class="items-list-detail">
                    ${itemsHtml || '<span>No items recorded.</span>'}
                </div>

                <h5 class="h6 text-secondary mt-3">Salesman Comment</h5>
                <div class="comment-text">${order.salesmanComment || 'No comment.'}</div>

                ${!isSalesman ? `
                    <h5 class="h6 text-secondary mt-3">Admin Comment</h5>
                    <div class="comment-text ${order.adminComment ? 'comment-highlight' : ''}">
                        ${order.adminComment || 'No admin comment yet.'}
                    </div>
                ` : ''}

            </div>
            ${adminControlsHtml}
        </div>
    `;

    tr.appendChild(td);
    return tr;
}

function renderOrderTable(filteredOrders, container, isSalesman, isHistory) {
    container.innerHTML = '';
    const groupedOrders = filteredOrders.reduce((acc, order) => {
        const status = isHistory ? (order.deletedByAdmin ? 'Deleted by Admin' : 'Deleted by Salesman') : (order.status || 'Pending');
        if (!acc[status]) {
            acc[status] = [];
        }
        acc[status].push(order);
        return acc;
    }, {});

    const sortedStatuses = Object.keys(groupedOrders).sort();

    sortedStatuses.forEach(status => {
        const statusGroupDiv = document.createElement('div');
        statusGroupDiv.className = 'order-group-container';

        const header = document.createElement('h2');
        header.className = 'status-group-header h5 mb-0 p-3 bg-light text-dark';
        header.innerHTML = `${status} (${groupedOrders[status].length}) <span class="float-end">▶</span>`;
        header.dataset.status = status;
        statusGroupDiv.appendChild(header);

        const table = document.createElement('table');
        table.className = 'table table-striped table-hover orders-table'; 
        table.id = `table-${status}`;
        table.style.display = 'none'; // Initially collapsed

        const thead = table.createTHead();
        thead.innerHTML = `
            <tr>
                <th scope="col">Date</th>
                <th scope="col">Company</th>
                <th scope="col">PO #</th>
                <th scope="col">ATTN</th>
                <th scope="col">Delivery Location</th>
                <th scope="col">Status</th>
            </tr>
        `;

        const tbody = table.createTBody();

        groupedOrders[status].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(order => {
            const tr = tbody.insertRow();
            const orderStatusClass = (order.status || 'Pending').replace(/\s/g, '');

            tr.className = `status-${orderStatusClass} ${order.isUrgent ? 'status-urgent' : ''} ${order.adminComment && !isSalesman ? 'has-comment' : ''}`;
            tr.dataset.id = order.id;
            tr.dataset.expanded = 'false';

            const date = new Date(order.timestamp).toLocaleString();

            tr.insertCell().textContent = date;
            tr.insertCell().textContent = order.company || 'N/A';
            tr.insertCell().textContent = order.po || 'N/A';
            tr.insertCell().textContent = order.attn || 'N/A';
            tr.insertCell().textContent = order.deliveryLocation || 'N/A';
            tr.insertCell().innerHTML = `<strong>${order.status || 'Pending'}</strong>`;

            tbody.appendChild(renderDetailsRow(order, isSalesman));
        });

        statusGroupDiv.appendChild(table);
        container.appendChild(statusGroupDiv);
    });
}

function filterAndRenderOrders(allOrdersData, container, isSalesman, showDeleted) {
    if (!allOrdersData) {
        container.innerHTML = '<p class="text-center text-muted">No orders found.</p>';
        return;
    }

    const searchValue = (document.getElementById('orderSearch')?.value || '').toLowerCase();
    
    const filteredOrders = Object.values(allOrdersData)
        .filter(order => {
            const company = order.company || '';
            const attn = order.attn || '';
            
            const matchesSearch = searchValue === '' || 
                company.toLowerCase().includes(searchValue) ||
                (order.po && order.po.toLowerCase().includes(searchValue)) ||
                attn.toLowerCase().includes(searchValue);
                
            return matchesSearch && (showDeleted ? order.deleted : !order.deleted);
        });

    renderOrderTable(filteredOrders, container, isSalesman, showDeleted);
}


// --- Firebase Interaction ---

function writeNewOrder(orderData, id = null) {
    const orderId = id || push(ordersRef).key;
    const orderPayload = {
        ...orderData,
        timestamp: Date.now(),
        date: new Date().toLocaleString(),
        status: orderData.status || 'Pending',
        deleted: false,
        deletedByAdmin: false
    };

    set(ref(db, 'orders/' + orderId), orderPayload)
        .then(() => {
            console.log("Order written successfully!");
            clearForm();
        })
        .catch((error) => {
            console.error("Error writing order: ", error);
            alert("Failed to submit order. Check console for details.");
        });
}

// --- Event Handlers ---

if (form) {
    // Salesman: Add Item Button
    document.getElementById('addItemBtn').addEventListener('click', () => {
        const itemDesc = document.getElementById('itemDesc').value.trim();
        const units = document.getElementById('units').value;
        const price = document.getElementById('price').value;

        if (itemDesc && units > 0 && price >= 0) {
            items.push({ 
                itemDesc, 
                units: parseInt(units), 
                price: parseFloat(price) 
            });
            document.getElementById('itemDesc').value = '';
            document.getElementById('units').value = '1';
            document.getElementById('price').value = '0.00';
            renderItemList();
        } else {
            alert('Please enter a valid item description, units, and price.');
        }
    });

    // Salesman: Submit Form
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (items.length === 0) {
            alert('Please add at least one item to the order.');
            return;
        }

        const formData = new FormData(form);
        const orderData = {
            company: formData.get('company'),
            attn: formData.get('attn'),
            hp: formData.get('hp'),
            deliveryLocation: formData.get('deliveryLocation'),
            po: formData.get('po'),
            isUrgent: document.getElementById('isUrgent').value === 'true',
            salesmanComment: formData.get('salesmanComment'),
            adminComment: '', 
            // 提交订单时，统一使用 'items' 字段
            items: items 
        };
        
        writeNewOrder(orderData, editingOrderId);
    });

    // Salesman: Cancel Edit
    document.querySelector('.cancel-edit-btn').addEventListener('click', clearForm);
}

// --- Dynamic Order List (Shared) ---

let allOrdersData = {};

function updateOrderStatus(id, newStatus) {
    set(ref(db, 'orders/' + id + '/status'), newStatus)
        .then(() => console.log(`Order ${id} status updated to ${newStatus}`))
        .catch(e => console.error("Error updating status:", e));
}

function updateAdminComment(id, comment) {
    set(ref(db, 'orders/' + id + '/adminComment'), comment)
        .then(() => console.log(`Order ${id} admin comment updated.`))
        .catch(e => console.error("Error updating admin comment:", e));
}

function deleteOrder(id, deletedByAdmin) {
    // Soft delete
    set(ref(db, 'orders/' + id + '/deleted'), true)
        .then(() => set(ref(db, 'orders/' + id + '/deletedByAdmin'), deletedByAdmin))
        .then(() => console.log(`Order ${id} soft deleted.`))
        .catch(e => console.error("Error deleting order:", e));
}

function restoreOrder(id) {
    set(ref(db, 'orders/' + id + '/deleted'), false)
        .then(() => set(ref(db, 'orders/' + id + '/deletedByAdmin'), false))
        .then(() => console.log(`Order ${id} restored.`))
        .catch(e => console.error("Error restoring order:", e));
}

function permanentDeleteOrder(id) {
    if (confirm("Are you sure you want to permanently delete this order? This action cannot be undone.")) {
        remove(ref(db, 'orders/' + id))
            .then(() => console.log(`Order ${id} permanently deleted.`))
            .catch(e => console.error("Error permanently deleting order:", e));
    }
}

function startEditOrder(id) {
    const orderToEdit = allOrdersData[id];
    if (!orderToEdit || !form) return;

    // Set editing flag
    editingOrderId = id;

    // Fill basic fields
    document.getElementById('company').value = orderToEdit.company || '';
    document.getElementById('attn').value = orderToEdit.attn || '';
    document.getElementById('hp').value = orderToEdit.hp || '';
    document.getElementById('deliveryLocation').value = orderToEdit.deliveryLocation || '';
    document.getElementById('po').value = orderToEdit.po || '';
    document.getElementById('isUrgent').value = String(orderToEdit.isUrgent || false);
    document.getElementById('salesmanComment').value = orderToEdit.salesmanComment || '';

    // 编辑时也兼容两种字段
    items.length = 0; 
    const itemsFromOrder = orderToEdit.items || orderToEdit.orderItems || [];
    items.push(...itemsFromOrder); 
    renderItemList();

    // Update buttons
    document.querySelector('.submit-order-btn').textContent = 'Update Order';
    document.querySelector('.submit-order-btn').classList.add('update-mode');
    document.querySelector('.cancel-edit-btn').style.display = 'inline-block';

    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth' });
}


// Universal Click Handler for the entire document
document.addEventListener('click', (e) => {
    // --- Table Row Expand/Collapse ---
    let targetRow = e.target.closest('tr[data-id]');
    if (targetRow && targetRow.parentElement.tagName === 'TBODY') {
        const id = targetRow.dataset.id;
        const detailsRow = document.getElementById(`details-${id}`);
        const isExpanded = targetRow.dataset.expanded === 'true';

        // Toggle state
        targetRow.dataset.expanded = isExpanded ? 'false' : 'true';

        // Toggle visibility of the details row
        if (detailsRow) {
            detailsRow.style.display = isExpanded ? 'none' : 'table-row';
        }
        return; 
    }

    // --- Status Group Collapse ---
    let targetHeader = e.target.closest('.status-group-header');
    if (targetHeader) {
        const status = targetHeader.dataset.status;
        const table = document.getElementById(`table-${status}`);
        if (table) {
            const isCollapsed = targetHeader.classList.toggle('collapsed');
            table.style.display = isCollapsed ? 'none' : 'table';
        }
        return;
    }
    
    // --- Admin Actions ---
    const target = e.target;
    // 从操作按钮上获取 orderId，而不是依赖 closest() 寻找 TR 
    const orderId = target.dataset.id; 

    if (target.classList.contains('update-status-btn')) {
        if (!orderId) {
            console.error("Error: Order ID not found on status button.");
            return;
        }
        const statusSelect = document.getElementById(`statusSelect_${orderId}`);
        updateOrderStatus(orderId, statusSelect.value);
        return; // 处理完毕，返回
    } else if (target.classList.contains('save-admin-comment-btn-detail')) {
        if (!orderId) return;
        const commentTextarea = document.getElementById(`adminComment_${orderId}`);
        updateAdminComment(orderId, commentTextarea.value);
        return;
    } else if (target.classList.contains('delete-btn')) {
        if (!orderId) return;
        if (confirm("Confirm soft delete?")) {
            deleteOrder(orderId, !isSalesman);
        }
        return;
    } else if (target.classList.contains('restore-btn')) {
        if (!orderId) return;
        restoreOrder(orderId);
        return;
    } else if (target.classList.contains('perm-delete-btn')) {
        if (!orderId) return;
        permanentDeleteOrder(orderId);
        return;
    } else if (target.classList.contains('edit-btn')) {
        if (!orderId) return;
        startEditOrder(orderId);
        return;
    }
});

// --- Search and Clear Logic ---
const searchInput = document.getElementById('orderSearch');
const clearSearchBtn = document.getElementById('clearSearch');

if (searchInput) {
    searchInput.addEventListener('input', () => {
        const hasSearchText = searchInput.value.trim().length > 0;
        clearSearchBtn.style.display = hasSearchText ? 'inline-block' : 'none';
        
        filterAndRenderOrders(allOrdersData, ordersContainer, isSalesman, false);
        if (historyContainer) {
            filterAndRenderOrders(allOrdersData, historyContainer, isSalesman, true);
        }
    });
}

if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        filterAndRenderOrders(allOrdersData, ordersContainer, isSalesman, false);
        if (historyContainer) {
            filterAndRenderOrders(allOrdersData, historyContainer, isSalesman, true);
        }
    });
}


// --- Main Data Listener ---
onValue(ordersRef, (snapshot) => {
    const newOrdersData = snapshot.val();
    
    // Notification Logic (Only for Admin)
    if (!isSalesman && newOrdersData) {
          const activeOrders = Object.values(newOrdersData || {}).filter(order => !order.deleted);
          const currentOrderCount = activeOrders.length;
          const currentUrgentOrderCount = activeOrders.filter(order => order.isUrgent).length; 
          
          if (lastOrderCount > 0 && currentOrderCount > lastOrderCount) {
              
              if (currentUrgentOrderCount > lastUrgentOrderCount && urgentAudio) {
                  // 优先播放紧急警报
                  urgentAudio.play().catch(e => console.log("Urgent audio play failed:", e)); 
              } else if (normalAudio) {
                  // 播放普通警报
                  normalAudio.play().catch(e => console.log("Normal audio play failed:", e)); 
              }
          }
          
          lastOrderCount = currentOrderCount;
          lastUrgentOrderCount = currentUrgentOrderCount; 
      }
      
    allOrdersData = newOrdersData;
    
    // 1. 渲染活动订单 (表格模式)
    if (ordersContainer) {
        filterAndRenderOrders(allOrdersData, ordersContainer, isSalesman, false);
    }
    
    // 2. 渲染历史订单 (表格模式)
    if (historyContainer) {
        filterAndRenderOrders(allOrdersData, historyContainer, isSalesman, true);
    }
});