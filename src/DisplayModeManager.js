/**
 * DisplayModeManager — cycles display modes with W key or toolbar button.
 *
 * Modes (in order):
 *   shaded          – default; opaque meshes
 *   shaded-edges    – shaded + wireframe overlay
 *   wireframe       – lines only
 *   xray            – semi-transparent
 */

import * as THREE from 'three';
import { ToastManager } from './ToastManager.js';

const MODES = ['shaded', 'shaded-edges', 'wireframe', 'xray'];

const MODE_LABELS = {
    'shaded':       'Shaded',
    'shaded-edges': 'Shaded + Edges',
    'wireframe':    'Wireframe',
    'xray':         'X-Ray',
};

export class DisplayModeManager {
    constructor(sceneManager, stateManager) {
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;
        this._mode = 'shaded';
        this._overlayMeshes = []; // wireframe overlays for shaded-edges mode
        this._btn = null;
        this._ensureDOM();
        window.addEventListener('keydown', (e) => {
            if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
            if (e.key === 'w' || e.key === 'W') this.cycleMode();
        });
    }

    get mode() { return this._mode; }

    setMode(mode) {
        if (!MODES.includes(mode)) return;
        this._clearOverlays();
        this._mode = mode;
        this._applyToAll();
        this._updateButton();
    }

    cycleMode() {
        const next = MODES[(MODES.indexOf(this._mode) + 1) % MODES.length];
        this.setMode(next);
        ToastManager.show(`Display: ${MODE_LABELS[next]}`, 'info', 2000);
    }

    /** Call whenever a new mesh is added to the scene */
    applyToMesh(mesh) {
        if (!mesh) return;
        this._applyMode(mesh, this._mode);
        if (this._mode === 'shaded-edges') this._addEdgeOverlay(mesh);
    }

    // ── private ──────────────────────────────────────────────────────────────

    _applyToAll() {
        this.stateManager.sketches.forEach(sketch => {
            if (sketch.extrudedMesh) {
                this._applyMode(sketch.extrudedMesh, this._mode);
                if (this._mode === 'shaded-edges') this._addEdgeOverlay(sketch.extrudedMesh);
            }
        });
    }

    _applyMode(mesh, mode) {
        if (!mesh.material) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(mat => {
            switch (mode) {
                case 'shaded':
                    mat.wireframe = false;
                    mat.transparent = false;
                    mat.opacity = 1.0;
                    mat.depthWrite = true;
                    break;
                case 'shaded-edges':
                    mat.wireframe = false;
                    mat.transparent = false;
                    mat.opacity = 1.0;
                    mat.depthWrite = true;
                    break;
                case 'wireframe':
                    mat.wireframe = true;
                    mat.transparent = false;
                    mat.opacity = 1.0;
                    mat.depthWrite = true;
                    break;
                case 'xray':
                    mat.wireframe = false;
                    mat.transparent = true;
                    mat.opacity = 0.35;
                    mat.depthWrite = false;
                    break;
            }
            mat.needsUpdate = true;
        });
        mesh.visible = true;
    }

    _addEdgeOverlay(mesh) {
        const edges = new THREE.EdgesGeometry(mesh.geometry, 20); // 20° threshold
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 })
        );
        line.userData.isEdgeOverlay = true;
        line.position.copy(mesh.position);
        line.rotation.copy(mesh.rotation);
        line.scale.copy(mesh.scale);
        mesh.add(line);
        this._overlayMeshes.push({ parent: mesh, line });
    }

    _clearOverlays() {
        this._overlayMeshes.forEach(({ parent, line }) => {
            parent.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        });
        this._overlayMeshes = [];
    }

    _ensureDOM() {
        // Insert a display-mode button into top-bar right section
        const rightSection = document.querySelector('.top-bar__right');
        if (!rightSection) return;

        const sep = document.createElement('div');
        sep.className = 'top-bar__sep';

        const btn = document.createElement('button');
        btn.id = 'top-display-mode';
        btn.className = 'tb-btn';
        btn.title = 'Display mode (W)';
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8a3 3 0 100 6 3 3 0 000-6z" fill="currentColor"/></svg>`;
        btn.addEventListener('click', () => this.cycleMode());
        this._btn = btn;

        // Insert before the first existing separator in right section
        const firstSep = rightSection.querySelector('.top-bar__sep');
        rightSection.insertBefore(sep, firstSep);
        rightSection.insertBefore(btn, sep);
        this._updateButton();
    }

    _updateButton() {
        if (!this._btn) return;
        this._btn.title = `Display: ${MODE_LABELS[this._mode]} (W to cycle)`;
        // Highlight when not in default shaded mode
        this._btn.classList.toggle('active', this._mode !== 'shaded');
    }
}
