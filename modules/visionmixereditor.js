import * as components from "./components.js";
import * as events from "./events.js";
import * as projects from "./projects.js";
import * as ui from "./ui.js";
import * as workspaces from "./workspaces.js";
import * as storyboardObjects from "./storyboardobjects.js";
import * as visionMixers from "./visionmixers.js";

components.css(`
    mixpipe-visionmixereditorview {
        ${components.styleMixins.HORIZONTAL_STACK}
        height: 100%;
        padding: 0.5rem;
        gap: 0.5rem;
    }

    mixpipe-visionmixereditorcollection {
        ${components.styleMixins.VERTICAL_STACK}
        ${components.styleMixins.GROW}
        flex-basis: 0;
        padding: 0.5rem;
        padding-block-end: 0;
        gap: 0.5rem;
        border: 0.2rem solid var(--secondaryBackground);
        border-radius: 0.5rem;
        overflow: hidden;
    }

    mixpipe-visionmixereditorcollection .titleBar {
        ${components.styleMixins.HORIZONTAL_STACK}
    }

    mixpipe-visionmixereditorcollection .titleBar h1 {
        ${components.styleMixins.GROW}
        margin: 0;
        font-size: 1.2rem;
    }

    mixpipe-visionmixereditorcollection .titleBar .actions {
        ${components.styleMixins.HORIZONTAL_STACK}
        flex-direction: row-reverse;
        gap: 0.2rem;
    }

    mixpipe-visionmixereditorcollection .titleBar .actions button {
        padding: 0.1rem;
    }

    mixpipe-visionmixereditorcollection .sceneList {
        ${components.styleMixins.GROW}
        flex-wrap: wrap;
        overflow: auto;
    }

    mixpipe-visionmixereditorcollection .transitionList {
        ${components.styleMixins.VERTICAL_STACK}
        ${components.styleMixins.GROW}
        gap: 0.25rem;
        overflow: auto;
    }

    mixpipe-visionmixereditorsceneview {
        ${components.styleMixins.VERTICAL_STACK}
        display: inline-flex;
        flex-direction: column-reverse;
        gap: 0.5rem;
        width: 8rem;
        height: 6rem;
        margin-block-end: 0.5rem;
        margin-inline-end: 0.5rem;
        padding: 0.2rem;
        border: 0.2rem solid transparent;
        border-radius: 0.25rem;
        align-items: center;
    }

    mixpipe-visionmixereditorsceneview.programme {
        background: var(--programmeBackground);
        color: var(--programmeForeground);
        border: 0.2rem solid var(--programmeBackground);
    }

    mixpipe-visionmixereditorsceneview.preview {
        border: 0.2rem solid var(--previewBackground);
    }
    
    mixpipe-visionmixereditorsceneview canvas {
        min-height: 0;
        object-fit: contain;
        background: repeating-conic-gradient(var(--primaryBackground) 0% 25%, var(--secondaryBackground) 0% 50%) 50% / 1rem 1rem;
    }

    mixpipe-visionmixereditorsceneview .name {
        ${components.styleMixins.ELLIPSIS_CUTOFF}
        flex-shrink: 0;
        max-width: 100%;
    }

    mixpipe-visionmixereditortransitionview {
        position: relative;
        display: grid;
        height: 2.5rem;
        padding: 0.25rem;
        padding-inline: 0.5rem;
        flex-shrink: 0;
        grid-template-rows: 100%;
        grid-template-columns: 3rem minmax(auto, 100%) 4rem auto;
        gap: 0.5rem;
        border-radius: 0.25rem;
        align-items: center;
    }

    mixpipe-visionmixereditortransitionview.selected {
        background-color: var(--selectedBackground);
        color: var(--selectedForeground);
    }

    mixpipe-visionmixereditortransitionview:last-child {
        margin-block-end: 0.5rem;
    }

    mixpipe-visionmixereditortransitionview canvas {
        grid-row: 1;
        grid-column: 1;
        max-width: 100%;
        max-height: 100%;
        justify-self: center;
        object-fit: contain;
        background: repeating-conic-gradient(var(--primaryBackground) 0% 25%, var(--secondaryBackground) 0% 50%) 50% / 0.5rem 0.5rem;
    }

    mixpipe-visionmixereditortransitionview .name {
        ${components.styleMixins.ELLIPSIS_CUTOFF}
        grid-row: 1;
        grid-column: 2;
    }

    mixpipe-visionmixereditortransitionview .duration {
        grid-row: 1;
        grid-column: 3;
    }

    mixpipe-visionmixereditortransitionview .actions {
        ${components.styleMixins.HORIZONTAL_STACK}
        grid-row: 1;
        grid-column: 4;
        gap: 0.2rem;
    }

    mixpipe-visionmixereditortransitionview .actions button {
        padding: 0.1rem;
    }
    
    mixpipe-visionmixereditortransitionview.selected .actions button[mixpipe-active="true"] {
        background: var(--innerSelectedBackground);
        color: var(--innerSelectedForeground);
    }

    mixpipe-visionmixereditortransitioncontrols {
        ${components.styleMixins.VERTICAL_STACK}
        width: 6rem;
        flex-shrink: 0;
        gap: 0.5rem;
    }

    mixpipe-visionmixereditortransitioncontrols input[type="range"] {
        height: 100%;
        font-size: 1.75rem;
    }

    mixpipe-visionmixereditortransitioncontrols button {
        padding-block: 0.75rem;
        height: 2.5rem;
        font-size: 1.2rem;
        text-transform: uppercase;
    }
`);

