import * as events from "./events.js";

export const styleMixins = {
    GROW: `min-width: 0; min-height: 0; flex-grow: 1;`,
    VERTICAL_STACK: `display: flex; flex-direction: column;`,
    HORIZONTAL_STACK: `display: flex; flex-direction: row;`,
    ICON_INVERT: `filter: contrast(0.5) brightness(10);`,
    NO_SELECT: `user-select: none; cursor: default;`,
    ELLIPSIS_CUTOFF: "overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
};

export class Component extends events.EventDrivenObject {
    constructor(elementName) {
        super();

        this.element = document.createElement(elementName);

        this.parent = null;
        this.children = [];
        this.childContainerElement = this.element;
        this.alwaysCallbacks = [];

        this.events = {
            childAdded: new events.EventType(this),
            childRemoved: new events.EventType(this)
        };
    }

    add(...children) {
        for (var child of children) {
            this.children.push(child);

            child.parent = this;

            this.childContainerElement.appendChild(child.element);
    
            this.events.childAdded.emit({child, index: this.childContainerElement.childElementCount - 1}, this);
        }
    }

    insert(index, ...children) {
        for (var child of children) {
            this.children.splice(index, 0, child);

            child.parent = this;

            this.childContainerElement.insertBefore(child.element, this.childContainerElement.childNodes[index]);
    
            this.events.childAdded.emit({child, index}, this);
        }
    }

    remove(...children) {
        for (var child of children) {
            var index = this.children.indexOf(child);

            this.children = this.children.filter((currentChild) => currentChild != child);

            child.parent = null;

            try {
                this.childContainerElement.removeChild(child.element);
            } catch (e) {
                console.warn(e);
            }

            this.events.childRemoved.emit({child, index}, this);
        }
    }

    clear() {
        this.remove(...this.children);
    }

    setVisiblity(isVisible) {
        this.element.style.display = isVisible ? null : "none";
    }

    set(...children) {
        this.remove(...this.children);

        this.element.innerHTML = "";

        this.add(...children);
    }

    ancestor(type) {
        var currentParent = this.parent;

        while (currentParent != null) {
            if (currentParent instanceof type) {
                return currentParent;
            }

            currentParent = currentParent.parent;
        }

        return null;
    }

    descendentsOfTypes(types, singleOnly = false) {
        var children = [];

        for (var child of this.children) {
            for (var type of types) {
                if (child instanceof type) {    
                    children.push(child);

                    if (singleOnly) {
                        return children;
                    }
                }
            }

            children.push(...child.descendentsOfTypes(types, singleOnly));
        }

        return children;
    }

    registerState(name, stateEventName, defaultValue, setCallback = null) {
        var value = defaultValue;

        this.events[stateEventName] ??= new events.EventType(this);

        Object.defineProperty(this, name, {
            get: function() {
                return value;
            },
            set: function(newValue) {
                value = newValue;

                this.events[stateEventName].emit({value: newValue});
            }
        });

        if (setCallback) {
            this.events[stateEventName].connect(setCallback);
        }
    }

    becomeChild(parent) {
        this.parent = parent;

        return this.element;
    }

    always(callback) {
        var thisScope = this;

        this.alwaysCallbacks.push(callback);

        requestAnimationFrame(function call() {
            callback.apply(thisScope);

            if (thisScope.alwaysCallbacks.includes(callback)) {
                requestAnimationFrame(call);
            }
        });
    }

    removeAlways(callback) {
        this.alwaysCallbacks = this.alwaysCallbacks.filter((currentCallback) => currentCallback != callback);
    }
}

export class ElementData {
    constructor(type, key, value = null) {
        this.type = type;
        this.key = key;
        this.value = value;
    }
}

export function attribute(key, value) {
    return new ElementData("attribute", key, value);
}

export function style(key, value) {
    return new ElementData("style", key, value);
}

export function className(name) {
    return new ElementData("class", name);
}

export function text(value = "") {
    return document.createTextNode(value);
}

export function element(tagName, children = []) {
    var createdElement = document.createElement(tagName);

    for (var child of children) {
        if (!child) {
            continue;
        }

        if (child instanceof ElementData && child.type == "attribute") {
            createdElement.setAttribute(child.key, child.value);

            continue;
        }

        if (child instanceof ElementData && child.type == "style") {
            createdElement.style[child.key] = child.value;

            continue;
        }

        if (child instanceof ElementData && child.type == "class") {
            createdElement.classList.add(child.key);

            continue;
        }

        createdElement.append(child);
    }

    return createdElement;
}

export function css(code) {
    var styleElement = document.createElement("style");

    styleElement.textContent = code;

    document.querySelector("#styles").append(styleElement);

    return styleElement;
}