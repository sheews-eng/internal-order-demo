import { getOrders, saveOrders, initOrderSound } from './common.js';

initOrderSound(true);

let orders = getOrders();
const tableBody = document.querySelector('#orderTable tbody');

function render() {
    tableBody.innerHTML = '';
    orders.forEach((o, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${o.customer}</td>
            <td>${o.item} x${o.quantity} ($${o.price})</td>
            <td>${o.status}</td>
            <td>
                ${o.status !== 'Completed' ? `<button onclick="markOrdered(${index})">Mark Ordered</button>` : ''}
                <button onclick="deleteOrder(${index})">Delete</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
    saveOrders(orders);
}

window.markOrdered = (i) => {
    orders[i].status = 'Ordered';
    render();
}

window.deleteOrder = (i) => {
    orders.splice(i,1);
    render();
}

document.querySelector('#addOrder').addEventListener('click', () => {
    const customer = document.querySelector('#customerName').value.trim();
    const item = document.querySelector('#itemCode').value.trim();
    const quantity = parseInt(document.querySelector('#quantity').value, 10);
    const price = parseFloat(document.querySelector('#price').value || 0);
    if(!customer || !item || isNaN(quantity) || isNaN(price)) return alert('Fill all fields');

    orders.push({customer, item, quantity, price, status:'Pending'});
    render();

    // 清空表单
    document.querySelector('#customerName').value = '';
    document.querySelector('#itemCode').value = '';
    document.querySelector('#quantity').value = '';
    document.querySelector('#price').value = '';
});

document.querySelector('#search').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    tableBody.querySelectorAll('tr').forEach(tr=>{
        tr.style.display = Array.from(tr.children).some(td=>td.textContent.toLowerCase().includes(val)) ? '' : 'none';
    });
});

render();
