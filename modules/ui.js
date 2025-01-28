import * as components from "./components.js";
import * as events from "./events.js";

export const DOUBLE_CLICK_DURATION = 500; // 500 milliseconds

export var lastPointerX = 0;
export var lastPointerY = 0;
export var pointerInWindow = true;

components.css(`
    img.icon.invert {
        ${components.styleMixins.ICON_INVERT}
    }

    img.icon[src='icons/reset.svg'] {
        position: relative;
        bottom: 0.05rem;
        right: 0.05rem;
    }

    button {
        height: 1.5rem;
        background: var(--secondaryBackground);
        color: inherit;
        font-size: 1em;
        font-family: inherit;
        padding-block: 0.1rem;
        padding-inline: 0.4rem;
        border: none;
        border-radius: 0.25rem;
    }

    button img.icon {
        width: 100%;
        height: 100%;
        vertical-align: bottom;
    }

    button[mixpipe-active="true"] {
        background: var(--selectedBackground);
        color: var(--selectedForeground);
    }

    button[mixpipe-active="true"] img.icon.active {
        ${components.styleMixins.ICON_INVERT}
    }

    button[mixpipe-active="true"] .inactive {
        display: none;
    }

    button:not([mixpipe-active="true"]) .active {
        display: none;
    }

    input, select {
        min-height: 1.5rem;
        background: var(--primaryBackground);
        color: inherit;
        font-size: 1em;
        font-family: inherit;
        padding-inline: 0.2rem;
        border: 0.1rem solid var(--secondaryBackground);
        border-radius: 0.25rem;
        outline: none;
    }

    dialog {
        position: fixed;
        padding: 0;
        background: var(--secondaryBackground);
        color: var(--primaryForeground);
        border: 2px solid var(--secondaryForeground);
        border-radius: 0.25rem;
    }

    dialog > div {
        padding: 0.5rem;
    }

    dialog p {
        margin: 0.2rem;
    }

    dialog button {
        background: var(--primaryBackground);
    }

    dialog button.primaryAction {
        background: var(--selectedBackground);
        color: var(--selectedForeground);
    }

    dialog::backdrop {
        background: transparent;
    }

    dialog .buttons {
        display: flex;
        margin-block: 0.2rem;
        gap: 0.2rem;
    }

    mixpipe-splitter {
        background: var(--secondaryForeground);
        z-index: 1;
    }

    mixpipe-splitter.horizontal {
        width: 0.25rem;
        cursor: ew-resize;
    }

    mixpipe-splitter.vertical {
        height: 0.25rem;
        cursor: ns-resize;
    }

    mixpipe-tooltip {
        position: fixed;
        padding: 0.25rem;
        background: var(--secondaryBackground);
        color: var(--primaryForeground);
        border: 0.1rem solid var(--secondaryBorder);
        border-radius: 0.25rem;
        white-space: nowrap;
        pointer-events: none;
    }

    mixpipe-tooltip.mode {
        background: var(--selectedBackground);
        color: var(--selectedForeground);
        border: 0.1rem solid var(--selectedBorder);
    }

    [disabled] {
        opacity: 0.6;
        cursor: not-allowed;
    }

    @media (prefers-color-scheme: dark) {
        img.icon {
            ${components.styleMixins.ICON_INVERT}
        }
    }
`);

export class Icon extends components.Component {
    constructor(source, alt) {
        super("img");

        this.element.src = source;
        this.element.alt = alt;

        this.element.classList.add("icon");

        this.registerState("source", "sourceChanged", source, (event) => this.element.src = event.value);
        this.registerState("alt", "altChanged", alt, (event) => this.element.alt = event.value);
    }
}

export class Button extends components.Component {
    constructor(text) {
        super("button");

        this.element.textContent = text;

        this.registerState("text", "textChanged", text, (event) => this.element.textContent = event.value);
        this.registerState("tooltip", "tooltipChanged", null, (event) => this.element.title = event.value);
        this.registerState("enabled", "interactionChanged", true, (event) => this.element.disabled = !event.value);

        this.events.activated = new events.EventType(this);

        this.element.addEventListener("click", () => this.events.activated.emit({}, this));
    }
}

export class ToggleButton extends Button {
    constructor(text, value = false) {
        super(text);

        this.registerState("value", "valueChanged", value, (event) => this.element.setAttribute("mixpipe-active", !!event.value));

        this.events.activated.connect(() => this.value = !this.value);
    }
}

