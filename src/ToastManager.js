/**
 * ToastManager — non-blocking toast notifications.
 *
 * Usage:
 *   ToastManager.show('Object created', 'success');
 *   ToastManager.show('No object selected', 'warning');
 *
 * Types: 'success' | 'info' | 'warning' | 'error'
 * Auto-dismisses after `duration` ms (default 3500).
 */

const ICONS = {
    success: '✓',
    info: 'ℹ',
    warning: '⚠',
    error: '✕',
};

export class ToastManager {
    static _container = null;

    static _getContainer() {
        if (!ToastManager._container) {
            const el = document.createElement('div');
            el.id = 'toast-container';
            document.body.appendChild(el);
            ToastManager._container = el;
        }
        return ToastManager._container;
    }

    /**
     * @param {string} message
     * @param {'success'|'info'|'warning'|'error'} type
     * @param {number} duration ms before auto-dismiss (0 = never)
     */
    static show(message, type = 'info', duration = 3500) {
        const container = ToastManager._getContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;

        toast.innerHTML = `<span class="toast-icon">${ICONS[type] ?? 'ℹ'}</span>
<span class="toast-msg">${message}</span>
<button class="toast-close" aria-label="Close">×</button>`;

        const dismiss = () => {
            toast.classList.add('toast--out');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        };

        toast.querySelector('.toast-close').addEventListener('click', dismiss);

        container.appendChild(toast);

        // Trigger enter animation
        requestAnimationFrame(() => toast.classList.add('toast--in'));

        if (duration > 0) {
            setTimeout(dismiss, duration);
        }
    }
}
