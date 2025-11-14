import { getOrders, saveOrders, initOrderSound } from './common.js';

initOrderSound(true);

let orders = getOrders();
const tableBody = document.querySelector('#adminTable tbody');

function render() {
    tableBody.innerHTML = '';
    orders.forEach((o, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${o.salesman || 'N/A'}</td>
            <td>${o.customer}</td>
            <td>${o.item} x${o.quantity} ($${o.price})</td>
            <td>${o.status}</td>
            <td>
                ${o.status !== 'Completed' ? `<button onclick="markCompleted(${index})">Mark Completed</button>` : ''}
                <button onclick="deleteOrder(${index})">Delete</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
    saveOrders(orders);
}

// 按钮操作
window.markCompleted = (i) => { orders[i].status = 'Completed'; render(); }
window.deleteOrder = (i) => { orders.splice(i,1); render(); }

document.querySelector('#markCompleted').addEventListener('click', ()=>{ orders.forEach(o=>o.status='Completed'); render(); });
document.querySelector('#deleteCompleted').addEventListener('click', ()=>{ orders = orders.filter(o=>o.status!=='Completed'); render(); });

document.querySelector('#searchAdmin').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    tableBody.querySelectorAll('tr').forEach(tr=>{
        tr.style.display = Array.from(tr.children).some(td=>td.textContent.toLowerCase().includes(val)) ? '' : 'none';
    });
});

setInterval(()=>{
    orders = getOrders(); // 每2秒同步 localStorage
    render();
},2000);

render();
