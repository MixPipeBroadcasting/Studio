import * as components from "./components.js";
import * as workspaces from "./workspaces.js";

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

        this.workArea.element.append(this.canvasElement);

        this.add(this.toolbar, this.workArea);

        this.scene.events.renamed.connect(() => this.name = scene.name);

        requestAnimationFrame(function render() {
            thisScope.render();

            requestAnimationFrame(render);
        });

        var panning = false;
        var panOffset = null;
        var lastMousePosition = null;

        this.canvasElement.addEventListener("pointerdown", function(event) {
            if (event.ctrlKey) {
                panning = true;
            }

            panOffset = {
                x: event.clientX - (thisScope.offset.x * thisScope.zoom),
                y: event.clientY - (thisScope.offset.y * thisScope.zoom)
            };

            event.preventDefault();
        });

        document.body.addEventListener("pointermove", function(event) {
            lastMousePosition = {
                x: event.clientX,
                y: event.clientY
            };

            if (!panning) {
                return;
            }

            thisScope.offset = {
                x: (event.clientX - panOffset.x) / thisScope.zoom,
                y: (event.clientY - panOffset.y) / thisScope.zoom
            };
        });

        document.body.addEventListener("pointerup", function() {
            panning = false;
        });

        this.canvasElement.addEventListener("wheel", function(event) {
            var previousZoom = thisScope.zoom;
            var lastX = null;
            var lastY = null;
            var workAreaRect = thisScope.workArea.element.getBoundingClientRect();

            if (lastMousePosition) {
                lastX = (lastMousePosition.x - workAreaRect.x - (thisScope.offset.x * thisScope.zoom)) / thisScope.zoom;
                lastY = (lastMousePosition.y - workAreaRect.y - (thisScope.offset.y * thisScope.zoom)) / thisScope.zoom;
            }

            thisScope.zoom -= event.deltaY * 0.01;

            if (thisScope.zoom < 0.1) {
                thisScope.zoom = 0.1;
            }

            thisScope.offset = {
                x: thisScope.offset.x * (previousZoom / thisScope.zoom),
                y: thisScope.offset.y * (previousZoom / thisScope.zoom)
            };

            if (lastMousePosition) {
                var absoluteX = (lastMousePosition.x - workAreaRect.x - (thisScope.offset.x * thisScope.zoom)) / thisScope.zoom;
                var absoluteY = (lastMousePosition.y - workAreaRect.y - (thisScope.offset.y * thisScope.zoom)) / thisScope.zoom;

                thisScope.offset.x -= lastX - absoluteX;
                thisScope.offset.y -= lastY - absoluteY;
            }
        });
    }

    render() {
        var workAreaRect = this.workArea.element.getBoundingClientRect();
        var sceneSize = this.scene.size;
        var context = this.canvasElement.getContext("2d");

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
}