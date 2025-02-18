import * as components from "./components.js";
import * as ui from "./ui.js";
import * as storyboardObjects from "./storyboardobjects.js";

components.css(`
    mixpipe-properties {
        ${components.styleMixins.GROW}
        overflow: auto;
    }

    mixpipe-properties tr.spacer {
        height: 1rem;
    }

    mixpipe-properties td > div {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }
    
    mixpipe-properties td:first-of-type {
        min-width: 8rem;
        vertical-align: top;
    }

    mixpipe-properties .editTemplateButton, .targetButton {
        width: 1.5rem;
        padding: 0.1rem;
        flex-shrink: 0;
    }

    mixpipe-properties input {
        width: 100%;
        min-width: 8rem;
    }

    mixpipe-properties input[mixpipe-computed="animated"] {
        border: 2px solid var(--animatedBackground);
    }

    mixpipe-properties input[mixpipe-computed="animated"][mixpipe-computedpoint="keyframe"] {
        background: var(--keyframePoint);
    }

    mixpipe-properties input[mixpipe-computed="computed"] {
        border: 2px solid var(--computedBackground);
    }

    mixpipe-properties input.target {
        animation: 1s propertyTarget infinite alternate-reverse;
        cursor: cell;
    }

    @keyframes propertyTarget {
        0% {
            background: var(--targetStart);
        }

        100% {
            background: var(--targetEnd);
        }
    }
`);

export class Property {
    constructor(name, type = "string", displayName = name, options = {}) {
        this.name = name;
        this.type = type;
        this.displayName = displayName;
        this.options = options;
    }

