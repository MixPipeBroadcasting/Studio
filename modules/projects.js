import * as events from "./events.js";
import * as animations from "./animations.js";
import * as templates from "./templates.js";

export var projectsById = {};
export var modelSyncHandlers = [];

const TIMELINE_TRIM_COUNT_TRIGGER = 20;

var keyIndex = 0;

export class Transaction {
    constructor(path) {
        this.path = path;

        this.performedAt = Date.now();
        this.createdExternally = false;
    }

    static deserialise(data) {
        if (this == Transaction) {
            switch (data.type) {
                case "set": return SetDataTransaction.deserialise(data);
                case "delete": return DeleteDataTransaction.deserialise(data);

                default:
                    throw new Error("Unknown transaction type");
            }
        }

        var instance = new this(data.path);

        instance.performedAt = data.performedAt;

        return instance;
    }
}

export class SetDataTransaction extends Transaction {
    constructor(path, value) {
        super(path);

        this.path = path;
        this.value = value;
    }

    serialise() {
        return {
            type: "set",
            path: this.path,
            value: this.value
        };
    }

    static deserialise(data) {
        var instance = new this(data.path, data.value);

        instance.performedAt = data.performedAt;

        return instance;
    }
}

export class DeleteDataTransaction extends Transaction {
    constructor(path) {
        super(path);

        this.path = path;
    }

    serialise() {
        return {
            type: "delete",
            path: this.path
        };
    }
}

export class ModelSyncHandler {
    constructor(rootPath, modelType, condition = (data) => true) {
        this.rootPath = rootPath;
        this.modelType = modelType;
        this.condition = condition;
    }
}

export class Project extends events.EventDrivenObject {
    constructor(id = generateKey()) {
        super();

        this.id = id;
        this.data = {};
        this.timeline = [];
        this.createdAt = Date.now();
        this.unregisteredModels = [];
        this.models = [];
        this.modelPropertyEventAssociations = {};
        this.modelReferencePropertyEventAssociations = {};

        this.events.transactionAdded = new events.EventType(this);
        this.events.modelAdded = new events.EventType(this);
        this.events.modelReparented = new events.EventType(this);

        projectsById[this.id] = this;
    }

    applyTransaction(transaction, emitEvents = false) {
        var path = [...transaction.path];
        var currentObject = this.data;
        var shouldSync = false;

        while (path.length > 1) {
            if (!currentObject.hasOwnProperty(path[0])) {
                currentObject[path[0]] = {};
            }

            currentObject = currentObject[path[0]];

            path.shift();
        }

        if (transaction instanceof SetDataTransaction) {
            shouldSync ||= !(path[0] in currentObject);
            currentObject[path[0]] = transaction.value;

            if (emitEvents) {
                this.emitTransactionEvents(transaction);
            }
        }

        if (transaction instanceof DeleteDataTransaction) {
            delete currentObject[path[0]];
        }

        return shouldSync;
    }

    emitTransactionEvents(transaction) {
        var pathHash = transaction.path.join(".");

        if (transaction instanceof SetDataTransaction) {
            this.modelPropertyEventAssociations[pathHash]?.emit({value: transaction.value});
            this.modelReferencePropertyEventAssociations[pathHash]?.emit({value: transaction.value != null ? this.getOrCreateModel(transaction.value) : null});
        }
    }

    applyTransactions(transactions, external = false) {
        var shouldSync = false;

        for (var transaction of transactions) {
            shouldSync ||= this.applyTransaction(transaction, external);
        }

        if (external && shouldSync) {
            this.sync();
        }
    }

    addTransaction(transaction) {
        this.timeline.push(transaction);

        this.applyTransactions([transaction], transaction.createdExternally);

        if (this.timeline.length > 0 && this.timeline.length % TIMELINE_TRIM_COUNT_TRIGGER == 0) {
            this.trimTimeline();
        }

        this.events.transactionAdded.emit({transaction});
    }

