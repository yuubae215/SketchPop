import * as THREE from 'three';

/**
 * FilletManager — apply chamfer or fillet to extruded box meshes.
 *
 * Supported operations (Plasticity-inspired):
 *   chamfer(sketch, amount)  — cuts all 4 top horizontal edges at 45°
 *   fillet(sketch, amount)   — rounds all 4 top horizontal edges (arc approx.)
 *   reset(sketch)            — restore original BoxGeometry
 *
 * The operation replaces mesh.geometry in-place and stores undo data on
 * sketch.userData so the original can be restored.
 *
 * Key: amount is clamped to half the minimum of width/depth/height.
 */
export class FilletManager {
    constructor(sceneManager, stateManager) {
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;
    }

    /**
     * Apply a 45° chamfer to all 4 top horizontal edges of the box.
     * @param {SketchRectangle} sketch
     * @param {number} amount  chamfer distance (units)
     */
    chamfer(sketch, amount) {
        if (!sketch || !sketch.extrudedMesh || !sketch.isExtruded) return false;
        return this._applyOperation(sketch, amount, 'chamfer');
    }

    /**
     * Apply a rounded fillet (arc approx., 4 segments) to all 4 top edges.
     * @param {SketchRectangle} sketch
     * @param {number} amount  fillet radius (units)
     */
    fillet(sketch, amount) {
        if (!sketch || !sketch.extrudedMesh || !sketch.isExtruded) return false;
        return this._applyOperation(sketch, amount, 'fillet');
    }

    /**
     * Restore original BoxGeometry (removes chamfer/fillet).
     */
    reset(sketch) {
        if (!sketch || !sketch.extrudedMesh) return false;

        const mesh = sketch.extrudedMesh;
        const saved = mesh.userData._originalGeometry;
        if (!saved) return false;

        mesh.geometry.dispose();
        mesh.geometry = saved.clone();
        delete mesh.userData._originalGeometry;
        delete mesh.userData._filletOp;
        return true;
    }

