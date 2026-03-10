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
                'sketch':    'スケッチ',
                'extrude':   '押し出し',
                'select':    '選択',
                'transform': '変形'
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
            'sketch':    isMobile ? 'タップしてスケッチ開始' : 'クリックしてスケッチ開始',
            'extrude':   isMobile ? 'ドラッグで高さ設定、タップで確定' : 'マウスで高さ設定、クリックで確定',
            'select':    this.state.selectedObject
                ? (isMobile ? 'タップで選択解除' : 'G: 移動  R: 回転  Delete: 削除')
                : (isMobile ? 'オブジェクトをタップ' : 'オブジェクトをクリック'),
            'transform': '変形中'
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