export class VisionMixerEditorSceneView extends components.Component {
    constructor(model, collection) {
        super("mixpipe-visionmixereditorsceneview");

        this.model = model;
        this.collection = collection;

        this.sceneNameElement = components.element("span", [components.className("name")]);

        this.sceneCanvasElement = components.element("canvas");

        this.element.append(this.sceneNameElement, this.sceneCanvasElement);

        this.element.addEventListener("click", function() {
            collection.events.sceneSelected.emit({scene: model.scene});
        });

        this.always(this.update);
    }

    update() {
        if (!this.model.exists || !this.model.scene?.exists) {
            this.removeAlways(this.update);

            return;
        }

        this.sceneNameElement.textContent = this.model.scene.name || "Untitled scene";

        if (this.model.scene.isSameModel(this.collection.model.programmeScene)) {
            this.element.classList.add("programme");
        } else {
            this.element.classList.remove("programme");
        }
        
        if (this.model.scene.isSameModel(this.collection.model.previewScene)) {
            this.element.classList.add("preview");
        } else {
            this.element.classList.remove("preview");
        }

        this.model.scene.render();

        var context = this.sceneCanvasElement.getContext("2d");

        this.sceneCanvasElement.width = this.model.scene.width;
        this.sceneCanvasElement.height = this.model.scene.height;

        context.clearRect(0, 0, this.sceneCanvasElement.width, this.sceneCanvasElement.height);
        context.drawImage(this.model.scene.canvas, 0, 0);
    }
}

export class VisionMixerEditorSceneCollection extends components.Component {
    constructor(model) {
        super("mixpipe-visionmixereditorcollection");

        var thisScope = this;
        var targetSceneEventConnection = null;

        this.model = model;

        this.addSceneButton = new ui.ToggleIconButton("icons/add.svg", "Cancel adding a scene", undefined, "Add scene");
        this.removeSceneButton = new ui.IconButton("icons/delete.svg", "Remove current preview scene");

        this.events.sceneSelected = new events.EventType(this);

        this.titleBarElement = components.element("div", [
            components.className("titleBar"),
            components.element("h1", [components.text("Scenes")]),
            components.element("div", [
                components.className("actions"),
                this.addSceneButton.element,
                this.removeSceneButton.element
            ])
        ]);

        this.sceneListElement = components.element("div", [
            components.className("sceneList")
        ]);

        this.element.append(this.titleBarElement, this.sceneListElement);

        this.childContainerElement = this.sceneListElement;

        this.model.project.associateChildModels(this, new Map([
            [visionMixers.VisionMixerSourceScene, VisionMixerEditorSceneView]
        ]), [this], (model) => model.parentVisionMixer == this.model);

        this.events.sceneSelected.connect((event) => this.model.previewScene = event.scene);

        this.addSceneButton.events.valueChanged.connect(function(event) {
            var project = model.project;

            project.events.localStateChanged.disconnect(targetSceneEventConnection);

            if (event.value) {
                workspaces.clearTargetingModes();

                targetSceneEventConnection = project.events.localStateChanged.connect(function(event) {
                    if (event.property == "targetedScenePath") {
                        thisScope.addSceneButton.value = false;

                        if (!event.value) {
                            return;
                        }

                        thisScope.addScene(project.getOrCreateModel(event.value));
                    }
                });
            }

            project.setLocalProperty("targetingScene", event.value);
        });

        this.removeSceneButton.events.activated.connect((event) => this.model.removeScene(this.model.previewScene));
    }

    addScene(scene) {
        this.model.addScene(scene);
    }
}

