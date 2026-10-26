let timer = null;

export function showToast(message, kind = 'info') {
    const host = document.getElementById('toast-host');
    if (!host) return;
    host.replaceChildren();
    const toast = document.createElement('div');
    toast.className = `app-toast is-${kind}`;
    toast.textContent = message;
    host.append(toast);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
        toast.classList.add('is-leaving');
        setTimeout(() => toast.remove(), 220);
    }, 2400);
}
