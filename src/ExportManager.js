import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

/**
 * ExportManager — exports the scene to various 3D and image formats.
 *
 * Supported: STL, OBJ, GLTF, GLB, PNG
 */
export class ExportManager {
    constructor(sceneManager, stateManager) {
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;
    }

    /** Build a temporary Group containing clones of all extruded meshes. */
    _buildExportGroup() {
        const group = new THREE.Group();
        for (const sketch of this.stateManager.sketches) {
            if (sketch.isExtruded && sketch.extrudedMesh) {
                group.add(sketch.extrudedMesh.clone());
            }
        }
        return group;
    }

    exportSTL() {
        const group = this._buildExportGroup();
        if (group.children.length === 0) return false;
        const exporter = new STLExporter();
        const str = exporter.parse(group, { binary: false });
        this._download('sketchpop.stl', str, 'model/stl');
        return true;
    }

    exportOBJ() {
        const group = this._buildExportGroup();
        if (group.children.length === 0) return false;
        const exporter = new OBJExporter();
        const str = exporter.parse(group);
        this._download('sketchpop.obj', str, 'text/plain');
        return true;
    }

    exportGLTF(binary = false) {
        const group = this._buildExportGroup();
        if (group.children.length === 0) return false;
        const exporter = new GLTFExporter();
        const ext = binary ? 'glb' : 'gltf';
        exporter.parse(
            group,
            (result) => {
                if (binary) {
                    this._downloadBlob(`sketchpop.${ext}`, new Blob([result], { type: 'application/octet-stream' }));
                } else {
                    this._download(`sketchpop.${ext}`, JSON.stringify(result, null, 2), 'application/json');
                }
            },
            (err) => console.error('GLTF export error:', err),
            { binary }
        );
        return true;
    }

    exportPNG() {
        // Ensure latest frame is rendered before capture
        this.sceneManager.render();
        this.sceneManager.renderer.domElement.toBlob((blob) => {
            if (blob) this._downloadBlob('sketchpop.png', blob);
        }, 'image/png');
        return true;
    }

    _download(filename, content, mimeType) {
        this._downloadBlob(filename, new Blob([content], { type: mimeType }));
    }

    _downloadBlob(filename, blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}
