import * as projects from "./projects.js";

export class SceneObject extends projects.ProjectModel {
    constructor(project, path = ["sceneObjects", projects.generateKey()]) {
        super(project, path);

        this.registerProperty("type", null);
        this.registerProperty("position", {x: 100, y: 100}, "moved");
        this.registerProperty("size", {width: 600, height: 400}, "resized");
        this.registerReferenceProperty("parentObject", SceneObject);
    }

    draw(scene) {}
}

export class Rectangle extends SceneObject {
    constructor(project, path = undefined) {
        super(project, path);

        this.registerProperty("type", "rectangle");
        this.registerProperty("backgroundFill");
        this.registerProperty("borderWidth");
        this.registerProperty("borderFill");
    }

    draw(scene) {
        var context = scene.canvasContext;

        context.beginPath();

        context.rect(this.position.x, this.position.y, this.size.width, this.size.height);

        if (![null, "transparent"].includes(context.backgroundFill)) {
            context.fillStyle = this.backgroundFill;
            context.fill();
        }

        if (this.borderWidth && this.borderWidth > 0) {
            context.lineWidth = String(this.borderWidth);
            context.strokeStyle = this.borderFill;

            context.stroke();
        }
    }
}

export const SCENE_OBJECT_TYPES = {
    "rectangle": Rectangle
};