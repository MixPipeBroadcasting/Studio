import * as projects from "./projects.js";
import * as sceneObjects from "./sceneobjects.js";
import * as timelines from "./timelines.js";
import * as sources from "./sources.js";

export class AttributeType extends projects.ProjectModel {
    constructor(project, path = ["attributeTypes", projects.generateKey()]) {
        super(project, path);

        this.registerProperty("id", null, "idChanged");
        this.registerProperty("name", null, "renamed");
        this.registerProperty("type", "string", "typeChanged");
        this.registerReferenceProperty("parentStoryboardObject", null, "reparented");

        this.placeholder = "";
        this.defaultValue = null;
        this.choices = null;
        this.useChoices = false;
    }

    get sanitisedId() {
        return this.id?.match(/([a-zA-Z_][a-zA-Z0-9_]*)/)?.[1] || "";
    }
}

export class BuiltInAttributeChoice {
    constructor(name, value) {
        this.name = name;
        this.value = value;
    }
}

export class BuiltInAttributeType {
    constructor(id, name, type = "string", options = {}) {
        this.id = id;
        this.name = name;
        this.type = type;

        this.placeholder = options.placeholder ?? "";
        this.defaultValue = options.defaultValue ?? null;
        this.choices = options.choices ?? null;
        this.useChoices = !!options.choices;
    }

    get sanitisedId() {
        return this.id;
    }
}

export class Connection {
    constructor(source, destination, attributes = {}) {
        this.source = source;
        this.destination = destination;
        this.attributes = attributes;

        this.upstreamConnections = [];
        this.downstreamConnections = [];
        this.type = null;
    }

    updateType(updatedTypes = []) {
        if (updatedTypes.includes(this)) {
            return;
        }

        var affectedByDownstream = true;

        this.type = "inactive";

        if (this.source instanceof AnimationController) {
            if (this.source.state == "running") {
                this.type = "activeAnimation";
            } else if (this.source.state == "stepping") {
                this.type = "steppingAnimation";
            } else {
                this.type = "inactiveAnimation";
            }

            affectedByDownstream = false;
        }

        if (this.destination instanceof VisionMixer) {
            if (this.source.isSameModel(this.destination.programmeScene)) {
                this.type = "programme";
            } else if (this.source.isSameModel(this.destination.previewScene)) {
                this.type = "preview";
            }

            affectedByDownstream = false;
        }

        if (this.attributes.sourceIsTemplateScene) {
            this.type = "template";
            affectedByDownstream = false;
        }

        if (affectedByDownstream) {
            var downstreamTypes = this.downstreamConnections.map((connection) => connection.type);

            if (downstreamTypes.includes("programme")) {
                this.type = "programme";
            } else if (downstreamTypes.includes("preview")) {
                this.type = "preview";
            } else if (this.type == "inactive" && downstreamTypes.includes("active")) {
                this.type = "active";
            } else if (this.type == "inactive" && downstreamTypes.length == 0) {
                this.type = "active";
            }
        }

        this.upstreamConnections.forEach((connection) => connection.updateType([...updatedTypes, this]));
    }
}

export class StoryboardObject extends projects.ProjectModel {
    constructor(project, path) {
        super(project, path);

        this.registerProperty("x", 100, "moved");
        this.registerProperty("y", 100, "moved");
        this.registerProperty("width", 600, "resized");
        this.registerProperty("height", 400, "resized");
        this.registerReferenceProperty("parentGroup", null, "reparented");

        this.attributeTypes = new projects.ProjectModelReferenceGroup(this.project, [...this.path, "attributeTypes"], AttributeType);
        this.builtInAttributeTypes = [];
    }

    getConnections() {
        return [];
    }

    getAllAttributeTypes() {
        return [...this.attributeTypes.getModelList(), ...this.builtInAttributeTypes];
    }

    addAttributeType(attributeType) {
        attributeType.parentStoryboardObject = this;

        this.attributeTypes.addModel(attributeType);
    }
}

export class StoryboardGroup extends StoryboardObject {
    constructor(project, path = ["storyboardGroups", projects.generateKey()]) {
        super(project, path);

        this.registerProperty("name", "", "renamed");
    }
}

export class Scene extends StoryboardObject {
    constructor(project, path = ["scenes", projects.generateKey()]) {
        super(project, path);

        this.width = 1920;
        this.height = 1080;
        this.canvas = new OffscreenCanvas(this.width, this.height);

        this.objects = new projects.ProjectModelReferenceGroup(this.project, [...this.path, "objects"], sceneObjects.SceneObject);

        this.registerProperty("name", "", "renamed");
        this.registerProperty("scale", 1);

        this.events.resized.connect(() => this.canvas = new OffscreenCanvas(this.width, this.height));

        this._lastConnections = [];
    }

