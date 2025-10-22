import * as components from "./components.js";
import * as ui from "./ui.js";
import * as workspaces from "./workspaces.js";

components.css(`
    mixpipe-panel.home {
        padding: 1rem;
        background: linear-gradient(315deg, color-mix(in srgb, var(--selectedBackground) 40%, transparent) 0%, transparent 30%, transparent 100%);
    }

    mixpipe-tab.home {
        position: relative;
        height: 2rem;
        margin: -0.2rem;
        padding-inline-start: 0.2rem;
        border-radius: 0;
        background: transparent;
        overflow: hidden;
    }

    mixpipe-tab.home img {
        position: absolute;
        width: 2.2rem;
        transform: translate(0, 0.2rem);
        vertical-align: top;
        pointer-events: none;
    }

    mixpipe-tab.home button {
        padding-inline-start: 2.2rem;
        padding-inline-end: 0.6rem;
    }

    mixpipe-tab.home.active {
        background: linear-gradient(90deg, color-mix(in srgb, var(--selectedBackground) 40%, transparent) 0%, transparent 100%);
        color: inherit;
    }

    mixpipe-tab.home.active button {
        font-weight: bold;
    }

    mixpipe-homewordmark {
        display: flex;
        gap: 0.5rem;
    }

    mixpipe-homewordmark img {
        height: 4rem;
    }

    mixpipe-homewordmark h1 {
        margin-block: 0.25rem;
        font-size: 2rem;
    }
`);

export class HomePanel extends workspaces.Panel {
    constructor() {
        super("MPS");

        this.wordmark = new HomeWordmark();

        this.element.classList.add("home");

        this.element.append(this.wordmark.element);
    }

    createTab() {
        return new HomeTab(this);
    }
}

export class HomeTab extends workspaces.Tab {
    constructor(panel) {
        super(panel);

        this.logo = new ui.Image("media/logo-white.svg", "");

        this.element.classList.add("home");

        this.element.prepend(this.logo.element);

        this.remove(this.closeButton);
    }
}

export class HomeWordmark extends components.Component {
    constructor() {
        super("mixpipe-homewordmark");

        this.logo = new ui.Image("media/logo.svg", "");

        this.titleElement = components.element("h1", [
            components.text("MixPipe Studio")
        ]);

        this.element.append(
            this.logo.element,
            this.titleElement
        );
    }
}

workspaces.registerPanelType("home", HomePanel);