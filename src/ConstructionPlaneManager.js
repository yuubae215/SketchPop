import * as THREE from 'three';
import { ToastManager } from './ToastManager.js';

/**
 * ConstructionPlaneManager — set the active sketch plane to any face of an
 * existing object, so that subsequent rectangle sketches land on that face.
 *
 * Usage:
 *   const cpm = new ConstructionPlaneManager(sceneManager, stateManager);
 *   // Press Space while hovering a face → cpm.setFromFace(hoveredFace)
 *   // Press Esc                          → cpm.reset()
 *
 * The manager mutates SceneManager.interactionHandler.intersectionPlane,
 * which is the THREE.Plane used by getMouseIntersection() to project the
 * cursor ray onto the sketch surface.
 */
export class ConstructionPlaneManager {
    constructor(sceneManager, stateManager) {
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;

        this.isActive = false;
        this._planeMesh = null;   // semi-transparent visual
        this._gridMesh = null;    // grid lines visual
        this._activeFaceNormal = null;
        this._activePlanePoint = null;

        // Ground plane reference (Y = 0)
        this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Activate a construction plane coincident with the given face.
     * @param {object} hoveredFace  — { face, object, sketch, intersectionPoint }
     */
    setFromFace(hoveredFace) {
        if (!hoveredFace) return;

        const { face, object, intersectionPoint } = hoveredFace;

        // Face normal in world space
        const normal = face.normal.clone()
            .applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(object.matrixWorld))
            .normalize();

        // Clamp near-axis normals to exact axis (avoids floating-point skew)
        this._snapNormal(normal);

        const point = intersectionPoint.clone();

        // Build the construction plane
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point);

        // Push the updated plane into SceneManager's ray-caster
        this._applyToSceneManager(plane);

        // Track state
        this._activeFaceNormal = normal.clone();
        this._activePlanePoint = point.clone();
        this.isActive = true;

        // Visual overlay
        this._showVisual(point, normal);
    }

    /** Reset to the world ground plane (Y = 0). */
    reset() {
        if (!this.isActive) return;

        this._applyToSceneManager(this._groundPlane.clone());
        this._removeVisual();

        this._activeFaceNormal = null;
        this._activePlanePoint = null;
        this.isActive = false;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    _applyToSceneManager(plane) {
        // SceneManager lazily creates interactionHandler on first getMouseIntersection()
        // If it exists, update it; otherwise store for later (not needed — first sketch
        // click will trigger creation; we intercept via the plane reference on scene).
        if (this.sceneManager.interactionHandler) {
            this.sceneManager.interactionHandler.intersectionPlane.copy(plane);
        }
        // Also store on sceneManager for cases where interactionHandler was not yet created
        this.sceneManager._pendingConstructionPlane = plane;
    }

    /** Snap normal to nearest axis if within 5°. */
    _snapNormal(normal) {
        const axes = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1),
        ];
        const threshold = Math.cos(THREE.MathUtils.degToRad(5));
        for (const axis of axes) {
            if (normal.dot(axis) >= threshold) {
                normal.copy(axis);
                return;
            }
        }
    }

    _showVisual(center, normal) {
        this._removeVisual();

        const SIZE = 20;

        // Semi-transparent plane
        const planeGeo = new THREE.PlaneGeometry(SIZE, SIZE);
        const planeMat = new THREE.MeshBasicMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        this._planeMesh = new THREE.Mesh(planeGeo, planeMat);
        this._orientMesh(this._planeMesh, center, normal);
        this._planeMesh.userData.isConstructionPlane = true;
        this.sceneManager.addToScene(this._planeMesh);

        // Grid lines on the plane
        const gridGeo = new THREE.BufferGeometry();
        const positions = [];
        const step = 1;
        const half = SIZE / 2;
        for (let i = -half; i <= half; i += step) {
            positions.push(i, 0, -half,  i, 0, half);
            positions.push(-half, 0, i,  half, 0, i);
        }
        gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const gridMat = new THREE.LineBasicMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.25,
        });
        this._gridMesh = new THREE.LineSegments(gridGeo, gridMat);
        this._orientMesh(this._gridMesh, center, normal);
        this._gridMesh.userData.isConstructionPlane = true;
        this.sceneManager.addToScene(this._gridMesh);
    }

    _orientMesh(mesh, center, normal) {
        // PlaneGeometry / grid face +Y by default; rotate to match normal
        const defaultNormal = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultNormal, normal);
        mesh.setRotationFromQuaternion(quaternion);
        mesh.position.copy(center);
        // Nudge 1 mm above the face to avoid z-fighting
        mesh.position.addScaledVector(normal, 0.001);
    }

    _removeVisual() {
        if (this._planeMesh) {
            this.sceneManager.removeFromScene(this._planeMesh);
            this._planeMesh.geometry.dispose();
            this._planeMesh.material.dispose();
            this._planeMesh = null;
        }
        if (this._gridMesh) {
            this.sceneManager.removeFromScene(this._gridMesh);
            this._gridMesh.geometry.dispose();
            this._gridMesh.material.dispose();
            this._gridMesh = null;
        }
    }
}
