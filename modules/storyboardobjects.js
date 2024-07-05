import * as projects from "./projects.js";
import * as sceneObjects from "./sceneobjects.js";
import * as animations from "./animations.js";

export class StoryboardObject extends projects.ProjectModel {
    constructor(project, path) {
        super(project, path);

        this.registerProperty("x", 100, "moved");
        this.registerProperty("y", 100, "moved");
        this.registerProperty("width", 600, "resized");
        this.registerProperty("height", 400, "resized");
        this.registerReferenceProperty("parentGroup", null, "reparented");
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

        for (var type in sceneObjects.SCENE_OBJECT_TYPES) {
            this.objects.associateCustomModel(sceneObjects.SCENE_OBJECT_TYPES[type], (data) => data.type == type);
        }

        this.registerProperty("name", "", "renamed");
        this.registerProperty("scale", 1);

        this.events.resized.connect(() => this.canvas = new OffscreenCanvas(this.width, this.height));
    }

    get canvasContext() {
        return this.canvas.getContext("2d");
    }

    getObjectsAtPoint(point) {
        var objectsAtPoint = [];

        for (var object of this.objects.getModelList()) {
            if (
                object.x <= point.x &&
                object.y <= point.y &&
                object.x + object.width > point.x &&
                object.y + object.height > point.y
            ) {
                objectsAtPoint.push(object);
            }
        }

        return objectsAtPoint;
    }

    drawToContext(context = this.canvasContext) {
        for (var object of this.objects.getModelList()) {
            object.draw(context);
        }
    }

    render() {
        this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawToContext();
    }
}

export class AnimationController extends StoryboardObject {
    constructor(project, path = ["animationControllers", projects.generateKey()]) {
        super(project, path);

        this.timelines = new projects.ProjectModelReferenceGroup(this.project, [...this.path, "timelines"], animations.TimelineSource);

        this.registerProperty("name", "", "renamed");
        this.registerProperty("startTime", null, "stateChanged");

        var timeline = new animations.TimelineSource(project);

        this.timelines.addModel(timeline);

        timeline.keyframes = [
            {t: 0, value: 0},
            {t: 5000, value: 1}
        ];
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
        if (this.startTime == null) {
            return "stopped";
        }

        if (Date.now() - this.startTime < this.duration) {
            return "running";
        }

        return "finished";
    }
}

projects.registerModelSyncHandler(["storyboardGroups"], StoryboardGroup);
projects.registerModelSyncHandler(["scenes"], Scene);
projects.registerModelSyncHandler(["animationControllers"], AnimationController);