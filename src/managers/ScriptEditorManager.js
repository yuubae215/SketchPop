import { ProceduralEngine } from '../geometry/ProceduralEngine.js';

/**
 * ScriptEditorManager — slide-in panel for the procedural CAD script editor.
 *
 * Provides a code textarea where users write parametric scripts and a
 * "Run" button to execute them via ProceduralEngine.
 *
 * Panel lives on the LEFT side of the canvas.
 * Toggle with the toolbar button (id="top-script-editor") or Ctrl+Shift+P.
 */
export class ScriptEditorManager {
    /**
     * @param {import('./SceneManager.js').SceneManager} sceneManager
     * @param {import('./StateManager.js').StateManager} stateManager
     * @param {import('./BooleanManager.js').BooleanManager} booleanManager
     */
    constructor(sceneManager, stateManager, booleanManager) {
        this._engine = new ProceduralEngine(sceneManager, stateManager, booleanManager);
        this._panel  = null;
        this._editor = null;
        this._errorEl = null;
        this._paramList = null;
        this._isVisible = false;
    }

    /** Call after the DOM is ready. */
    init() {
        this._panel   = document.getElementById('script-editor-panel');
        this._editor  = document.getElementById('script-editor-textarea');
        this._errorEl = document.getElementById('script-editor-error');
        this._paramList = document.getElementById('script-editor-params');
        if (!this._panel) return;

        // Close button
        const closeBtn = document.getElementById('script-editor-close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.hide());

        // Run button
        const runBtn = document.getElementById('script-editor-run');
        if (runBtn) runBtn.addEventListener('click', () => this._run());

        // Clear button
        const clearBtn = document.getElementById('script-editor-clear');
        if (clearBtn) clearBtn.addEventListener('click', () => this._clearScene());

        // Keyboard shortcut inside textarea: Ctrl+Enter to run
        if (this._editor) {
            this._editor.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    this._run();
                }
                // Prevent app hotkeys while typing
                e.stopPropagation();
            });
        }

        // Load saved script from localStorage
        const saved = localStorage.getItem('sketchpop_procedural_script');
        if (saved && this._editor) {
            this._editor.value = saved;
        } else if (this._editor) {
            this._editor.value = EXAMPLE_SCRIPT;
        }
    }

    /** Show the panel. */
    show() {
        if (this._panel) this._panel.classList.add('visible');
        this._isVisible = true;
        const btn = document.getElementById('top-script-editor');
        if (btn) btn.classList.add('active');
    }

    /** Hide the panel. */
    hide() {
        if (this._panel) this._panel.classList.remove('visible');
        this._isVisible = false;
        const btn = document.getElementById('top-script-editor');
        if (btn) btn.classList.remove('active');
    }

    /** Toggle panel visibility. */
    toggle() {
        if (this._isVisible) this.hide(); else this.show();
    }

    // ── Private ────────────────────────────────────────────────────────────

    _run() {
        if (!this._editor) return;
        const script = this._editor.value.trim();
        this._clearError();

        // Persist script
        try { localStorage.setItem('sketchpop_procedural_script', script); } catch (_) {}

        if (!script) return;

        const result = this._engine.execute(script);

        if (result.ok) {
            this._clearError();
            this._updateParamDisplay(script);
        } else {
            this._showError(result.error);
        }
    }

    _clearScene() {
        this._engine.clearAll();
        this._clearError();
        this._updateParamDisplay('');
    }

    _showError(msg) {
        if (!this._errorEl) return;
        this._errorEl.textContent = msg;
        this._errorEl.style.display = 'block';
    }

    _clearError() {
        if (!this._errorEl) return;
        this._errorEl.textContent = '';
        this._errorEl.style.display = 'none';
    }

    /** Parse params({...}) from the script and display them as a summary. */
    _updateParamDisplay(script) {
        if (!this._paramList) return;
        try {
            const match = script.match(/params\s*\(\s*(\{[\s\S]*?\})\s*\)/);
            if (!match) { this._paramList.innerHTML = ''; return; }
            const obj = new Function(`return ${match[1]}`)();
            const entries = Object.entries(obj);
            if (entries.length === 0) { this._paramList.innerHTML = ''; return; }
            this._paramList.innerHTML = entries
                .map(([k, v]) => `<div class="spe-param-row"><span class="spe-param-key">${_escHtml(k)}</span><span class="spe-param-val">${_escHtml(String(v))}</span></div>`)
                .join('');
        } catch (_) {
            this._paramList.innerHTML = '';
        }
    }
}

function _escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Default example script ────────────────────────────────────────────────────

const EXAMPLE_SCRIPT = `// Procedural CAD Script
// Ctrl+Enter to run · sketch(x1,z1, x2,z2).extrude(h)

params({
  width:  80,
  depth:  50,
  height: 30,
  wall:    6,
});

// Outer shell
const outer = sketch(0, 0, width, depth).extrude(height);

// Inner cutout (hollow box)
const inner = sketch(wall, wall, width - wall, depth - wall)
                .extrude(height - wall);

outer.subtract(inner);
`;
