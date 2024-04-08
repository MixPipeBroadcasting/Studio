import * as common from "./common.js";
import * as components from "./components.js";
import * as workspaces from "./workspaces.js";

var lastAbsolutePointerPosition = null;

export class SceneEditorPanel extends workspaces.Panel {
    constructor(scene) {
        super(scene.name || "Untitled scene");

        var thisScope = this;

        this.scene = scene;

        this.toolbar = new workspaces.Toolbar();
        this.workArea = new workspaces.WorkArea();
        this.canvasElement = components.element("canvas");
        this.zoom = null;
        this.offset = null;
        this.selectedObjects = [];
        this.boundingHalo = null;
        this.targetHandle = null;

        this.workArea.element.append(this.canvasElement);

        this.add(this.toolbar, this.workArea);

        this.scene.events.renamed.connect(() => this.name = scene.name);

        requestAnimationFrame(function render() {
            thisScope.render();

            requestAnimationFrame(render);
        });

        var pointerDown = false;
        var panning = false;
        var panOffset = null;
        var moving = false;
        var hasMoved = false;
        var lastMoveOffset = null;
        var handleIsGrabbed = false;

        this.canvasElement.addEventListener("pointerdown", function(event) {
            if (common.ctrlOrCommandKey(event)) {
                panning = true;

                panOffset = {
                    x: event.clientX - (thisScope.offset.x * thisScope.zoom),
                    y: event.clientY - (thisScope.offset.y * thisScope.zoom)
                };

                event.preventDefault();

                return;
            }

            if (thisScope.checkHandles() != null) {
                handleIsGrabbed = true;
                lastBoundingHalo = thisScope.boundingHalo;

                return;
            }

            pointerDown = true;
            moving = thisScope.scene.getObjectsAtPoint(thisScope.pointerPosition).length > 0; // TODO: Get selected objects at point instead
            hasMoved = false;
            lastMoveOffset = thisScope.pointerPosition;
        });

        document.body.addEventListener("pointermove", function(event) {
            if (panning) {
                thisScope.offset = {
                    x: (event.clientX - panOffset.x) / thisScope.zoom,
                    y: (event.clientY - panOffset.y) / thisScope.zoom
                };
            }

            if (moving) {
                var moveDelta = {
                    x: thisScope.pointerPosition.x - lastMoveOffset.x,
                    y: thisScope.pointerPosition.y - lastMoveOffset.y
                };
    
                for (var object of thisScope.selectedObjects) {
                    object.position = {
                        x: object.position.x + moveDelta.x,
                        y: object.position.y + moveDelta.y
                    };
                }

                lastMoveOffset = thisScope.pointerPosition;
                hasMoved = true;
            }
        });

        document.body.addEventListener("pointerup", function(event) {
            if (!hasMoved) {
                thisScope.selectObjectAtPoint(thisScope.pointerPosition, event.shiftKey);
            }

            pointerDown = false;
            panning = false;
            moving = false;
            hasMoved = false;
            handleIsGrabbed = false;

        });

        this.canvasElement.addEventListener("wheel", function(event) {
            var previousZoom = thisScope.zoom;
            var lastPointerPosition = thisScope.pointerPosition;

            thisScope.zoom -= event.deltaY * 0.01;

            if (thisScope.zoom < 0.1) {
                thisScope.zoom = 0.1;
            }

            thisScope.offset = {
                x: thisScope.offset.x * (previousZoom / thisScope.zoom),
                y: thisScope.offset.y * (previousZoom / thisScope.zoom)
            };

            if (lastPointerPosition) {
                thisScope.offset.x -= lastPointerPosition.x - thisScope.pointerPosition.x;
                thisScope.offset.y -= lastPointerPosition.y - thisScope.pointerPosition.y;
            }
        });
    }

    get canvasContext() {
        return this.canvasElement.getContext("2d");
    }

    get pointerPosition() {
        if (lastAbsolutePointerPosition == null) {
            return null;
        }

        var workAreaRect = this.workArea.element.getBoundingClientRect();

        return {
            x: (lastAbsolutePointerPosition.x - workAreaRect.x - (this.offset.x * this.zoom)) / this.zoom,
            y: (lastAbsolutePointerPosition.y - workAreaRect.y - (this.offset.y * this.zoom)) / this.zoom
        };
    }

    selectObjectAtPoint(point = this.pointerPosition, addToSelection = false) {
        var objectsAtPoint = this.scene.getObjectsAtPoint(point);

        if (!addToSelection) {
            this.selectedObjects = [];            
        }

        if (objectsAtPoint.length == 0) {
            return;
        }

        var objectToSelect = objectsAtPoint[objectsAtPoint.length - 1];

        if (!this.selectedObjects.includes(objectToSelect)) {
            this.selectedObjects.push(objectsAtPoint[objectsAtPoint.length - 1]);
        }
    }

