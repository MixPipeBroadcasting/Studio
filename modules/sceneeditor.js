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

        this.workArea.element.append(this.canvasElement);

        this.add(this.toolbar, this.workArea);

        this.scene.events.renamed.connect(() => this.name = scene.name);

        requestAnimationFrame(function render() {
            thisScope.render();

            requestAnimationFrame(render);
        });

        var panning = false;
        var panOffset = null;

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

document.body.addEventListener("pointermove", function(event) {
    lastAbsolutePointerPosition = {
        x: event.clientX,
        y: event.clientY
    };
});