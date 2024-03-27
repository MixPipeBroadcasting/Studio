import * as components from "./components.js";

components.css(`
    img.icon.invert {
        ${components.styleMixins.ICON_INVERT}
    }

    button {
        background: var(--secondaryBackground);
        color: inherit;
        font-size: 1em;
        font-family: inherit;
        border: none;
        border-radius: 0.25rem;
    }

    button img.icon {
        height: 1em;
        vertical-align: text-top;
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

        this.events.activate = new components.EventType(this);

        this.element.addEventListener("click", () => this.events.activate.emit({}, this));
    }
}

export class IconButton extends Button {
    constructor(source, alt) {
        super("");

        this.icon = new Icon(source, alt);

        this.add(this.icon);
    }
}