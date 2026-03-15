/**
 * StatusBarManager (simplified)
 * Manages minimal status bar: mode label + operation hint.
 */
export class StatusBarManager {
    constructor() {
        this.elements = {
            currentMode: document.getElementById('current-mode'),
            operationHint: document.getElementById('operation-hint')
        };

        this.state = {
            mode: 'sketch',
            cameraType: 'perspective',
            objectCount: 0,
            selectedObject: null
        };
    }

    updateCursorPosition(_x, _y, _z) {
        // No cursor display in simplified UI
    }

    updateMode(mode) {
        this.state.mode = mode;
        if (this.elements.currentMode) {
            const modeNames = {
                'sketch':    'Sketch',
                'extrude':   'Extrude',
                'select':    'Select',
                'transform': 'Transform'
            };
            this.elements.currentMode.textContent = modeNames[mode] || mode;
        }
        this.updateOperationHint();
    }

    updateCameraType(type) {
        this.state.cameraType = type;
        // No camera type display in simplified UI
    }

    updateObjectCount(count) {
        this.state.objectCount = count;
        // No object count display in simplified UI
    }

    updateSelection(objectName = null) {
        this.state.selectedObject = objectName;
        this.updateOperationHint();
    }

    updateOperationHint() {
        if (!this.elements.operationHint) return;

        const isMobile = 'ontouchstart' in window;

        const hints = {
            'sketch':    isMobile ? 'Tap to start sketch' : 'Click to start sketch',
            'extrude':   isMobile ? 'Drag to set height, tap to confirm' : 'Move mouse to set height, click to confirm',
            'select':    this.state.selectedObject
                ? (isMobile ? 'Tap to deselect' : 'G: Move  R: Rotate  Delete: Delete')
                : (isMobile ? 'Tap an object' : 'Click an object'),
            'transform': 'Transforming'
        };

        this.elements.operationHint.textContent = hints[this.state.mode] || '';
    }

    setHint(message) {
        if (this.elements.operationHint) {
            this.elements.operationHint.textContent = message;
        }
    }

    reset() {
        this.updateMode('sketch');
        this.updateCameraType('perspective');
        this.updateObjectCount(0);
        this.updateSelection(null);
    }
}
