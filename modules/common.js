var keyIndex = 0;

export const RECT_OPPOSITE_SIDES = {
    "top": "bottom",
    "bottom": "top",
    "left": "right",
    "right": "left"
};

export function generateKey() {
    const DIGITS = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";

    return BigInt(BigInt(Math.floor(Date.now() * 100) * 256) + BigInt(keyIndex++))
        .toString(2)
        .split(/(.{0,6})/)
        .filter((part) => part != "")
        .map((part) => DIGITS[parseInt(part, 2)])
        .join("")
    ;
}

export function lerp(v0, v1, t) {
    return (v0 * (1 - t)) + (v1 * t);
}

export function invLerp(v0, v1, v) {
    return (v - v0) / (v1 - v0);
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export function ctrlOrCommandKey(event) {
    return navigator.userAgent.match(/mac/i) ? event.metaKey : event.ctrlKey;
}

export function getRectCentre(rect) {
    return {x: rect.x + (rect.width / 2), y: rect.y + (rect.height / 2)};
}

export function getBestRectSide(thisRect, otherRect) {
    var thisCentre = getRectCentre(thisRect);
    var otherCentre = getRectCentre(otherRect);
    var shouldBeHorizontal = thisRect.y < otherCentre.y && otherRect.y < thisCentre.y;

    if (shouldBeHorizontal) {
        return thisCentre.x > otherCentre.x ? "left" : "right";
    } else {
        return thisCentre.y > otherCentre.y ? "top" : "bottom";
    }
}

export function rectSideToPoint(rect, side) {
    var centre = getRectCentre(rect);
    var sourcePoint;

    if (side == "top") {
        sourcePoint = {x: centre.x, y: rect.top};
    } else if (side == "bottom") {
        sourcePoint = {x: centre.x, y: rect.bottom};
    } else if (side == "left") {
        sourcePoint = {x: rect.left, y: centre.y};
    } else if (side == "right") {
        sourcePoint = {x: rect.right, y: centre.y};
    }

    return sourcePoint;
}