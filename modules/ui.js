import * as components from "./components.js";
import * as events from "./events.js";

export const DOUBLE_CLICK_DURATION = 500; // 500 milliseconds

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

    input {
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
        gap: 0.1rem;
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

export class IconButton extends Button {
    constructor(source, alt) {
        super("");

        this.icon = new Icon(source, alt);
        this.tooltip = alt;

        this.add(this.icon);
    }
}

export class Input extends components.Component {
    constructor(placeholder = "", type = "text", value = "") {
        super("input");

        var thisScope = this;

        this.element.placeholder = placeholder;
        this.element.type = type;
        this.element.value = value;

        this.registerState("placeholder", "placeholderChanged", placeholder, (event) => this.element.placeholder = event.value);
        this.registerState("value", "valueChanged", value, (event) => this.element.value = event.value);
        this.registerState("enabled", "interactionChanged", true, (event) => this.element.disabled = !event.value);

        this.events.valueCommitted = new events.EventType(this);
        this.events.confirmed = new events.EventType(this);

        this.element.addEventListener("input", (event) => this.value = event.target.value);
        this.element.addEventListener("change", (event) => this.events.valueCommitted.emit({value: event.target.value}));

        this.element.addEventListener("keydown", function(event) {
            if (event.code == "Enter") {
                thisScope.events.confirmed.emit({value: event.target.value});

                event.preventDefault();
            }
        });
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