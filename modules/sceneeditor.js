import * as common from "./common.js";
import * as events from "./events.js";
import * as projects from "./projects.js";
import * as components from "./components.js";
import * as ui from "./ui.js";
import * as workspaces from "./workspaces.js";
import * as propertyTables from "./propertytables.js";
import * as storyboardObjects from "./storyboardobjects.js";
import * as sceneObjects from "./sceneobjects.js";

components.css(`
    mixpipe-panel.attributesList mixpipe-documentarea {
        ${components.styleMixins.VERTICAL_STACK}
        padding: 0.5rem;
        gap: 0.5rem;
        overflow: auto;
    }

    mixpipe-attribute {
        ${components.styleMixins.VERTICAL_STACK}
        padding: 0.5rem;
        background: var(--secondaryBackground);
        border-radius: 0.25rem;
    }

    mixpipe-attribute :is(input, select):has(+ label) {
        margin-block-end: 0.5rem;
    }

    mixpipe-attribute .hint {
        opacity: 0.5;
    }

    mixpipe-attribute.target {
        animation: 1s attributeTarget infinite alternate-reverse;
        cursor: cell;
    }

    mixpipe-attribute.target * {
        cursor: cell;
    }

    @keyframes attributeTarget {
        0% {
            background: var(--targetStart);
        }

        100% {
            background: var(--targetEnd);
        }
    }
`);

export const PROPERTIES = [
    new propertyTables.Property("name", "string", "Name", {placeholder: "Untitled object"}),
    new propertyTables.Property("text", "string", "Text"),
    new propertyTables.Property("scene", "scene", "Scene"),
    new propertyTables.Property("x", "number", "X", {roundNumber: true}),
    new propertyTables.Property("y", "number", "Y", {roundNumber: true}),
    new propertyTables.Property("width", "number", "Width", {roundNumber: true}),
    new propertyTables.Property("height", "number", "Height", {roundNumber: true}),
    new propertyTables.Property("font", "string", "Font"),
    new propertyTables.Property("fontSize", "number", "Font size", {roundNumber: true}),
    new propertyTables.Property("backgroundFill", "string", "Background"),
    new propertyTables.Property("borderFill", "string", "Border"),
    new propertyTables.Property("borderWidth", "number", "Border width")
];

var lastAbsolutePointerPosition = null;

