import * as projects from "./projects.js";
import * as sceneObjects from "./sceneobjects.js";

export class StoryboardObject extends projects.ProjectModel {
    constructor(project, path) {
        super(project, path);

        this.registerProperty("position", {x: 100, y: 100}, "moved");
        this.registerProperty("size", {width: 600, height: 400}, "resized");
        this.registerReferenceProperty("parentGroup", SceneGroup);
    }
}

export class SceneGroup extends StoryboardObject {
    constructor(project, path = ["sceneGroups", projects.generateKey()]) {
        super(project, path);

        this.registerProperty("name", "", "renamed");
    }
}

export class Scene extends StoryboardObject {
    constructor(project, path = ["scenes", projects.generateKey()]) {
        super(project, path);
        
        this.size = {width: 1920, height: 1080};
        this.canvas = new OffscreenCanvas(this.size.width, this.size.height);

        this.objects = new projects.ProjectModelReferenceGroup(this.project, [...this.path, "objects"], sceneObjects.SceneObject);

        for (var type in sceneObjects.SCENE_OBJECT_TYPES) {
            this.objects.associateCustomModel(sceneObjects.SCENE_OBJECT_TYPES[type], (data) => data.type == type);
        }

        this.registerProperty("name", "", "renamed");
        this.registerProperty("scale", 1);

        this.events.resized.connect((event) => this.canvas = new OffscreenCanvas(event.value.width, event.value.height));
    }

    get canvasContext() {
        return this.canvas.getContext("2d");
    }

    render() {
        var objectsList = this.objects.getModelList();

        this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (var object of objectsList) {
            object.draw(this);
        }
    }
}