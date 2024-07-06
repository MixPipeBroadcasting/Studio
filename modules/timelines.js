import * as projects from "./projects.js";

export class TimelineSource extends projects.ProjectModel {
    constructor(project, path = ["timelines", projects.generateKey()]) {
        super(project, path);

        this.registerReferenceProperty("scene");
        this.registerProperty("property");
        this.registerProperty("keyframes", []);
    }

    get duration() {
        var latestStartTime = 0;

        for (var keyframe of this.keyframes) {
            if (keyframe.t > latestStartTime) {
                latestStartTime = keyframe.t;
            }
        }

        return latestStartTime;
    }
}

projects.registerModelSyncHandler(["timelines"], TimelineSource);