export class VisionMixerEditorTransitionView extends components.Component {
    constructor(model, collection) {
        super("mixpipe-visionmixereditortransitionview");

        var thisScope = this;
        var targetSceneEventConnection = null;
        var targetAnimationControllerEventConnection = null;

        this.model = model;
        this.collection = collection;

        this.targetSceneButton = new ui.ToggleIconButton("icons/select.svg", "Cancel selecting a scene", undefined, "Select a scene");
        this.targetAnimationControllerButton = new ui.ToggleIconButton("icons/selectanimation.svg", "Cancel selecting an animation controller", undefined, "Select an animation controller");

        this.sceneNameElement = components.element("span", [components.className("name")]);
        this.sceneDurationElement = components.element("span", [components.className("duration")]);

        this.actionsElement = components.element("div", [
            components.className("actions"),
            this.targetSceneButton.element,
            this.targetAnimationControllerButton.element
        ]);

        this.sceneCanvasElement = components.element("canvas");
        this.sceneCanvasPreviewStart = null;

        this.element.append(this.sceneNameElement, this.sceneDurationElement, this.actionsElement, this.sceneCanvasElement);

        this.element.addEventListener("click", function() {
            collection.events.transitionSelected.emit({transition: model});
        });

        this.sceneCanvasElement.addEventListener("pointerenter", function() {
            thisScope.sceneCanvasPreviewStart = Date.now();
        });

        this.sceneCanvasElement.addEventListener("pointerleave", function() {
            thisScope.sceneCanvasPreviewStart = null;
        });

        this.targetSceneButton.events.valueChanged.connect(function(event) {
            var project = model.project;

            project.events.localStateChanged.disconnect(targetSceneEventConnection);

            if (event.value) {
                workspaces.clearTargetingModes();

                targetSceneEventConnection = project.events.localStateChanged.connect(function(event) {
                    if (event.property == "targetedScenePath") {
                        thisScope.targetSceneButton.value = false;

                        if (!event.value) {
                            return;
                        }

                        thisScope.model.scene = project.getOrCreateModel(event.value);
                    }
                });
            }

            project.setLocalProperty("targetingScene", event.value);
        });

        this.targetAnimationControllerButton.events.valueChanged.connect(function(event) {
            var project = model.project;

            project.events.localStateChanged.disconnect(targetAnimationControllerEventConnection);

            if (event.value) {
                workspaces.clearTargetingModes();

                targetAnimationControllerEventConnection = project.events.localStateChanged.connect(function(event) {
                    if (event.property == "targetedAnimationControllerPath") {
                        thisScope.targetAnimationControllerButton.value = false;

                        if (!event.value) {
                            return;
                        }

                        thisScope.model.animationController = project.getOrCreateModel(event.value);
                    }
                });
            }

            project.setLocalProperty("targetingAnimationController", event.value);
        });

        this.always(this.update);
    }

    update() {
        if (!this.model.exists || (this.model.scene && !this.model.scene?.exists)) {
            this.removeAlways(this.update);
            
            return;
        }

        var scene = this.model.scene;
        var animationController = this.model.animationController;

        this.sceneNameElement.textContent = scene ? (scene.name || "Untitled scene") : "(No scene)";

        if (animationController) {
            this.sceneDurationElement.textContent = storyboardObjects.AnimationController.renderDisplayTime(animationController?.duration);
        } else {
            this.sceneDurationElement.textContent = "--.---";
        }

        if (this.model.isSameModel(this.collection.model.selectedTransition)) {
            this.element.classList.add("selected");
        } else {
            this.element.classList.remove("selected");
        }

        if (animationController) {
            if (this.sceneCanvasPreviewStart != null) {
                animationController.startPreview(this.sceneCanvasPreviewStart);
            } else {
                animationController.stepPreview(animationController.duration / 2);
            }
        }

        projects.ProjectModel.showPreviewTimelines = true;

        scene?.render();

        projects.ProjectModel.showPreviewTimelines = false;

        animationController?.clearPreview();

        var context = this.sceneCanvasElement.getContext("2d");

        if (scene) {
            this.sceneCanvasElement.width = scene.width;
            this.sceneCanvasElement.height = scene.height;
        }

        context.clearRect(0, 0, this.sceneCanvasElement.width, this.sceneCanvasElement.height);

        if (scene) {
            context.drawImage(scene.canvas, 0, 0);
        } else {
            this.sceneCanvasElement.width = 96;
            this.sceneCanvasElement.height = 54;

            context.fillStyle = "black";

            context.fillRect(0, 0, 96, 54);

            context.fillStyle = "white";
            context.font = "32px Overpass, system-ui, sans-serif";
            context.textAlign = "center";
            context.textBaseline = "middle";

            context.fillText("?", 96 / 2, 54 / 2);
        }
    }
}

