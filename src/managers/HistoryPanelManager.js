/**
 * HistoryPanelManager — Fusion-360-style timeline at the bottom of the viewport.
 *
 * Reads from CommandManager.undoStack and shows each command as a chip.
 * Clicking a chip replays undo/redo to reach that state.
 */

const LABELS = {
    AddSketchCommand:    { text: 'Sketch',        icon: '✏️' },
    ExtrudeCommand:      { text: 'Extrude',       icon: '⬆️' },
    DeleteSketchCommand: { text: 'Delete',        icon: '🗑️' },
    FaceExtrudeCommand:  { text: 'Face Extrude',  icon: '🔼' },
    DuplicateCommand:    { text: 'Duplicate',     icon: '⧉' },
};

export class HistoryPanelManager {
    constructor(commandManager) {
        this.commandManager = commandManager;
        this._panel = null;
        this._track = null;
        this._visible = false;
        this._ensureDOM();
    }

    /** Call after every commandManager.push / undo / redo */
    refresh() {
        if (!this._panel) return;
        this._renderTrack();
        // Auto-show the panel the first time there's history
        if (this.commandManager.undoStack.length > 0 && !this._visible) {
            this.show();
        }
        if (this.commandManager.undoStack.length === 0 && this.commandManager.redoStack.length === 0) {
            this.hide();
        }
    }

    show() {
        this._panel.classList.add('hp-visible');
        this._visible = true;
    }

    hide() {
        this._panel.classList.remove('hp-visible');
        this._visible = false;
    }

    toggle() {
        this._visible ? this.hide() : this.show();
    }

    // ── private ──────────────────────────────────────────

    _ensureDOM() {
        this._panel = document.createElement('div');
        this._panel.id = 'history-panel';
        this._panel.innerHTML = `
          <div class="hp-header">
            <span class="hp-title">History</span>
            <button class="hp-close" title="Close history">×</button>
          </div>
          <div class="hp-track-wrap">
            <div class="hp-track"></div>
          </div>`;
        document.getElementById('canvas-container').appendChild(this._panel);

        this._track = this._panel.querySelector('.hp-track');
        this._panel.querySelector('.hp-close').addEventListener('click', () => this.hide());
    }

    _renderTrack() {
        this._track.innerHTML = '';
        const undoStack = this.commandManager.undoStack;
        const redoStack = [...this.commandManager.redoStack].reverse(); // oldest-first

        // Undo items (committed history)
        undoStack.forEach((cmd, i) => {
            const chip = this._makeChip(cmd, i, false);
            this._track.appendChild(chip);
        });

        // Current position marker
        const marker = document.createElement('div');
        marker.className = 'hp-cursor';
        marker.title = 'Current state';
        this._track.appendChild(marker);

        // Redo items (greyed out, future)
        redoStack.forEach((cmd, i) => {
            const chip = this._makeChip(cmd, undoStack.length + i, true);
            this._track.appendChild(chip);
        });

        // Scroll the marker into view
        requestAnimationFrame(() => marker.scrollIntoView({ inline: 'nearest', block: 'nearest' }));
    }

    _makeChip(cmd, index, isFuture) {
        const name = cmd.constructor.name;
        const def = LABELS[name] || { text: name, icon: '●' };

        const chip = document.createElement('button');
        chip.className = 'hp-chip' + (isFuture ? ' hp-chip--future' : '');
        chip.title = `${def.text}${isFuture ? ' (redo)' : ''}`;
        chip.innerHTML = `<span class="hp-chip-icon">${def.icon}</span><span class="hp-chip-label">${def.text}</span>`;

        chip.addEventListener('click', () => this._jumpTo(index));
        return chip;
    }

    /**
     * Jump to the state after command at `targetIndex` has been applied.
     * Uses undo/redo to reach that position.
     */
    _jumpTo(targetIndex) {
        const cm = this.commandManager;
        const current = cm.undoStack.length - 1; // index of last applied command

        if (targetIndex === current) return;

        if (targetIndex < current) {
            // Need to undo (current - targetIndex) times
            const steps = current - targetIndex;
            for (let i = 0; i < steps; i++) cm.undo();
        } else {
            // Need to redo (targetIndex - current) times
            const steps = targetIndex - current;
            for (let i = 0; i < steps; i++) cm.redo();
        }
        this.refresh();
    }
}
