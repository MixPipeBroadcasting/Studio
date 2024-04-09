import * as projects from "./projects.js";

export class SceneObject extends projects.ProjectModel {
    constructor(project, path = ["sceneObjects", projects.generateKey()]) {
        super(project, path);

        this.registerProperty("type", null);
        this.registerProperty("name", "Object");
        this.registerProperty("x", 0, "moved");
        this.registerProperty("y", 0, "moved");
        this.registerProperty("width", 0, "resized");
        this.registerProperty("height", 0, "resized");
        this.registerReferenceProperty("parentObject", SceneObject);
    }

    draw(context) {}
}

export class Rectangle extends SceneObject {
    constructor(project, path = undefined) {
        super(project, path);

        this.registerProperty("type", "rectangle");
        this.registerProperty("name", "Rectangle");
        this.registerProperty("backgroundFill");
        this.registerProperty("borderWidth", 0);
        this.registerProperty("borderFill");
    }

    draw(context) {
        context.beginPath();
        context.rect(this.x, this.y, this.width, this.height);
        context.closePath();

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

export class CompositedScene extends SceneObject {
    constructor(project, path = undefined) {
        super(project, path);

        this.registerProperty("type", "compositedScene");
        this.registerProperty("name", "Composited scene");
        this.registerReferenceProperty("scene");
    }

    draw(context) {
        if (!this.scene) {
            return;
        }

        context.drawImage(
            this.scene.canvas,
            0, 0,
            this.scene.width, this.scene.height,
            this.x, this.y,
            this.width, this.height
        );
    }
}

export class Text extends SceneObject {
    constructor(project, path = undefined) {
        super(project, path);

        this.registerProperty("type", "text");
        this.registerProperty("name", "Text");
        this.registerProperty("text");
        this.registerProperty("font");
        this.registerProperty("backgroundFill");
        this.registerProperty("borderWidth");
        this.registerProperty("borderFill");
    }

    draw(context) {
        if (this.text.trim() == "") {
            return;
        }

        context.font = this.font || "100px system-ui, sans-serif";

        if (![null, "transparent"].includes(context.backgroundFill)) {
            context.fillStyle = this.backgroundFill;

            context.fillText(this.text || "", this.x, this.y);
        }

        if (this.borderWidth && this.borderWidth > 0) {
            context.lineWidth = String(this.borderWidth);
            context.strokeStyle = this.borderFill;

            context.strokeText(this.text || "", this.x, this.y);
        }
    }
}

export const SCENE_OBJECT_TYPES = {
    "rectangle": Rectangle,
    "compositedScene": CompositedScene,
    "text": Text
};