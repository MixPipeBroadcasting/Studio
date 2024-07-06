import * as ui from "./ui.js";
import * as workspaces from "./workspaces.js";

export class AnimationEditorToolbar extends workspaces.Toolbar {
    constructor(animationEditor) {
        super();

        this.animationEditor = animationEditor;

        this.triggerButton = new ui.IconButton("icons/play.svg", "Start/reset animation");
        this.createTimelineButton = new ui.IconButton("icons/add.svg", "Create timeline");

        this.add(this.triggerButton, this.createTimelineButton);

        this.triggerButton.events.activated.connect(() => this.animationEditor.animation.startOrReset());
    }
}

export class AnimationEditorPanel extends workspaces.Panel {
    constructor(animation) {
        super(animation.name || "Untitled animation");

        var thisScope = this;

        this.animation = animation;

        this.toolbar = new AnimationEditorToolbar(this);
        this.workArea = new workspaces.WorkArea();

        this.add(this.toolbar, this.workArea);

        this.animation.events.renamed.connect(() => this.name = animation.name);

        requestAnimationFrame(function render() {
            thisScope.render();

            requestAnimationFrame(render);
        });
    }

    serialise() {
        return {
            type: "animationEditor",
            projectId: this.animation.project.id,
            animationPath: this.animation.path
        };
    }

    static deserialise(data) {
        return new this(projects.getOrCreateProjectById(data.projectId).getOrCreateModel(data.animationPath));
    }

    render() {
        this.toolbar.triggerButton.icon.source = this.animation.state != "stopped" ? "icons/reset.svg" : "icons/play.svg";

        this.toolbar.triggerButton.element.style.background = this.animation.state == "running" ? `var(--animatedBackground)` : null;
    }
}

workspaces.registerPanelType("animationEditor", AnimationEditorPanel);