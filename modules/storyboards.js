import * as projects from "./projects.js";
import * as components from "./components.js";
import * as ui from "./ui.js";
import * as windows from "./windows.js";
import * as workspaces from "./workspaces.js";
import * as storyboardObjects from "./storyboardobjects.js";
import * as sceneEditor from "./sceneeditor.js";

const OBJECT_MOVE_Z_INDEX = 2;
const STORYBOARD_GROUP_RESIZE_HANDLE_Z_INDEX = 1;

components.css(`
    mixpipe-storyboard {
        ${components.styleMixins.GROW}
        position: relative;
        overflow: auto;
    }

    mixpipe-storyboardgroup, mixpipe-scene, mixpipe-animationcontroller {
        position: absolute;
    }

    mixpipe-storyboardgroup {
        overflow: hidden;
        background-color: var(--primaryBackground);
        border: 0.15rem solid var(--secondaryForeground);
        border-radius: 0.25rem;
        z-index: 0;
    }

    mixpipe-storyboardgroup > input {
        width: 100%;
        padding: 0.2rem;
        background-color: transparent;
        color: var(--secondaryForeground);
        font-size: 1rem;
        border: none;
    }

    mixpipe-storyboardgroup > .resizeHandle {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 10px;
        height: 10px;
        background: linear-gradient(135deg, transparent 0%, transparent 50%, var(--secondaryBackground) 50%, var(--secondaryBackground) 100%);
        z-index: ${STORYBOARD_GROUP_RESIZE_HANDLE_Z_INDEX};
        cursor: nwse-resize;
    }

    mixpipe-scene {
        ${components.styleMixins.VERTICAL_STACK}
        background-color: var(--secondaryBackground);
        border-radius: 0.25rem;
    }

    mixpipe-scene .title {
        padding: 0.2rem;
        padding-block-end: 0;
        font-size: 1rem;
    }

    mixpipe-scene .title input {
        width: 100%;
        background: transparent;
        border: none;
    }

    mixpipe-scene canvas {
        --zoom: 0.1;
        margin: calc(0.2rem / var(--zoom));
        margin-block-start: 0;
        background: repeating-conic-gradient(var(--primaryBackground) 0% 25%, var(--secondaryBackground) 0% 50%) 50% / 128px 128px;
        zoom: var(--zoom);
    }

    mixpipe-animationcontroller {
        display: grid;
        grid-template-rows: repeat(2, min-content);
        grid-template-columns: 3rem 1fr;
        align-items: center;
        padding: 10px;
        gap: 0.5rem;
        background: var(--secondaryBackground);
        border-radius: 0.25rem;
    }

    mixpipe-animationcontroller button {
        grid-row: 1 / 3;
        grid-column: 1;
        width: 3rem;
        height: 3rem;
        background: var(--primaryBackground);
        border-radius: 50%;
    }

    mixpipe-animationcontroller .timer {
        ${components.styleMixins.NO_SELECT}
        width: 6rem;
        margin: auto;
        font-size: 1.5rem;
    }

    mixpipe-animationcontroller.running {
        background: var(--live);
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
            if (!event.target.matches([
                "mixpipe-storyboardgroup > input",
                "mixpipe-scene, mixpipe-scene *:not(input)",
                "mixpipe-animationcontroller, mixpipe-animationcontroller *:not(button, button *, input)"
            ].join(", "))) {
                return;
            }

            if (thisScope instanceof StoryboardGroupView && event.target != thisScope.nameInput.element) {
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

            for (var object of thisScope.storyboard.descendentsOfTypes([StoryboardGroupView])) {
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

                if (thisScope.model.parentGroup != parentSceneGroupView.model) {
                    thisScope.model.parentGroup = parentSceneGroupView.model;
                } else {
                    thisScope.parent.remove(thisScope);
                    parentSceneGroupView.add(thisScope);
                }
            } else if (thisScope.model.parentGroup != null) {
                thisScope.model.parentGroup = null;
            }

            thisScope.model.x = newPosition.x;
            thisScope.model.y = newPosition.y;
        });
    }

    connectPositioningUpdater(callback) {
        this.model.events.moved.connect(callback, this);
        this.model.events.resized.connect(callback, this);
    }

    updatePositioning() {
        this.element.style.left = `${this.model.x}px`;
        this.element.style.top = `${this.model.y}px`;
        
        if (!this.sizeUnconstrained) {
            this.element.style.width = `${this.model.width}px`;
            this.element.style.height = `${this.model.height}px`;
        } else {
            this.element.style.width = null;
            this.element.style.height = null;
        }
    }
}

export class StoryboardGroupView extends StoryboardObjectView {
    constructor(model, storyboard) {
        super("mixpipe-storyboardgroup", model, storyboard);

        var thisScope = this;

        this.nameInput = new ui.Input("Untitled group");
        this.resizeHandleElement = components.element("div", [components.className("resizeHandle")]);

        this.add(this.nameInput);

        this.element.append(this.resizeHandleElement);

        this.model.events.renamed.connect(this.updateInfo, this);
        this.updateInfo();

        this.nameInput.events.valueCommitted.connect((event) => this.model.name = event.value);

        model.project.associateChildModels(this, new Map([
            [storyboardObjects.StoryboardGroup, StoryboardGroupView],
            [storyboardObjects.Scene, SceneView],
            [storyboardObjects.AnimationController, AnimationControllerView]
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

            thisScope.model.width = objectRect.width;
            thisScope.model.height = objectRect.height;
        });
    }

    updateInfo() {
        this.nameInput.value = this.model.name;
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
        this.canvasElement.width = this.model.width;
        this.canvasElement.height = this.model.height;
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

export class AnimationControllerView extends StoryboardObjectView {
    constructor(model, storyboard) {
        super("mixpipe-animationcontroller", model, storyboard);

        var thisScope = this;

        this.sizeUnconstrained = true;

        this.triggerButton = new ui.IconButton("icons/play.svg", "Trigger animation");
        this.nameInput = new ui.Input("Untitled animation");

        this.timerElement = components.element("div", [components.className("timer"), components.text("--.---")]);

        this.add(this.triggerButton, this.nameInput);

        this.element.append(this.timerElement);

        this.updatePositioning();

        this.model.events.renamed.connect(this.updateInfo, this);
        this.updateInfo();

        this.triggerButton.events.activated.connect((event) => this.startOrReset());
        this.nameInput.events.valueCommitted.connect((event) => this.model.name = event.value);

        requestAnimationFrame(function update() {
            thisScope.updateTimer();

            requestAnimationFrame(update);
        });
    }

    updateInfo() {
        this.nameInput.value = this.model.name;
    }

    updateTimer() {
        var currentTime = Date.now() - this.model.startTime;
        var durationToShow = this.model.duration;
        var isCountdown = false;

        if (this.model.state == "running") {
            durationToShow = this.model.duration - currentTime;
            isCountdown = true;
        } else if (this.model.state == "finished") {
            durationToShow = 0;
            isCountdown = true;
        }

        this.triggerButton.icon.source = this.model.state != "stopped" ? "icons/reset.svg" : "icons/play.svg";

        this.triggerButton.element.style.background = (
            this.model.state == "running" ?
            `conic-gradient(var(--liveProgressForeground) 0 ${(currentTime / this.model.duration) * 100}%, var(--liveProgressBackground) 0)` :
            null
        );

        if (this.model.state == "running") {
            this.element.classList.add("running");
        } else {
            this.element.classList.remove("running");
        }

        this.timerElement.textContent = (
            (isCountdown ? "-" : "") +
            String(Math.floor(durationToShow / 1000)).padStart(2, "0") +
            "." +
            String(durationToShow % 1000).padStart(3, "0")
        );
    }

    startOrReset() {
        if (this.model.state != "stopped") {
            this.model.startTime = null;

            return;
        }
        
        this.model.startTime = Date.now();
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
            [storyboardObjects.StoryboardGroup, StoryboardGroupView],
            [storyboardObjects.Scene, SceneView],
            [storyboardObjects.AnimationController, AnimationControllerView]
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

    createStoryboardGroup() {
        var scene = new storyboardObjects.StoryboardGroup(this.project);

        this.project.registerNewModels();

        return scene;
    }

    createScene() {
        var scene = new storyboardObjects.Scene(this.project);

        this.project.registerNewModels();

        return scene;
    }

    createAnimationController() {
        var scene = new storyboardObjects.AnimationController(this.project);

        this.project.registerNewModels();

        return scene;
    }
}

export class StoryboardToolbar extends workspaces.Toolbar {
    constructor(storyboardPanel) {
        super();

        this.storyboardPanel = storyboardPanel;
        this.storyboard = this.storyboardPanel.storyboard;

        this.createSceneButton = new ui.IconButton("icons/add.svg", "Create scene");
        this.createStoryboardGroupButton = new ui.IconButton("icons/group.svg", "Create group");
        this.createAnimationControllerButton = new ui.IconButton("icons/animation.svg", "Create animation controller");
        this.newWindowButton = new ui.IconButton("icons/newwindow.svg", "New window");

        this.add(
            this.createSceneButton,
            this.createStoryboardGroupButton,
            this.createAnimationControllerButton,
            this.newWindowButton
        );

        this.createSceneButton.events.activated.connect(() => this.storyboard.createScene());
        this.createStoryboardGroupButton.events.activated.connect(() => this.storyboard.createStoryboardGroup());
        this.createAnimationControllerButton.events.activated.connect(() => this.storyboard.createAnimationController());
        this.newWindowButton.events.activated.connect(() => windows.open(this.storyboard.project, this.storyboardPanel));
    }
}

export class StoryboardPanel extends workspaces.Panel {
    constructor(project) {
        super("Storyboard");

        this.storyboard = new Storyboard(project);
        this.toolbar = new StoryboardToolbar(this);
        this.workArea = new workspaces.WorkArea();

        this.workArea.documentArea.add(this.storyboard);

        this.add(this.toolbar, this.workArea);
    }

    serialise() {
        return {
            type: "storyboard",
            projectId: this.storyboard.project.id
        };
    }

    static deserialise(data) {
        return new this(projects.getOrCreateProjectById(data.projectId));
    }
}

workspaces.registerPanelType("storyboard", StoryboardPanel);