export class VisionMixerEditorTransitionCollection extends components.Component {
    constructor(model) {
        super("mixpipe-visionmixereditorcollection");

        this.model = model;

        this.addTransitionButton = new ui.IconButton("icons/add.svg", "Add transition");
        this.removeTransitionButton = new ui.IconButton("icons/delete.svg", "Remove selected transition");

        this.events.transitionSelected = new events.EventType(this);

        this.titleBarElement = components.element("div", [
            components.className("titleBar"),
            components.element("h1", [components.text("Transitions")]),
            components.element("div", [
                components.className("actions"),
                this.addTransitionButton.element,
                this.removeTransitionButton.element
            ])
        ]);

        this.transitionListElement = components.element("div", [
            components.className("transitionList")
        ]);

        this.element.append(this.titleBarElement, this.transitionListElement);

        this.childContainerElement = this.transitionListElement;

        this.model.project.associateChildModels(this, new Map([
            [visionMixers.VisionMixerTransition, VisionMixerEditorTransitionView]
        ]), [this], (model) => model.parentVisionMixer == this.model);

        this.events.transitionSelected.connect((event) => this.model.selectedTransition = event.transition);

        this.addTransitionButton.events.activated.connect((event) => this.addTransition());
        this.removeTransitionButton.events.activated.connect((event) => this.removeTransition(this.model.selectedTransition));
    }

    addTransition() {
        var transition = new visionMixers.VisionMixerTransition(this.model.project);

        transition.parentVisionMixer = this.model;

        this.model.project.registerNewModels();

        this.model.addTransition(transition);

        this.model.selectedTransition = transition;
    }

    removeTransition(transition) {
        this.model.removeTransition(transition);
    }
}

export class VisionMixerEditorTransitionControls extends components.Component {
    constructor(model) {
        super("mixpipe-visionmixereditortransitioncontrols");

        var thisScope = this;

        this.model = model;

        this.faderInput = new ui.Input(undefined, "range", 0);
        this.cutButton = new ui.Button("Cut");
        this.transitionButton = new ui.Button("Txn");

        this.faderInput.tooltip = "Transition fader bar";
        this.faderInput.orientation = "vertical";

        this.cutButton.tooltip = "Cut preview to programme";
        this.transitionButton.tooltip = "Transition preview to programme using selected transition";
        
        this.add(this.faderInput, this.cutButton, this.transitionButton);

        this.faderInput.events.valueEdited.connect((event) => this.model.stepTransition(Number(event.value)));

        this.faderInput.events.valueCommitted.connect(function(event) {
            var value = Number(event.value);

            thisScope.model.stepTransition(value);

            if (value == 100) {
                thisScope.model.cut();
            }
        });

        this.cutButton.events.activated.connect(() => this.model.cut());
        this.transitionButton.events.activated.connect(() => this.model.startTransition(Number(this.faderInput.value)));

        this.always(function() {
            var animationController = thisScope.model.selectedTransition?.animationController;

            if (!animationController) {
                thisScope.faderInput.value = 0;

                return;
            }

            if (animationController.startTime != null && animationController.currentTime < animationController.duration) {
                thisScope.faderInput.value = (animationController.currentTime / animationController.duration) * 100;

                return;
            }

            if (animationController.stepTime == null) {
                thisScope.faderInput.value = 0;

                return;
            }

            thisScope.faderInput.value = (animationController.stepTime / animationController.duration) * 100;
        });
    }
}

export class VisionMixerEditorView extends components.Component {
    constructor(model) {
        super("mixpipe-visionmixereditorview");

        this.model = model;

        this.sceneCollection = new VisionMixerEditorSceneCollection(model);
        this.transitionCollection = new VisionMixerEditorTransitionCollection(model);
        this.transitionControls = new VisionMixerEditorTransitionControls(model);

        this.add(this.sceneCollection, this.transitionCollection, this.transitionControls);
    }
}

export class VisionMixerEditorPanel extends workspaces.Panel {
    constructor(model) {
        super(model.name || "Untitled vision mixer");

        this.model = model;

        this.view = new VisionMixerEditorView(model);
        this.workArea = new workspaces.WorkArea();

        this.workArea.documentArea.add(this.view);

        this.add(this.workArea);

        this.model.events.renamed.connect(() => this.name = model.name || "Untitled vision mixer");
    }

    serialise() {
        return {
            type: "visionMixer",
            projectId: this.model.project.id,
            visionMixerPath: this.model.path
        };
    }

    static deserialise(data) {
        return new this(projects.getOrCreateProjectById(data.projectId).getOrCreateModel(data.animationPath));
    }
}

workspaces.registerPanelType("visionMixerEditor", VisionMixerEditorPanel);