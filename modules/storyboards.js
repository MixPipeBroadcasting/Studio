import * as components from "./components.js";
import * as ui from "./ui.js";
import * as workspaces from "./workspaces.js";
import * as scenes from "./scenes.js";
import * as sceneEditor from "./sceneeditor.js";

const OBJECT_MOVE_Z_INDEX = 2;
const SCENE_GROUP_RESIZE_HANDLE_Z_INDEX = 1;

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

    mixpipe-scene .title {
        height: 1.6rem;
        padding: 0.2rem;
        font-size: 1rem;
    }

    mixpipe-scene .title input {
        width: 100%;
        background: transparent;
        border: 0.1rem solid transparent;
    }

    mixpipe-scene canvas {
        --zoom: 0.1;
        margin: calc(0.2rem / var(--zoom));
        margin-block-start: 0;
        background: repeating-conic-gradient(var(--primaryBackground) 0% 25%, var(--secondaryBackground) 0% 50%) 50% / 128px 128px;
        zoom: var(--zoom);
    }

    mixpipe-scenegroup {
        overflow: hidden;
        background-color: var(--primaryBackground);
        border: 0.15rem solid var(--secondaryForeground);
        border-radius: 0.25rem;
    }

    mixpipe-scenegroup > input {
        width: 100%;
        padding: 0.2rem;
        background-color: transparent;
        color: var(--secondaryForeground);
        font-size: 1rem;
        border: none;
    }

    mixpipe-scenegroup > .resizeHandle {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 10px;
        height: 10px;
        background: linear-gradient(135deg, transparent 0%, transparent 50%, var(--secondaryBackground) 50%, var(--secondaryBackground) 100%);
        z-index: ${SCENE_GROUP_RESIZE_HANDLE_Z_INDEX};
        cursor: nwse-resize;
    }