    drawScreenAreas() {
        var sceneSize = this.scene.size;
        var context = this.canvasContext;

        context.lineWidth = 1 / this.zoom;
        context.strokeStyle = "#666666";

        context.strokeRect(0, 0, sceneSize.width, sceneSize.height);
        context.strokeRect(sceneSize.width * 0.05, sceneSize.height * 0.05, sceneSize.width * 0.9, sceneSize.height * 0.9);
        context.strokeRect(sceneSize.width * 0.1, sceneSize.height * 0.1, sceneSize.width * 0.8, sceneSize.height * 0.8);

        context.beginPath();
        context.moveTo(sceneSize.width * 0.05, sceneSize.height / 2);
        context.lineTo(sceneSize.width * 0.075, sceneSize.height / 2);
        context.stroke();

        context.beginPath();
        context.moveTo(sceneSize.width * 0.95, sceneSize.height / 2);
        context.lineTo(sceneSize.width * 0.925, sceneSize.height / 2);
        context.stroke();

        context.beginPath();
        context.moveTo(sceneSize.width / 2, sceneSize.height * 0.05);
        context.lineTo(sceneSize.width / 2, sceneSize.height * 0.075);
        context.stroke();

        context.beginPath();
        context.moveTo(sceneSize.width / 2, sceneSize.height * 0.95);
        context.lineTo(sceneSize.width / 2, sceneSize.height * 0.925);
        context.stroke();
    }

    checkHandles(draw = false) {
        if (this.boundingHalo == null) {
            return null;
        }

        var thisScope = this;
        var context = this.canvasContext;
        var boundingHalo = this.boundingHalo;
        
        function checkHandle(x, y, targetHandle = null) {
            const HANDLE_EDGE = 4 / thisScope.zoom;

            if (draw) {
                context.fillStyle = "blue";

                context.beginPath();
                context.arc(x, y, 8 / thisScope.zoom, 0, 2 * Math.PI, false);
                context.fill();
            }

            if (
                thisScope.pointerPosition.x >= x - HANDLE_EDGE &&
                thisScope.pointerPosition.y >= y - HANDLE_EDGE &&
                thisScope.pointerPosition.x < x + HANDLE_EDGE &&
                thisScope.pointerPosition.y < y + HANDLE_EDGE
            ) {
                thisScope.targetHandle = targetHandle;
            }
        }

        thisScope.targetHandle = null;

        checkHandle(boundingHalo.xMin, boundingHalo.yMin, {x: -1, y: -1});
        checkHandle((boundingHalo.xMin + boundingHalo.xMax) / 2, boundingHalo.yMin, {x: 0, y: -1});
        checkHandle(boundingHalo.xMax, boundingHalo.yMin, {x: 1, y: -1});
        checkHandle(boundingHalo.xMin, (boundingHalo.yMin + boundingHalo.yMax) / 2, {x: -1, y: 0});
        checkHandle(boundingHalo.xMax, (boundingHalo.yMin + boundingHalo.yMax) / 2, {x: 1, y: 0});
        checkHandle(boundingHalo.xMin, boundingHalo.yMax, {x: -1, y: 1});
        checkHandle((boundingHalo.xMin + boundingHalo.xMax) / 2, boundingHalo.yMax, {x: 0, y: 1});
        checkHandle(boundingHalo.xMax, boundingHalo.yMax, {x: 1, y: 1});

        return thisScope.targetHandle;
    }

    checkHalos(draw = false) {
        if (this.selectedObjects.length == 0) {
            this.boundingHalo = null;
            this.targetHandle = null;

            return;
        }

        var context = this.canvasContext;

        var boundingHalo = {
            xMin: Infinity,
            yMin: Infinity,
            xMax: -Infinity,
            yMax: -Infinity
        };

        if (draw) {
            context.lineWidth = 1 / this.zoom;
            context.strokeStyle = "red";
        }

        for (var object of this.selectedObjects) {
            if (draw) {
                context.strokeRect(object.position.x, object.position.y, object.size.width, object.size.height);
            }

            boundingHalo.xMin = Math.min(boundingHalo.xMin, object.position.x);
            boundingHalo.yMin = Math.min(boundingHalo.yMin, object.position.y);
            boundingHalo.xMax = Math.max(boundingHalo.xMax, object.position.x + object.size.width);
            boundingHalo.yMax = Math.max(boundingHalo.yMax, object.position.y + object.size.height);
        }

        this.boundingHalo = boundingHalo;

        if (draw) {
            context.lineWidth = 2 / this.zoom;

            context.strokeRect(
                boundingHalo.xMin,
                boundingHalo.yMin,
                boundingHalo.xMax - boundingHalo.xMin,
                boundingHalo.yMax - boundingHalo.yMin
            );
        }

        this.checkHandles(draw);

        return boundingHalo;
    }

    render() {
        var workAreaRect = this.workArea.element.getBoundingClientRect();
        var sceneSize = this.scene.size;
        var context = this.canvasContext;

        this.canvasElement.width = workAreaRect.width;
        this.canvasElement.height = workAreaRect.height;

        this.zoom ??= (workAreaRect.width / sceneSize.width) * 0.75;

        this.offset ??= {
            x: (workAreaRect.width - (sceneSize.width * this.zoom)) / 2 / this.zoom,
            y: (workAreaRect.height - (sceneSize.height * this.zoom)) / 2 / this.zoom
        };

        context.scale(this.zoom, this.zoom);
        context.translate(this.offset.x, this.offset.y);

        this.scene.drawToContext(context);

        this.drawScreenAreas();
        this.checkHalos(true);
    }
}

document.body.addEventListener("pointermove", function(event) {
    lastAbsolutePointerPosition = {
        x: event.clientX,
        y: event.clientY
    };
});