export class SceneEditorToolbar extends workspaces.Toolbar {
    constructor(sceneEditor) {
        super();

        var thisScope = this;
        var targetSceneEventConnection = null;
        var targetAttributeEventConnection = null;

        this.sceneEditor = sceneEditor;

        this.createRectangleButton = new ui.IconButton("icons/add.svg", "Create rectangle");
        this.createTextButton = new ui.IconButton("icons/text.svg", "Create text");
        this.createCompositedSceneButton = new ui.ToggleIconButton("icons/composite.svg", "Cancel creating a composited scene", undefined, "Create composited scene");
        this.createCompositedScenePlaceholderButton = new ui.ToggleIconButton("icons/compositeattribute.svg", "Cancel creating a composited scene placeholder", undefined, "Create composited scene placeholder");
        this.deleteObjectsButton = new ui.IconButton("icons/delete.svg", "Delete selected objects");

        this.add(this.createRectangleButton, this.createTextButton, this.createCompositedSceneButton, this.createCompositedScenePlaceholderButton, this.deleteObjectsButton);

        this.createRectangleButton.events.activated.connect(function() {
            var rectangle = new sceneObjects.Rectangle(sceneEditor.scene.project);

            rectangle.x = 50;
            rectangle.y = 50;
            rectangle.width = 100;
            rectangle.height = 100;

            rectangle.backgroundFill = "cyan";

            sceneEditor.scene.objects.addModel(rectangle);

            sceneEditor.setSelectedObjects([rectangle]);
        });

        this.createTextButton.events.activated.connect(function() {
            var text = new sceneObjects.Text(sceneEditor.scene.project);

            text.x = 50;
            text.y = 50;
            text.width = 1050;
            text.height = 150;

            text.text = "Text";
            text.fontSize = 100;
            text.backgroundFill = "black";

            sceneEditor.scene.objects.addModel(text);

            sceneEditor.setSelectedObjects([text]);
        });

        this.createCompositedSceneButton.events.valueChanged.connect(function(event) {
            var project = sceneEditor.scene.project;

            project.setLocalProperty("targetingScene", event.value);

            project.events.localStateChanged.disconnect(targetSceneEventConnection);

            if (event.value) {
                targetSceneEventConnection = project.events.localStateChanged.connect(function(event) {
                    if (event.property == "targetedScenePath") {
                        thisScope.createCompositedSceneButton.value = false;

                        var scene = project.getOrCreateModel(event.value);
                        var compositedScene = new sceneObjects.CompositedScene(project);

                        compositedScene.x = 0;
                        compositedScene.y = 0;
                        compositedScene.width = scene.width;
                        compositedScene.height = scene.height;
                        compositedScene.scene = scene;

                        sceneEditor.scene.objects.addModel(compositedScene);

                        sceneEditor.setSelectedObjects([compositedScene]);
                    }
                });
            }
        });

        this.createCompositedScenePlaceholderButton.events.valueChanged.connect(function(event) {
            var project = sceneEditor.scene.project;

            project.setLocalProperty("targetingAttributeScenePath", sceneEditor.scene.path);
            project.setLocalProperty("targetingAttributeType", "scene");
            project.setLocalProperty("targetingAttribute", event.value);

            project.events.localStateChanged.disconnect(targetAttributeEventConnection);

            if (event.value) {
                targetAttributeEventConnection = project.events.localStateChanged.connect(function(event) {
                    if (event.property == "targetedAttributePath") {
                        thisScope.createCompositedScenePlaceholderButton.value = false;

                        var attributeType = project.getOrCreateModel(event.value);
                        var compositedScene = new sceneObjects.CompositedScene(project);

                        compositedScene.x = 0;
                        compositedScene.y = 0;
                        compositedScene.width = sceneEditor.scene.width;
                        compositedScene.height = sceneEditor.scene.height;
                        compositedScene.scene = `{{ ${attributeType.id} }}`;

                        sceneEditor.scene.objects.addModel(compositedScene);

                        sceneEditor.setSelectedObjects([compositedScene]);
                    }
                });
            }
        });

        this.deleteObjectsButton.events.activated.connect(function() {
            for (var object of sceneEditor.selectedObjects) {
                var key = sceneEditor.scene.objects.getModelKey(object);

                if (key == null) {
                    continue;
                }

                sceneEditor.scene.objects.removeModel(key);

                sceneEditor.setSelectedObjects([]);
            }
        });
    }
}

export class SceneEditorPropertiesPanel extends workspaces.Panel {
    constructor(sceneEditor) {
        super("Properties");

        this.sceneEditor = sceneEditor;
        this.properties = null;
        this.propertyTableEventConnections = [];

        sceneEditor.scene.project.events.modelAdded.connect(() => this.setPropertyTable(true));
        sceneEditor.scene.project.events.modelDeleted.connect(() => this.setPropertyTable(true));
    }

    init() {
        this.setPropertyTable();

        this.sceneEditor.events.selectionChanged.connect(() => this.setPropertyTable(), this);
    }

