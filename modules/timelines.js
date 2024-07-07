import * as projects from "./projects.js";
import * as templates from "./templates.js";

export class TimelineSource extends projects.ProjectModel {
    constructor(project, path = ["timelines", projects.generateKey()]) {
        super(project, path);

        var thisScope = this;

        this.registerReferenceProperty("object");
        this.registerProperty("property");
        this.registerProperty("startTime", null, "stateChanged");
        this.registerProperty("stepTime", null, "stateChanged");
        this.registerProperty("keyframes", [], "keyframesChanged");

        this.events.stateChanged.connect(function() {
            thisScope.object[`${thisScope.property}_timeline`] = (thisScope.startTime != null || thisScope.stepTime != null) ? {
                start: thisScope.startTime,
                step: thisScope.stepTime,
                keyframes: thisScope.keyframes
            } : null;
        });
    }

    get duration() {
        var latestStartTime = 0;

        for (var keyframe of this.keyframes) {
            if (keyframe.t > latestStartTime) {
                latestStartTime = templates.evaluateNumericTemplate(keyframe.t);
            }
        }

        return latestStartTime;
    }

    emitKeyframesChangedEvent() {
        this.keyframes = this.keyframes;
    }
}

projects.registerModelSyncHandler(["timelines"], TimelineSource);