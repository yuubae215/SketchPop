/**
 * GridSnapManager — snaps sketch points and extrusion heights to a grid.
 *
 * Usage:
 *   gridSnap.snapPoint(vec3)   — mutates and returns the vector (x/z only)
 *   gridSnap.snapValue(n)      — returns a snapped number (for height)
 *   gridSnap.toggle()          — enable / disable; returns new state
 */
export class GridSnapManager {
    constructor(gridSize = 1.0) {
        this.enabled = false;
        this.gridSize = gridSize;
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    snapValue(value) {
        if (!this.enabled) return value;
        return Math.round(value / this.gridSize) * this.gridSize;
    }

    /** Snap x and z of a THREE.Vector3 in-place. */
    snapPoint(point) {
        if (!this.enabled) return point;
        point.x = this.snapValue(point.x);
        point.z = this.snapValue(point.z);
        return point;
    }
}
