import * as THREE from 'three';

export function calculateSelectionBounds(sketch) {
    if (!sketch || !sketch.getBounds) {
        return null;
    }
    
    const bounds = sketch.getBounds();
    return {
        minX: bounds.minX,
        maxX: bounds.maxX,
        minZ: bounds.minZ,
        maxZ: bounds.maxZ,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxZ - bounds.minZ
    };
}

export function calculateObjectCenter(bounds, isExtruded = false, extrudeHeight = 0) {
    if (!bounds) {
        return new THREE.Vector3();
    }
    
    return new THREE.Vector3(
        (bounds.minX + bounds.maxX) / 2,
        isExtruded ? extrudeHeight / 2 : 0,
        (bounds.minZ + bounds.maxZ) / 2
    );
}

export function calculateOriginPosition(sketch) {
    if (!sketch) {
        return new THREE.Vector3();
    }
    
    const bounds = calculateSelectionBounds(sketch);
    if (!bounds) {
        return new THREE.Vector3();
    }
    
    return calculateObjectCenter(bounds, sketch.isExtruded, sketch.extrudeHeight);
}

export function calculateDimensionLinePositions(bounds, is3D = false) {
    if (!bounds) {
        return [];
    }
    
    const positions = [];
    
    if (!is3D) {
        // 2D dimensions
        const offset = 0.7;
        const y = 0.02;
        
        // Width dimension (horizontal)
        positions.push({
            type: 'width',
            startPoint: new THREE.Vector3(bounds.minX, y, bounds.minZ - offset),
            endPoint: new THREE.Vector3(bounds.maxX, y, bounds.minZ - offset),
            value: bounds.width,
            color: 0x00ff00
        });
        
        // Height dimension (vertical in Z direction)
        positions.push({
            type: 'height',
            startPoint: new THREE.Vector3(bounds.maxX + offset, y, bounds.minZ),
            endPoint: new THREE.Vector3(bounds.maxX + offset, y, bounds.maxZ),
            value: bounds.height,
            color: 0x00ff00
        });
    } else {
        // 3D dimensions
        const offset = 0.8;
        
        // Width dimension (X-axis)
        positions.push({
            type: 'width',
            startPoint: new THREE.Vector3(bounds.minX, -0.3, bounds.minZ - offset),
            endPoint: new THREE.Vector3(bounds.maxX, -0.3, bounds.minZ - offset),
            value: bounds.width,
            color: 0x00ff00
        });
        
        // Depth dimension (Z-axis)
        positions.push({
            type: 'depth',
            startPoint: new THREE.Vector3(bounds.maxX + offset, -0.3, bounds.minZ),
            endPoint: new THREE.Vector3(bounds.maxX + offset, -0.3, bounds.maxZ),
            value: bounds.height,
            color: 0x00ff00
        });
    }
    
    return positions;
}

export function calculateExtrudedDimensionPosition(bounds, extrudeHeight) {
    if (!bounds || !extrudeHeight) {
        return null;
    }
    
    const offset = 0.8;
    
    return {
        type: 'height',
        startPoint: new THREE.Vector3(bounds.maxX + offset, 0, bounds.maxZ + offset),
        endPoint: new THREE.Vector3(bounds.maxX + offset, extrudeHeight, bounds.maxZ + offset),
        value: extrudeHeight,
        color: 0x00ff00
    };
}

export function calculateTickMarkPositions(startPoint, endPoint, tickLength = 0.1) {
    if (!startPoint || !endPoint) {
        return { startTicks: [], endTicks: [] };
    }
    
    const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
    const perpendicular = new THREE.Vector3();
    
    if (Math.abs(direction.y) > 0.9) {
        perpendicular.set(1, 0, 0);
    } else if (Math.abs(direction.x) > 0.9) {
        perpendicular.set(0, 0, 1);
    } else {
        perpendicular.set(0, 1, 0);
    }
    
    const startTicks = [
        startPoint.clone().add(perpendicular.clone().multiplyScalar(tickLength)),
        startPoint.clone().add(perpendicular.clone().multiplyScalar(-tickLength))
    ];
    
    const endTicks = [
        endPoint.clone().add(perpendicular.clone().multiplyScalar(tickLength)),
        endPoint.clone().add(perpendicular.clone().multiplyScalar(-tickLength))
    ];
    
    return { startTicks, endTicks };
}

