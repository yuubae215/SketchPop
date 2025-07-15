import * as THREE from 'three';

class SceneHandler {
    constructor() {
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.raycaster = null;
        this.mouse = new THREE.Vector2();
        this.intersectionPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    }

    initializeScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        return this.scene;
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);
        
        return { ambientLight, directionalLight };
    }

    setupHelpers() {
        const gridHelper = new THREE.GridHelper(20, 20, 0x000000, 0x000000);
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        
        const axesHelper = new THREE.AxesHelper(5);
        
        this.scene.add(gridHelper);
        this.scene.add(axesHelper);
        
        return { gridHelper, axesHelper };
    }

    setupGroundPlane() {
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0 
        });
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        
        this.scene.add(groundMesh);
        return groundMesh;
    }

    addToScene(object) {
        if (this.scene && object) {
            this.scene.add(object);
        }
    }

    removeFromScene(object) {
        if (this.scene && object) {
            this.scene.remove(object);
        }
    }

    clearScene() {
        if (this.scene) {
            const objectsToRemove = [];
            this.scene.traverse((child) => {
                if (child.userData && child.userData.isUserCreated) {
                    objectsToRemove.push(child);
                }
            });
            objectsToRemove.forEach(obj => this.scene.remove(obj));
        }
    }
}

class MeshHandler {
    constructor(sceneHandler) {
        this.sceneHandler = sceneHandler;
    }

