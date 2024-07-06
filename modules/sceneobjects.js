import * as projects from "./projects.js";

export class SceneObject extends projects.ProjectModel {
    constructor(project, path = ["sceneObjects", projects.generateKey()]) {
        super(project, path);

        this.registerProperty("type", null, null, false);
        this.registerProperty("name", "Object", null, false);
        this.registerAnimationProperty("x", "number", 0, "moved");
        this.registerAnimationProperty("y", "number", 0, "moved");
        this.registerAnimationProperty("width", "number", 0, "resized");
        this.registerAnimationProperty("height", "number", 0, "resized");
        this.registerReferenceProperty("parentObject");
    }

    draw(context) {}
}

export class Rectangle extends SceneObject {
    constructor(project, path = undefined) {
        super(project, path);

        this.registerProperty("type", "rectangle");
        this.registerProperty("name", "Rectangle", null, false);
        this.registerProperty("backgroundFill");
        this.registerAnimationProperty("borderWidth", "number", 0);
        this.registerProperty("borderFill");
    }

    draw(context) {
        context.beginPath();

        context.rect(
            this.getAnimatedValue("x"),
            this.getAnimatedValue("y"),
            this.getAnimatedValue("width"),
            this.getAnimatedValue("height")
        );

        context.closePath();

        var backgroundFill = this.getValue("backgroundFill");

        if (![null, "transparent"].includes(backgroundFill)) {
            context.fillStyle = backgroundFill;

            context.fill();
        }

        var borderWidth = this.getAnimatedValue("borderWidth");

        if (borderWidth && borderWidth > 0) {
            context.lineWidth = String(borderWidth);
            context.strokeStyle = this.getValue("borderFill");

            context.stroke();
        }
    }
}

export class CompositedScene extends SceneObject {
    constructor(project, path = undefined) {
        super(project, path);

        this.registerProperty("type", "compositedScene");
        this.registerProperty("name", "Composited scene", null, false);
        this.registerReferenceProperty("scene");
    }

    draw(context) {
        if (!this.scene) {
            return;
        }

        context.drawImage(
            this.scene.canvas,
            0, 0,
            this.scene.width,
            this.scene.height,
            this.getAnimatedValue("x"),
            this.getAnimatedValue("y"),
            this.getAnimatedValue("width"),
            this.getAnimatedValue("height")
        );
    }
}

export class Text extends SceneObject {
    constructor(project, path = undefined) {
        super(project, path);

        this.registerProperty("type", "text");
        this.registerProperty("name", "Text", null, false);
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

        var x = this.getAnimatedValue("x");
        var y = this.getAnimatedValue("y");
        var text = this.getValue("text") || "";

        context.font = this.getValue("font") || "100px system-ui, sans-serif";

        if (![null, "transparent"].includes(context.backgroundFill)) {
            context.fillStyle = this.backgroundFill;

            context.fillText(text, x, y);
        }

        if (this.borderWidth && this.borderWidth > 0) {
            context.lineWidth = String(this.getAnimatedValue("borderWidth"));
            context.strokeStyle = this.borderFill;

            context.strokeText(text, x, y);
        }
    }
}

export const SCENE_OBJECT_TYPES = {
    "rectangle": Rectangle,
    "compositedScene": CompositedScene,
    "text": Text
};

Object.keys(SCENE_OBJECT_TYPES).forEach(function(type) {
    projects.registerModelSyncHandler(["sceneObjects"], SCENE_OBJECT_TYPES[type], (data) => data.type == type);
});