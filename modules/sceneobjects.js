import * as projects from "./projects.js";
import * as sources from "./sources.js";

var nextCompositionId = 0;
var logoImage = new Image();

logoImage.src = "media/logo.svg";

export class SceneObject extends projects.ProjectModel {
    constructor(project, path = ["sceneObjects", projects.generateKey()]) {
        super(project, path);

        this.registerProperty("type", null, null, false);
        this.registerProperty("name", "Object", "renamed", false);
        this.registerAnimationProperty("x", "number", 0, "moved");
        this.registerAnimationProperty("y", "number", 0, "moved");
        this.registerAnimationProperty("width", "number", 0, "resized");
        this.registerAnimationProperty("height", "number", 0, "resized");
        this.registerAnimationProperty("opacity", "number", 1, "filterChanged");
        this.registerAnimationProperty("originX", "number", 0, "originChanged");
        this.registerAnimationProperty("originY", "number", 0, "originChanged");
        this.registerAnimationProperty("rotation", "number", 0, "transformationChanged");

        this.ownerScene = null;
    }

    draw(context, options = {}) {
        context.save();

        var filterValues = [];

        if (this.getAnimatedValue("opacity") < 1) {
            filterValues.push(`opacity(${this.getAnimatedValue("opacity")})`);
        }
        
        context.filter = filterValues.join(" ");
        
        if (this.getAnimatedValue("rotation") != 0) {
            var originX = this.getAnimatedValue("x") + (this.getAnimatedValue("width") / 2) + this.getAnimatedValue("originX");
            var originY = this.getAnimatedValue("y") + (this.getAnimatedValue("height") / 2) + this.getAnimatedValue("originY");

            context.translate(originX, originY);
            context.rotate(this.getAnimatedValue("rotation") * Math.PI / 180);
            context.translate(-originX, -originY);
        }

        this._draw(context, options);

        context.restore();
    }

    _draw(context, options = {}) {}
}

export class Rectangle extends SceneObject {
    constructor(project, path = undefined) {
        super(project, path);

        this.registerProperty("type", "rectangle");
        this.registerProperty("name", "Rectangle", "renamed", false);
        this.registerProperty("backgroundFill");
        this.registerAnimationProperty("borderWidth", "number", 0);
        this.registerProperty("borderFill");
    }

    _draw(context, options = {}) {
        this.templateOptions = options;

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
        this.registerProperty("name", "Composited scene", "renamed", false);
        this.registerReferenceProperty("scene", null, "sceneChanged", true);

        this.compositionId = nextCompositionId++;
        this.uniqueCanvas = null;
    }

    get attributeTypeListOwner() {
        return this.scene;
    }