    setPropertyTable(updating = false) {
        var properties = [...PROPERTIES, null];
        var addedAttributeIds = [];

        if (updating && this.properties && this.properties.element.contains(document.activeElement)) {
            return;
        }

        for (var eventConnection of this.propertyTableEventConnections) {
            eventConnection.disconnect();
        }

        this.propertyTableEventConnections = [];

        for (var object of this.sceneEditor.selectedObjects) {
            if (!(object instanceof sceneObjects.CompositedScene) || !object.scene) {
                continue;
            }

            for (var attributeType of object.scene.attributeTypes.getModelList()) {
                object.ensureAttributeProperty(attributeType.id);

                if (addedAttributeIds.includes(attributeType.id)) {
                    continue;
                }

                this.propertyTableEventConnections.push(
                    attributeType.events.idChanged.connect(() => this.setPropertyTable(true)),
                    attributeType.events.renamed.connect(() => this.setPropertyTable(true)),
                    attributeType.events.typeChanged.connect(() => this.setPropertyTable(true))
                );

                addedAttributeIds.push(attributeType.id);

                if (!attributeType.id) {
                    continue;
                }

                properties.push(new propertyTables.Property(`attr:${attributeType.sanitisedId}`, attributeType.type, attributeType.name?.trim() || "(Unnamed)"));
            }
        }

        this.properties = new propertyTables.PropertyTableContainer(this.sceneEditor.selectedObjects, properties);

        this.clear();
        this.add(this.properties);
    }
}

export class SceneEditorAttributeView extends components.Component {
    constructor(model, attributesPanel) {
        super("mixpipe-attribute");

        var thisScope = this;

        this.model = model;
        this.attributesPanel = attributesPanel;

        this.nameInput = new ui.Input("");
        this.idInput = new ui.Input("");
        this.typeInput = new ui.SelectionInput();

        this.typeInput.loadObject({
            "string": "String",
            "number": "Number",
            "scene": "Scene"
        });

        this.nameLabel = new ui.Label("Name", this.nameInput);
        this.idLabel = new ui.Label("ID", this.idInput);
        this.typeLabel = new ui.Label("Type", this.typeInput);

        this.idLabel.element.append(components.element("span", [components.className("hint"), components.text(" (used in templates)")]));

        this.add(this.nameLabel, this.nameInput, this.idLabel, this.idInput, this.typeLabel, this.typeInput);

        model.events.renamed.connect(this.updateInfo, this);
        model.events.idChanged.connect(this.updateInfo, this);
        model.events.typeChanged.connect(this.updateInfo, this);
        this.updateInfo();

        this.nameInput.events.valueCommitted.connect(function(event) {
            thisScope.model.name = event.value;

            if (!thisScope.model.id) {
                thisScope.model.id = event.value.trim().split(" ").map(function(word, i) {
                    if (i == 0) {
                        return word.toLocaleLowerCase().replace(/^([0-9])/g, "n$1");
                    }

                    return word[0].toLocaleUpperCase() + word.slice(1).toLocaleLowerCase();
                }).join("").replace(/[^a-zA-Z0-9_]/g, "");
            }
        });

        this.idInput.events.valueCommitted.connect((event) => this.model.id = event.value);
        this.typeInput.events.selectionCommitted.connect(() => this.model.type = this.typeInput.key);

        this.element.addEventListener("pointerdown", function(event) {
            if (thisScope.matchesTargetCriteria()) {
                model.project.setLocalProperty("targetedAttributePath", model.path);

                event.preventDefault();
            }
        });

        model.project.events.localStateChanged.connect(this.updateTargetState, this);
    }

    matchesTargetCriteria() {
        var localState = this.model.project.localState;

        return (
            localState.targetingAttribute &&
            localState.targetingAttributeType == this.model.type &&
            localState.targetingAttributeScenePath.join(".") == this.model.parentStoryboardObject.path.join(".")
        );
    }

    updateTargetState() {
        if (this.matchesTargetCriteria()) {
            this.element.classList.add("target");
        } else {
            this.element.classList.remove("target");
        }
    }

    updateInfo() {
        this.nameInput.value = this.model.name || "";
        this.idInput.value = this.model.id || "";
        this.typeInput.key = this.model.type || "string";

        this.updateTargetState();
    }
}

export class SceneEditorAttributesToolbar extends workspaces.Toolbar {
    constructor(sceneEditor) {
        super();

        this.sceneEditor = sceneEditor;

        this.addAttributeTypeButton = new ui.IconButton("icons/add.svg", "Create attribute type");

        this.add(this.addAttributeTypeButton);

        this.addAttributeTypeButton.events.activated.connect(function() {
            var attributeType = new storyboardObjects.AttributeType(sceneEditor.scene.project);

            sceneEditor.scene.addAttributeType(attributeType);
            sceneEditor.scene.project.registerNewModels();
        });
    }
}

