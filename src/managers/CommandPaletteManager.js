/**
 * CommandPaletteManager — Ctrl+K fuzzy-search command launcher.
 *
 * Usage:
 *   const palette = new CommandPaletteManager();
 *   palette.register([{ id, label, shortcut, action }]);
 *   palette.open();
 */

export class CommandPaletteManager {
    constructor() {
        this._commands = [];
        this._filtered = [];
        this._selectedIndex = 0;
        this._overlay = null;
        this._input = null;
        this._list = null;
        this._open = false;
        this._onKeyDown = this._handleGlobalKey.bind(this);
        window.addEventListener('keydown', this._onKeyDown);
    }

    /** Register command definitions. May be called multiple times to extend the list. */
    register(commands) {
        this._commands.push(...commands);
    }

    open() {
        if (this._open) return;
        this._ensureDOM();
        this._overlay.classList.add('cp-open');
        this._open = true;
        this._input.value = '';
        this._filter('');
        requestAnimationFrame(() => this._input.focus());
    }

    close() {
        if (!this._open) return;
        this._overlay.classList.remove('cp-open');
        this._open = false;
    }

    toggle() {
        this._open ? this.close() : this.open();
    }

    // ── private ────────────────────────────────────────

    _ensureDOM() {
        if (this._overlay) return;

        this._overlay = document.createElement('div');
        this._overlay.id = 'command-palette';
        this._overlay.innerHTML = `
          <div class="cp-backdrop"></div>
          <div class="cp-modal" role="dialog" aria-label="Command palette">
            <div class="cp-search-row">
              <svg class="cp-search-icon" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27A6.5 6.5 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
              </svg>
              <input class="cp-input" type="text" placeholder="Search commands..." autocomplete="off" spellcheck="false">
              <kbd class="cp-esc-hint">Esc</kbd>
            </div>
            <ul class="cp-list" role="listbox"></ul>
            <div class="cp-footer">
              <span><kbd>↑↓</kbd> navigate</span>
              <span><kbd>Enter</kbd> run</span>
              <span><kbd>Esc</kbd> close</span>
            </div>
          </div>`;
        document.body.appendChild(this._overlay);

        this._input = this._overlay.querySelector('.cp-input');
        this._list  = this._overlay.querySelector('.cp-list');

        this._input.addEventListener('input', () => this._filter(this._input.value));
        this._input.addEventListener('keydown', (e) => this._handleInputKey(e));

        // Click backdrop to close
        this._overlay.querySelector('.cp-backdrop').addEventListener('click', () => this.close());
    }

    _filter(query) {
        const q = query.trim().toLowerCase();
        this._filtered = q === ''
            ? this._commands.slice()
            : this._commands.filter(cmd => this._fuzzy(cmd.label, q));
        this._selectedIndex = 0;
        this._renderList();
    }

    /** Simple fuzzy: every char in query appears in order within label */
    _fuzzy(label, query) {
        const s = label.toLowerCase();
        let qi = 0;
        for (let i = 0; i < s.length && qi < query.length; i++) {
            if (s[i] === query[qi]) qi++;
        }
        return qi === query.length;
    }

    _renderList() {
        this._list.innerHTML = '';
        if (this._filtered.length === 0) {
            const li = document.createElement('li');
            li.className = 'cp-empty';
            li.textContent = 'No commands match';
            this._list.appendChild(li);
            return;
        }
        this._filtered.forEach((cmd, i) => {
            const li = document.createElement('li');
            li.className = 'cp-item' + (i === this._selectedIndex ? ' cp-item--active' : '');
            li.setAttribute('role', 'option');
            li.innerHTML = `
              <span class="cp-item-label">${this._highlight(cmd.label, this._input.value.trim())}</span>
              ${cmd.shortcut ? `<kbd class="cp-item-kbd">${cmd.shortcut}</kbd>` : ''}`;
            li.addEventListener('mouseenter', () => {
                this._selectedIndex = i;
                this._renderList();
            });
            li.addEventListener('click', () => this._execute(cmd));
            this._list.appendChild(li);
        });
        // Scroll selected into view
        const active = this._list.querySelector('.cp-item--active');
        if (active) active.scrollIntoView({ block: 'nearest' });
    }

    _highlight(label, query) {
        if (!query) return label;
        // Wrap matched chars in <mark>
        const q = query.toLowerCase();
        let result = '';
        let qi = 0;
        for (let i = 0; i < label.length; i++) {
            if (qi < q.length && label[i].toLowerCase() === q[qi]) {
                result += `<mark>${label[i]}</mark>`;
                qi++;
            } else {
                result += label[i];
            }
        }
        return result;
    }

    _handleInputKey(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this._selectedIndex = Math.min(this._selectedIndex + 1, this._filtered.length - 1);
            this._renderList();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
            this._renderList();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this._filtered[this._selectedIndex]) {
                this._execute(this._filtered[this._selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.close();
        }
    }

    _handleGlobalKey(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.toggle();
        }
    }

    _execute(cmd) {
        this.close();
        try {
            cmd.action();
        } catch (err) {
            console.error('CommandPalette: error running command', cmd.id, err);
        }
    }
}
