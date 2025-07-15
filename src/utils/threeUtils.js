import * as THREE from 'three';

export function calculateBoundingBox(geometry) {
    if (!geometry || !geometry.attributes || !geometry.attributes.position) {
        return null;
    }
    
    const box = new THREE.Box3();
    box.setFromAttribute(geometry.attributes.position);
    return box;
}

export function calculateMeshBounds(mesh) {
    if (!mesh || !mesh.geometry) {
        return null;
    }
    
    const box = new THREE.Box3();
    box.setFromObject(mesh);
    return box;
}

export function calculateDistance3D(point1, point2) {
    if (!point1 || !point2) {
        return 0;
    }
    
    return Math.sqrt(
        Math.pow(point2.x - point1.x, 2) +
        Math.pow(point2.y - point1.y, 2) +
        Math.pow(point2.z - point1.z, 2)
    );
}

export function calculateMidpoint3D(point1, point2) {
    if (!point1 || !point2) {
        return new THREE.Vector3();
    }
    
    return new THREE.Vector3(
        (point1.x + point2.x) / 2,
        (point1.y + point2.y) / 2,
        (point1.z + point2.z) / 2
    );
}

export function calculateNormal(p1, p2, p3) {
    if (!p1 || !p2 || !p3) {
        return new THREE.Vector3(0, 1, 0);
    }
    
    const v1 = new THREE.Vector3().subVectors(p2, p1);
    const v2 = new THREE.Vector3().subVectors(p3, p1);
    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
    
    return normal;
}

export function calculateFaceCenter(vertices) {
    if (!vertices || vertices.length === 0) {
        return new THREE.Vector3();
    }
    
    const center = new THREE.Vector3();
    vertices.forEach(vertex => {
        center.add(vertex);
    });
    center.divideScalar(vertices.length);
    
    return center;
}

export function calculateObjectDimensions(object) {
    if (!object) {
        return { width: 0, height: 0, depth: 0 };
    }
    
    const box = new THREE.Box3();
    box.setFromObject(object);
    
    const size = new THREE.Vector3();
    box.getSize(size);
    
    return {
        width: size.x,
        height: size.y,
        depth: size.z
    };
}

export function calculateScreenPosition(object, camera) {
    if (!object || !camera) {
        return new THREE.Vector2();
    }
    
    const vector = new THREE.Vector3();
    object.getWorldPosition(vector);
    vector.project(camera);
    
    return new THREE.Vector2(
        (vector.x + 1) / 2,
        (-vector.y + 1) / 2
    );
}

export function calculateWorldPosition(screenX, screenY, camera) {
    if (!camera) {
        return new THREE.Vector3();
    }
    
    const mouse = new THREE.Vector2(screenX, screenY);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectionPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectionPoint);
    
    return intersectionPoint;
}

export function calculateRotationMatrix(axis, angle) {
    if (!axis || typeof angle !== 'number') {
        return new THREE.Matrix4();
    }
    
    const matrix = new THREE.Matrix4();
    matrix.makeRotationAxis(axis.normalize(), angle);
    
    return matrix;
}

export function calculateTransformMatrix(position, rotation, scale) {
    const matrix = new THREE.Matrix4();
    
    const pos = position || new THREE.Vector3();
    const rot = rotation || new THREE.Euler();
    const scl = scale || new THREE.Vector3(1, 1, 1);
    
    matrix.compose(pos, new THREE.Quaternion().setFromEuler(rot), scl);
    
    return matrix;
}

export function calculateExtrusionVertices(points, height) {
    if (!points || points.length < 3 || !height) {
        return [];
    }
    
    const vertices = [];
    
    points.forEach(point => {
        vertices.push(new THREE.Vector3(point.x, 0, point.z));
        vertices.push(new THREE.Vector3(point.x, height, point.z));
    });
    
    return vertices;
}

export function calculateRectanglePoints(startPoint, endPoint) {
    if (!startPoint || !endPoint) {
        return [];
    }
    
    const points = [
        new THREE.Vector3(startPoint.x, 0, startPoint.z),
        new THREE.Vector3(endPoint.x, 0, startPoint.z),
        new THREE.Vector3(endPoint.x, 0, endPoint.z),
        new THREE.Vector3(startPoint.x, 0, endPoint.z),
        new THREE.Vector3(startPoint.x, 0, startPoint.z)
    ];
    
    return points;
}

export function calculatePlaneIntersection(ray, plane) {
    if (!ray || !plane) {
        return null;
    }
    
    const intersectionPoint = new THREE.Vector3();
    const result = ray.intersectPlane(plane, intersectionPoint);
    
    return result;
}

export function calculateFaceVertices(mesh, faceIndex) {
    if (!mesh || !mesh.geometry || faceIndex < 0) {
        return [];
    }
    
    const geometry = mesh.geometry;
    const position = geometry.attributes.position;
    const index = geometry.index;
    
    if (!position || !index) {
        return [];
    }
    
    const faceStart = faceIndex * 3;
    const vertices = [];
    
    for (let i = 0; i < 3; i++) {
        const vertexIndex = index.array[faceStart + i];
        const vertex = new THREE.Vector3(
            position.array[vertexIndex * 3],
            position.array[vertexIndex * 3 + 1],
            position.array[vertexIndex * 3 + 2]
        );
        vertices.push(vertex);
    }
    
    return vertices;
}

export function calculateUVCoordinates(width, height) {
    if (width <= 0 || height <= 0) {
        return [];
    }
    
    const uvs = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(1, 1),
        new THREE.Vector2(0, 1)
    ];
    
    return uvs;
}

export function calculateColorHex(r, g, b) {
    if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
        return 0xffffff;
    }
    
    const red = Math.max(0, Math.min(255, Math.floor(r * 255)));
    const green = Math.max(0, Math.min(255, Math.floor(g * 255)));
    const blue = Math.max(0, Math.min(255, Math.floor(b * 255)));
    
    return (red << 16) | (green << 8) | blue;
}

export function calculateColorRGB(hex) {
    if (typeof hex !== 'number') {
        return { r: 1, g: 1, b: 1 };
    }
    
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    
    return {
        r: r / 255,
        g: g / 255,
        b: b / 255
    };
}

export function validateGeometry(geometry) {
    if (!geometry || !geometry.attributes) {
        return false;
    }
    
    const position = geometry.attributes.position;
    if (!position || position.count === 0) {
        return false;
    }
    
    return true;
}

export function validateMaterial(material) {
    if (!material || typeof material.dispose !== 'function') {
        return false;
    }
    
    return true;
}

export function validateMesh(mesh) {
    if (!mesh || !mesh.geometry || !mesh.material) {
        return false;
    }
    
    return validateGeometry(mesh.geometry) && validateMaterial(mesh.material);
}