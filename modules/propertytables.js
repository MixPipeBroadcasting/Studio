import * as projects from "./projects.js";
import * as components from "./components.js";
import * as ui from "./ui.js";

components.css(`
    mixpipe-properties {
        ${components.styleMixins.GROW}
        overflow: auto;
    }

    mixpipe-properties td:first-of-type {
        min-width: 8rem;
        vertical-align: top;
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

        switch (this.type) {
            case "string":
            case "number":
                function getValue() {
                    var currentValue = model.getAnimatedValue(thisScope.name, thisScope.type);

                    if (thisScope.type == "number" && thisScope.options.roundNumber) {
                        currentValue = Math.round(currentValue);
                    }

                    return currentValue;
                }

                var input = new ui.Input("", {"string": "text", "number": "number"}[this.type], getValue());
                var computationStatus = null;
                var ignoreNextValueChange = false;

                function updateInputComputationIndicator() {
                    computationStatus = model.getValueComputationStatus(thisScope.name);

                    if (computationStatus != null) {
                        input.element.setAttribute("mixpipe-computed", computationStatus);
                    } else {
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
                        model[thisScope.name] = Number(event.value);
                    } else {
                        model[thisScope.name] = event.value;
                    }

                    updateInputComputationIndicator();
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

                    requestAnimationFrame(updateComputed);
                });

                return input.element;

            default:
                return components.text("(Unknown)");
        }

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