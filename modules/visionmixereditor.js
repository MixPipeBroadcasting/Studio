import * as components from "./components.js";
import * as events from "./events.js";
import * as ui from "./ui.js";
import * as workspaces from "./workspaces.js";
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
`);

export class VisionMixerEditorSceneView extends components.Component {
    constructor(model, collection) {
        super("mixpipe-visionmixereditorsceneview");

        this.model = model;
        this.collection = collection;

        this.sceneNameElement = components.element("span", [
            components.className("name"),
            components.text(model.scene?.name || "Untitled scene")
        ]);

        this.sceneCanvasElement = components.element("canvas");

        this.element.append(this.sceneNameElement, this.sceneCanvasElement);

        this.updateCanvasSize();

        this.element.addEventListener("click", function() {
            collection.events.sceneSelected.emit({scene: model.scene});
        });

        this.always(this.update);
    }

    updateCanvasSize() {
        if (!this.model.scene) {
            return;
        }

        this.sceneCanvasElement.width = this.model.scene.width;
        this.sceneCanvasElement.height = this.model.scene.height;
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

        context.clearRect(0, 0, this.sceneCanvasElement.width, this.sceneCanvasElement.height);
        context.drawImage(this.model.scene.canvas, 0, 0);
    }
}

export class VisionMixerEditorCollection extends components.Component {
    constructor(model, title) {
        super("mixpipe-visionmixereditorcollection");

        var thisScope = this;
        var targetSceneEventConnection = null;

        this.model = model;

        this.addSceneButton = new ui.ToggleIconButton("icons/add.svg", "Cancel adding a scene", undefined, "Add scene");
        this.removeSceneButton = new ui.IconButton("icons/delete.svg", "Remove current preview scene");

        this.events.sceneSelected = new events.EventType(this);

        this.titleBarElement = components.element("div", [
            components.className("titleBar"),
            components.element("h1", [components.text(title)]),
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

        this.removeSceneButton.events.activated.connect(function(event) {
            thisScope.model.removeScene(thisScope.model.previewScene);
        });
    }

    addScene(scene) {
        throw new Error("Not implemented");
    }
}

export class VisionMixerEditorSceneCollection extends VisionMixerEditorCollection {
    constructor(model) {
        super(model, "Scenes");

        this.model.project.associateChildModels(this, new Map([
            [visionMixers.VisionMixerSourceScene, VisionMixerEditorSceneView]
        ]), [this], (model) => model.parentVisionMixer == this.model);

        this.events.sceneSelected.connect((event) => this.model.previewScene = event.scene);
    }

    addScene(scene) {
        this.model.addScene(scene);
    }
}

export class VisionMixerEditorView extends components.Component {
    constructor(model) {
        super("mixpipe-visionmixereditorview");

        this.model = model;

        this.sceneCollection = new VisionMixerEditorSceneCollection(model);
        this.transitionCollection = new VisionMixerEditorCollection(model, "Transitions");

        this.add(this.sceneCollection, this.transitionCollection);
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