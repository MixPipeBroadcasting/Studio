import * as projects from "./projects.js";
import * as templates from "./templates.js";
import * as animations from "./animations.js";

export class KeyframeSource extends projects.ProjectModel {
    constructor(project, path = ["keyframes", projects.generateKey()]) {
        super(project, path);

        this.registerProperty("time", 0, "changed");
        this.registerProperty("value", null, "changed");
        this.registerProperty("easing", animations.EASING_METHODS.linear, "changed");
    }

    static deserialise(project, keyframe) {
        var instance = new this(project);

        instance.time = keyframe.t;
        instance.value = keyframe.value;

        if (keyframe.easing) {
            instance.easing = keyframe.easing;
        }

        return instance;
    }

    serialise() {
        return {
            t: this.time,
            value: this.value,
            easing: this.easing
        };
    }
}

export class TimelineSource extends projects.ProjectModel {
    constructor(project, path = ["timelines", projects.generateKey()]) {
        super(project, path);

        var thisScope = this;

        this.registerReferenceProperty("object");
        this.registerProperty("property");
        this.registerProperty("startTime", null, "stateChanged");
        this.registerProperty("stepTime", null, "stateChanged");

        this.keyframes = new projects.ProjectModelReferenceGroup(this.project, [...this.path, "keyframes"], KeyframeSource);

        this.events.stateChanged.connect(function() {
            thisScope.object[`${thisScope.property}_timeline`] = (thisScope.startTime != null || thisScope.stepTime != null) ? {
                start: thisScope.startTime,
                step: thisScope.stepTime,
                keyframes: thisScope.keyframes.getModelList().map((keyframe) => keyframe.serialise())
            } : null;
        });
    }

    get duration() {
        var latestStartTime = 0;

        for (var keyframe of this.keyframes.getModelList()) {
            if (keyframe.time > latestStartTime) {
                latestStartTime = templates.evaluateNumericTemplate(keyframe.time);
            }
        }

        return latestStartTime;
    }

    setFromSerialisedKeyframes(keyframes) {
        this.keyframes.clearModels();

        for (var keyframe of keyframes) {
            this.keyframes.addModel(KeyframeSource.deserialise(this.project, keyframe));
        }
    }
}

projects.registerModelSyncHandler(["keyframes"], KeyframeSource);
projects.registerModelSyncHandler(["timelines"], TimelineSource);