export class IconButton extends Button {
    constructor(source, alt) {
        super("");

        this.icon = new Icon(source, alt);
        this.tooltip = alt;

        this.add(this.icon);
    }
}

export class ToggleIconButton extends ToggleButton {
    constructor(activeSource, activeAlt, inactiveSource = activeSource, inactiveAlt = activeAlt, value = false) {
        super("", value);

        this.activeIcon = new Icon(activeSource, activeAlt);
        this.inactiveIcon = new Icon(inactiveSource, inactiveAlt);

        this.activeTooltip = activeAlt;
        this.inactiveTooltip = inactiveAlt;
        this.tooltip = value ? this.activeTooltip : this.inactiveTooltip;

        this.activeIcon.element.classList.add("active");
        this.inactiveIcon.element.classList.add("inactive");

        this.add(this.activeIcon, this.inactiveIcon);

        this.events.valueChanged.connect((event) => this.tooltip = event.value ? this.activeTooltip : this.inactiveTooltip);
    }
}

export class Input extends components.Component {
    constructor(placeholder = "", type = "text", value = "") {
        super("input");

        var thisScope = this;
        var decimalPointTyped = false;

        this.element.placeholder = placeholder;
        this.element.type = type;
        this.element.value = value;

        this.registerState("placeholder", "placeholderChanged", placeholder, (event) => this.element.placeholder = event.value);
        this.registerState("value", "valueChanged", value, (event) => this.element.value = event.value);
        this.registerState("enabled", "interactionChanged", true, (event) => this.element.disabled = !event.value);

        this.events.valueCommitted = new events.EventType(this);
        this.events.confirmed = new events.EventType(this);

        this.element.addEventListener("input", function(event) {
            var value = event.target.value;

            if (type == "number") {
                if (!event.target.validity.valid) {
                    return;
                }

                if (decimalPointTyped) {
                    decimalPointTyped = false;

                    if (value.indexOf(".") < 0) {
                        return;
                    }
                }
            }

            thisScope.value = value;
        });

        this.element.addEventListener("change", (event) => this.events.valueCommitted.emit({value: event.target.value}));

        this.element.addEventListener("keydown", function(event) {
            if (event.code == "Period") {
                decimalPointTyped = true;

                return;
            }

            if (event.code == "Enter") {
                thisScope.events.confirmed.emit({value: event.target.value});

                event.preventDefault();
            }
        });
    }
}

export class SelectionInput extends components.Component {
    constructor(options = [], selectedIndex = 0) {
        super("select");

        var thisScope = this;

        this.internalKeys = [];

        this.registerState("options", "optionsChanged", options, this.renderOptions);
        this.registerState("selectedIndex", "selectionChanged", selectedIndex, this.renderOptions);
        this.registerState("enabled", "interactionChanged", true, (event) => this.element.disabled = !event.value);

        this.element.addEventListener("input", function(event) {
            thisScope.selectedIndex = Number(event.target.value);
        });

        this.renderOptions();
    }

    renderOptions() {
        this.element.innerHTML = "";

        for (var i = 0; i < this.options.length; i++) {
            var optionElement = document.createElement("option");

            optionElement.value = i;
            optionElement.textContent = this.options[i];

            this.element.append(optionElement);
        }

        this.element.value = this.selectedIndex;
    }

    loadObject(object) {
        var keys = Object.keys(object);
        var options = [];

        this.internalKeys = [];

        for (var key of keys) {
            options.push(object[key]);
            this.internalKeys.push(key);
        }

        this.options = options;
    }

    get key() {
        return this.internalKeys[this.selectedIndex];
    }

    set key(value) {
        this.selectedIndex = this.internalKeys.indexOf(value);
    }
}

export class Dialog extends components.Component {
    constructor() {
        super("dialog");

        var thisScope = this;

        this.mainElement = components.element("div");

        this.element.append(this.mainElement);

        this.childContainerElement = this.mainElement;

        this.events.blurred = new events.EventType(this);

        this.element.addEventListener("pointerdown", function(event) {
            if (!event.target.matches("dialog > div, dialog > div *")) {
                thisScope.events.blurred.emit();
            }
        });
    }

    openAtLocation(x, y) {
        this.element.showModal();

        var dialogRect = this.element.getBoundingClientRect();
        var pageRect = document.body.getBoundingClientRect();

        if (x + dialogRect.width > pageRect.width) {
            x = pageRect.width - dialogRect.width;
        }

        if (y + dialogRect.height > pageRect.height) {
            y = pageRect.height - dialogRect.height;
        }

        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
        this.element.style.margin = "0";
    }