export class SceneEditorAttributesPanel extends workspaces.Panel {
    constructor(sceneEditor) {
        super("Attributes");

        this.sceneEditor = sceneEditor;

        this.toolbar = new SceneEditorAttributesToolbar(sceneEditor);
        this.workArea = new workspaces.WorkArea();

        this.add(this.toolbar, this.workArea);
        this.element.classList.add("attributesList");

        this.childContainerElement = this.workArea.documentArea.element;

        sceneEditor.scene.project.associateChildModels(this, new Map([
            [storyboardObjects.AttributeType, SceneEditorAttributeView]
        ]), [this], (model) => model.parentStoryboardObject == sceneEditor.scene);
    }
}

export class SceneEditorPropertiesSidebar extends workspaces.Sidebar {
    constructor(sceneEditor) {
        super();

        this.sceneEditor = sceneEditor;

        this.workspace = new workspaces.Workspace();
        this.propertiesPanel = new SceneEditorPropertiesPanel(sceneEditor);
        this.attributesPanel = new SceneEditorAttributesPanel(sceneEditor);

        this.workspace.add(this.propertiesPanel, this.attributesPanel);
        this.add(this.workspace);

        this.workspace.activePanel = this.propertiesPanel;
    }

    init() {
        this.propertiesPanel.init();
    }
}

