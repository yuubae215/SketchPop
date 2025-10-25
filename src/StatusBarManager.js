/**
 * StatusBarManager
 * ステータスバーの情報表示と更新を管理
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

    /**
     * カーソル座標を更新
     */
    updateCursorPosition(x, y, z) {
        this.state.cursorPosition = { x, y, z };
        if (this.elements.cursorCoords) {
            this.elements.cursorCoords.textContent =
                `X: ${x.toFixed(1)}, Y: ${y.toFixed(1)}, Z: ${z.toFixed(1)}`;
        }
    }

    /**
     * 現在のモードを更新
     */
    updateMode(mode) {
        this.state.mode = mode;
        if (this.elements.currentMode) {
            const modeNames = {
                'sketch': 'スケッチ',
                'extrude': '押し出し',
                'select': '選択',
                'transform': '変形'
            };
            this.elements.currentMode.textContent = modeNames[mode] || mode;
        }
        this.updateOperationHint();
    }

    /**
     * カメラタイプを更新
     */
    updateCameraType(type) {
        this.state.cameraType = type;
        if (this.elements.cameraType) {
            const cameraNames = {
                'perspective': '透視投影',
                'orthographic': '平行投影'
            };
            this.elements.cameraType.textContent = cameraNames[type] || type;
        }
    }

    /**
     * オブジェクト数を更新
     */
    updateObjectCount(count) {
        this.state.objectCount = count;
        if (this.elements.objectStats) {
            this.elements.objectStats.textContent = `${count} 個`;
        }
    }

    /**
     * 選択情報を更新
     */
    updateSelection(objectName = null) {
        this.state.selectedObject = objectName;
        if (this.elements.selectionInfo) {
            this.elements.selectionInfo.textContent = objectName || 'なし';
        }
        this.updateOperationHint();
    }

    /**
     * 操作ヒントを更新
     */
    updateOperationHint() {
        if (!this.elements.operationHint) return;

        const hints = {
            'sketch': this.state.selectedObject
                ? 'クリックで押し出し開始'
                : 'クリックしてスケッチを開始',
            'extrude': 'マウス移動で高さ調整、クリックで仮確定',
            'select': this.state.selectedObject
                ? 'G:移動 R:回転 S:スケール Delete:削除'
                : 'オブジェクトをクリックして選択',
            'transform': 'ドラッグで変形、Enterで確定'
        };

        this.elements.operationHint.textContent = hints[this.state.mode] || '';
    }

    /**
     * カスタムヒントを設定
     */
    setHint(message) {
        if (this.elements.operationHint) {
            this.elements.operationHint.textContent = message;
        }
    }

    /**
     * すべての情報をリセット
     */
    reset() {
        this.updateCursorPosition(0, 0, 0);
        this.updateMode('sketch');
        this.updateCameraType('perspective');
        this.updateObjectCount(0);
        this.updateSelection(null);
    }
}
