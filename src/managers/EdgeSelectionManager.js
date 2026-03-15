import * as THREE from 'three';

/**
 * EdgeSelectionManager — hover-highlight and click-select edges on extruded meshes.
 *
 * Usage:
 *   const esm = new EdgeSelectionManager(sceneManager, stateManager);
 *   // call from mousemove:  esm.onMouseMove(event)
 *   // call from click:      esm.onClick(event)
 *   // get selected edges:   esm.selectedEdges  (array of { mesh, edgeIndex, vertices })
 *   // enable/disable:       esm.enabled = true/false
 *
 * Colors:
 *   Normal    : dim gray (hidden by default, shown in edge-select mode)
 *   Hovered   : yellow  #ffff00
 *   Selected  : orange  #ff9500
 */
export class EdgeSelectionManager {
    constructor(sceneManager, stateManager) {
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;

        this.enabled = false;

        /** Map<THREE.Mesh, { lines: THREE.LineSegments, edgePositions: Float32Array }> */
        this._meshData = new Map();

        this._hoveredEdge  = null; // { mesh, segIndex }
        this._selectedEdges = [];  // [{ mesh, segIndex, vertices: [v0, v1] }]

        this._raycaster = new THREE.Raycaster();
        this._raycaster.params.Line = { threshold: 0.15 };

        this._mouse = new THREE.Vector2();
    }

    // ── Public API ────────────────────────────────────────────────────────────

    get selectedEdges() { return this._selectedEdges; }

    enable() {
        this.enabled = true;
        // Build edge overlays for all existing extruded meshes
        this.stateManager.sketches.forEach(sketch => {
            if (sketch.extrudedMesh) this._ensureEdgeLines(sketch.extrudedMesh);
        });
        this._showAll();
    }

    disable() {
        this.enabled = false;
        this._clearHover();
        this._hideAll();
    }

    /** Call when a new mesh is added to the scene */
    onMeshAdded(mesh) {
        if (this.enabled) {
            this._ensureEdgeLines(mesh);
            if (this.enabled) this._showLines(mesh);
        }
    }

    /** Call when a mesh is removed from the scene */
    onMeshRemoved(mesh) {
        this._removeMeshData(mesh);
    }

    clearSelection() {
        this._selectedEdges = [];
        // Reset all edge colors to default
        for (const [mesh, data] of this._meshData) {
            this._resetEdgeColors(data.lines);
        }
    }

    /**
     * Select the full edge loop containing the given segment.
     * Walks connected edges that make ~90° turns (box-style loop).
     * Falls back to selecting all parallel edges if no loop is found.
     *
     * @param {THREE.Mesh} mesh
     * @param {number}     segIndex  — starting segment index
     */
    selectLoop(mesh, segIndex) {
        const data = this._meshData.get(mesh);
        if (!data) return;

        const pos = data.edgePositions; // flat Float32Array: [x0,y0,z0, x1,y1,z1, ...]
        const numEdges = pos.length / 6;
        const EPS = 0.001;

        const getV = (i, endpoint) => {
            const base = i * 6 + (endpoint === 0 ? 0 : 3);
            return new THREE.Vector3(pos[base], pos[base + 1], pos[base + 2]);
        };

        const edgeDir = (i) =>
            getV(i, 1).sub(getV(i, 0)).normalize();

        // Walk edge loop starting from segIndex
        const loopIndices = this._walkLoop(segIndex, numEdges, getV, edgeDir, EPS);

        // If loop is trivially short (< 3), fall back to parallel-edge selection
        const finalIndices = loopIndices.length >= 3
            ? loopIndices
            : this._selectParallel(segIndex, numEdges, edgeDir);

        // Apply selection
        finalIndices.forEach(idx => {
            const alreadySelected = this._selectedEdges.some(
                e => e.mesh === mesh && e.segIndex === idx
            );
            if (!alreadySelected) {
                this._selectedEdges.push({
                    mesh,
                    segIndex: idx,
                    vertices: this._getEdgeVertices(mesh, idx),
                });
            }
            this._setEdgeColor(mesh, idx, 0xff9500);
        });
    }

