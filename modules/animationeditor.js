import * as components from "./components.js";
import * as ui from "./ui.js";
import * as workspaces from "./workspaces.js";
import * as timelines from "./timelines.js";
import * as sceneEditor from "./sceneeditor.js";

components.css(`
    mixpipe-toolbar.forAnimationEditor button[mixpipe-animated="true"] {
        background: var(--animatedBackground);
    }

    mixpipe-toolbar.forAnimationEditor button[mixpipe-animated="true"] img.icon {
        ${components.styleMixins.ICON_INVERT}
    }

    mixpipe-animationcontrollereditor {
        display: block;
        overflow: auto;
    }

    mixpipe-animationcontrollereditor .scrubber {
        position: sticky;
        top: 0;
        left: 0;
        height: 2rem;
        background: var(--primaryBackground);
        border-bottom: 2px solid var(--secondaryBackground);
    }

    mixpipe-animationcontrollereditor .time {
        width: 10rem;
        height: calc(100% - 1px);
        padding: 0.5rem;
        border-inline-end: 2px solid var(--secondaryBackground);
    }

    mixpipe-timelineeditor {
        display: block;
        border-bottom: 2px solid var(--secondaryBackground);
    }

    mixpipe-timelineeditor .info {
        display: flex;
        flex-direction: column;
        width: 10rem;
        padding: 0.5rem;
        background: var(--secondaryBackground);
        border-bottom: 1px solid var(--primaryBackground);
    }

    mixpipe-timelineeditor .info > :is(strong, span) {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }
`);

export class TimelineSourceEditorView extends components.Component {
    constructor(model) {
        super("mixpipe-timelineeditor");

        this.model = model;

        this.objectNameElement = components.element("strong");
        this.objectPropertyElement = components.element("span");

        this.infoColumnElement = components.element("div", [
            components.className("info"),
            this.objectNameElement,
            this.objectPropertyElement
        ]);

        this.element.append(this.infoColumnElement);

        this.always(this.updateInfo);
    }

    updateInfo() {
        this.objectNameElement.textContent = this.model.object.name;
        this.objectPropertyElement.textContent = sceneEditor.PROPERTIES.find((property) => property.name == this.model.property).displayName || this.model.property;
    }
}

export class AnimationControllerEditorView extends components.Component {
    constructor(model) {
        super("mixpipe-animationcontrollereditor");

        this.model = model;

        this.timeElement = components.element("div", [components.className("time"), components.text("--.---")]);

        this.scrubberElement = components.element("div", [
            components.className("scrubber"),
            this.timeElement
        ]);

        this.timelinesElement = components.element("div");

        this.element.append(this.scrubberElement, this.timelinesElement);

        this.childContainerElement = this.timelinesElement;

        this.project.associateChildModels(this, new Map([
            [timelines.TimelineSource, TimelineSourceEditorView]
        ]), [this]);

        this.always(this.updateTime);
    }

    get project() {
        return this.model.project;
    }

    updateTime() {
        this.timeElement.textContent = this.model.getDisplayTime("progress");
    }

    createTimeline() {
        var timeline = new timelines.TimelineSource(this.project);

        this.project.registerNewModels();

        return timeline;
    }
}

export class AnimationEditorToolbar extends workspaces.Toolbar {
    constructor(animationEditor) {
        super();

        var thisScope = this;

        this.element.classList.add("forAnimationEditor");

        this.animationEditor = animationEditor;

        this.triggerButton = new ui.IconButton("icons/play.svg", "Start/reset animation");

        this.stepModeButton = new ui.ToggleIconButton(
            "icons/step.svg", "Enter running mode (currently in stepping mode)",
            "icons/run.svg", "Enter stepping mode (currently in running mode)",
            this.model.state == "stepping"
        );

        this.createTimelineButton = new ui.IconButton("icons/add.svg", "Create timeline");

        this.add(this.triggerButton, this.stepModeButton, this.createTimelineButton);

        this.stepModeButton.events.activated.connect(function() {
            if (thisScope.stepModeButton.value) {
                thisScope.model.step(Math.min(thisScope.model.currentTime, thisScope.model.duration));
            } else {
                thisScope.model.reset();
            }
        });

        this.triggerButton.events.activated.connect(() => this.model.startOrReset());

        this.model.events.stateChanged.connect(() => this.stepModeButton.value = this.model.state == "stepping");
    }

    get model() {
        return this.animationEditor.model;
    }
}

export class AnimationEditorPanel extends workspaces.Panel {
    constructor(model) {
        super(model.name || "Untitled animation");

        this.model = model;

        this.toolbar = new AnimationEditorToolbar(this);
        this.workArea = new workspaces.WorkArea();
        this.controllerEditor = new AnimationControllerEditorView(model);

        this.workArea.documentArea.add(this.controllerEditor);

        this.add(this.toolbar, this.workArea);

        this.model.events.renamed.connect(() => this.name = model.name);

        this.always(this.render);
    }

    serialise() {
        return {
            type: "animationEditor",
            projectId: this.model.project.id,
            animationPath: this.model.path
        };
    }

    static deserialise(data) {
        return new this(projects.getOrCreateProjectById(data.projectId).getOrCreateModel(data.animationPath));
    }

    render() {
        this.toolbar.triggerButton.icon.source = this.model.state != "stopped" ? "icons/reset.svg" : "icons/play.svg";

        this.toolbar.triggerButton.element.setAttribute("mixpipe-animated", this.model.state == "running");
    }
}

workspaces.registerPanelType("animationEditor", AnimationEditorPanel);