import * as components from "./components.js";
import * as events from "./events.js";
import * as ui from "./ui.js";

components.css(`
    mixpipe-workspace {
        ${components.styleMixins.GROW}
        ${components.styleMixins.VERTICAL_STACK}
    }

    mixpipe-workspace .panels {
        ${components.styleMixins.VERTICAL_STACK}
        ${components.styleMixins.GROW}
    }

    mixpipe-tabs {
        ${components.styleMixins.HORIZONTAL_STACK}
        min-height: 1.45rem;
        background-color: var(--secondaryBackground);
        padding: 0.2rem;
        gap: 0.2rem;
    }

    mixpipe-tab {
        background-color: var(--primaryBackground);
        border-radius: 0.25rem;
    }

    mixpipe-tab button {
        background-color: transparent;
    }

    mixpipe-tab button:first-child {
        padding-inline-end: 0.2rem;
    }

    mixpipe-tab button:last-child {
        padding-inline-start: 0.2rem;
    }

    mixpipe-tab.active {
        background-color: var(--selectedBackground);
        color: var(--selectedForeground);
    }

    mixpipe-tab.active img.icon {
        ${components.styleMixins.ICON_INVERT}
    }

    mixpipe-panel {
        ${components.styleMixins.VERTICAL_STACK}
        ${components.styleMixins.GROW}
    }

    mixpipe-toolbar {
        ${components.styleMixins.HORIZONTAL_STACK}
        height: 2.4rem;
        padding: 0.2rem;
        gap: 0.2rem;
        border-block-end: 0.2rem solid var(--secondaryBackground);
    }

    mixpipe-toolbar button:has(img.icon) {
        min-width: 2rem;
        padding: 0.1rem;
    }

    mixpipe-toolbar button img.icon {
        height: 100%;
    }

    mixpipe-workarea {
        ${components.styleMixins.HORIZONTAL_STACK}
        ${components.styleMixins.GROW}
        gap: 0.2rem;
        background-color: var(--secondaryBackground);
    }

    mixpipe-workarea > * {
        background-color: var(--primaryBackground);
    }

    mixpipe-documentarea {
        ${components.styleMixins.VERTICAL_STACK}
        ${components.styleMixins.GROW}
    }

    mixpipe-sidebar {
        ${components.styleMixins.VERTICAL_STACK}
        width: 20rem;
    }
`);

export class Tab extends components.Component {
    constructor(panel) {
        super("mixpipe-tab");

        this.panel = panel;

        this.activateButton = new ui.Button(this.panel.name);
        this.closeButton = new ui.IconButton("icons/close.svg", "Close");

        this.element.append(this.activateButton.becomeChild(this));
        this.element.append(this.closeButton.becomeChild(this));

        this.activateButton.events.activated.connect(this.activate, this);
        this.closeButton.events.activated.connect(this.close, this);

        panel.events.nameChanged.connect(this.update, this);

        var switchedPanelEvent = panel.ancestor(Workspace).events.switchedPanels;
        var switchedPanelEventConnection = switchedPanelEvent.connect(this.update, this);

        panel.events.closed.connect(() => switchedPanelEvent.disconnect(switchedPanelEventConnection));
    }

    update() {
        this.activateButton.text = this.panel.name;

        if (this.ancestor(Workspace)?.activePanel == this.panel) {
            this.element.classList.add("active");
        } else {
            this.element.classList.remove("active");
        }
    }

    activate() {
        this.ancestor(Workspace).activePanel = this.panel;
    }

    close() {
        this.panel.close();
    }
}

export class Panel extends components.Component {
    constructor(name) {
        super("mixpipe-panel");

        this.tab = null;

        this.events.activated = new events.EventType(this);
        this.events.closed = new events.EventType(this);

        this.registerState("name", "nameChanged", name);
    }

    close() {
        this.parent.remove(this);
    }
}

export class TabContainer extends components.Component {
    constructor() {
        super("mixpipe-tabs");
    }

    addTabForPanel(panel) {
        var tab = new Tab(panel);

        this.add(tab);
    }

    removeTabForPanel(panel) {
        this.remove(...this.children.filter((tab) => tab.panel == panel));
    }
}

export class Workspace extends components.Component {
    constructor() {
        super("mixpipe-workspace");

        this.tabs = [];
        this.tabContainer = new TabContainer();
        this.childContainerElement = components.element("div", [components.className("panels")]);

        this.element.append(
            this.tabContainer.becomeChild(this),
            this.childContainerElement
        );

        this.events.allPanelsClosed = new events.EventType(this);

        this.registerState("activePanel", "switchedPanels", null, (event) => this._switchToPanel(event.value));

        this.events.childAdded.connect((event) => this.registerPanel(event.child));
        this.events.childRemoved.connect((event) => this.unregisterPanel(event.child));
    }

    registerPanel(panel) {
        this.tabContainer.addTabForPanel(panel);

        this.activePanel = panel;
    }

    unregisterPanel(panel) {
        panel.events.closed.emit();

        this.tabContainer.removeTabForPanel(panel);

        var panelIndexToSwitchTo = Math.max(this.children.findIndex((currentPanel) => currentPanel == panel) - 1, 0);

        if (this.activePanel == panel && this.children.length > 0) {
            this.activePanel = this.children[panelIndexToSwitchTo];
        }

        if (this.children.length == 0) {
            this.events.allPanelsClosed.emit();
        }
    }

    _switchToPanel(panel) {
        for (var child of this.children) {
            if (child == panel) {
                child.element.style.display = null;

                child.events.activated.emit();
            } else {
                child.element.style.display = "none";
            }
        }
    }
}

export class Toolbar extends components.Component {
    constructor() {
        super("mixpipe-toolbar");
    }
}

export class WorkArea extends components.Component {
    constructor() {
        super("mixpipe-workarea");

        this.documentArea = new DocumentArea();

        this.add(this.documentArea);
    }

    addSidebar(sidebar, beforeDocumentArea = false) {
        if (beforeDocumentArea) {
            this.insert(0, sidebar);
        } else {
            this.add(sidebar);
        }
    }
}

export class DocumentArea extends components.Component {
    constructor() {
        super("mixpipe-documentarea");
    }
}

export class Sidebar extends components.Component {
    constructor() {
        super("mixpipe-sidebar");
    }
}