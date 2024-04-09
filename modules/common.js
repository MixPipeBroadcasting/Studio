export function lerp(v0, v1, t) {
    return (v0 * (1 - t)) + (v1 * t);
}

export function invLerp(v0, v1, v) {
    return (v - v0) / (v1 - v0);
}

export function ctrlOrCommandKey(event) {
    return navigator.userAgent.match(/mac/i) ? event.metaKey : event.ctrlKey;
}