import * as projects from "./projects.js";

export class SceneGroup extends projects.ProjectModel {
    constructor(project, path) {
        super(project, path ?? ["sceneGroups", projects.generateKey()]);

        this.registerProperty("name");
        this.registerProperty("position", {x: 100, y: 100});
        this.registerProperty("size", {w: 100, h: 100});
        this.registerReferenceProperty("parentGroup");
    }
}

export class Scene extends projects.ProjectModel {
    constructor(project, path) {
        super(project, path ?? ["scenes", projects.generateKey()]);

        this.registerProperty("position", {x: 100, y: 100});
        this.registerProperty("scale", 1);
        this.registerReferenceProperty("parentGroup");
    }
}