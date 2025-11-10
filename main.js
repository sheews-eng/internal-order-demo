// Sample demo data
let orders = [
  {id: 1, customer: "PMP EQUIPMENTS", item: "1713-0004-10", desc: "Item Description 1", qty: 5, price: 100, status: "Pending"},
  {id: 2, customer: "ACME Corp", item: "1713-0005-11", desc: "Item Description 2", qty: 3, price: 50, status: "Completed"},
];

let editingOrderId = null;

const orderList = document.getElementById("orderList");
const searchInput = document.getElementById("searchInput");
const addOrderBtn = document.getElementById("addOrderBtn");
const orderModal = document.getElementById("orderModal");
const modalTitle = document.getElementById("modalTitle");

const customerInput = document.getElementById("customerInput");
const itemInput = document.getElementById("itemInput");
const descInput = document.getElementById("descInput");
const qtyInput = document.getElementById("qtyInput");
const priceInput = document.getElementById("priceInput");
const statusInput = document.getElementById("statusInput");
const saveOrderBtn = document.getElementById("saveOrderBtn");
const cancelBtn = document.getElementById("cancelBtn");

// Render orders
function renderOrders(filter="") {
  orderList.innerHTML = "";
  const filtered = orders.filter(o =>
    o.customer.toLowerCase().includes(filter) ||
    o.item.toLowerCase().includes(filter) ||
    o.desc.toLowerCase().includes(filter)
  );

  filtered.forEach(order => {
    const li = document.createElement("li");
    li.className = "order-item";
    li.innerHTML = `
      <h3>${order.customer}</h3>
      <p><strong>Item:</strong> ${order.item}</p>
      <p><strong>Description:</strong> ${order.desc}</p>
      <p><strong>Qty:</strong> ${order.qty} | <strong>Price:</strong> ${order.price}</p>
      <p><strong>Status:</strong> ${order.status}</p>
      <div class="order-actions">
        <button class="edit-btn" data-id="${order.id}">Edit</button>
        <button class="delete-btn" data-id="${order.id}">Delete</button>
      </div>
    `;
    orderList.appendChild(li);
  });
}

// Search
searchInput.addEventListener("input", e => renderOrders(e.target.value.toLowerCase()));

// Show modal
addOrderBtn.addEventListener("click", () => {
  editingOrderId = null;
  modalTitle.textContent = "Add Order";
  customerInput.value = "";
  itemInput.value = "";
  descInput.value = "";
  qtyInput.value = 1;
  priceInput.value = 0;
  statusInput.value = "Pending";
  orderModal.classList.remove("hidden");
});

// Cancel modal
cancelBtn.addEventListener("click", () => orderModal.classList.add("hidden"));

// Save order
saveOrderBtn.addEventListener("click", () => {
  const orderData = {
    customer: customerInput.value,
    item: itemInput.value,
    desc: descInput.value,
    qty: parseInt(qtyInput.value),
    price: parseFloat(priceInput.value),
    status: statusInput.value
  };

  if (editingOrderId) {
    const index = orders.findIndex(o => o.id === editingOrderId);
    orders[index] = {...orders[index], ...orderData};
  } else {
    orderData.id = Date.now();
    orders.push(orderData);
  }

  orderModal.classList.add("hidden");
  renderOrders(searchInput.value.toLowerCase());
});

// Edit / Delete buttons
orderList.addEventListener("click", e => {
  const id = parseInt(e.target.dataset.id);
  if (e.target.classList.contains("edit-btn")) {
    editingOrderId = id;
    const order = orders.find(o => o.id === id);
    modalTitle.textContent = "Edit Order";
    customerInput.value = order.customer;
    itemInput.value = order.item;
    descInput.value = order.desc;
    qtyInput.value = order.qty;
    priceInput.value = order.price;
    statusInput.value = order.status;
    orderModal.classList.remove("hidden");
  } else if (e.target.classList.contains("delete-btn")) {
    orders = orders.filter(o => o.id !== id);
    renderOrders(searchInput.value.toLowerCase());
  }
});

// Initial render
renderOrders();
