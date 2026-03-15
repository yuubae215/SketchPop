import * as THREE from 'three';

export class ExtrusionManager {
    constructor(sceneManager, stateManager) {
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;
        this.mouse = new THREE.Vector2();
        this.originalMeshOpacity = null; // Store original opacity for restoration
        this.dimensionLines = [];
        this.dimensionTexts = [];
    }

    updateFaceHighlight(event) {
        if (this.stateManager.faceHighlightMesh) {
            this.sceneManager.removeFromScene(this.stateManager.faceHighlightMesh);
            this.stateManager.faceHighlightMesh = null;
            this.stateManager.hoveredFace = null;
        }
        
        if (this.stateManager.isFaceExtruding) return;
        
        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.sceneManager.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
        
        const extrudedMeshes = this.stateManager.sketches
            .filter(sketch => sketch.isExtruded && sketch.extrudedMesh && !sketch.isPending)
            .map(sketch => ({ mesh: sketch.extrudedMesh, sketch: sketch }));
        
        if (extrudedMeshes.length === 0) return;
        
        const intersects = this.sceneManager.raycaster.intersectObjects(extrudedMeshes.map(item => item.mesh));
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const face = intersect.face;
            const object = intersect.object;
            
            const sketchData = extrudedMeshes.find(item => item.mesh === object);
            
            if (face && sketchData) {
                this.stateManager.hoveredFace = {
                    face: face,
                    object: object,
                    sketch: sketchData.sketch,
                    intersectionPoint: intersect.point
                };
                
                this.createFaceHighlight(object, face, intersect.point);
            }
        }
    }

    createFaceHighlight(object, face, intersectionPoint) {
        const geometry = object.geometry;
        const position = geometry.attributes.position;
        
        const a = face.a;
        const b = face.b;
        const c = face.c;
        
        const vA = new THREE.Vector3().fromBufferAttribute(position, a);
        const vB = new THREE.Vector3().fromBufferAttribute(position, b);
        const vC = new THREE.Vector3().fromBufferAttribute(position, c);
        
        vA.applyMatrix4(object.matrixWorld);
        vB.applyMatrix4(object.matrixWorld);
        vC.applyMatrix4(object.matrixWorld);
        
        const normal = face.normal.clone();
        normal.transformDirection(object.matrixWorld);
        
        const absNormal = normal.clone();
        absNormal.x = Math.abs(absNormal.x);
        absNormal.y = Math.abs(absNormal.y);
        absNormal.z = Math.abs(absNormal.z);
        
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        let width, height;
        let faceCenter = center.clone();
        
        if (absNormal.y > 0.9) {
            width = size.x;
            height = size.z;
            faceCenter.y = normal.y > 0 ? box.max.y : box.min.y;
        } else if (absNormal.x > 0.9) {
            width = size.z;
            height = size.y;
            faceCenter.x = normal.x > 0 ? box.max.x : box.min.x;
        } else if (absNormal.z > 0.9) {
            width = size.x;
            height = size.y;
            faceCenter.z = normal.z > 0 ? box.max.z : box.min.z;
        } else {
            width = Math.max(size.x, size.y, size.z) * 0.5;
            height = width;
        }
        
        const geometry_highlight = new THREE.PlaneGeometry(width * 1.00, height * 1.00);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            depthTest: false
        });
        
        this.stateManager.faceHighlightMesh = new THREE.Mesh(geometry_highlight, material);
        
        this.stateManager.faceHighlightMesh.position.copy(faceCenter);
        this.stateManager.faceHighlightMesh.position.add(normal.multiplyScalar(0.001));
        
        if (absNormal.y > 0.9) {
            this.stateManager.faceHighlightMesh.rotation.x = normal.y > 0 ? -Math.PI / 2 : Math.PI / 2;
        } else if (absNormal.x > 0.9) {
            this.stateManager.faceHighlightMesh.rotation.y = normal.x > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else if (absNormal.z > 0.9) {
            this.stateManager.faceHighlightMesh.rotation.y = normal.z > 0 ? 0 : Math.PI;
        }
        
        this.sceneManager.addToScene(this.stateManager.faceHighlightMesh);
    }

    updateFaceExtrusion(event) {
        const faceExtrusion = this.stateManager.currentFaceExtrusion;
        
        if (faceExtrusion.newMesh) {
            this.sceneManager.removeFromScene(faceExtrusion.newMesh);
            faceExtrusion.newMesh = null;
        }
        
        const face = faceExtrusion.face;
        const object = faceExtrusion.object;
        
        const normal = face.normal.clone();
        normal.transformDirection(object.matrixWorld);
        
        const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
        const currentMouse = new THREE.Vector2();
        currentMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        currentMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        if (!faceExtrusion.startMouse) {
            faceExtrusion.startMouse = currentMouse.clone();
            faceExtrusion.startCameraPosition = this.sceneManager.camera.position.clone();
        }
        
        const mouseDelta = currentMouse.clone().sub(faceExtrusion.startMouse);
        
        const normalInScreen = normal.clone();
        normalInScreen.project(this.sceneManager.camera);
        
        const mouseDelta3D = new THREE.Vector3(mouseDelta.x, mouseDelta.y, 0);
        const normalInScreen3D = new THREE.Vector3(normalInScreen.x, normalInScreen.y, 0);
        
        if (normalInScreen3D.length() > 0) {
            normalInScreen3D.normalize();
        }
        
        const extrudeDistance = mouseDelta3D.dot(normalInScreen3D) * 4.0;
        
        console.log('Face extrusion mouse move - distance:', extrudeDistance, 'normal:', normal, 'mouseDelta:', mouseDelta);
        
        faceExtrusion.extrudeDistance = extrudeDistance;
        this.createFaceExtrusionMesh(faceExtrusion, extrudeDistance);
        
        // Update dimension display
        if (this.stateManager.dimensionsEnabled && Math.abs(extrudeDistance) > 0.1) {
            this.updateExtrusionDimensions(faceExtrusion, extrudeDistance);
        }
    }

    createFaceExtrusionMesh(faceExtrusion, distance) {
        if (Math.abs(distance) < 0.1) return;
        
        const face = faceExtrusion.face;
        const object = faceExtrusion.object;
        
        const normal = face.normal.clone();
        normal.transformDirection(object.matrixWorld);
        
        const absNormal = normal.clone();
        absNormal.x = Math.abs(absNormal.x);
        absNormal.y = Math.abs(absNormal.y);
        absNormal.z = Math.abs(absNormal.z);
        
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        
        let width, height, depth;
        let position = new THREE.Vector3();
        
        if (absNormal.y > 0.9) {
            width = size.x;
            depth = size.z;
            height = Math.abs(distance);
            position.copy(box.getCenter(new THREE.Vector3()));
            if (distance > 0) {
                position.y = normal.y > 0 ? box.max.y + height/2 : box.min.y - height/2;
            } else {
                position.y = normal.y > 0 ? box.max.y - height/2 : box.min.y + height/2;
            }
        } else if (absNormal.x > 0.9) {
            depth = size.z;
            height = size.y;
            width = Math.abs(distance);
            position.copy(box.getCenter(new THREE.Vector3()));
            if (distance > 0) {
                position.x = normal.x > 0 ? box.max.x + width/2 : box.min.x - width/2;
            } else {
                position.x = normal.x > 0 ? box.max.x - width/2 : box.min.x + width/2;
            }
        } else if (absNormal.z > 0.9) {
            width = size.x;
            height = size.y;
            depth = Math.abs(distance);
            position.copy(box.getCenter(new THREE.Vector3()));
            if (distance > 0) {
                position.z = normal.z > 0 ? box.max.z + depth/2 : box.min.z - depth/2;
            } else {
                position.z = normal.z > 0 ? box.max.z - depth/2 : box.min.z + depth/2;
            }
        }
        
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshPhongMaterial({ 
            color: distance > 0 ? 0x4a90e2 : 0xe24a4a,
            transparent: true,
            opacity: 0.5  // More transparent for better visibility during extrusion
        });
        
        faceExtrusion.newMesh = new THREE.Mesh(geometry, material);
        faceExtrusion.newMesh.position.copy(position);
        
        // Make the original mesh semi-transparent during extrusion
        this.makeOriginalMeshTransparent(faceExtrusion.object);
        
        this.sceneManager.addToScene(faceExtrusion.newMesh);
    }

    makeOriginalMeshTransparent(mesh) {
        if (mesh && mesh.material) {
            // Store original opacity if not already stored
            if (this.originalMeshOpacity === null) {
                this.originalMeshOpacity = mesh.material.opacity || 1.0;
            }
            
            // Enable transparency and reduce opacity
            mesh.material.transparent = true;
            mesh.material.opacity = 0.4;
            mesh.material.needsUpdate = true;
        }
    }

    restoreOriginalMeshOpacity(mesh) {
        if (mesh && mesh.material && this.originalMeshOpacity !== null) {
            // Restore original opacity
            mesh.material.opacity = this.originalMeshOpacity;
            
            // Disable transparency if original opacity was 1.0
            if (this.originalMeshOpacity >= 1.0) {
                mesh.material.transparent = false;
            }
            
            mesh.material.needsUpdate = true;
            this.originalMeshOpacity = null; // Reset for next use
        }
    }

    confirmFaceExtrusion() {
        const faceExtrusion = this.stateManager.currentFaceExtrusion;
        
        // Clear dimension display
        this.clearExtrusionDimensions();
        
        // Restore original mesh opacity regardless of success
        if (faceExtrusion && faceExtrusion.object) {
            this.restoreOriginalMeshOpacity(faceExtrusion.object);
        }
        
        if (faceExtrusion && faceExtrusion.newMesh && Math.abs(faceExtrusion.extrudeDistance) > 0.1) {
            const success = this.integrateExtrusionWithOriginal(faceExtrusion);
            if (success) {
                console.log('Face extrusion confirmed and integrated with original shape');
            } else {
                console.log('Failed to integrate face extrusion');
                if (faceExtrusion.newMesh) {
                    this.sceneManager.removeFromScene(faceExtrusion.newMesh);
                }
            }
        } else if (faceExtrusion && faceExtrusion.newMesh) {
            this.sceneManager.removeFromScene(faceExtrusion.newMesh);
        }
        
        this.stateManager.currentFaceExtrusion = null;
        this.stateManager.isFaceExtruding = false;
        this.stateManager.faceExtrudeStartPos = null;
        this.stateManager.hoveredFace = null;
        if (this.stateManager.faceHighlightMesh) {
            this.sceneManager.removeFromScene(this.stateManager.faceHighlightMesh);
            this.stateManager.faceHighlightMesh = null;
        }
    }

    cancelFaceExtrusion() {
        const faceExtrusion = this.stateManager.currentFaceExtrusion;
        
        // Clear dimension display
        this.clearExtrusionDimensions();
        
        // Restore original mesh opacity when cancelling
        if (faceExtrusion && faceExtrusion.object) {
            this.restoreOriginalMeshOpacity(faceExtrusion.object);
        }
        
        if (faceExtrusion && faceExtrusion.newMesh) {
            this.sceneManager.removeFromScene(faceExtrusion.newMesh);
        }
        this.stateManager.currentFaceExtrusion = null;
        this.stateManager.isFaceExtruding = false;
        this.stateManager.faceExtrudeStartPos = null;
        this.stateManager.hoveredFace = null;
        if (this.stateManager.faceHighlightMesh) {
            this.sceneManager.removeFromScene(this.stateManager.faceHighlightMesh);
            this.stateManager.faceHighlightMesh = null;
        }
    }

    integrateExtrusionWithOriginal(faceExtrusion) {
        const originalSketch = faceExtrusion.originalSketch;
        const newMesh = faceExtrusion.newMesh;
        const face = faceExtrusion.face;
        const object = faceExtrusion.object;
        
        if (!originalSketch || !newMesh || !originalSketch.extrudedMesh) return false;
        
        const normal = face.normal.clone();
        normal.transformDirection(object.matrixWorld);
        
        const absNormal = normal.clone();
        absNormal.x = Math.abs(absNormal.x);
        absNormal.y = Math.abs(absNormal.y);
        absNormal.z = Math.abs(absNormal.z);
        
        const currentBox = new THREE.Box3().setFromObject(originalSketch.extrudedMesh);
        const currentSize = currentBox.getSize(new THREE.Vector3());
        const currentCenter = currentBox.getCenter(new THREE.Vector3());
        const extrudeDistance = faceExtrusion.extrudeDistance;
        
        let newGeometry;
        let newPosition = currentCenter.clone();
        
        if (absNormal.y > 0.9) {
            if (extrudeDistance > 0) {
                const newHeight = currentSize.y + extrudeDistance;
                newGeometry = new THREE.BoxGeometry(currentSize.x, newHeight, currentSize.z);
                if (normal.y > 0) {
                    newPosition.y = currentBox.min.y + newHeight / 2;
                } else {
                    newPosition.y = currentBox.max.y - newHeight / 2;
                }
                originalSketch.extrudeHeight = newHeight;
            } else {
                const depressionDepth = Math.abs(extrudeDistance);
                if (depressionDepth >= currentSize.y * 0.9) return false;
                
                const newHeight = currentSize.y - depressionDepth;
                newGeometry = new THREE.BoxGeometry(currentSize.x, newHeight, currentSize.z);
                if (normal.y > 0) {
                    newPosition.y = currentBox.min.y + newHeight / 2;
                } else {
                    newPosition.y = currentBox.max.y - newHeight / 2;
                }
                originalSketch.extrudeHeight = newHeight;
            }
        } else if (absNormal.x > 0.9) {
            const bounds = originalSketch.getBounds();
            if (extrudeDistance > 0) {
                const newWidth = currentSize.x + extrudeDistance;
                newGeometry = new THREE.BoxGeometry(newWidth, currentSize.y, currentSize.z);
                if (normal.x > 0) {
                    newPosition.x = currentBox.min.x + newWidth / 2;
                    const rightmostPointIsEnd = originalSketch.endPoint.x > originalSketch.startPoint.x;
                    if (rightmostPointIsEnd) {
                        originalSketch.endPoint.x = bounds.minX + newWidth;
                    } else {
                        originalSketch.startPoint.x = bounds.minX + newWidth;
                    }
                } else {
                    newPosition.x = currentBox.max.x - newWidth / 2;
                    const leftmostPointIsEnd = originalSketch.endPoint.x < originalSketch.startPoint.x;
                    if (leftmostPointIsEnd) {
                        originalSketch.endPoint.x = bounds.maxX - newWidth;
                    } else {
                        originalSketch.startPoint.x = bounds.maxX - newWidth;
                    }
                }
            } else {
                const depressionDepth = Math.abs(extrudeDistance);
                if (depressionDepth >= currentSize.x * 0.9) return false;
                
                const newWidth = currentSize.x - depressionDepth;
                newGeometry = new THREE.BoxGeometry(newWidth, currentSize.y, currentSize.z);
                if (normal.x > 0) {
                    newPosition.x = currentBox.min.x + newWidth / 2;
                    const rightmostPointIsEnd = originalSketch.endPoint.x > originalSketch.startPoint.x;
                    if (rightmostPointIsEnd) {
                        originalSketch.endPoint.x = bounds.maxX - depressionDepth;
                    } else {
                        originalSketch.startPoint.x = bounds.maxX - depressionDepth;
                    }
                } else {
                    newPosition.x = currentBox.max.x - newWidth / 2;
                    const leftmostPointIsEnd = originalSketch.endPoint.x < originalSketch.startPoint.x;
                    if (leftmostPointIsEnd) {
                        originalSketch.endPoint.x = bounds.minX + depressionDepth;
                    } else {
                        originalSketch.startPoint.x = bounds.minX + depressionDepth;
                    }
                }
            }
        } else if (absNormal.z > 0.9) {
            const bounds = originalSketch.getBounds();
            if (extrudeDistance > 0) {
                const newDepth = currentSize.z + extrudeDistance;
                newGeometry = new THREE.BoxGeometry(currentSize.x, currentSize.y, newDepth);
                if (normal.z > 0) {
                    newPosition.z = currentBox.min.z + newDepth / 2;
                    const frontmostPointIsEnd = originalSketch.endPoint.z > originalSketch.startPoint.z;
                    if (frontmostPointIsEnd) {
                        originalSketch.endPoint.z = bounds.minZ + newDepth;
                    } else {
                        originalSketch.startPoint.z = bounds.minZ + newDepth;
                    }
                } else {
                    newPosition.z = currentBox.max.z - newDepth / 2;
                    const backmostPointIsEnd = originalSketch.endPoint.z < originalSketch.startPoint.z;
                    if (backmostPointIsEnd) {
                        originalSketch.endPoint.z = bounds.maxZ - newDepth;
                    } else {
                        originalSketch.startPoint.z = bounds.maxZ - newDepth;
                    }
                }
            } else {
                const depressionDepth = Math.abs(extrudeDistance);
                if (depressionDepth >= currentSize.z * 0.9) return false;
                
                const newDepth = currentSize.z - depressionDepth;
                newGeometry = new THREE.BoxGeometry(currentSize.x, currentSize.y, newDepth);
                if (normal.z > 0) {
                    newPosition.z = currentBox.min.z + newDepth / 2;
                    const frontmostPointIsEnd = originalSketch.endPoint.z > originalSketch.startPoint.z;
                    if (frontmostPointIsEnd) {
                        originalSketch.endPoint.z = bounds.maxZ - depressionDepth;
                    } else {
                        originalSketch.startPoint.z = bounds.maxZ - depressionDepth;
                    }
                } else {
                    newPosition.z = currentBox.max.z - newDepth / 2;
                    const backmostPointIsEnd = originalSketch.endPoint.z < originalSketch.startPoint.z;
                    if (backmostPointIsEnd) {
                        originalSketch.endPoint.z = bounds.minZ + depressionDepth;
                    } else {
                        originalSketch.startPoint.z = bounds.minZ + depressionDepth;
                    }
                }
            }
        }
        
        if (newGeometry) {
            this.sceneManager.removeFromScene(originalSketch.extrudedMesh);
            this.sceneManager.removeFromScene(newMesh);
            
            const material = new THREE.MeshPhongMaterial({ 
                color: 0x4a90e2,
                transparent: true,
                opacity: 0.8
            });
            
            originalSketch.extrudedMesh = new THREE.Mesh(newGeometry, material);
            originalSketch.extrudedMesh.position.copy(newPosition);
            this.sceneManager.addToScene(originalSketch.extrudedMesh);
            
            const lineMesh = originalSketch.createMesh();
            this.sceneManager.addToScene(lineMesh);
            
            console.log('Face extrusion integrated with original shape. New position:', newPosition, 'New size:', newGeometry.parameters);
            return true;
        }
        
        return false;
    }

    updateExtrusionDimensions(faceExtrusion, distance) {
        this.clearExtrusionDimensions();
        
        if (!faceExtrusion.newMesh) return;
        
        const face = faceExtrusion.face;
        const object = faceExtrusion.object;
        
        const normal = face.normal.clone();
        normal.transformDirection(object.matrixWorld);
        
        const absNormal = normal.clone();
        absNormal.x = Math.abs(absNormal.x);
        absNormal.y = Math.abs(absNormal.y);
        absNormal.z = Math.abs(absNormal.z);
        
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        
        this.createExtrusionDimensionLine(faceExtrusion, distance, normal, absNormal, box, center);
    }
    
    createExtrusionDimensionLine(faceExtrusion, distance, normal, absNormal, box, center) {
        const absDistance = Math.abs(distance);
        const offset = 0.8;
        
        let startPoint, endPoint, textPosition, lineColor;
        
        // Choose color based on extrusion direction
        lineColor = distance > 0 ? 0x4a90e2 : 0xe24a4a;
        
        if (absNormal.y > 0.9) {
            // Vertical extrusion (Y-axis)
            const faceY = normal.y > 0 ? box.max.y : box.min.y;
            const extrudeEndY = faceY + (normal.y > 0 ? distance : -distance);
            
            startPoint = new THREE.Vector3(center.x + offset, faceY, center.z);
            endPoint = new THREE.Vector3(center.x + offset, extrudeEndY, center.z);
            textPosition = new THREE.Vector3(center.x + offset + 0.3, (faceY + extrudeEndY) / 2, center.z);
            
        } else if (absNormal.x > 0.9) {
            // Horizontal extrusion (X-axis)
            const faceX = normal.x > 0 ? box.max.x : box.min.x;
            const extrudeEndX = faceX + (normal.x > 0 ? distance : -distance);
            
            startPoint = new THREE.Vector3(faceX, center.y, center.z + offset);
            endPoint = new THREE.Vector3(extrudeEndX, center.y, center.z + offset);
            textPosition = new THREE.Vector3((faceX + extrudeEndX) / 2, center.y, center.z + offset + 0.3);
            
        } else if (absNormal.z > 0.9) {
            // Depth extrusion (Z-axis)
            const faceZ = normal.z > 0 ? box.max.z : box.min.z;
            const extrudeEndZ = faceZ + (normal.z > 0 ? distance : -distance);
            
            startPoint = new THREE.Vector3(center.x + offset, center.y, faceZ);
            endPoint = new THREE.Vector3(center.x + offset, center.y, extrudeEndZ);
            textPosition = new THREE.Vector3(center.x + offset + 0.3, center.y, (faceZ + extrudeEndZ) / 2);
        }
        
        if (startPoint && endPoint) {
            // Create main dimension line
            const points = [startPoint, endPoint];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ 
                color: lineColor,
                linewidth: 2
            });
            
            const dimensionLine = new THREE.Line(geometry, material);
            this.dimensionLines.push(dimensionLine);
            this.sceneManager.addToScene(dimensionLine);
            
            // Create tick marks at both ends
            const tickLength = 0.15;
            const tickDirection = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
            const perpendicular = new THREE.Vector3();
            
            if (Math.abs(tickDirection.y) > 0.9) {
                perpendicular.set(1, 0, 0);
            } else if (Math.abs(tickDirection.x) > 0.9) {
                perpendicular.set(0, 1, 0);
            } else {
                perpendicular.set(0, 1, 0);
            }
            
            // Start tick
            const startTick1 = startPoint.clone().add(perpendicular.clone().multiplyScalar(tickLength));
            const startTick2 = startPoint.clone().add(perpendicular.clone().multiplyScalar(-tickLength));
            const startTickGeometry = new THREE.BufferGeometry().setFromPoints([startTick1, startTick2]);
            const startTick = new THREE.Line(startTickGeometry, material);
            this.dimensionLines.push(startTick);
            this.sceneManager.addToScene(startTick);
            
            // End tick
            const endTick1 = endPoint.clone().add(perpendicular.clone().multiplyScalar(tickLength));
            const endTick2 = endPoint.clone().add(perpendicular.clone().multiplyScalar(-tickLength));
            const endTickGeometry = new THREE.BufferGeometry().setFromPoints([endTick1, endTick2]);
            const endTick = new THREE.Line(endTickGeometry, material);
            this.dimensionLines.push(endTick);
            this.sceneManager.addToScene(endTick);
            
            // Create dimension text
            if (textPosition) {
                this.createExtrusionDimensionText(absDistance.toFixed(2), textPosition, lineColor);
            }
        }
    }
    
    createExtrusionDimensionText(text, position, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Use color-coded background
        const colorHex = '#' + color.toString(16).padStart(6, '0');
        context.fillStyle = colorHex;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.strokeStyle = '#ffffff';
        context.lineWidth = 3;
        context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
        
        context.fillStyle = '#ffffff';
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            depthTest: false,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(material);
        
        sprite.position.copy(position);
        sprite.position.y += 0.15;
        sprite.scale.set(1.2, 0.3, 1);
        sprite.renderOrder = 1000;
        
        this.dimensionTexts.push(sprite);
        this.sceneManager.addToScene(sprite);
    }
    
    clearExtrusionDimensions() {
        this.dimensionLines.forEach(line => {
            this.sceneManager.removeFromScene(line);
        });
        this.dimensionTexts.forEach(text => {
            this.sceneManager.removeFromScene(text);
        });
        this.dimensionLines = [];
        this.dimensionTexts = [];
    }
}