    generateInputElementForModel(model) {
        var thisScope = this;

        if (!(
            (this.name.startsWith("attr:") && model.scene?.attributeTypes.getModelList().find((attributeType) => `attr:${attributeType.id}` == this.name)) ||
            model.hasOwnProperty(this.name)
        )) {
            return components.element("span", [
                components.style("display", "inline-block"),
                components.style("width", "100%"),
                components.style("text-align", "center"),
                components.text("--")
            ]);
        }

        var computationStatus = null;
        var returnElement = components.text("(Unknown)");
        var existenceCheckElement = components.element("span");

        var editTemplateButton = new ui.IconButton("icons/computed.svg", "Edit template");
        var editTemplateDialog = new ui.ValueEditorDialog("Enter the template source to be rendered.");

        editTemplateDialog.events.saved.connect(function(event) {
            model[thisScope.name] = event.value;
        })

        editTemplateButton.element.classList.add("editTemplateButton");

        editTemplateButton.events.activated.connect(function() {
            var currentValue = model.project.get([...model.path, thisScope.name]);

            editTemplateDialog.input.value = ["string", "number"].includes(typeof(currentValue)) ? currentValue : "";

            editTemplateDialog.openBelowElement(editTemplateButton.element, true);
        });

        editTemplateButton.setVisiblity(this.name.startsWith("attr:") || model[`${this.name}:canTemplate`]);

        var targetButton = null;

        function getValue(textualOnly = false) {
            var currentValue = model.getAnimatedValue(thisScope.name, thisScope.type);

            if (textualOnly && !["string", "number"].includes(typeof(currentValue))) {
                return "";
            }

            if (thisScope.type == "number" && thisScope.options.roundNumber) {
                currentValue = Math.round(currentValue);
            }

            return currentValue;
        }

        function updateComputationStatus() {
            computationStatus = model.getValueComputationStatus(thisScope.name);
        }

        updateComputationStatus();

        switch (this.type) {
            case "string":
            case "number":
                var input = new ui.Input(this.options.placeholder || "", {"string": "text", "number": "number"}[this.type], getValue(true));
                var ignoreNextValueChange = false;

                function isTargetingProperty() {
                    return ["any", thisScope.type].includes(model.project.localState.targetingProperty);
                }

                function updateInputComputationIndicator() {
                    updateComputationStatus();

                    if (computationStatus != null && (thisScope.name.startsWith("attr:") || model[`${thisScope.name}:canTemplate`])) {
                        input.enabled = computationStatus == "animated";

                        input.element.setAttribute("mixpipe-computed", computationStatus);
                    } else {
                        input.enabled = true;

                        input.element.removeAttribute("mixpipe-computed");
                    }

                    if (model.propertyIsKeyframedNow(thisScope.name)) {
                        input.element.setAttribute("mixpipe-computedpoint", "keyframe");
                    } else {
                        input.element.removeAttribute("mixpipe-computedpoint");
                    }
                }

                function updateInputTargetState() {
                    if (isTargetingProperty()) {
                        input.element.classList.add("target");
                    } else {
                        input.element.classList.remove("target");
                    }
                }

                updateInputComputationIndicator();
                updateInputTargetState();

                input.element.addEventListener("pointerdown", function(event) {
                    if (isTargetingProperty()) {
                        model.project.setLocalProperty("targetedModelPath", model.path);
                        model.project.setLocalProperty("targetedProperty", thisScope.name);

                        event.preventDefault();
                    }
                });

                input.element.addEventListener("focus", () => input.element.select());

                input.element.addEventListener("blur", function() {
                    input.value = getValue(true);
                });

                model.project.events.localStateChanged.connect(updateInputTargetState);

                input.events.valueChanged.connect(function(event) {
                    if (ignoreNextValueChange) {
                        ignoreNextValueChange = false;
                        return;
                    }

                    var newValue;

                    if (thisScope.type == "number") {
                        newValue = parseFloat(event.value);

                        if (Number.isNaN(newValue)) {
                            return;
                        }
                    } else {
                        newValue = event.value;
                    }

                    model.addOrEditKeyframeNow(thisScope.name, newValue);
                });

                input.events.valueCommitted.connect(function() {
                    ignoreNextValueChange = true;
                });

                var eventName = model.propertyEventAssociations[this.name];

                if (eventName != null) {
                    model.events[eventName].connect(function() {
                        if (document.activeElement == input.element) {
                            return;
                        }

                        ignoreNextValueChange = true;
                        input.value = getValue(true);

                        updateInputComputationIndicator();
                    });
                }

                requestAnimationFrame(function updateComputed() {
                    if (!document.body.contains(existenceCheckElement)) {
                        return;
                    }

                    if (document.activeElement == input.element) {
                        requestAnimationFrame(updateComputed);

                        return;
                    }

                    if (computationStatus != null) {
                        ignoreNextValueChange = true;
                        input.value = getValue(true);
                    }

                    updateInputComputationIndicator();

                    requestAnimationFrame(updateComputed);
                });

                returnElement = input.element;

                break;

            case "scene":
                var input = new ui.Input(this.options.placeholder || "");
                var targetSceneEventConnection = null;

                input.enabled = false;

                targetButton = new ui.ToggleIconButton("icons/select.svg", "Cancel selecting a scene", undefined, "Select a scene");

                function updateSelectedScene() {
                    var rawValue = model.project.get([...model.path, thisScope.name]);

                    if (typeof(rawValue) == "string" && rawValue.match(/{{.*}}/)) {
                        input.element.setAttribute("mixpipe-computed", "computed");
                    } else {
                        input.element.removeAttribute("mixpipe-computed");
                    }

                    if (!(model[thisScope.name] instanceof storyboardObjects.Scene)) {
                        input.value = "";
                        return;
                    }

                    input.value = model[thisScope.name].name?.trim() || "Untitled scene";

                    sceneRenameEvent?.component.events.renamed.disconnect(sceneRenameEvent);

                    sceneRenameEvent = model[thisScope.name].events.renamed.connect(function() {
                        input.value = model[thisScope.name].name;
                    });
                }

                targetButton.element.classList.add("targetButton");

                targetButton.events.valueChanged.connect(function(event) {
                    var project = model.project;

                    project.setLocalProperty("targetingScene", event.value);

                    project.events.localStateChanged.disconnect(targetSceneEventConnection);

                    if (event.value) {
                        targetSceneEventConnection = project.events.localStateChanged.connect(function(event) {
                            if (event.property == "targetedScenePath") {
                                targetButton.value = false;

                                model[thisScope.name] = project.getOrCreateModel(event.value);

                                updateSelectedScene();
                            }
                        });
                    }
                });

                var eventName = model.propertyEventAssociations[this.name];
                var sceneRenameEvent = null;

                if (eventName != null) {
                    model.events[eventName].connect(function() {
                        if (document.activeElement == input.element) {
                            return;
                        }

                        updateSelectedScene();
                    });
                }

                updateSelectedScene();

                requestAnimationFrame(function updateComputed() {
                    if (!document.body.contains(existenceCheckElement)) {
                        return;
                    }

                    updateSelectedScene();

                    requestAnimationFrame(updateComputed);
                });

                returnElement = input.element;

                break;

        }

        return components.element("div", [returnElement, targetButton?.element, editTemplateButton.element, editTemplateDialog.element, existenceCheckElement]);
    }
}

export class PropertyRow extends components.Component {
    constructor(property, models) {
        super("tr");

        this.element.append(
            components.element("td", [
                components.text(property.displayName)
            ])
        );

        for (var model of models) {
            this.element.append(components.element("td", [
                property.generateInputElementForModel(model)
            ]));
        }
    }
}

export class PropertyTable extends components.Component {
    constructor(models, properties) {
        super("table");

        for (var property of properties) {
            if (property == null) {
                this.element.append(components.element("tr", [components.className("spacer")]));
                continue;
            }

            if (property.name.startsWith("attr:")) {
                this.add(new PropertyRow(property, models));
                continue;
            }

            var atLeastOneModelHasProperty = false;

            for (var model of models) {
                if (model.hasOwnProperty(property.name)) {
                    atLeastOneModelHasProperty = true;

                    break;
                }
            }

            if (!atLeastOneModelHasProperty) {
                continue;
            }

            this.add(new PropertyRow(property, models));
        }
    }
}

export class PropertyTableContainer extends components.Component {
    constructor(models, properties) {
        super("mixpipe-properties");

        this.table = new PropertyTable(models, properties);

        this.add(this.table);
    }
}