    _draw(context, options = {}) {
        this.templateOptions = options;

        if (!this.scene) {
            var template = this.project.get([...this.path, "scene"]);
            var isPlaceholder = typeof(template) == "string";

            context.fillStyle = isPlaceholder ? "black" : "#770000";
            context.strokeStyle = "white";
            context.lineWidth = 2;

            var x = this.getAnimatedValue("x");
            var y = this.getAnimatedValue("y");
            var width = this.getAnimatedValue("width");
            var height = this.getAnimatedValue("height");

            context.beginPath();
            context.rect(x, y, width, height);
            context.closePath();
            context.fill();
            context.stroke();

            context.font = "50px Overpass, system-ui, sans-serif";
            context.fillStyle = "white";
            context.textAlign = "center";

            context.save();
            context.beginPath();
            context.rect(x, y, width, height);
            context.clip();

            context.globalAlpha = 0.5;
            context.filter = "grayscale(1)";

            context.drawImage(
                logoImage,
                0, 0, logoImage.width, logoImage.height,
                x + 20, y + 20, height * 0.2, height * 0.2
            );

            context.globalAlpha = 1;
            context.filter = null;

            context.textBaseline = "bottom";

            context.fillText(isPlaceholder ? this.referencePropertyTemplateActualResult : "(Unknown scene)", x + (width / 2), y + (height / 2) - 10);

            context.font = "40px Overpass, system-ui, sans-serif";
            context.textBaseline = "top";

            context.fillText(`${Math.round(width)}×${Math.round(height)}`, (x + width / 2), y + (height / 2) + 10);

            context.restore();

            return;
        }

        var attributeTypes = this.scene.getAllAttributeTypes();
        var canvas = this.scene.canvas;

        if (attributeTypes.length > 0 && !options.callStack?.includes(this.scene)) {
            var sceneOptions = {...options};

            if (!this.uniqueCanvas) {
                this.uniqueCanvas = new OffscreenCanvas(this.scene.width, this.scene.height);
            } else {
                this.uniqueCanvas.width = this.scene.width;
                this.uniqueCanvas.height = this.scene.height;
            }

            canvas = this.uniqueCanvas;

            sceneOptions.compositionChain ||= "";
            sceneOptions.compositionChain += `${this.compositionId},`;
            sceneOptions.env ||= {};

            for (var attributeType of attributeTypes) {
                this.ensureAttributeProperty(attributeType.id);

                sceneOptions.env[attributeType.id] = this.getAnimatedValue(`attr:${attributeType.id}`, attributeType.type || "string");
            }

            this.scene.drawToContext(canvas.getContext("2d"), sceneOptions);
        }

        context.drawImage(
            canvas,
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
        this.registerProperty("name", "Text", "renamed", false);
        this.registerProperty("text");
        this.registerProperty("font");
        this.registerProperty("fontSize", 100);
        this.registerProperty("backgroundFill");
        this.registerProperty("borderWidth");
        this.registerProperty("borderFill");
    }

    _draw(context, options = {}) {
        this.templateOptions = options;

        if (!this.text || String(this.text).trim() == "") {
            return;
        }

        var x = this.getAnimatedValue("x");
        var y = this.getAnimatedValue("y");
        var width = this.getAnimatedValue("width");
        var height = this.getAnimatedValue("height");
        var fontSize = this.getAnimatedValue("fontSize");
        var lines = this.getValue("text").split("\n") || "";

        context.save();
        context.beginPath();
        context.rect(x, y, width, height);
        context.clip();

        context.font = `${fontSize}px ${this.getValue("font") || "Overpass, system-ui, sans-serif"}`;
        context.textAlign = "start";
        context.textBaseline = "alphabetic";

        if (![null, "transparent"].includes(context.backgroundFill)) {
            context.fillStyle = this.backgroundFill;

            for (var i = 0; i < lines.length; i++) {
                context.fillText(lines[i], x, y + (fontSize * (i + 1)));
            }
        }

        if (this.borderWidth && this.borderWidth > 0) {
            context.lineWidth = String(this.getAnimatedValue("borderWidth"));
            context.strokeStyle = this.borderFill;

            for (var i = 0; i < lines.length; i++) {
                context.strokeText(lines[i], x, y + (fontSize * (i + 1)));
            }
        }

        context.restore();
    }
}

export class Graphic extends SceneObject {
    constructor(project, path = undefined) {
        super(project, path);

        this.registerProperty("type", "graphic");
        this.registerProperty("name", "Graphic", "renamed", false);
        this.registerProperty("uri", "", "uriChanged", true);

        this._cachedGraphicUri = null;
        this._cachedGraphicImage = null;
    }

    async getImage() {
        var source = sources.get(this.project, this.getValue("uri"), "graphic");

        try {
            this._cachedGraphicImage = await source.getGraphic();
        } catch (error) {
            console.warn(error);

            this._cachedGraphicImage = null;
        }

        return this._cachedGraphicImage;
    }

    _draw(context, options = {}) {
        if (this.getValue("uri") != this._cachedGraphicUri) {
            this._cachedGraphicUri = this.getValue("uri");

            this.getImage();
        }

        if (this._cachedGraphicImage) {
            context.drawImage(
                this._cachedGraphicImage,
                0, 0,
                this._cachedGraphicImage.width,
                this._cachedGraphicImage.height,
                this.getAnimatedValue("x"),
                this.getAnimatedValue("y"),
                this.getAnimatedValue("width"),
                this.getAnimatedValue("height")
            );
        }
    }
}

export const SCENE_OBJECT_TYPES = {
    "rectangle": Rectangle,
    "compositedScene": CompositedScene,
    "text": Text,
    "graphic": Graphic
};

Object.keys(SCENE_OBJECT_TYPES).forEach(function(type) {
    projects.registerModelSyncHandler(["sceneObjects"], SCENE_OBJECT_TYPES[type], (data) => data.type == type);
});