    trimTimeline() {
        var reversedTimeline = [...this.timeline].reverse();
        var trimmedTimeline = [];
        var touchedPaths = [];

        for (var transaction of reversedTimeline) {
            var pathHash = transaction.path.join(".");

            if (touchedPaths.includes(pathHash)) {
                continue;
            }

            touchedPaths.push(pathHash);
            trimmedTimeline.unshift(transaction);
        }

        this.timeline = trimmedTimeline;
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
        var thisScope = this;

        function associate(model, instance) {
            var reparentedConnection = model.events.reparented.connect(function(event) {
                model.events.reparented.disconnect(reparentedConnection);

                instance.parent?.remove(instance);

                thisScope.events.modelReparented.emit({model});
            });

            return instance;
        }

        for (var model of this.getModels([...modelViewMap.keys()], modelFilter)) {
            var modelClass = modelViewMap.get(model.constructor);

            if (!modelClass) {
                continue;
            }

            view.add(associate(model, new modelClass(model, ...args)));
        }

        function parentEventListener(event) {
            if (!view.parent) {
                return;
            }

            if (!modelFilter(event.model)) {
                return;
            }

            var modelClass = modelViewMap.get(event.model.constructor);

            if (!modelClass) {
                return;
            }

            view.add(associate(event.model, new modelClass(event.model, ...args)));
        }

        this.events.modelAdded.connect(parentEventListener);
        this.events.modelReparented.connect(parentEventListener);
    }

    getOrCreateModel(path) {
        for (var model of this.models) {
            if (model.path.join(".") == path.join(".")) {
                return model;
            }
        }

        for (var model of this.unregisteredModels) {
            if (model.path.join(".") == path.join(".")) {
                return model;
            }
        }

        var data = this.get(path);
        var model = null;
        
        for (var handler of modelSyncHandlers) {
            if (path.slice(0, -1).join(".") == handler.rootPath.join(".") && handler.condition(data)) {
                model = new handler.modelType(this, path);
            }
        }

        this.registerNewModels();

        return model;
    }

    sync() {
        var syncedPathHashes = this.models.map((model) => model.path.join("."));

        for (var handler of modelSyncHandlers) {
            for (var key in this.get(handler.rootPath) ?? {}) {
                if (syncedPathHashes.includes(`${handler.rootPath.join(".")}.${key}`)) {
                    continue;
                }

                var modelPath = [...handler.rootPath, key];

                if (handler.condition(this.get(modelPath))) {
                    new handler.modelType(this, modelPath);
                }
            }
        }

        this.registerNewModels();
    }
}

export class ProjectModel extends events.EventDrivenObject {
    constructor(project, path) {
        super();

        this.project = project;
        this.path = path;
        this.animationInterpolationMethods = {};
        this.currentAnimations = {};

        this.events.reparented = new events.EventType(this);

        this.project.softSet(this.path, {});
        this.project.unregisteredModels.push(this);

        this.propertyEventAssociations = {};
    }

    registerProperty(name, defaultValue = null, propertyEventName = null) {
        var thisScope = this;

        if (this.hasOwnProperty(name)) {
            this[name] = defaultValue;

            return;
        }

        if (propertyEventName != null) {
            this.events[propertyEventName] ??= new events.EventType(this);
            this.propertyEventAssociations[name] = propertyEventName;
            this.project.modelPropertyEventAssociations[[...this.path, name].join(".")] = this.events[propertyEventName];
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
            this.project.softSet([...this.path, name], defaultValue);
        }
    }

    registerReferenceProperty(name, defaultValue = null, propertyEventName = null) {
        var thisScope = this;

        if (this.hasOwnProperty(name)) {
            this[name] = defaultValue.path;

            return;
        }

        if (propertyEventName != null) {
            this.events[propertyEventName] ??= new events.EventType(this);
            this.propertyEventAssociations[name] = propertyEventName;
            this.project.modelReferencePropertyEventAssociations[[...this.path, name].join(".")] = this.events[propertyEventName];
        }

        Object.defineProperty(this, name, {
            get: function() {
                var path = thisScope.project.get([...thisScope.path, name]);

                if (path == undefined || path == null) {
                    return path;
                }

                return thisScope.project.getOrCreateModel(path);
            },
            set: function(newValue) {
                thisScope.project.set([...thisScope.path, name], newValue != null ? newValue.path : newValue);

                if (propertyEventName != null) {
                    this.events[propertyEventName].emit({value: newValue});
                }
            }
        });

        if (defaultValue != null) {
            this.project.softSet([...this.path, name], defaultValue.path);
        }
    }

