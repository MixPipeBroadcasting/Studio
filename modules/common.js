export function ctrlOrCommandKey(event) {
    return navigator.userAgent.match(/mac/i) ? event.metaKey : event.ctrlKey;
}