import * as components from "./components.js";
import * as workspaces from "./workspaces.js";
import * as scenes from "./scenes.js";

components.css(`
    mixpipe-storyboard {
        ${components.styleMixins.GROW}
        position: relative;
        overflow: auto;
    }

    mixpipe-scene, mixpipe-scenegroup {
        position: absolute;
    }

    mixpipe-scene {
        ${components.styleMixins.VERTICAL_STACK}
        background-color: var(--secondaryBackground);
        border-radius: 0.25rem;
    }

    mixpipe-scene .handle {
        padding: 0.2rem;
        font-size: 1rem;
    }

    mixpipe-scene canvas {
        --zoom: 0.1;
        margin: calc(0.2rem / var(--zoom));
        margin-block-start: 0;
        zoom: var(--zoom);
    }

    mixpipe-scenegroup {
        overflow: hidden;
        border: 0.15rem solid var(--secondaryForeground);
        border-radius: 0.25rem;
    }

    mixpipe-scenegroup > .name {
        padding: 0.2rem;
        color: var(--secondaryForeground);
        font-size: 1rem;
    }
`);

export class StoryboardObjectView extends components.Component {
    constructor(elementName, model) {
        super(elementName);

        this.model = model;
        this.sizeUnconstrained = false;

        this.connectPositioningUpdater(this.updatePositioning);
        this.updatePositioning();
    }

    connectPositioningUpdater(callback) {
        this.model.events.moved.connect(callback);
        this.model.events.resized.connect(callback);
    }

    updatePositioning() {
        this.element.style.left = `${this.model.position.x}px`;
        this.element.style.top = `${this.model.position.y}px`;
        
        if (!this.sizeUnconstrained) {
            this.element.style.width = `${this.model.size.width}px`;
            this.element.style.height = `${this.model.size.height}px`;
        } else {
            this.element.style.width = null;
            this.element.style.height = null;
        }
    }
}

export class SceneView extends StoryboardObjectView {
    constructor(model) {
        super("mixpipe-scene", model);

        var thisScope = this;

        this.sizeUnconstrained = true;

        this.nameElement = components.text();
        this.canvasElement = components.element("canvas");

        this.handleElement = components.element("div", [
            components.className("handle"),
            this.nameElement
        ]);

        this.element.append(this.handleElement, this.canvasElement);

        this.updatePositioning();

        this.model.events.renamed.connect(this.updateInfo);
        this.updateInfo();

        this.connectPositioningUpdater(this.updateCanvasSize);
        this.updateCanvasSize();

        requestAnimationFrame(function render() {
            thisScope.render();

            requestAnimationFrame(render);
        });
    }

    updateInfo() {
        this.nameElement.textContent = this.model.name;
    }

    updateCanvasSize() {
        this.canvasElement.width = this.model.size.width;
        this.canvasElement.height = this.model.size.height;
    }

    render() {
        this.model.render();

        var context = this.canvasElement.getContext("2d");

        context.drawImage(this.model.canvas, 0, 0);
    }
}

export class SceneGroupView extends StoryboardObjectView {
    constructor(model) {
        super("mixpipe-scenegroup", model);

        this.nameElement = components.element("div", [components.className("name")]);

        this.element.append(this.nameElement);

        this.model.events.renamed.connect(this.updateInfo);
        this.updateInfo();

        model.project.associateChildModels(this, new Map([
            [scenes.Scene, SceneView]
        ]), function(childModel) {
            if (childModel.parentGroup != model) {
                return false;
            }

            return true;
        });
    }

    updateInfo() {
        this.nameElement.textContent = this.model.name;
    }
}

export class Storyboard extends components.Component {
    constructor(project) {
        super("mixpipe-storyboard");

        this.project = project;

        project.associateChildModels(this, new Map([
            [scenes.Scene, SceneView],
            [scenes.SceneGroup, SceneGroupView]
        ]), function(model) {
            if (model.parentGroup) {
                return false;
            }

            return true;
        });
    }
}

export class StoryboardPanel extends workspaces.Panel {
    constructor(project) {
        super("Storyboard");

        this.storyboard = new Storyboard(project);

        this.add(this.storyboard);
    }
}