export class SceneEditorPanel extends workspaces.Panel {
    constructor(scene) {
        super(scene.name || "Untitled scene");

        var thisScope = this;

        this.scene = scene;

        this.toolbar = new SceneEditorToolbar(this);
        this.endSidebar = new SceneEditorPropertiesSidebar(this);
        this.workArea = new workspaces.WorkArea();
        this.canvasElement = components.element("canvas");
        this.zoom = null;
        this.offset = null;
        this.selectedObjects = [];
        this.boundingHalo = null;
        this.targetHandle = null;

        this.events.selectionChanged = new events.EventType(this);

        this.workArea.documentArea.element.style.overflow = "hidden";

        this.workArea.documentArea.element.append(this.canvasElement);

        this.workArea.addSidebar(this.endSidebar);

        this.add(this.toolbar, this.workArea);

        this.scene.events.renamed.connect(() => this.name = scene.name || "Untitled scene");

        this.always(this.render);

        var panning = false;
        var panOffset = null;
        var moving = false;
        var initialPointerPosition = null;
        var lastPointerPosition = null;
        var grabbedHandle = null;
        var initialBoundingHalo = null;
        var lastBoundingHalo = null;

        this.canvasElement.addEventListener("pointerdown", function(event) {
            initialPointerPosition = lastPointerPosition = thisScope.pointerPosition;

            if (event.button == 1 || common.ctrlOrCommandKey(event)) {
                panning = true;

                panOffset = {
                    x: event.clientX - (thisScope.offset.x * thisScope.zoom),
                    y: event.clientY - (thisScope.offset.y * thisScope.zoom)
                };

                event.preventDefault();

                return;
            }

            if (thisScope.checkHandles() != null) {
                grabbedHandle = thisScope.targetHandle;
                initialBoundingHalo = lastBoundingHalo = thisScope.boundingHalo;

                return;
            }

            thisScope.selectObjectAtPoint(thisScope.pointerPosition, event.shiftKey, true);

            moving = thisScope.scene.getObjectsAtPoint(thisScope.pointerPosition).filter((object) => thisScope.selectedObjects.includes(object)).length > 0;
        });

        document.body.addEventListener("pointermove", function(event) {
            if (grabbedHandle != null) {
                var newBoundingHalo = {...thisScope.boundingHalo};

                if (grabbedHandle.x == -1) {
                    newBoundingHalo.xMin = initialBoundingHalo.xMin + (thisScope.pointerPosition.x - initialPointerPosition.x);

                    if (newBoundingHalo.xMin >= newBoundingHalo.xMax) {
                        newBoundingHalo.xMin = newBoundingHalo.xMax - 1;
                    }
                }

                if (grabbedHandle.x == 1) {
                    newBoundingHalo.xMax = initialBoundingHalo.xMax + (thisScope.pointerPosition.x - initialPointerPosition.x);

                    if (newBoundingHalo.xMax <= newBoundingHalo.xMin) {
                        newBoundingHalo.xMax = newBoundingHalo.xMin + 1;
                    }
                }

                if (grabbedHandle.y == -1) {
                    newBoundingHalo.yMin = initialBoundingHalo.yMin + (thisScope.pointerPosition.y - initialPointerPosition.y);

                    if (newBoundingHalo.yMin >= newBoundingHalo.yMax) {
                        newBoundingHalo.yMin = newBoundingHalo.yMax - 1;
                    }
                }

                if (grabbedHandle.y == 1) {
                    newBoundingHalo.yMax = initialBoundingHalo.yMax + (thisScope.pointerPosition.y - initialPointerPosition.y);

                    if (newBoundingHalo.yMax <= newBoundingHalo.yMin) {
                        newBoundingHalo.yMax = newBoundingHalo.yMin + 1;
                    }
                }

                for (var object of thisScope.selectedObjects) {
                    object.addOrEditKeyframeNow("x", common.lerp(
                        newBoundingHalo.xMin,
                        newBoundingHalo.xMax,
                        common.invLerp(
                            lastBoundingHalo.xMin,
                            lastBoundingHalo.xMax,
                            object.getAnimatedValue("x")
                        )
                    ));
                    
                    object.addOrEditKeyframeNow("y", common.lerp(
                        newBoundingHalo.yMin,
                        newBoundingHalo.yMax,
                        common.invLerp(
                            lastBoundingHalo.yMin,
                            lastBoundingHalo.yMax,
                            object.getAnimatedValue("y")
                        )
                    ));

                    object.addOrEditKeyframeNow("width", object.getAnimatedValue("width") * ((newBoundingHalo.xMax - newBoundingHalo.xMin) / (lastBoundingHalo.xMax - lastBoundingHalo.xMin)), true);
                    object.addOrEditKeyframeNow("height", object.getAnimatedValue("height") * ((newBoundingHalo.yMax - newBoundingHalo.yMin) / (lastBoundingHalo.yMax - lastBoundingHalo.yMin)), true);
                }

                lastBoundingHalo = thisScope.checkHalos();

                event.preventDefault();
            }

            if (panning) {
                thisScope.offset = {
                    x: (event.clientX - panOffset.x) / thisScope.zoom,
                    y: (event.clientY - panOffset.y) / thisScope.zoom
                };

                event.preventDefault();
            }

            if (moving) {
                var moveDelta = {
                    x: thisScope.pointerPosition.x - lastPointerPosition.x,
                    y: thisScope.pointerPosition.y - lastPointerPosition.y
                };
    
                for (var object of thisScope.selectedObjects) {
                    object.addOrEditKeyframeNow("x", object.getAnimatedValue("x") + moveDelta.x, true);
                    object.addOrEditKeyframeNow("y", object.getAnimatedValue("y") + moveDelta.y, true);
                }

                event.preventDefault();
            }

            lastPointerPosition = thisScope.pointerPosition;
        });

        document.body.addEventListener("pointerup", function(event) {
            panning = false;
            moving = false;
            grabbedHandle = null;
        });

        this.canvasElement.addEventListener("wheel", function(event) {
            var previousZoom = thisScope.zoom;

            lastPointerPosition = thisScope.pointerPosition;

            thisScope.zoom -= event.deltaY * 0.002;

            if (thisScope.zoom < 0.01) {
                thisScope.zoom = previousZoom;
            }

            thisScope.offset = {
                x: thisScope.offset.x * (previousZoom / thisScope.zoom),
                y: thisScope.offset.y * (previousZoom / thisScope.zoom)
            };

            if (lastPointerPosition) {
                thisScope.offset.x -= lastPointerPosition.x - thisScope.pointerPosition.x;
                thisScope.offset.y -= lastPointerPosition.y - thisScope.pointerPosition.y;
            }
        });

        this.endSidebar.init();
    }

