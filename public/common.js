export function getOrders() {
    return JSON.parse(localStorage.getItem('internalOrders') || '[]');
}

export function saveOrders(orders) {
    localStorage.setItem('internalOrders', JSON.stringify(orders));
}

export function initOrderSound(enable = true) {
    if (!enable) return;
    const audio = document.getElementById('orderSound');
    let lastPendingCount = getOrders().filter(o => o.status === 'Pending').length;

    setInterval(() => {
        const orders = getOrders();
        const pendingCount = orders.filter(o => o.status === 'Pending').length;
        if (pendingCount > lastPendingCount && audio) audio.play();
        lastPendingCount = pendingCount;
    }, 3000); // 每3秒检测
}