    _walkLoop(startIdx, numEdges, getV, edgeDir, EPS) {
        const visited = new Set([startIdx]);
        const loop = [startIdx];

        const v0start = getV(startIdx, 0);
        const v1start = getV(startIdx, 1);

        let currentPos = v1start.clone();
        let currentDir = edgeDir(startIdx);

        for (let step = 0; step < numEdges; step++) {
            let nextIdx = -1;
            let nextEndPos = null;
            let nextDir = null;

            for (let i = 0; i < numEdges; i++) {
                if (visited.has(i)) continue;
                const a = getV(i, 0);
                const b = getV(i, 1);

                let fromV, toV;
                if (a.distanceTo(currentPos) < EPS) {
                    fromV = a; toV = b;
                } else if (b.distanceTo(currentPos) < EPS) {
                    fromV = b; toV = a;
                } else {
                    continue;
                }

                const newDir = toV.clone().sub(fromV).normalize();
                // Accept only edges that are NOT co-linear with current direction
                // (|dot| < 0.3 means angle > ~72°, which catches 90° box corners)
                if (Math.abs(currentDir.dot(newDir)) < 0.3) {
                    nextIdx = i;
                    nextEndPos = toV.clone();
                    nextDir = newDir.clone();
                    break;
                }
            }

            if (nextIdx === -1) break;

            visited.add(nextIdx);
            loop.push(nextIdx);
            currentPos = nextEndPos;
            currentDir = nextDir;

            // Closed when we returned to the start edge's start vertex
            if (currentPos.distanceTo(v0start) < EPS) break;
        }

        return loop;
    }

    /** Fallback: select all edges parallel to segIndex. */
    _selectParallel(segIndex, numEdges, edgeDir) {
        const refDir = edgeDir(segIndex);
        const result = [segIndex];
        for (let i = 0; i < numEdges; i++) {
            if (i === segIndex) continue;
            const d = edgeDir(i);
            if (Math.abs(refDir.dot(d)) > 0.99) {
                result.push(i);
            }
        }
        return result;
    }

    onMouseMove(event) {
        if (!this.enabled) return;

        this._updateMouseNDC(event);
        this._raycaster.setFromCamera(this._mouse, this.sceneManager.camera);

        const nearest = this._findNearestEdge();

        if (nearest) {
            if (!this._hoveredEdge || nearest.mesh !== this._hoveredEdge.mesh || nearest.segIndex !== this._hoveredEdge.segIndex) {
                this._clearHover();
                this._setEdgeColor(nearest.mesh, nearest.segIndex, 0xffff00); // yellow hover
                this._hoveredEdge = nearest;
            }
        } else {
            this._clearHover();
        }
    }

    onClick(event) {
        if (!this.enabled || !this._hoveredEdge) return;

        const { mesh, segIndex } = this._hoveredEdge;

        // Toggle selection
        const existingIdx = this._selectedEdges.findIndex(
            e => e.mesh === mesh && e.segIndex === segIndex
        );

        if (existingIdx >= 0) {
            // Deselect
            this._selectedEdges.splice(existingIdx, 1);
            this._setEdgeColor(mesh, segIndex, 0xaaaaaa); // back to normal
        } else {
            // Select
            const verts = this._getEdgeVertices(mesh, segIndex);
            this._selectedEdges.push({ mesh, segIndex, vertices: verts });
            this._setEdgeColor(mesh, segIndex, 0xff9500); // orange selected
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    _updateMouseNDC(event) {
        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        this._mouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
        this._mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;
    }

    _ensureEdgeLines(mesh) {
        if (this._meshData.has(mesh)) return;

        // Use small threshold (5°) to detect all edges
        const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, 5);
        const positions = edgesGeo.attributes.position.array.slice(); // copy

        // Build per-edge color attribute (each edge = 2 vertices)
        const count = positions.length / 3;
        const colors = new Float32Array(count * 3);
        // Default: dim gray
        for (let i = 0; i < count; i++) {
            colors[i * 3]     = 0.4;
            colors[i * 3 + 1] = 0.4;
            colors[i * 3 + 2] = 0.4;
        }
        edgesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            depthTest: true,
        });

