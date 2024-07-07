import * as components from "./components.js";
import * as ui from "./ui.js";
import * as workspaces from "./workspaces.js";
import * as timelines from "./timelines.js";
import * as storyboardObjects from "./storyboardobjects.js";
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
        flex-grow: 1;
        overflow: auto;
    }

    mixpipe-animationcontrollereditor .scrubber {
        display: flex;
        position: sticky;
        top: 0;
        height: 2rem;
        background: var(--primaryBackground);
        border-bottom: 2px solid var(--secondaryBackground);
        z-index: 2;
    }

    mixpipe-animationcontrollereditor .time {
        position: sticky;
        left: 0;
        width: 10rem;
        height: calc(100% - 1px);
        padding: 0.5rem;
        border-inline-end: 2px solid var(--secondaryBackground);
    }

    mixpipe-animationcontrollereditor .markers {
        position: sticky;
        top: 0;
        left: 10rem;
    }

    mixpipe-animationcontrollereditor .playhead {
        position: absolute;
        top: 1rem;
        left: 10rem;
        width: 2px;
        background: var(--animatedBackground);
    }

    mixpipe-animationcontrollereditor .playhead .handle {
        position: absolute;
        top: -0.625rem;
        left: 0;
        width: 1.25rem;
        height: 1.25rem;
        border-radius: 50%;
        background: var(--animatedProgressBackground);
        transform: translateX(calc(-50% + 1.5px));
        cursor: ew-resize;
    }

    mixpipe-timelineeditor {
        display: block;
        border-bottom: 2px solid var(--secondaryBackground);
    }

    mixpipe-timelineeditor .info {
        position: sticky;
        display: flex;
        flex-direction: column;
        left: 0;
        width: 10rem;
        padding: 0.5rem;
        background: var(--secondaryBackground);
        border-bottom: 1px solid var(--primaryBackground);
        z-index: 1;
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

        var thisScope = this;
        var scrubOffset = null;

        this.model = model;

        this.scrubStart = null;
        this.shouldRedrawCanvas = true;

        this.registerState("timeScale", "timeScaleChanged", 1 / 10, () => this.shouldRedrawCanvas = true);

        this.timeElement = components.element("div", [components.className("time"), components.text("--.---")]);
        this.timeMarkerCanvasElement = components.element("canvas", [components.className("markers")]);
        this.playheadHandleElement = components.element("div", [components.className("handle")]);

        this.playheadElement = components.element("div", [
            components.className("playhead"),
            this.playheadHandleElement
        ]);

        this.scrubberElement = components.element("div", [
            components.className("scrubber"),
            this.timeElement,
            this.timeMarkerCanvasElement,
            this.playheadElement
        ]);

        this.timelinesElement = components.element("div");

        this.element.append(this.scrubberElement, this.timelinesElement);

        this.childContainerElement = this.timelinesElement;

        this.project.associateChildModels(this, new Map([
            [timelines.TimelineSource, TimelineSourceEditorView]
        ]), [this], (model) => this.model.timelines.hasModel(model));

        function movePlayheadEvent(event) {
            if (thisScope.scrubStart == null) {
                return;
            }

            var position = Math.min(Math.max(thisScope.scrubStart + ((event.clientX - scrubOffset) / thisScope.timeScale), 0), thisScope.model.duration);

            if (thisScope.element.scrollLeft > 0 && event.clientX < thisScope.timeElement.getBoundingClientRect().width) {
                thisScope.element.scrollLeft -= 5;
                scrubOffset += 5;
            }

            if (event.clientX > document.body.getBoundingClientRect().width - 40) {
                thisScope.element.scrollLeft += 5;
                scrubOffset -= 5;
            }

            thisScope.model.step(position);
        }

        this.scrubberElement.addEventListener("pointerdown", function(event) {
            if (event.target == thisScope.playheadHandleElement) {
                return;
            }

            scrubOffset = event.clientX;
            thisScope.scrubStart = (event.clientX - thisScope.timeElement.getBoundingClientRect().width) / thisScope.timeScale;

            movePlayheadEvent(event);

            event.preventDefault();
        });

        this.playheadHandleElement.addEventListener("pointerdown", function(event) {
            scrubOffset = event.clientX;
            thisScope.scrubStart = thisScope.model.currentTime;

            event.preventDefault();
        });

        document.body.addEventListener("pointermove", movePlayheadEvent);

        document.body.addEventListener("pointerup", function() {
            thisScope.scrubStart = null;
        });

        this.element.addEventListener("scroll", function() {
            thisScope.shouldRedrawCanvas = true;
        });

        new ResizeObserver(function() {
            thisScope.shouldRedrawCanvas = true;
        }).observe(this.element);

        this.always(this.update);
    }

    get project() {
        return this.model.project;
    }

    update() {
        var elementRect = this.element.getBoundingClientRect();
        var scrubberRect = this.scrubberElement.getBoundingClientRect();
        var playheadRect = this.playheadElement.getBoundingClientRect();
        var timeRect = this.timeElement.getBoundingClientRect();

        this.timeElement.textContent = this.model.getDisplayTime("progress");

        this.playheadElement.style.left = `calc(10rem + ${this.model.currentTime * this.timeScale}px)`;
        this.playheadElement.style.height = `calc(${this.element.clientHeight}px - 1rem)`;
        this.playheadElement.style.visibility = playheadRect.x < timeRect.width ? "hidden" : null;

        var minWidth = this.model.duration * this.timeScale;

        this.scrubberElement.style.minWidth = `calc(12rem + ${minWidth}px)`;

        this.timelinesElement.querySelectorAll("mixpipe-timelineeditor").forEach(function(element) {
            element.style.minWidth = `calc(12rem + ${minWidth}px)`;
        });

        if (this.shouldRedrawCanvas) {
            this.timeMarkerCanvasElement.width = this.element.clientWidth - timeRect.width;
            this.timeMarkerCanvasElement.height = scrubberRect.height - 2;
    
            var markersContext = this.timeMarkerCanvasElement.getContext("2d");
    
            markersContext.font = "12px Overpass";
            markersContext.fillStyle = markersContext.strokeStyle = getComputedStyle(document.body).getPropertyValue("--secondaryBackground");
            markersContext.lineWidth = 2;
    
            var smallestIncrement = 100;
    
            if (this.timeScale > 1 / 2) {
                smallestIncrement = 10;
            }
    
            if (this.timeScale < 1 / 10) {
                smallestIncrement = 1000;
            }
    
            var minX = Math.floor(this.element.scrollLeft / smallestIncrement) * smallestIncrement;
            var maxX = minX + elementRect.width;
            var canvasHeight = this.timeMarkerCanvasElement.height;
    
            for (var x = minX; x < maxX; x += this.timeScale * smallestIncrement) {
                var time = x / this.timeScale;
    
                var relativeX = x - this.element.scrollLeft;
    
                var lineHeight = 4;
    
                if (time % (10 * smallestIncrement) == 0) {
                    lineHeight = 12;

                    markersContext.fillText(storyboardObjects.AnimationController.renderDisplayTime(time), relativeX + 1, canvasHeight - lineHeight - 5);
                } else if (time % (5 * smallestIncrement) == 0) {
                    lineHeight = 8;
                }

                if (time == 0) {
                    continue;
                }
    
                markersContext.beginPath();
                markersContext.moveTo(relativeX + 1, canvasHeight - lineHeight - 1);
                markersContext.lineTo(relativeX + 1, canvasHeight - 1);
                markersContext.stroke();
            }

            this.shouldRedrawCanvas = false;
        }
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