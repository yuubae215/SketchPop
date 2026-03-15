/**
 * ContextMenuManager — right-click context menu for objects and empty canvas space.
 *
 * Object menu:  Rename | Duplicate | Hide/Show | ─── | Delete
 * Empty menu:   Sketch here | Reset view
 */
export class ContextMenuManager {
    constructor() {
        this._el = null;
        this._currentTarget = null; // { type: 'object'|'empty', sketch?, position? }
        this._callbacks = {};
        this._build();
        document.addEventListener('click', () => this.hide());
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hide(); });
    }

    // ── Public API ────────────────────────────────────────────────────────

    /**
     * Register action callbacks.
     * @param {Object} cbs - { rename, duplicate, toggleVisibility, delete, sketchHere, resetView }
     */
    setCallbacks(cbs) {
        this._callbacks = { ...this._callbacks, ...cbs };
    }

    /**
     * Show the context menu for a 3D object.
     * @param {MouseEvent} event
     * @param {Object} sketch - SketchRectangle instance
     */
    showForObject(event, sketch) {
        event.preventDefault();
        event.stopPropagation();
        this._currentTarget = { type: 'object', sketch };
        this._populateObjectMenu(sketch);
        this._position(event.clientX, event.clientY);
        this._el.classList.add('ctx-visible');
    }

    /**
     * Show the context menu for empty canvas space.
     * @param {MouseEvent} event
     * @param {THREE.Vector3|null} worldPos - 3D position on ground plane (may be null)
     */
    showForEmpty(event, worldPos) {
        event.preventDefault();
        event.stopPropagation();
        this._currentTarget = { type: 'empty', position: worldPos };
        this._populateEmptyMenu();
        this._position(event.clientX, event.clientY);
        this._el.classList.add('ctx-visible');
    }

    hide() {
        if (this._el) this._el.classList.remove('ctx-visible');
        this._currentTarget = null;
    }

    // ── Build ─────────────────────────────────────────────────────────────

    _build() {
        const el = document.createElement('div');
        el.id = 'context-menu';
        el.className = 'ctx-menu';
        document.body.appendChild(el);
        this._el = el;
    }

    // ── Menu population ───────────────────────────────────────────────────

    _populateObjectMenu(sketch) {
        const isHidden = sketch.extrudedMesh ? !sketch.extrudedMesh.visible : false;
        const visLabel = isHidden ? 'Show' : 'Hide';
        const visIcon  = isHidden ? '👁' : '🙈';

        this._el.innerHTML = '';
        this._addItem('✏️', 'Rename',    'rename');
        this._addItem('📋', 'Duplicate', 'duplicate');
        this._addItem(visIcon, visLabel, 'toggleVisibility');
        this._addSeparator();
        this._addItem('🗑️', 'Delete', 'delete', 'ctx-item--danger');
    }

    _populateEmptyMenu() {
        this._el.innerHTML = '';
        this._addItem('✏️', 'Sketch here', 'sketchHere');
        this._addItem('🏠', 'Reset view',  'resetView');
    }

    _addItem(icon, label, action, extraClass = '') {
        const btn = document.createElement('button');
        btn.className = `ctx-item${extraClass ? ' ' + extraClass : ''}`;
        btn.innerHTML = `<span class="ctx-item__icon">${icon}</span><span class="ctx-item__label">${label}</span>`;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._dispatch(action);
            this.hide();
        });
        this._el.appendChild(btn);
    }

    _addSeparator() {
        const sep = document.createElement('div');
        sep.className = 'ctx-sep';
        this._el.appendChild(sep);
    }

    // ── Dispatch ──────────────────────────────────────────────────────────

    _dispatch(action) {
        const cb = this._callbacks[action];
        if (!cb) return;
        const t = this._currentTarget;
        if (!t) return;

        switch (action) {
            case 'rename':
            case 'duplicate':
            case 'toggleVisibility':
            case 'delete':
                if (t.sketch) cb(t.sketch);
                break;
            case 'sketchHere':
                cb(t.position);
                break;
            case 'resetView':
                cb();
                break;
        }
    }

    // ── Positioning ───────────────────────────────────────────────────────

    _position(x, y) {
        const el = this._el;
        el.style.left = '-9999px';
        el.style.top  = '-9999px';
        el.classList.add('ctx-visible'); // need visible to measure

        const w = el.offsetWidth  || 160;
        const h = el.offsetHeight || 120;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let left = x + 4;
        let top  = y + 4;
        if (left + w > vw - 8) left = x - w - 4;
        if (top  + h > vh - 8) top  = y - h - 4;
        if (left < 4) left = 4;
        if (top  < 4) top  = 4;

        el.style.left = `${left}px`;
        el.style.top  = `${top}px`;
        el.classList.remove('ctx-visible'); // caller will re-add
    }
}