    createBoxMesh(width, height, depth, color = 0x00ff00) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshPhongMaterial({ color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.isUserCreated = true;
        return mesh;
    }

    createLineMesh(points, color = 0x000000) {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color });
        const line = new THREE.Line(geometry, material);
        line.userData.isUserCreated = true;
        return line;
    }

    createWireframeMesh(originalMesh, color = 0xff0000) {
        const wireframeGeometry = new THREE.WireframeGeometry(originalMesh.geometry);
        const wireframeMaterial = new THREE.LineBasicMaterial({ color });
        const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
        wireframe.userData.isUserCreated = true;
        return wireframe;
    }

    createPlaneMesh(width, height, color = 0x0000ff, opacity = 0.3) {
        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({ 
            color, 
            transparent: true, 
            opacity 
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.userData.isUserCreated = true;
        return plane;
    }

    createSphereMesh(radius, color = 0xff0000) {
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.userData.isUserCreated = true;
        return sphere;
    }

    createConeMesh(radius, height, color = 0x00ff00) {
        const geometry = new THREE.ConeGeometry(radius, height, 8);
        const material = new THREE.MeshBasicMaterial({ color });
        const cone = new THREE.Mesh(geometry, material);
        cone.userData.isUserCreated = true;
        return cone;
    }

    updateMeshPosition(mesh, x, y, z) {
        if (mesh && mesh.position) {
            mesh.position.set(x, y, z);
        }
    }

    updateMeshRotation(mesh, x, y, z) {
        if (mesh && mesh.rotation) {
            mesh.rotation.set(x, y, z);
        }
    }

    updateMeshScale(mesh, x, y, z) {
        if (mesh && mesh.scale) {
            mesh.scale.set(x, y, z);
        }
    }

    disposeMesh(mesh) {
        if (mesh) {
            if (mesh.geometry) {
                mesh.geometry.dispose();
            }
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(material => material.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
            if (mesh.parent) {
                mesh.parent.remove(mesh);
            }
        }
    }
}

class MaterialHandler {
    constructor() {
        this.materials = new Map();
    }

    createPhongMaterial(color, options = {}) {
        const material = new THREE.MeshPhongMaterial({
            color,
            ...options
        });
        return material;
    }

    createBasicMaterial(color, options = {}) {
        const material = new THREE.MeshBasicMaterial({
            color,
            ...options
        });
        return material;
    }

    createLineMaterial(color, options = {}) {
        const material = new THREE.LineBasicMaterial({
            color,
            ...options
        });
        return material;
    }

    updateMaterialColor(material, color) {
        if (material && material.color) {
            material.color.setHex(color);
            material.needsUpdate = true;
        }
    }

    updateMaterialOpacity(material, opacity) {
        if (material) {
            material.opacity = opacity;
            material.transparent = opacity < 1;
            material.needsUpdate = true;
        }
    }

    updateMaterialProperties(material, properties) {
        if (material) {
            Object.assign(material, properties);
            material.needsUpdate = true;
        }
    }

    disposeMaterial(material) {
        if (material) {
            if (material.map) material.map.dispose();
            if (material.normalMap) material.normalMap.dispose();
            if (material.bumpMap) material.bumpMap.dispose();
            if (material.specularMap) material.specularMap.dispose();
            material.dispose();
        }
    }
}

class DimensionHandler {
    constructor(sceneHandler, meshHandler, materialHandler) {
        this.sceneHandler = sceneHandler;
        this.meshHandler = meshHandler;
        this.materialHandler = materialHandler;
    }

    createDimensionLine(startPoint, endPoint, color = 0x000000) {
        const points = [startPoint, endPoint];
        const line = this.meshHandler.createLineMesh(points, color);
        line.userData.isDimension = true;
        return line;
    }

    createTextSprite(text, color = '#000000', size = 16) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = 256;
        canvas.height = 64;
        
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = `${size}px Arial`;
        context.fillStyle = color;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        
        sprite.scale.set(2, 0.5, 1);
        sprite.userData.isDimension = true;
        
        return sprite;
    }

    createDimensionSet(startPoint, endPoint, text, offset = 0.5) {
        const line = this.createDimensionLine(startPoint, endPoint);
        const sprite = this.createTextSprite(text);
        
        const midPoint = new THREE.Vector3()
            .addVectors(startPoint, endPoint)
            .multiplyScalar(0.5);
        midPoint.y += offset;
        
        sprite.position.copy(midPoint);
        
        const group = new THREE.Group();
        group.add(line);
        group.add(sprite);
        group.userData.isDimension = true;
        
        return group;
    }

    removeDimensions() {
        const dimensionObjects = [];
        this.sceneHandler.scene.traverse((child) => {
            if (child.userData && child.userData.isDimension) {
                dimensionObjects.push(child);
            }
        });
        
        dimensionObjects.forEach(obj => {
            this.sceneHandler.removeFromScene(obj);
            this.meshHandler.disposeMesh(obj);
        });
    }
}

class InteractionHandler {
    constructor(sceneHandler, camera) {
        this.sceneHandler = sceneHandler;
        this.camera = camera;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.intersectionPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    }

    updateMousePosition(event, domElement) {
        const rect = domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    getIntersectionPoint(camera) {
        this.raycaster.setFromCamera(this.mouse, camera);
        const intersectionPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.intersectionPlane, intersectionPoint);
        return intersectionPoint;
    }

    raycastObjects(objects, camera) {
        this.raycaster.setFromCamera(this.mouse, camera);
        return this.raycaster.intersectObjects(objects, true);
    }

    getObjectsAtMouse(camera) {
        const intersects = this.raycastObjects(this.sceneHandler.scene.children, camera);
        return intersects.filter(intersect => 
            intersect.object.userData && intersect.object.userData.isUserCreated
        );
    }
}

class RenderHandler {
    constructor() {
        this.renderer = null;
        this.camera = null;
        this.animationId = null;
        this.renderLoop = null;
    }

    createRenderer(canvas) {
        this.renderer = new THREE.WebGLRenderer({ 
            canvas, 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        return this.renderer;
    }

    createPerspectiveCamera(fov = 75, aspect = 1, near = 0.1, far = 1000) {
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.camera.position.set(0, 10, 10);
        this.camera.lookAt(0, 0, 0);
        return this.camera;
    }

    createOrthographicCamera(left, right, top, bottom, near = 0.1, far = 1000) {
        this.camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);
        this.camera.position.set(0, 10, 10);
        this.camera.lookAt(0, 0, 0);
        return this.camera;
    }

    startRenderLoop(scene, camera, controls) {
        this.renderLoop = () => {
            if (controls) {
                controls.update();
            }
            
            this.renderer.render(scene, camera);
            this.animationId = requestAnimationFrame(this.renderLoop);
        };
        
        this.renderLoop();
    }

    stopRenderLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    updateRendererSize(width, height) {
        if (this.renderer) {
            this.renderer.setSize(width, height);
        }
        
        if (this.camera) {
            if (this.camera.isPerspectiveCamera) {
                this.camera.aspect = width / height;
            } else if (this.camera.isOrthographicCamera) {
                const aspect = width / height;
                this.camera.left = -10 * aspect;
                this.camera.right = 10 * aspect;
                this.camera.top = 10;
                this.camera.bottom = -10;
            }
            this.camera.updateProjectionMatrix();
        }
    }

    render(scene, camera) {
        if (this.renderer && scene && camera) {
            this.renderer.render(scene, camera);
        }
    }
}

export {
    SceneHandler,
    MeshHandler,
    MaterialHandler,
    DimensionHandler,
    InteractionHandler,
    RenderHandler
};