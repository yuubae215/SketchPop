/**
 * StatusBarManager
 * Manages status bar information display and updates
 */
export class StatusBarManager {
    constructor() {
        this.elements = {
            cursorCoords: document.getElementById('cursor-coords'),
            currentMode: document.getElementById('current-mode'),
            cameraType: document.getElementById('camera-type'),
            objectStats: document.getElementById('object-stats'),
            selectionInfo: document.getElementById('selection-info'),
            operationHint: document.getElementById('operation-hint')
        };

        this.state = {
            cursorPosition: { x: 0, y: 0, z: 0 },
            mode: 'sketch',
            cameraType: 'perspective',
            objectCount: 0,
            selectedObject: null
        };
    }

    updateCursorPosition(x, y, z) {
        this.state.cursorPosition = { x, y, z };
        if (this.elements.cursorCoords) {
            this.elements.cursorCoords.textContent =
                `X: ${x.toFixed(1)}, Y: ${y.toFixed(1)}, Z: ${z.toFixed(1)}`;
        }
    }

    updateMode(mode) {
        this.state.mode = mode;
        if (this.elements.currentMode) {
            const modeNames = {
                'sketch': 'Sketch',
                'extrude': 'Extrude',
                'select': 'Select',
                'transform': 'Transform'
            };
            this.elements.currentMode.textContent = modeNames[mode] || mode;
        }
        this.updateOperationHint();
    }

    updateCameraType(type) {
        this.state.cameraType = type;
        if (this.elements.cameraType) {
            const cameraNames = {
                'perspective': 'Perspective',
                'orthographic': 'Orthographic'
            };
            this.elements.cameraType.textContent = cameraNames[type] || type;
        }
    }

    updateObjectCount(count) {
        this.state.objectCount = count;
        if (this.elements.objectStats) {
            this.elements.objectStats.textContent = `${count}`;
        }
    }

    updateSelection(objectName = null) {
        this.state.selectedObject = objectName;
        if (this.elements.selectionInfo) {
            this.elements.selectionInfo.textContent = objectName || 'None';
        }
        this.updateOperationHint();
    }

    updateOperationHint() {
        if (!this.elements.operationHint) return;

        const hints = {
            'sketch': 'Click to start sketch',
            'extrude': 'Move mouse to set height  |  Click to confirm  |  Esc to cancel',
            'select': this.state.selectedObject
                ? 'G: Move  R: Rotate  Shift+S: Scale  Delete: Remove'
                : 'Click an object to select',
            'transform': 'Drag to transform'
        };

        this.elements.operationHint.textContent = hints[this.state.mode] || '';
    }

    setHint(message) {
        if (this.elements.operationHint) {
            this.elements.operationHint.textContent = message;
        }
    }

    reset() {
        this.updateCursorPosition(0, 0, 0);
        this.updateMode('sketch');
        this.updateCameraType('perspective');
        this.updateObjectCount(0);
        this.updateSelection(null);
    }
}
