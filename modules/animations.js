import BezierEasing from "../lib/bezier-easing.min.js";

import * as common from "./common.js";
import * as templates from "./templates.js";

export const EASING_METHODS = {
    linear: [0, 0, 1, 1],
    ease: [0.25, 0.1, 0.25, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1]
};

export const INTERPOLATION_METHODS = {
    number: function(from, to, t) {
        return common.lerp(from, to, t);
    }
};

export function getValueInTimeline(timeline, interpolationMethod = INTERPOLATION_METHODS.number, atTime = Date.now()) {
    var dt = atTime - timeline.start;
    var fromKeyframe = null;
    var toKeyframe = timeline.keyframes[0];

    for (var keyframe of timeline.keyframes) {
        fromKeyframe = toKeyframe;
        toKeyframe = keyframe;

        if (dt < templates.evaluateNumericTemplate(keyframe.t)) {
            break;
        }
    }

    var boundedT = common.clamp(common.invLerp(
        templates.evaluateNumericTemplate(fromKeyframe.t),
        templates.evaluateNumericTemplate(toKeyframe.t),
        dt
    ), 0, 1);

    return interpolationMethod(
        templates.evaluateNumericTemplate(fromKeyframe.value),
        templates.evaluateNumericTemplate(toKeyframe.value),
        BezierEasing(...(toKeyframe.easing?.map((value) => templates.evaluateNumericTemplate(value)) || EASING_METHODS.linear))(boundedT)
    );
}