    serialise() {
        return {
            type: "sceneEditor",
            projectId: this.scene.project.id,
            scenePath: this.scene.path
        };
    }

    static deserialise(data) {
        return new this(projects.getOrCreateProjectById(data.projectId).getOrCreateModel(data.scenePath));
    }

    get canvasContext() {
        return this.canvasElement.getContext("2d");
    }

    get pointerPosition() {
        if (lastAbsolutePointerPosition == null) {
            return null;
        }

        var documentAreaRect = this.workArea.documentArea.element.getBoundingClientRect();

        return {
            x: (lastAbsolutePointerPosition.x - documentAreaRect.x - (this.offset.x * this.zoom)) / this.zoom,
            y: (lastAbsolutePointerPosition.y - documentAreaRect.y - (this.offset.y * this.zoom)) / this.zoom
        };
    }

    selectObjectAtPoint(point = this.pointerPosition, addToSelection = false, deselectIfSelected = false) {
        var objectsAtPoint = this.scene.getObjectsAtPoint(point);

        if (!addToSelection) {
            if (objectsAtPoint.length > 0 && this.selectedObjects.includes(objectsAtPoint[objectsAtPoint.length - 1])) {
                return;
            }

            this.selectedObjects = [];
        }

        if (objectsAtPoint.length > 0) {
            var objectToSelect = objectsAtPoint[objectsAtPoint.length - 1];

            if (!this.selectedObjects.includes(objectToSelect)) {
                this.selectedObjects.push(objectsAtPoint[objectsAtPoint.length - 1]);
            } else if (deselectIfSelected) {
                this.selectedObjects = this.selectedObjects.filter((object) => object != objectToSelect);
            }
        }

        this.events.selectionChanged.emit({selectedObjects: this.selectedObjects});
    }

    setSelectedObjects(objects) {
        this.selectedObjects = objects;

        this.events.selectionChanged.emit({selectedObjects: this.selectedObjects});
    }

    drawScreenAreas() {
        var context = this.canvasContext;

        context.lineWidth = 1 / this.zoom;
        context.strokeStyle = "#666666";

        context.strokeRect(0, 0, this.scene.width, this.scene.height);
        context.strokeRect(this.scene.width * 0.05, this.scene.height * 0.05, this.scene.width * 0.9, this.scene.height * 0.9);
        context.strokeRect(this.scene.width * 0.1, this.scene.height * 0.1, this.scene.width * 0.8, this.scene.height * 0.8);

        context.beginPath();
        context.moveTo(this.scene.width * 0.05, this.scene.height / 2);
        context.lineTo(this.scene.width * 0.075, this.scene.height / 2);
        context.stroke();

        context.beginPath();
        context.moveTo(this.scene.width * 0.95, this.scene.height / 2);
        context.lineTo(this.scene.width * 0.925, this.scene.height / 2);
        context.stroke();

        context.beginPath();
        context.moveTo(this.scene.width / 2, this.scene.height * 0.05);
        context.lineTo(this.scene.width / 2, this.scene.height * 0.075);
        context.stroke();

        context.beginPath();
        context.moveTo(this.scene.width / 2, this.scene.height * 0.95);
        context.lineTo(this.scene.width / 2, this.scene.height * 0.925);
        context.stroke();
    }