    get canvasContext() {
        return this.canvas.getContext("2d");
    }

    _updateConnections() {
        this._lastConnections = [];

        for (var object of this.objects.getModelList()) {            
            if (object instanceof sceneObjects.CompositedScene && object.scene) {
                var rawValue = object.project.get([...object.path, "scene"]);

                if (!Array.isArray(rawValue)) {
                    continue;
                }

                var sourceIsTemplateScene = false;
                var innerSceneObjects = object.scene.objects.getModelList().filter((innerObject) => innerObject instanceof sceneObjects.CompositedScene);
                var innerScenes = [];

                for (var innerSceneObject of innerSceneObjects) {
                    innerScenes.push(innerSceneObject.scene);
                }

                for (var innerSceneObject of innerSceneObjects) {
                    innerSceneObject.templateOptions ||= {};
                    innerSceneObject.templateOptions.compositionChain = null;

                    if (!(innerSceneObject.scene instanceof Scene)) {
                        sourceIsTemplateScene = true;
                    }
                }

                if (sourceIsTemplateScene) {
                    for (var innerScene of innerScenes) {
                        if (innerScene instanceof Scene) {
                            this._lastConnections.push(new Connection(innerScene, this));
                        }
                    }
                }

                this._lastConnections.push(new Connection(object.scene, this, {sourceIsTemplateScene}));
            }
        }
    }

    getConnections() {
        return this._lastConnections;
    }

    getObjectsAtPoint(point) {
        var objectsAtPoint = [];

        for (var object of this.objects.getModelList()) {
            var x = object.getAnimatedValue("x");
            var y = object.getAnimatedValue("y");
            var width = object.getAnimatedValue("width");
            var height = object.getAnimatedValue("height");

            if (
                x <= point.x && y <= point.y &&
                x + width > point.x && y + height > point.y
            ) {
                objectsAtPoint.push(object);
            }
        }

        return objectsAtPoint;
    }

    drawToContext(context = this.canvasContext, options = {}) {
        if (options.callStack?.includes(this)) {
            return;
        }

        options.callStack = [...(options.callStack || []), this];

        options.templateEnv ||= {};

        for (var attributeType of this.getAllAttributeTypes()) {
            options.templateEnv[attributeType.id] = `[[ ${attributeType.name} ]]`;
        }

        for (var object of this.objects.getModelList()) {
            object.ownerScene = this;

            object.draw(context, options);
        }

        this._updateConnections();
    }

    render() {
        this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawToContext();
    }
}

export class Feed extends Scene {
    constructor(project, path = ["feeds", projects.generateKey()]) {
        super(project, path);

        this.registerProperty("uri", "camera:video", "uriChanged");

        this.connectCalled = false;
        this.videoElement = document.createElement("video");
    }

    render() {
        var thisScope = this;

        this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.uri) {
            this.canvasContext.fillStyle = "black";

            this.canvasContext.fillRect(0, 0, this.canvas.width, this.canvas.height);

            return;
        }

        var source = sources.get(this.project, this.uri, "feed");

        if (!source.isConnected) {
            if (!this.connectCalled) {
                source.connect();

                this.connectCalled = true;
            }

            return;
        }

        if (source instanceof sources.CameraSource) {
            if (this.videoElement.srcObject != source.stream) {
                this.videoElement.srcObject = source.stream;

                this.videoElement.addEventListener("loadedmetadata", function() {
                    thisScope.videoElement.play();
                });
            }

            if (this.videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                this.canvas.width = this.videoElement.videoWidth;
                this.canvas.height = this.videoElement.videoHeight;

                if (this.width != this.videoElement.videoWidth || this.height != this.videoElement.videoHeight) {
                    this.width = this.videoElement.videoWidth;
                    this.height = this.videoElement.videoHeight;
                }

                this.canvasContext.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
            }
        }
    }
}

export class VisionMixer extends Scene {
    static _builtInAttributeTypes = [
        new BuiltInAttributeType("bus", "Bus", "string", {
            defaultValue: "programme",
            choices: [
                new BuiltInAttributeChoice("Programme", "programme"),
                new BuiltInAttributeChoice("Preview", "preview")
            ]
        })
    ];

    constructor(project, path = ["visionMixers", projects.generateKey()]) {
        super(project, path);

        this.sourceScenes = new projects.ProjectModelReferenceGroup(this.project, [...this.path, "sourceScenes"], Scene);

        this.registerReferenceProperty("programmeScene", null, "transitionStarted");
        this.registerReferenceProperty("previewScene", null, "previewSelected");

        this.builtInAttributeTypes = this.constructor._builtInAttributeTypes;
    }