        const lines = new THREE.LineSegments(edgesGeo, material);
        lines.userData.isEdgeSelection = true;
        lines.visible = false; // hidden until enabled
        mesh.add(lines);

        this._meshData.set(mesh, { lines, edgePositions: positions });
    }

    _removeMeshData(mesh) {
        const data = this._meshData.get(mesh);
        if (!data) return;

        mesh.remove(data.lines);
        data.lines.geometry.dispose();
        data.lines.material.dispose();
        this._meshData.delete(mesh);

        // Remove any selected edges for this mesh
        this._selectedEdges = this._selectedEdges.filter(e => e.mesh !== mesh);
        if (this._hoveredEdge && this._hoveredEdge.mesh === mesh) {
            this._hoveredEdge = null;
        }
    }

    _showAll() {
        for (const [mesh, data] of this._meshData) {
            data.lines.visible = true;
        }
    }

    _hideAll() {
        for (const [mesh, data] of this._meshData) {
            data.lines.visible = false;
        }
    }

    _showLines(mesh) {
        const data = this._meshData.get(mesh);
        if (data) data.lines.visible = true;
    }

    _clearHover() {
        if (!this._hoveredEdge) return;
        const { mesh, segIndex } = this._hoveredEdge;

        // Restore: check if this edge is selected
        const isSelected = this._selectedEdges.some(
            e => e.mesh === mesh && e.segIndex === segIndex
        );
        this._setEdgeColor(mesh, segIndex, isSelected ? 0xff9500 : 0xaaaaaa);
        this._hoveredEdge = null;
    }

    _setEdgeColor(mesh, segIndex, hexColor) {
        const data = this._meshData.get(mesh);
        if (!data) return;

        const r = ((hexColor >> 16) & 0xff) / 255;
        const g = ((hexColor >>  8) & 0xff) / 255;
        const b = ( hexColor        & 0xff) / 255;

        const colAttr = data.lines.geometry.attributes.color;
        // Each segment = 2 vertices = indices segIndex*2 and segIndex*2+1
        const v0 = segIndex * 2;
        const v1 = v0 + 1;
        colAttr.setXYZ(v0, r, g, b);
        colAttr.setXYZ(v1, r, g, b);
        colAttr.needsUpdate = true;
    }

    _resetEdgeColors(lines) {
        const colAttr = lines.geometry.attributes.color;
        if (!colAttr) return;
        for (let i = 0; i < colAttr.count; i++) {
            colAttr.setXYZ(i, 0.4, 0.4, 0.4);
        }
        colAttr.needsUpdate = true;
    }

    _findNearestEdge() {
        // Build line segments for raycasting from enabled meshes
        let best = null;
        let bestDist = Infinity;

        for (const [mesh, data] of this._meshData) {
            if (!data.lines.visible) continue;

            // Temporarily set raycaster to test against line segments
            const hits = this._raycaster.intersectObject(data.lines, false);
            if (hits.length === 0) continue;

            const hit = hits[0];
            if (hit.distance < bestDist) {
                // Determine which segment was hit using faceIndex
                // For LineSegments, faceIndex = segment index
                const segIndex = hit.faceIndex !== undefined ? hit.faceIndex : 0;
                bestDist = hit.distance;
                best = { mesh, segIndex };
            }
        }

        return best;
    }

    _getEdgeVertices(mesh, segIndex) {
        const data = this._meshData.get(mesh);
        if (!data) return [];

        const pos = data.edgePositions;
        const i = segIndex * 6; // 2 vertices × 3 components
        const v0 = new THREE.Vector3(pos[i],     pos[i + 1], pos[i + 2]);
        const v1 = new THREE.Vector3(pos[i + 3], pos[i + 4], pos[i + 5]);

        // Transform to world space
        v0.applyMatrix4(mesh.matrixWorld);
        v1.applyMatrix4(mesh.matrixWorld);

        return [v0, v1];
    }
}