    checkHandles(draw = false) {
        if (this.boundingHalo == null) {
            return null;
        }

        var thisScope = this;
        var context = this.canvasContext;
        var boundingHalo = this.boundingHalo;
        
        function checkHandle(x, y, targetHandle = null) {
            const HANDLE_RADIUS = 8 / thisScope.zoom;

            if (draw) {
                context.fillStyle = "blue";

                context.beginPath();
                context.arc(x, y, HANDLE_RADIUS, 0, 2 * Math.PI, false);
                context.fill();
            }

            if (
                thisScope.pointerPosition.x >= x - HANDLE_RADIUS &&
                thisScope.pointerPosition.y >= y - HANDLE_RADIUS &&
                thisScope.pointerPosition.x < x + HANDLE_RADIUS &&
                thisScope.pointerPosition.y < y + HANDLE_RADIUS
            ) {
                thisScope.targetHandle = targetHandle;
            }
        }

        thisScope.targetHandle = null;

        checkHandle(boundingHalo.xMin, boundingHalo.yMin, {x: -1, y: -1});
        checkHandle((boundingHalo.xMin + boundingHalo.xMax) / 2, boundingHalo.yMin, {x: 0, y: -1});
        checkHandle(boundingHalo.xMax, boundingHalo.yMin, {x: 1, y: -1});
        checkHandle(boundingHalo.xMin, (boundingHalo.yMin + boundingHalo.yMax) / 2, {x: -1, y: 0});
        checkHandle(boundingHalo.xMax, (boundingHalo.yMin + boundingHalo.yMax) / 2, {x: 1, y: 0});
        checkHandle(boundingHalo.xMin, boundingHalo.yMax, {x: -1, y: 1});
        checkHandle((boundingHalo.xMin + boundingHalo.xMax) / 2, boundingHalo.yMax, {x: 0, y: 1});
        checkHandle(boundingHalo.xMax, boundingHalo.yMax, {x: 1, y: 1});

        return thisScope.targetHandle;
    }

    checkHalos(draw = false) {
        if (this.selectedObjects.length == 0) {
            this.boundingHalo = null;
            this.targetHandle = null;

            return;
        }

        var context = this.canvasContext;

        var boundingHalo = {
            xMin: Infinity,
            yMin: Infinity,
            xMax: -Infinity,
            yMax: -Infinity
        };

        if (draw) {
            context.lineWidth = 1 / this.zoom;
            context.strokeStyle = "red";
        }

        for (var object of this.selectedObjects) {
            var x = object.getAnimatedValue("x");
            var y = object.getAnimatedValue("y");
            var width = object.getAnimatedValue("width");
            var height = object.getAnimatedValue("height");

            if (draw) {
                context.strokeRect(x, y, width, height);
            }

            boundingHalo.xMin = Math.min(boundingHalo.xMin, x);
            boundingHalo.yMin = Math.min(boundingHalo.yMin, y);
            boundingHalo.xMax = Math.max(boundingHalo.xMax, x + width);
            boundingHalo.yMax = Math.max(boundingHalo.yMax, y + height);
        }

        this.boundingHalo = boundingHalo;

        if (draw) {
            context.lineWidth = 2 / this.zoom;

            context.strokeRect(
                boundingHalo.xMin,
                boundingHalo.yMin,
                boundingHalo.xMax - boundingHalo.xMin,
                boundingHalo.yMax - boundingHalo.yMin
            );
        }

        this.checkHandles(draw);

        return boundingHalo;
    }

    render() {
        var documentAreaRect = this.workArea.documentArea.element.getBoundingClientRect();
        var context = this.canvasContext;

        this.canvasElement.width = documentAreaRect.width;
        this.canvasElement.height = documentAreaRect.height;

        this.zoom ??= (documentAreaRect.width / this.scene.width) * 0.75;

        this.offset ??= {
            x: (documentAreaRect.width - (this.scene.width * this.zoom)) / 2 / this.zoom,
            y: (documentAreaRect.height - (this.scene.height * this.zoom)) / 2 / this.zoom
        };

        context.scale(this.zoom, this.zoom);
        context.translate(this.offset.x, this.offset.y);

        this.scene.drawToContext(context);

        this.drawScreenAreas();
        this.checkHalos(true);
    }
}

workspaces.registerPanelType("sceneEditor", SceneEditorPanel);

document.body.addEventListener("pointermove", function(event) {
    lastAbsolutePointerPosition = {
        x: event.clientX,
        y: event.clientY
    };
});