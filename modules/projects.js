import * as events from "./events.js";

var keyIndex = 0;

export class Transaction {
    constructor(path) {
        this.path = path;

        this.performedAt = Date.now();
    }
}

export class SetDataTransaction extends Transaction {
    constructor(path, value) {
        super(path);

        this.path = path;
        this.value = value;
    }
}

export class DeleteDataTransaction extends Transaction {
    constructor(path) {
        super(path);

        this.path = path;
    }
}

export class Project extends events.EventDrivenObject {
    constructor() {
        super();

        this.data = {};
        this.timeline = [];
        this.createdAt = Date.now();
        this.unregisteredModels = [];
        this.models = [];

        this.events.modelAdded = new events.EventType(this);
    }

    applyTransaction(transaction) {
        var path = [...transaction.path];
        var currentObject = this.data;

        while (path.length > 1) {
            if (!currentObject.hasOwnProperty(path[0])) {
                currentObject[path[0]] = {};
            }

            currentObject = currentObject[path[0]];

            path.shift();
        }

        if (transaction instanceof SetDataTransaction) {
            currentObject[path[0]] = transaction.value;
        }

        if (transaction instanceof DeleteDataTransaction) {
            delete currentObject[path[0]];
        }
    }

    applyTransactions(transactions) {
        for (var transaction of transactions) {
            this.applyTransaction(transaction);
        }
    }

    addTransaction(transaction) {
        this.timeline.push(transaction);

        this.applyTransaction(transaction);
    }

    get(path) {
        path = [...path];

        var currentObject = this.data;

        while (path.length > 0) {
            if (!currentObject.hasOwnProperty(path[0])) {
                return undefined;
            }

            currentObject = currentObject[path[0]];

            path.shift();
        }

        return currentObject;
    }

    set(path, value) {
        var transaction = new SetDataTransaction(path, value);

        this.addTransaction(transaction);
    }

    softSet(path, value) {
        if (this.get(path) == undefined) {
            this.set(path, value);
        }
    }

    delete(path) {
        var transaction = new DeleteDataTransaction(path);

        this.addTransaction(transaction);
    }

    registerNewModels() {
        this.models.push(...this.unregisteredModels);

        for (var model of this.unregisteredModels) {
            this.events.modelAdded.emit({model});
        }

        this.unregisteredModels = [];
    }

    getModels(types, modelFilter = (model) => true) {
        return this.models.filter(function(model) {
            if (!modelFilter(model)) {
                return false;
            }

            for (var type of types) {
                if (model instanceof type) {
                    return true;
                }
            }

            return false;
        });
    }

    associateChildModels(view, modelViewMap, args = [], modelFilter = (model) => true) {
        for (var model of this.getModels(modelViewMap.keys(), modelFilter)) {
            view.add(new (modelViewMap.get(model.constructor))(model, ...args));
        }

        this.events.modelAdded.connect(function(event) {
            if (!modelFilter(event.model)) {
                return;
            }

            view.add(new (modelViewMap.get(event.model.constructor))(event.model, ...args));
        });
    }
}

export class ProjectModel extends events.EventDrivenObject {
    constructor(project, path) {
        super();

        this.project = project;
        this.path = path;

        this.project.softSet(this.path, {});
        this.project.unregisteredModels.push(this);
    }

    registerProperty(name, defaultValue = null, propertyEventName = null) {
        var thisScope = this;

        if (propertyEventName != null) {
            this.events[propertyEventName] ??= new events.EventType(this);
        }

        Object.defineProperty(this, name, {
            get: function() {
                return thisScope.project.get([...thisScope.path, name]);
            },
            set: function(newValue) {
                thisScope.project.set([...thisScope.path, name], newValue);

                if (propertyEventName != null) {
                    this.events[propertyEventName].emit({value: newValue});
                }
            }
        });

        if (defaultValue != null) {
            thisScope.project.softSet([...thisScope.path, name], defaultValue);
        }
    }

    registerReferenceProperty(name, classType, defaultValue = null) {
        var thisScope = this;
        var value = defaultValue;

        Object.defineProperty(this, name, {
            get: function() {
                if (value != null) {
                    return value;
                }

                var path = thisScope.project.get([...thisScope.path, name]);

                if (path == undefined) {
                    return undefined;
                }

                return new classType(thisScope.project, path);
            },
            set: function(newValue) {
                value = newValue;

                return thisScope.project.set([...thisScope.path, name], newValue.path);
            }
        });

        if (defaultValue != null) {
            thisScope.project.softSet([...thisScope.path, name], defaultValue.path);
        }
    }
}

export function generateKey() {
    const DIGITS = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";

    return BigInt(BigInt(Math.floor(Date.now() * 100) * 256) + BigInt(keyIndex++))
        .toString(2)
        .split(/(.{0,6})/)
        .filter((part) => part != "")
        .map((part) => DIGITS[parseInt(part, 2)])
        .join("")
    ;
}