    hasOperation(sketch) {
        return !!(sketch && sketch.extrudedMesh && sketch.extrudedMesh.userData._filletOp);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    _applyOperation(sketch, amount, type) {
        const mesh = sketch.extrudedMesh;

        // Save original geometry for undo
        if (!mesh.userData._originalGeometry) {
            mesh.userData._originalGeometry = mesh.geometry.clone();
        }

        // Get box dimensions from mesh geometry bounding box
        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox;
        const W = bb.max.x - bb.min.x;  // width
        const H = bb.max.y - bb.min.y;  // height
        const D = bb.max.z - bb.min.z;  // depth

        // Clamp amount
        const maxAmt = Math.min(W, D, H) * 0.45;
        const c = Math.min(Math.max(amount, 0.01), maxAmt);

        // Build new geometry
        let newGeo;
        if (type === 'chamfer') {
            newGeo = this._buildChamferedBox(W, H, D, c);
        } else {
            newGeo = this._buildFilletedBox(W, H, D, c, 6);
        }

        mesh.geometry.dispose();
        mesh.geometry = newGeo;
        mesh.userData._filletOp = { type, amount: c };

        return true;
    }

    /**
     * Build a BufferGeometry for a box with chamfered top-horizontal edges.
     * Bottom stays sharp; all 4 top edges are cut at 45°.
     *
     * Layout (looking from above, counter-clockwise from front-left):
     *   x: [-W/2 … W/2]
     *   y: [0 … H]         (box sits on y=0)
     *   z: [-D/2 … D/2]
     *
     * The top face becomes an octagon; 4 chamfer strips + 4 corner triangles
     * are added to fill the gaps.
     */
    _buildChamferedBox(W, H, D, c) {
        const x1 = -W / 2, x2 = W / 2;
        const y0 = 0,       y1 = H;
        const z1 = -D / 2,  z2 = D / 2;

        // Top octagon vertices (y = y1)
        // Going clockwise from front-left when viewed from above:
        // Naming: tAB = top edge A→B direction
        const tFL = v(x1 + c, y1, z1);       // front edge, left part
        const tFR = v(x2 - c, y1, z1);       // front edge, right part
        const tRF = v(x2,     y1, z1 + c);   // right edge, front part
        const tRB = v(x2,     y1, z2 - c);   // right edge, back part
        const tBR = v(x2 - c, y1, z2);       // back edge, right part
        const tBL = v(x1 + c, y1, z2);       // back edge, left part
        const tLB = v(x1,     y1, z2 - c);   // left edge, back part
        const tLF = v(x1,     y1, z1 + c);   // left edge, front part

        // Bottom corners (y = y0)
        const bFL = v(x1, y0, z1); // front-left
        const bFR = v(x2, y0, z1); // front-right
        const bBR = v(x2, y0, z2); // back-right
        const bBL = v(x1, y0, z2); // back-left

        // Side top edge (below the chamfer on each side face)
        const sFL_top = v(x1, y1 - c, z1); // on front-left vertical edge
        const sFR_top = v(x2, y1 - c, z1); // on front-right vertical edge
        const sBR_top = v(x2, y1 - c, z2); // on back-right vertical edge
        const sBL_top = v(x1, y1 - c, z2); // on back-left vertical edge

        // --- Triangles (normal outward convention via right-hand rule) ---
        const tris = [];

        // ── Bottom face (normal: -Y)
        quad(tris, bFL, bFR, bBR, bBL, false);

        // ── Front face body (z = z1, normal: -Z)
        // From bottom to the chamfer transition line
        quad(tris, bFR, bFL, sFL_top, sFR_top, false);

        // ── Front chamfer strip (angled, 45°, normal: towards -Z-Y)
        quad(tris, sFR_top, sFL_top, tFL, tFR, false);

        // ── Right face body (x = x2, normal: +X)
        quad(tris, bFR, bBR, sBR_top, sFR_top, false);

        // ── Right chamfer strip
        quad(tris, sFR_top, sBR_top, tRB, tRF, false);

        // ── Back face body (z = z2, normal: +Z)
        quad(tris, bBR, bBL, sBL_top, sBR_top, false);

        // ── Back chamfer strip
        quad(tris, sBR_top, sBL_top, tBL, tBR, false);

        // ── Left face body (x = x1, normal: -X)
        quad(tris, bBL, bFL, sFL_top, sBL_top, false);

        // ── Left chamfer strip
        quad(tris, sBL_top, sFL_top, tLF, tLB, false);

        // ── 4 corner vertical triangle strips (fill gap between two chamfer strips meeting at corner)
        // Front-Left corner
        tri(tris, sFL_top, tLF, tFL);
        // Front-Right corner
        tri(tris, sFR_top, tFR, tRF);
        // Back-Right corner
        tri(tris, sBR_top, tRB, tBR);
        // Back-Left corner
        tri(tris, sBL_top, tBL, tLB);

        // ── Top octagon face (normal: +Y)
        // Fan from center
        const topCenter = v((x1 + x2) / 2, y1, (z1 + z2) / 2);
        const topRing = [tFL, tFR, tRF, tRB, tBR, tBL, tLB, tLF];
        for (let i = 0; i < topRing.length; i++) {
            tri(tris, topCenter, topRing[i], topRing[(i + 1) % topRing.length]);
        }

        return buildGeometry(tris);
    }

    /**
     * Build a BufferGeometry for a box with filleted top-horizontal edges.
     * Uses arc approximation with `segments` steps per quarter-circle.
     */
    _buildFilletedBox(W, H, D, r, segments) {
        const x1 = -W / 2, x2 = W / 2;
        const y0 = 0,       y1 = H;
        const z1 = -D / 2,  z2 = D / 2;

        // Arc center (y) is at y1 - r; arc sweeps from horizontal (on side face) to vertical (on top face)
        const cy = y1 - r;

        // Generate arc points for one edge of the fillet
        // angle goes from 0 (pointing outward in Z/X) to PI/2 (pointing up in Y)
        const arcPoints = [];
        for (let i = 0; i <= segments; i++) {
            const t = (Math.PI / 2) * (i / segments);
            arcPoints.push({ sin: Math.sin(t), cos: Math.cos(t) });
        }

        // Bottom corners
        const bFL = v(x1, y0, z1);
        const bFR = v(x2, y0, z1);
        const bBR = v(x2, y0, z2);
        const bBL = v(x1, y0, z2);

        const tris = [];

        // ── Bottom face
        quad(tris, bFL, bFR, bBR, bBL, false);

        // ── 4 side faces (flat body portions below arc)
        // Front (z = z1): from y0 to cy, x1 to x2
        quad(tris, bFR, bFL, v(x1, cy, z1), v(x2, cy, z1), false);
        // Right (x = x2): from y0 to cy, z1 to z2
        quad(tris, bFR, bBR, v(x2, cy, z2), v(x2, cy, z1), false);
        // Back (z = z2): from y0 to cy, x2 to x1
        quad(tris, bBR, bBL, v(x1, cy, z2), v(x2, cy, z2), false);
        // Left (x = x1): from y0 to cy, z2 to z1
        quad(tris, bBL, bFL, v(x1, cy, z1), v(x1, cy, z2), false);

        // ── 4 arc strips (one per top horizontal edge)
        for (let i = 0; i < segments; i++) {
            const a0 = arcPoints[i];
            const a1 = arcPoints[i + 1];

            // Front arc: center of arc = (x, cy, z1 + r) for x in [x1+r, x2-r]
            //   but for a full-edge fillet (not corner), the arc axis is horizontal along X
            //   arc point at angle t: z = z1 + r - r*cos(t) = z1 + r*(1-cos), y = cy + r*sin
            const fz0 = z1 + r * (1 - a0.cos), fy0 = cy + r * a0.sin;
            const fz1 = z1 + r * (1 - a1.cos), fy1 = cy + r * a1.sin;

            // Front arc strip (x1+r to x2-r): one quad per segment
            quad(tris,
                v(x2 - r, fy0, fz0), v(x1 + r, fy0, fz0),
                v(x1 + r, fy1, fz1), v(x2 - r, fy1, fz1), false);

            // Back arc
            const bz0 = z2 - r * (1 - a0.cos), by0 = cy + r * a0.sin;
            const bz1 = z2 - r * (1 - a1.cos), by1 = cy + r * a1.sin;
            quad(tris,
                v(x1 + r, by0, bz0), v(x2 - r, by0, bz0),
                v(x2 - r, by1, bz1), v(x1 + r, by1, bz1), false);

            // Right arc
            const rx0 = x2 - r * (1 - a0.cos), ry0 = cy + r * a0.sin;
            const rx1 = x2 - r * (1 - a1.cos), ry1 = cy + r * a1.sin;
            quad(tris,
                v(rx0, ry0, z2 - r), v(rx0, ry0, z1 + r),
                v(rx1, ry1, z1 + r), v(rx1, ry1, z2 - r), false);

            // Left arc
            const lx0 = x1 + r * (1 - a0.cos), ly0 = cy + r * a0.sin;
            const lx1 = x1 + r * (1 - a1.cos), ly1 = cy + r * a1.sin;
            quad(tris,
                v(lx0, ly0, z1 + r), v(lx0, ly0, z2 - r),
                v(lx1, ly1, z2 - r), v(lx1, ly1, z1 + r), false);
        }

        // ── Top flat face (inset by r on all sides)
        const topY = y1;
        quad(tris,
            v(x1 + r, topY, z1 + r), v(x2 - r, topY, z1 + r),
            v(x2 - r, topY, z2 - r), v(x1 + r, topY, z2 - r), false);

        // ── 4 corner fillets (spherical-ish triangle fans) — simplified as flat fans
        // Front-Left corner: arc sweeps both Z and X
        this._buildCornerFillet(tris, x1, cy, z1, r, segments, 'fl');
        this._buildCornerFillet(tris, x2, cy, z1, r, segments, 'fr');
        this._buildCornerFillet(tris, x2, cy, z2, r, segments, 'br');
        this._buildCornerFillet(tris, x1, cy, z2, r, segments, 'bl');

        return buildGeometry(tris);
    }

    /**
     * Build a simplified spherical cap at one corner.
     * Uses a latitude/longitude grid of (segments × segments) triangles.
     */
    _buildCornerFillet(tris, cx, cy, cz, r, segments, corner) {
        // Determine direction signs for this corner
        const sx = corner === 'fl' || corner === 'bl' ? -1 : 1; // -1 = left, +1 = right
        const sz = corner === 'fl' || corner === 'fr' ? -1 : 1; // -1 = front, +1 = back

        // Grid of points on the spherical surface spanning 90° in both X and Z directions
        const grid = [];
        for (let i = 0; i <= segments; i++) {
            const phi = (Math.PI / 2) * (i / segments); // 0 → PI/2 (from side to top)
            const row = [];
            for (let j = 0; j <= segments; j++) {
                const theta = (Math.PI / 2) * (j / segments); // 0 → PI/2 (sweep along edge)
                const x = cx + sx * r * Math.cos(phi) * Math.cos(theta);
                const y = cy + r * Math.sin(phi);
                const z = cz + sz * r * Math.cos(phi) * Math.sin(theta);
                row.push(v(x, y, z));
            }
            grid.push(row);
        }

        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < segments; j++) {
                const a = grid[i][j];
                const b = grid[i][j + 1];
                const c2 = grid[i + 1][j + 1];
                const d = grid[i + 1][j];
                quad(tris, a, b, c2, d, false);
            }
        }
    }
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

/** Create a Vector3 shorthand */
function v(x, y, z) { return new THREE.Vector3(x, y, z); }

/**
 * Push 2 triangles for a quad (v0,v1,v2,v3 in CCW order when flip=false).
 * flip=true reverses winding.
 */
function quad(tris, v0, v1, v2, v3, flip = false) {
    if (flip) {
        tri(tris, v0, v2, v1);
        tri(tris, v0, v3, v2);
    } else {
        tri(tris, v0, v1, v2);
        tri(tris, v0, v2, v3);
    }
}

function tri(tris, a, b, c) {
    tris.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
}

/** Build a BufferGeometry with auto-computed normals from a flat position array. */
function buildGeometry(posArray) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));
    geo.computeVertexNormals();
    return geo;
}
