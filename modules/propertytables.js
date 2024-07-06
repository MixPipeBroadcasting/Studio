import * as components from "./components.js";
import * as ui from "./ui.js";

components.css(`
    mixpipe-properties {
        ${components.styleMixins.GROW}
        overflow: auto;
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

    mixpipe-properties .editTemplateButton {
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

    mixpipe-properties input[mixpipe-computed="computed"] {
        border: 2px solid var(--computedBackground);
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

        if (!model.hasOwnProperty(this.name)) {
            return components.element("span", [
                components.style("display", "inline-block"),
                components.style("width", "100%"),
                components.style("text-align", "center"),
                components.text("--")
            ]);
        }

        var computationStatus = null;
        var returnElement = components.text("(Unknown)");

        var editTemplateButton = new ui.IconButton("icons/computed.svg", "Edit template");
        var editTemplateDialog = new ui.ValueEditorDialog("Enter the template source to be rendered.");

        editTemplateDialog.events.saved.connect(function(event) {
            model[thisScope.name] = event.value;
        })

        editTemplateButton.element.classList.add("editTemplateButton");

        editTemplateButton.events.activated.connect(function() {
            editTemplateDialog.input.value = model[thisScope.name];

            editTemplateDialog.openBelowElement(editTemplateButton.element, true);
        });

        editTemplateButton.setVisiblity(model[`${this.name}_canTemplate`]);

        function getValue() {
            var currentValue = model.getAnimatedValue(thisScope.name, thisScope.type);

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
                var input = new ui.Input("", {"string": "text", "number": "number"}[this.type], getValue());
                var ignoreNextValueChange = false;

                function updateInputComputationIndicator() {
                    updateComputationStatus();

                    if (computationStatus != null) {
                        input.enabled = false;

                        input.element.setAttribute("mixpipe-computed", computationStatus);
                    } else {
                        input.enabled = true;

                        input.element.removeAttribute("mixpipe-computed");
                    }
                }

                updateInputComputationIndicator();

                input.element.addEventListener("focus", () => input.element.select());

                input.events.valueChanged.connect(function(event) {
                    if (ignoreNextValueChange) {
                        ignoreNextValueChange = false;

                        return;
                    }

                    if (thisScope.type == "number") {
                        model[thisScope.name] = parseFloat(event.value);
                    } else {
                        model[thisScope.name] = event.value;
                    }
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
                        input.value = getValue();

                        updateInputComputationIndicator();
                    });
                }

                requestAnimationFrame(function updateComputed() {
                    if (computationStatus != null) {
                        ignoreNextValueChange = true;
                        input.value = getValue();
                    }

                    if (document.activeElement != input.element) {
                        updateInputComputationIndicator();
                    }

                    requestAnimationFrame(updateComputed);
                });

                returnElement = input.element;

                break;
        }

        return components.element("div", [returnElement, editTemplateButton.element, editTemplateDialog.element]);
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