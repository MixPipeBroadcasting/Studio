import * as components from "./components.js";
import * as events from "./events.js";

components.css(`
    img.icon.invert {
        ${components.styleMixins.ICON_INVERT}
    }

    button {
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
        height: 1em;
        vertical-align: middle;
    }

    input {
        background: var(--primaryBackground);
        color: inherit;
        font-size: 1em;
        font-family: inherit;
        padding-inline: 0.2rem;
        border: 0.1rem solid var(--secondaryBackground);
        border-radius: 0.25rem;
        outline: none;
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
    constructor(placeholder = "", value = "") {
        super("input");

        this.element.placeholder = placeholder;
        this.element.value = value;

        this.registerState("placeholder", "placeholderChanged", placeholder, (event) => this.element.placeholder = event.value);
        this.registerState("value", "valueChanged", value, (event) => this.element.value = event.value);
        this.registerState("enabled", "interactionChanged", true, (event) => this.element.disabled = !event.value);

        this.events.valueCommitted = new events.EventType(this);

        this.element.addEventListener("input", (event) => this.value = event.target.value);
        this.element.addEventListener("change", (event) => this.events.valueCommitted.emit({value: event.target.value}, this));
    }
}