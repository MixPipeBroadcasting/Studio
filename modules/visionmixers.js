import * as projects from "./projects.js";

export class VisionMixerSourceScene extends projects.ProjectModel {
    constructor(project, path = ["visionMixerSourceScenes", projects.generateKey()]) {
        super(project, path);

        this.registerReferenceProperty("scene");
        this.registerReferenceProperty("parentVisionMixer", null, "reparented");
    }
}

export class VisionMixerTransition extends projects.ProjectModel {
    constructor(project, path = ["visionMixerTransitions", projects.generateKey()]) {
        super(project, path);

        this.registerReferenceProperty("scene");
        this.registerReferenceProperty("animationController");
        this.registerReferenceProperty("parentVisionMixer", null, "reparented");
    }
}

projects.registerModelSyncHandler(["visionMixerSourceScenes"], VisionMixerSourceScene);
projects.registerModelSyncHandler(["visionMixerTransitions"], VisionMixerTransition);