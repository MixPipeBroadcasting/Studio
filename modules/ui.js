import * as common from "./common.js";
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
        vertical-align: middle;
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

    button.textualIcon img.icon {
        width: unset;
    }

    button.action {
        position: relative;
        width: 100%;
        height: unset;
        min-height: 2.4rem;
        margin-block: 0.2rem;
        padding-inline-start: 2.6rem;
        background: transparent;
        text-align: left;
        transition: 0.5s background;
    }

    button.action:hover {
        background: var(--secondaryBackground);
    }

    button.action img {
        position: absolute;
        top: 50%;
        left: 0.4rem;
        width: 1.6rem;
        height: 1.6rem;
        transform: translate(0, -50%);
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

    label {
        display: block;
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

    mixpipe-menu {
        position: fixed;
        min-width: 10rem;
        max-height: 80vh;
        margin: 0;
        padding: 0;
        background: var(--secondaryBackground);
        border: 0.1rem solid var(--secondaryBorder);
        border-radius: 0.25rem;
    }

    mixpipe-menu button {
        display: block;
        width: 100%;
        padding-block: 0.25rem!important;
        padding-inline-end: 0.4rem!important;
        text-align: start;
        border-radius: 0;
    }

    mixpipe-menu:has(button img.icon, details) button:not(:has(img.icon)) {
        padding-inline-start: 1.6rem;
    }

    mixpipe-menu :is(button:hover, details summary:hover) {
        background: var(--selectedBackground);
        color: var(--selectedForeground);
    }

    mixpipe-menu button img.icon {
        height: 1.5rem!important;
    }

    mixpipe-menu button:hover img.icon {
        ${components.styleMixins.ICON_INVERT}
    }

    mixpipe-menu details summary {
        position: relative;
        padding-block: 0.25rem;
        padding-inline-start: 1.6rem;
        padding-inline-end: 0.4rem;
        cursor: default;
        user-select: none;
    }

    mixpipe-menu details summary:before {
        position: absolute;
        display: block;
        width: 1.5rem;
        height: 1.5rem;
        top: 0.125rem;
        left: 0.125rem;
        background: url(icons/expand.svg) no-repeat;
        background-size: 1.5rem 1.5rem;
        content: "";
    }

    mixpipe-menu details summary:hover:before {
        ${components.styleMixins.ICON_INVERT}
    }

    mixpipe-menu details summary::marker {
        content: "";
    }

    mixpipe-menu details[open] summary:before {
        transform: rotate(90deg);
    }

    mixpipe-menu details :is(button, details) {
        width: calc(100% - 1rem);
        margin-inline-start: 1rem;
        border-start-start-radius: 0.25rem;
        border-end-start-radius: 0.25rem;
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

export class Image extends components.Component {
    constructor(source, alt) {
        super("img");

        this.element.src = source;
        this.element.alt = alt;

        this.registerState("source", "sourceChanged", source, (event) => this.element.src = event.value);
        this.registerState("alt", "altChanged", alt, (event) => this.element.alt = event.value);
    }
}

export class Icon extends Image {
    constructor(source, alt) {
        super(source, alt ?? "");

        this.element.classList.add("icon");
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
        this.tooltip = alt ?? "";

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

export class TextualIconButton extends Button {
    constructor(text, source, alt) {
        super(text);

        this.icon = new Icon(source, alt);
        this.tooltip = alt;

        this.element.classList.add("textualIcon");

        this.insert(0, this.icon);
    }
}

export class ActionListButton extends TextualIconButton {
    constructor(text, source, alt) {
        super(text, source, alt);

        this.element.classList.add("action");
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
        this.registerState("minValue", "minValueChanged", -Infinity, (event) => this.element.min = event.value);
        this.registerState("maxValue", "maxValueChanged", Infinity, (event) => this.element.max = event.value);
        this.registerState("stepValue", "stepValueChanged", 1, (event) => this.element.step = event.value);
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

        this.events.selectionCommitted = new events.EventType(this);

        this.element.addEventListener("input", function(event) {
            thisScope.selectedIndex = Number(event.target.value);
        });

        this.element.addEventListener("change", (event) => this.events.selectionCommitted.emit({value: event.target.value}));

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

export class Label extends components.Component {
    constructor(text, target = null) {
        super("label");

        this.element.textContent = text;

        this.registerState("text", "textChanged", text, (event) => this.element.textContent = event.value);
        this.registerState("target", "targetChanged", target, this.updateTarget);

        this.updateTarget();
    }

    updateTarget() {
        if (!this.target) {
            return;
        }

        if (!this.target.element.id) {
            this.target.element.id = common.generateKey();
        }

        this.element.setAttribute("for", this.target.element.id);
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

export class Menu extends components.Component {
    constructor() {
        super("mixpipe-menu");

        var thisScope = this;

        this.element.setAttribute("popover", "auto");

        this._openerElement = null;
        this._shouldIgnoreNextToggle = false;
    
        this.element.addEventListener("beforetoggle", function(event) {
            if (event.newState == "closed") {
                thisScope._shouldIgnoreNextToggle = true;

                setTimeout(function() {
                    thisScope._shouldIgnoreNextToggle = false;
                });
            }
        });

        this.element.addEventListener("toggle", function(event) {
            if (event.newState == "open") {
                var rect = thisScope._openerElement?.getBoundingClientRect();

                if (!rect) {
                    rect = {top: 10, left: 10, width: 0, height: 0};
                }

                thisScope.element.style.top = `${Math.min(
                    rect.top + rect.height + 10,
                    document.body.clientHeight - thisScope.element.clientHeight - rect.height - 10
                )}px`;

                thisScope.element.style.left = `${Math.min(
                    rect.left,
                    document.body.clientWidth - thisScope.element.clientWidth - 10
                )}px`;
            }
        });

        this.element.addEventListener("click", function(event) {
            if (event.target.matches("button, button *")) {
                thisScope.element.hidePopover();
            }
        });
    }

    showFromOpener(openerElement) {
        this._openerElement = openerElement;

        this.element.showPopover({source: openerElement});
    }

    toggleFromOpener(openerElement) {
        if (this._shouldIgnoreNextToggle) {
            return;
        }

        this._openerElement = openerElement;

        this.element.togglePopover({source: openerElement});
    }
}

export class Expandable extends components.Component {
    constructor(summary) {
        super("details");

        this.summaryElement = components.element("summary");
        this.summaryElement.textContent = summary;

        this.registerState("summary", "summaryChanged", summary, (event) => this.summaryElement.textContent = event.value);

        this.element.append(this.summaryElement);
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