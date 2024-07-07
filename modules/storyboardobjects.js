import * as projects from "./projects.js";
import * as sceneObjects from "./sceneobjects.js";
import * as timelines from "./timelines.js";

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
        return (
            (isCountdown ? "-" : "") +
            String(Math.floor(durationToShow / 1000)).padStart(2, "0") +
            "." +
            String(Math.floor(durationToShow % 1000)).padStart(3, "0")
        );
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
}

projects.registerModelSyncHandler(["storyboardGroups"], StoryboardGroup);
projects.registerModelSyncHandler(["scenes"], Scene);
projects.registerModelSyncHandler(["animationControllers"], AnimationController);