// localStorage key
const STORAGE_KEY = 'internalOrders';

// 读取/保存订单
function loadOrders(){ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
function saveOrders(orders){ localStorage.setItem(STORAGE_KEY, JSON.stringify(orders)); }

// 提示音初始化
function initOrderSound(enable=true){
  if(!enable) return;
  const audio = document.getElementById('orderSound');
  let lastPending = loadOrders().filter(o=>o.status==='Pending').length;
  setInterval(()=>{
    const orders = loadOrders();
    const pending = orders.filter(o=>o.status==='Pending').length;
    if(pending > lastPending && audio) audio.play();
    lastPending = pending;
  }, 2000); // 每2秒检测一次
}