    openBelowElement(element, anchorAtRight = false, offset = 2) {
        this.open();

        var dialogRect = this.element.getBoundingClientRect();
        var elementRect = element.getBoundingClientRect();

        this.openAtLocation(
            elementRect.x - (anchorAtRight ? dialogRect.width - elementRect.width : 0),
            elementRect.y + elementRect.height + offset
        );
    }

    open() {
        this.element.style.left = null;
        this.element.style.top = null;
        this.element.style.margin = null;

        this.element.showModal();
    }

    close() {
        this.element.close();
    }
}

export class ValueEditorDialog extends Dialog {
    constructor(title) {
        super("dialog");

        var thisScope = this;

        this.input = new Input();
        this.buttonContainerElement = components.element("div", [components.className("buttons")]);
        this.saveButton = new Button("Save");
        this.cancelButton = new Button("Cancel");
        this.titleElement = components.element("p", [components.text(title)]);

        this.saveButton.element.classList.add("primaryAction");

        this.buttonContainerElement.append(this.saveButton.element, this.cancelButton.element);

        this.childContainerElement.append(this.titleElement, this.input.element, this.buttonContainerElement);

        this.registerState("title", "titleChanged", title, (event) => this.titleElement.textContent = event.value);

        this.events.saved = new events.EventType(this);

        function save() {
            thisScope.events.saved.emit({value: thisScope.input.value});

            thisScope.close();
        }

        this.saveButton.events.activated.connect(save);
        this.input.events.confirmed.connect(save);
        this.events.blurred.connect(save);

        this.cancelButton.events.activated.connect(() => this.close());
    }
}

export class Splitter extends components.Component {
    constructor(vertical) {
        super("mixpipe-splitter");

        var thisScope = this;

        this.element.classList.add(vertical ? "vertical" : "horizontal");

        var resizing = false;
        var resizeOffset = null;
        var previousElementSize = null;
        var nextElementSize = null;

        this.element.addEventListener("pointerdown", function(event) {
            var previousElementRect = thisScope.element.previousSibling.getBoundingClientRect();
            var nextElementRect = thisScope.element.nextSibling.getBoundingClientRect();

            resizing = true;
            resizeOffset = vertical ? event.clientY : event.clientX;
            previousElementSize = vertical ? previousElementRect.height : previousElementRect.width;
            nextElementSize = vertical ? nextElementRect.height : nextElementRect.width;

            event.preventDefault();
        });

        document.body.addEventListener("pointermove", function(event) {
            if (!resizing) {
                return;
            }

            var currentPosition = vertical ? event.clientY : event.clientX;

            thisScope.element.previousSibling.style[vertical ? "height" : "width"] = `${previousElementSize + (currentPosition - resizeOffset)}px`;
            thisScope.element.nextSibling.style[vertical ? "height" : "width"] = `${nextElementSize - (currentPosition - resizeOffset)}px`;

            thisScope.element.previousSibling.style.flexBasis = "unset";
            thisScope.element.nextSibling.style.flexBasis = "unset";
        });

        document.body.addEventListener("pointerup", function() {
            resizing = false;
        });
    }
}

export class Tooltip extends components.Component {
    constructor(type) {
        super("mixpipe-tooltip");

        if (type) {
            this.element.classList.add(type);
        }

        this.always(this.update);
    }

    static withText(type, text) {
        var instance = new this(type);

        instance.element.textContent = text;

        return instance;
    }

    update() {
        this.element.style.left = `calc(${lastPointerX}px + 1rem)`;
        this.element.style.top = `calc(${lastPointerY}px + 0.5rem)`;
        this.element.style.opacity = pointerInWindow ? "1" : "0";

        var rect = this.element.getBoundingClientRect();
        var windowRect = document.body.getBoundingClientRect();

        if (rect.right >= windowRect.right) {
            this.element.style.left = `calc(${lastPointerX - rect.width}px - 0.5rem)`;
        }

        if (rect.bottom >= windowRect.bottom) {
            this.element.style.top = `calc(${lastPointerY - rect.height}px - 0.5rem)`;
        }
    }
}

window.addEventListener("pointermove", function(event) {
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
});

document.body.addEventListener("pointerenter", function() {
    pointerInWindow = true;
});

document.body.addEventListener("pointerleave", function() {
    pointerInWindow = false;
});