export function calculateDimensionTextPosition(startPoint, endPoint, yOffset = 0.15) {
    if (!startPoint || !endPoint) {
        return new THREE.Vector3();
    }
    
    const textPosition = startPoint.clone().add(endPoint).multiplyScalar(0.5);
    textPosition.y += yOffset;
    
    return textPosition;
}

export function calculateOriginAxesPositions(originPosition, axisLength = 0.5) {
    if (!originPosition) {
        return [];
    }
    
    const axes = [
        {
            name: 'x',
            color: 0xff0000,
            startPoint: originPosition.clone(),
            endPoint: new THREE.Vector3(originPosition.x + axisLength, originPosition.y, originPosition.z),
            direction: new THREE.Vector3(1, 0, 0)
        },
        {
            name: 'y',
            color: 0x00ff00,
            startPoint: originPosition.clone(),
            endPoint: new THREE.Vector3(originPosition.x, originPosition.y + axisLength, originPosition.z),
            direction: new THREE.Vector3(0, 1, 0)
        },
        {
            name: 'z',
            color: 0x0000ff,
            startPoint: originPosition.clone(),
            endPoint: new THREE.Vector3(originPosition.x, originPosition.y, originPosition.z + axisLength),
            direction: new THREE.Vector3(0, 0, 1)
        }
    ];
    
    return axes;
}

export function calculateArrowPosition(origin, direction, length) {
    if (!origin || !direction || !length) {
        return null;
    }
    
    const tipPosition = origin.clone().add(direction.clone().multiplyScalar(length));
    
    let rotation = { x: 0, y: 0, z: 0 };
    
    if (direction.x > 0.9) {
        // X-axis (pointing right)
        rotation.z = -Math.PI / 2;
    } else if (direction.y > 0.9) {
        // Y-axis (pointing up) - default orientation
        // No rotation needed
    } else if (direction.z > 0.9) {
        // Z-axis (pointing forward)
        rotation.x = Math.PI / 2;
    }
    
    return {
        position: tipPosition,
        rotation: rotation
    };
}

export function calculateOriginTextPosition(originPosition, yOffset = 0.5) {
    if (!originPosition) {
        return new THREE.Vector3();
    }
    
    const textPosition = originPosition.clone();
    textPosition.y += yOffset;
    
    return textPosition;
}

export function formatOriginCoordinates(position) {
    if (!position) {
        return "(0.00, 0.00, 0.00)";
    }
    
    return `(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`;
}

export function formatDimensionValue(value) {
    if (typeof value !== 'number') {
        return "0.00";
    }
    
    return value.toFixed(2);
}

export function validateSelectionBounds(bounds) {
    if (!bounds) {
        return false;
    }
    
    return (
        typeof bounds.minX === 'number' &&
        typeof bounds.maxX === 'number' &&
        typeof bounds.minZ === 'number' &&
        typeof bounds.maxZ === 'number' &&
        bounds.maxX > bounds.minX &&
        bounds.maxZ > bounds.minZ
    );
}

export function validateSketchObject(sketch) {
    if (!sketch) {
        return false;
    }
    
    return (
        typeof sketch.getBounds === 'function' &&
        typeof sketch.isExtruded === 'boolean'
    );
}

export function calculateHoverHighlightScale(originalScale, scaleMultiplier = 1.005) {
    if (!originalScale) {
        return new THREE.Vector3(1, 1, 1);
    }
    
    return new THREE.Vector3(
        originalScale.x * scaleMultiplier,
        originalScale.y * scaleMultiplier,
        originalScale.z * scaleMultiplier
    );
}

export function shouldShowHighlight(selectionMode, meshObject) {
    if (selectionMode !== 'object') {
        return false;
    }
    
    if (!meshObject || !meshObject.userData || !meshObject.userData.sketchRectangle) {
        return false;
    }
    
    return true;
}

export function extractSketchFromMesh(meshObject) {
    if (!meshObject) {
        return null;
    }
    
    if (meshObject.userData && meshObject.userData.sketchRectangle) {
        return meshObject.userData.sketchRectangle;
    }
    
    if (meshObject.getBounds) {
        return meshObject;
    }
    
    return null;
}