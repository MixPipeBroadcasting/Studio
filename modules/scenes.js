import * as projects from "./projects.js";

export class StoryboardObject extends projects.ProjectModel {
    constructor(project, path) {
        super(project, path);

        this.registerProperty("position", {x: 100, y: 100}, "moved");
        this.registerProperty("size", {width: 1920, height: 1080}, "resized");
        this.registerReferenceProperty("parentGroup", SceneGroup);
    }
}

export class SceneGroup extends StoryboardObject {
    constructor(project, path) {
        super(project, path ?? ["sceneGroups", projects.generateKey()]);

        this.registerProperty("name", "", "renamed");
    }
}

export class Scene extends StoryboardObject {
    constructor(project, path) {
        super(project, path ?? ["scenes", projects.generateKey()]);
        
        this.size = {width: 1920, height: 1080};
        this.canvas = new OffscreenCanvas(this.size.width, this.size.height);

        this.registerProperty("name", "", "renamed");
        this.registerProperty("scale", 1);

        this.events.resized.connect((event) => this.canvas = new OffscreenCanvas(event.value.width, event.value.height));

        console.log("constructed", this);
    }

    render() {
        var context = this.canvas.getContext("2d");

        context.fillStyle = "red";
        context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        context.fillStyle = "green";
        context.fillRect(10, 10, this.canvas.width / 2, this.canvas.height / 2);
    }
}