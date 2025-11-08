import * as components from "./components.js";
import * as ui from "./ui.js";
import * as workspaces from "./workspaces.js";
import * as projects from "./projects.js";
import * as storyboards from "./storyboards.js";

components.css(`
    mixpipe-panel.home {
        padding: 4rem;
        padding-inline: 15%;
        background: linear-gradient(315deg, color-mix(in srgb, var(--selectedBackground) 40%, transparent) 0%, transparent 30%, transparent 100%);
    }

    mixpipe-panel.home .columns {
        display: flex;
        gap: 2rem;
        margin-block: 2rem;
    }

    mixpipe-panel.home .columns > div {
        width: 100%;
        flex-grow: 1;
        flex-basis: 0;
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

    mixpipe-tipoftheday {
        display: block;
        padding: 0.5rem;
        background: var(--secondaryBackground);
        border-radius: 0.25rem;
    }

    mixpipe-tipoftheday h2 {
        margin: 0;
        margin-block-end: 0.5rem;
        font-size: 1.2rem;
    }

    mixpipe-tipoftheday p {
        margin: 0;
    }
`);

export const TIPS = [
    "In the scene editor, compare the values of specific properties for two or more objects by selecting each object while holding the Shift key, and then expanding the properties panel.",
    "You can quickly add new keyframes to an object's animation timeline by moving the playhead in the animation editor to the desired time, and then modifying the timeline's property value in the scene editor.",
    "Use composited scene placeholders in a scene to create a reusable layout template that can then be applied to create a consistent set of multi-scene layouts."
];

export class HomePanel extends workspaces.Panel {
    constructor() {
        super("MPS");

        this.wordmark = new HomeWordmark();

        this.columnsElement = components.element("div", [
            components.className("columns")
        ]);

        this.actionsColumnElement = components.element("div");
        this.statusColumnElement = components.element("div");

        this.createProjectButton = new ui.ActionListButton("Create a new project", "icons/add.svg", "");
        this.openLocalProjectButton = new ui.ActionListButton("Open a local project", "icons/open.svg", "");
        this.openRemoteProjectButton = new ui.ActionListButton("Open a remote project", "icons/remote.svg", "");
        this.tipOfTheDay = new TipOfTheDay();

        this.actionsColumnElement.append(
            this.createProjectButton.element,
            this.openLocalProjectButton.element,
            this.openRemoteProjectButton.element
        );

        this.statusColumnElement.append(
            this.tipOfTheDay.element
        );

        this.columnsElement.append(
            this.actionsColumnElement,
            this.statusColumnElement
        );

        this.element.classList.add("home");

        this.element.append(
            this.wordmark.element,
            this.columnsElement
        );

        this.createProjectButton.events.activated.connect(function() {
            var project = new projects.Project();
            var storyboardPanel = new storyboards.StoryboardPanel(project);

            workspaces.mainWorkspace.add(storyboardPanel);
            workspaces.addEventListenersForProject(project);
        });

        this.openLocalProjectButton.events.activated.connect(async function() {
            var project = await projects.openLocalProject();
            var storyboardPanel = new storyboards.StoryboardPanel(project);

            workspaces.mainWorkspace.add(storyboardPanel);
            workspaces.addEventListenersForProject(project);
        });
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

export class TipOfTheDay extends components.Component {
    constructor() {
        super("mixpipe-tipoftheday");

        this.titleElement = components.element("h2", [
            components.text("Tip of the day")
        ]);

        this.tipElement = components.element("p");

        this.element.append(
            this.titleElement,
            this.tipElement
        );

        this.showTip();
    }

    showTip() {
        var randomTip = TIPS[Math.floor(Math.random() * TIPS.length)];

        this.tipElement.textContent = randomTip;
    }
}

workspaces.registerPanelType("home", HomePanel);