    registerAnimationProperty(name, interpolationMethod, ...options) {
        this.registerProperty(name, ...options);

        this.registerProperty(`${name}_timeline`, null);

        this.animationInterpolationMethods[name] = interpolationMethod;
    }

    getValue(name) {
        return templates.evaluateTemplate(this[name], `path=${this.path.join(".")}`);
    }

    getNumericValue(name) {
        return templates.evaluateNumericTemplate(this[name], `path=${this.path.join(".")}`);
    }

    getAnimatedValue(name, type = "number") {
        var timeline = this[`${name}_timeline`];

        if (!timeline) {
            return type == "number" ? this.getNumericValue(name) : this.getValue(name);
        }

        return animations.getValueInTimeline(timeline, animations.INTERPOLATION_METHODS[this.animationInterpolationMethods[name]]);
    }

    getValueComputationStatus(name) {
        if (this[`${name}_timeline`]) {
            return "animated";
        }

        if (String(this[name]).match(/{{.*}}/)) {
            return "computed";
        }

        return null;
    }

    mutateProperty(name, value) {
        this.project.set([...this.path, `${name}:initial`], value);

        this[name] = value;
    }

    resetProperty(name) {
        this[name] = this.project.get([...this.path, `${name}:initial`]);

        return this[name];
    }
}

export class ProjectModelGroup extends events.EventDrivenObject {
    constructor(project, path) {
        super();

        this.project = project;
        this.path = path;

        this.events.changed = new events.EventType(this);
    }

    get length() {
        return this.getItemKeys().length;
    }

    getItems() {
        return this.project.get(this.path) || {};
    }

    getItemKeys() {
        return Object.keys(this.getItems());
    }

    getItemValues() {
        return Object.values(this.getItems());
    }

    iterateOver() {
        var items = this.getItems();

        return Object.keys(items).map((key) => ({key, value: items[key]}));
    }

    getItem(key) {
        return this.getItems()[key] || null;
    }

    getItemKey(item) {
        var items = this.getItems();

        for (var key in items) {
            if (items[key] == item) {
                return key;
            }
        }

        return null;
    }

    setItem(key, value) {
        this.project.set([...this.path, key], value);

        this.events.changed.emit();
    }

    addItem(value) {
        this.setItem(generateKey(), value);
    }

    removeItem(key) {
        this.project.delete([...this.path, key]);

        this.events.changed.emit();
    }
}

export class ProjectModelReferenceGroup extends ProjectModelGroup {
    constructor(project, path, baseModel = ProjectModel) {
        super(project, path);

        this.baseModel = baseModel;
        this.modelCache = {};
    }

    getModels() {
        var object = {};

        for (var key of this.getModelKeys()) {
            object[key] = this.getModel(key);
        }

        return object;
    }

    getModelKeys() {
        return this.getItemKeys();
    }

    getModelList() {
        return this.getModelKeys().map((key) => this.getModel(key));
    }

    iterateOver() {
        var models = this.getModels();

        return Object.keys(models).map((key) => ({key, value: models[key]}));
    }

    getModel(key) {
        if (this.modelCache[key]) {
            return this.modelCache[key];
        }

        return this.project.getOrCreateModel(this.getItem(key));
    }

    getModelKey(model) {
        return this.getItemKey(model.path);
    }

    setModel(key, model) {
        this.setItem(key, model.path);

        this.modelCache[key] = model;
    }

    addModel(model) {
        this.setModel(generateKey(), model);
    }

    removeModel(key) {
        this.removeItem(key);

        delete this.modelCache[key];
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

export function getOrCreateProjectById(id) {
    return projectsById[id] ?? new Project(id);
}

export function registerModelSyncHandler(rootPath, modelType, condition = undefined) {
    modelSyncHandlers.push(new ModelSyncHandler(rootPath, modelType, condition));
}