`);

export class StoryboardObjectView extends components.Component {
    constructor(elementName, model, storyboard) {
        super(elementName);

        var thisScope = this;

        this.model = model;
        this.storyboard = storyboard;
        this.sizeUnconstrained = false;

        this.connectPositioningUpdater(this.updatePositioning);
        this.updatePositioning();

        var movingObject = false;
        var movedObject = false;
        var moveOffset = null;

        this.element.addEventListener("pointerdown", function(event) {
            if (!event.target.matches("mixpipe-scene, mixpipe-scene *:not(input), mixpipe-scenegroup > input")) {
                return;
            }

            if (thisScope instanceof SceneGroupView && event.target != thisScope.nameInput.element) {
                return;
            }

            var storyboardRect = thisScope.storyboard.element.getBoundingClientRect();
            var objectRect = thisScope.element.getBoundingClientRect();

            movingObject = true;

            moveOffset = {
                x: event.clientX - objectRect.x + storyboardRect.x,
                y: event.clientY - objectRect.y + storyboardRect.y
            };
        });

        document.body.addEventListener("pointermove", function move(event) {
            if (!movingObject) {
                return;
            }

            if (!movedObject) {
                thisScope.parent.remove(thisScope);
                thisScope.storyboard.add(thisScope);
            }

            var storyboardRect = thisScope.storyboard.element.getBoundingClientRect();

            thisScope.element.style.zIndex = OBJECT_MOVE_Z_INDEX;
            thisScope.element.style.left = `${event.clientX + thisScope.storyboard.element.scrollLeft - moveOffset.x}px`;
            thisScope.element.style.top = `${event.clientY + thisScope.storyboard.element.scrollTop - moveOffset.y}px`;

            var slowlyScroll = {x: 0, y: 0};

            if (event.clientX < storyboardRect.x + 20) {
                slowlyScroll.x = -5;
            }

            if (event.clientX >= storyboardRect.x + storyboardRect.width - 20) {
                slowlyScroll.x = 5;
            }

            if (event.clientY < storyboardRect.y + 20) {
                slowlyScroll.y = -5;
            }

            if (event.clientY >= storyboardRect.y + storyboardRect.height - 20) {
                slowlyScroll.y = 5;
            }

            if (slowlyScroll.x != 0 || slowlyScroll.y != 0) {
                thisScope.storyboard.slowlyScroll = {x: slowlyScroll.x, y: slowlyScroll.y};
                
                thisScope.storyboard.slowlyScrollCallback = function() {
                    move(event);
                };
            } else {
                thisScope.storyboard.slowlyScroll = null;
                thisScope.storyboard.slowlyScrollCallback = null;
            }

            movedObject = true;

            event.preventDefault();
        });

        document.body.addEventListener("pointerup", function(event) {
            if (!movingObject) {
                return;
            }
            
            movingObject = false;

            if (!movedObject) {
                thisScope.updatePositioning();
                
                return;
            }

            movedObject = false;
            
            thisScope.storyboard.slowlyScroll = null;
            thisScope.storyboard.slowlyScrollCallback = null;

            var storyboardRect = thisScope.storyboard.element.getBoundingClientRect();
            var objectRect = thisScope.element.getBoundingClientRect();

            thisScope.element.style.zIndex = null;

            var newPosition = {
                x: objectRect.x - storyboardRect.x + thisScope.storyboard.element.scrollLeft,
                y: objectRect.y - storyboardRect.y + thisScope.storyboard.element.scrollTop
            };

            var parentSceneGroupView = null;

            for (var object of thisScope.storyboard.descendentsOfTypes([SceneGroupView])) {
                if (object == thisScope) {
                    continue;
                }

                var groupRect = object.element.getBoundingClientRect();

                if (
                    groupRect.x <= objectRect.x - storyboardRect.x + moveOffset.x &&
                    groupRect.y <= objectRect.y - storyboardRect.y + moveOffset.y &&
                    groupRect.x + groupRect.width > objectRect.x - storyboardRect.x + moveOffset.x &&
                    groupRect.y + groupRect.height > objectRect.y - storyboardRect.y + moveOffset.y
                ) {
                    parentSceneGroupView = object;
                }
            }

            if (parentSceneGroupView != null) {
                var groupRect = parentSceneGroupView.element.getBoundingClientRect();

                newPosition.x = objectRect.x - groupRect.x - parentSceneGroupView.element.clientLeft;
                newPosition.y = objectRect.y - groupRect.y - parentSceneGroupView.element.clientTop;

                thisScope.model.parentGroup = parentSceneGroupView.model;

                thisScope.parent.remove(thisScope);
                parentSceneGroupView.add(thisScope);
            }

            thisScope.model.position = newPosition;
        });
    }

    connectPositioningUpdater(callback) {
        this.model.events.moved.connect(callback, this);
        this.model.events.resized.connect(callback, this);
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
    constructor(model, storyboard) {
        super("mixpipe-scene", model, storyboard);

        var thisScope = this;

        this.sizeUnconstrained = true;

        this.nameInput = new ui.Input("Untitled scene");
        this.canvasElement = components.element("canvas");

        this.titleElement = components.element("div", [
            components.className("title"),
            this.nameInput.becomeChild(this.titleElement)
        ]);

        this.element.append(this.titleElement, this.canvasElement);

        this.updatePositioning();

        this.model.events.renamed.connect(this.updateInfo, this);
        this.updateInfo();

        this.connectPositioningUpdater(this.updateCanvasSize);
        this.updateCanvasSize();

        this.nameInput.events.valueCommitted.connect((event) => this.model.name = event.value);

        var lastClicked = null;

        this.canvasElement.addEventListener("pointerdown", function(event) {
            event.preventDefault();
        });

        this.canvasElement.addEventListener("pointermove", function() {
            lastClicked = null;
        });

        this.canvasElement.addEventListener("pointerup", function() {
            if (lastClicked != null && Date.now() - lastClicked <= ui.DOUBLE_CLICK_DURATION) {
                thisScope.openEditor();
            }

            lastClicked = Date.now();
        });

        requestAnimationFrame(function render() {
            thisScope.render();

            requestAnimationFrame(render);
        });
    }

    updateInfo() {
        this.nameInput.value = this.model.name;
    }

    updateCanvasSize() {
        this.canvasElement.width = this.model.size.width;
        this.canvasElement.height = this.model.size.height;
    }

    render() {
        this.model.render();

        var context = this.canvasElement.getContext("2d");

        context.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        context.drawImage(this.model.canvas, 0, 0);
    }

    openEditor() {
        var workspace = this.ancestor(workspaces.Workspace);

        workspace.add(new sceneEditor.SceneEditorPanel(this.model));
    }
}

export class SceneGroupView extends StoryboardObjectView {
    constructor(model, storyboard) {
        super("mixpipe-scenegroup", model, storyboard);

        var thisScope = this;

        this.nameInput = new ui.Input("Untitled group");
        this.resizeHandleElement = components.element("div", [components.className("resizeHandle")]);

        this.add(this.nameInput);

        this.element.append(this.resizeHandleElement);

        this.model.events.renamed.connect(this.updateInfo, this);
        this.updateInfo();

        this.nameInput.events.valueCommitted.connect((event) => this.model.name = event.value);

        model.project.associateChildModels(this, new Map([
            [scenes.Scene, SceneView]
        ]), [storyboard], function(childModel) {
            if (childModel.parentGroup != model) {
                return false;
            }

            return true;
        });

        var resizingObject = false;
        var resizeOffset = null;

        this.resizeHandleElement.addEventListener("pointerdown", function(event) {
            var objectRect = thisScope.element.getBoundingClientRect();

            resizingObject = true;

            resizeOffset = {
                x: event.clientX - objectRect.width,
                y: event.clientY - objectRect.height
            };
        });

        document.body.addEventListener("pointermove", function(event) {
            if (!resizingObject) {
                return;
            }

            thisScope.element.style.width = `${event.clientX - resizeOffset.x}px`;
            thisScope.element.style.height = `${event.clientY - resizeOffset.y}px`;

            event.preventDefault();
        });

        document.body.addEventListener("pointerup", function(event) {
            if (!resizingObject) {
                return;
            }

            var objectRect = thisScope.element.getBoundingClientRect();

            resizingObject = false;

            thisScope.model.size = {
                width: objectRect.width,
                height: objectRect.height
            };
        });
    }

    updateInfo() {
        this.nameInput.value = this.model.name;
    }
}

export class Storyboard extends components.Component {
    constructor(project) {
        super("mixpipe-storyboard");

        var thisScope = this;

        this.project = project;

        this.slowlyScroll = null;
        this.slowlyScrollCallback = null;

        project.associateChildModels(this, new Map([
            [scenes.Scene, SceneView],
            [scenes.SceneGroup, SceneGroupView]
        ]), [this], function(model) {
            if (model.parentGroup) {
                return false;
            }

            return true;
        });

        setInterval(function() {
            if (thisScope.slowlyScroll != null) {
                thisScope.element.scrollBy(thisScope.slowlyScroll.x, thisScope.slowlyScroll.y);

                if (thisScope.slowlyScrollCallback != null) {
                    thisScope.slowlyScrollCallback();
                }
            }
        }, 20);
    }

    createScene() {
        var scene = new scenes.Scene(this.project);

        this.project.registerNewModels();

        return scene;
    }

    createSceneGroup() {
        var scene = new scenes.SceneGroup(this.project);

        this.project.registerNewModels();

        return scene;
    }
}

export class StoryboardToolbar extends workspaces.Toolbar {
    constructor(storyboard) {
        super();

        this.storyboard = storyboard;

        this.createSceneButton = new ui.IconButton("icons/add.svg", "Create scene");
        this.createSceneGroupButton = new ui.IconButton("icons/add.svg", "Create scene group");

        this.add(this.createSceneButton, this.createSceneGroupButton);

        this.createSceneButton.events.activated.connect(() => this.storyboard.createScene());
        this.createSceneGroupButton.events.activated.connect(() => this.storyboard.createSceneGroup());
    }
}

export class StoryboardPanel extends workspaces.Panel {
    constructor(project) {
        super("Storyboard");

        this.storyboard = new Storyboard(project);
        this.toolbar = new StoryboardToolbar(this.storyboard);
        this.workArea = new workspaces.WorkArea();

        this.workArea.documentArea.add(this.storyboard);

        this.add(this.toolbar, this.workArea);
    }
}