    getConnections() {
        var connections = [];

        for (var scene of this.sourceScenes.getModelList()) {
            connections.push(new Connection(scene, this));
        }

        return connections;
    }

    drawToContext(context = this.canvasContext, options = {}) {
        if (options.callStack?.includes(this)) {
            return;
        }

        options.callStack = [...(options.callStack || []), this];

        var bus = options.env?.bus ?? "programme";

        if (bus == "preview") {
            this.previewScene?.drawToContext(context, options);

            return;
        }

        this.programmeScene?.drawToContext(context, options);
    }
}

export class AnimationController extends StoryboardObject {
    constructor(project, path = ["animationControllers", projects.generateKey()]) {
        super(project, path);

        this.timelines = new projects.ProjectModelReferenceGroup(this.project, [...this.path, "timelines"], timelines.TimelineSource);

        this.registerProperty("name", "", "renamed");
        this.registerProperty("startTime", null, "stateChanged");
        this.registerProperty("stepTime", null, "stateChanged");
    }

    get duration() {
        var longestDuration = 0;

        for (var timeline of this.timelines.getModelList()) {
            if (timeline.duration > longestDuration) {
                longestDuration = timeline.duration;
            }
        }

        return longestDuration;
    }

    get state() {
        if (this.stepTime != null) {
            return "stepping";
        }

        if (this.startTime == null) {
            return "stopped";
        }

        if (Date.now() - this.startTime < this.duration) {
            return "running";
        }

        return "finished";
    }

    get currentTime() {
        if (this.stepTime != null) {
            return this.stepTime;
        }

        if (this.startTime == null) {
            return 0;
        }

        return Math.min(Date.now() - this.startTime, this.duration);
    }

    static renderDisplayTime(durationToShow, isCountdown = false) {
        if (durationToShow < 0) {
            durationToShow = 0;
        }

        return (
            (isCountdown ? "-" : "") +
            String(Math.floor(durationToShow / 1000)).padStart(2, "0") +
            "." +
            String(Math.floor(durationToShow % 1000)).padStart(3, "0")
        );
    }

    getConnections() {
        var connections = [];

        for (var timeline of this.timelines.getModelList()) {
            if (timeline.object instanceof sceneObjects.SceneObject && timeline.object.ownerScene) {
                connections.push(new Connection(this, timeline.object.ownerScene));
            }
        }

        return connections;
    }

    getDisplayTime(type = "general") {
        var durationToShow = 0;
        var isCountdown = false;

        if (type == "progress") {
            if (this.state == "running" || this.state == "stepping") {
                durationToShow = this.currentTime;
            } else if (this.state == "finished") {
                durationToShow = this.duration;
            }
        } else {
            if (this.state == "running" || this.state == "stepping") {
                durationToShow = this.duration - this.currentTime;
                isCountdown = true;
            } else if (this.state == "finished") {
                isCountdown = true;
            } else {
                durationToShow = this.duration;
            }
        }

        return this.constructor.renderDisplayTime(durationToShow, isCountdown);
    }

    start(time = Date.now()) {
        this.startTime = time;
        this.stepTime = null;

        for (var timeline of this.timelines.getModelList()) {
            timeline.startTime = time;
            timeline.stepTime = null;
        }
    }

    step(time = 0) {
        this.startTime = null;
        this.stepTime = time;

        for (var timeline of this.timelines.getModelList()) {
            timeline.startTime = null;
            timeline.stepTime = time;
        }
    }

    update() {
        this.step(this.currentTime);
    }

    reset() {
        this.startTime = null;
        this.stepTime = null;

        for (var timeline of this.timelines.getModelList()) {
            timeline.startTime = null;
            timeline.stepTime = null;
        }
    }

    startOrReset() {
        if (this.state != "stopped") {
            this.reset();

            return;
        }
        
        this.start();
    }

    addTimeline(timeline) {
        timeline.parentAnimationController = this;

        this.timelines.addModel(timeline);
    }
}

projects.registerModelSyncHandler(["attributeTypes"], AttributeType);
projects.registerModelSyncHandler(["storyboardGroups"], StoryboardGroup);
projects.registerModelSyncHandler(["scenes"], Scene);
projects.registerModelSyncHandler(["feeds"], Feed);
projects.registerModelSyncHandler(["visionMixers"], VisionMixer);
projects.registerModelSyncHandler(["animationControllers"], AnimationController);