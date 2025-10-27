import * as common from "./common.js";
import * as events from "./events.js";
import * as assets from "./assets.js";
import * as animations from "./animations.js";
import * as templates from "./templates.js";

export var projectsById = {};
export var modelSyncHandlers = [];

const TIMELINE_TRIM_COUNT_TRIGGER = 20;

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
    constructor(id = generateKey(), assetStore = new assets.TemporaryAssetStore()) {
        super();

        this.id = id;
        this.data = {};
        this.timeline = [];
        this.createdAt = Date.now();
        this.assetStore = assetStore;
        this.unregisteredModels = [];
        this.models = [];
        this.modelPropertyEventAssociations = {};
        this.modelReferencePropertyEventAssociations = {};
        this.localState = {};

        this.events.transactionAdded = new events.EventType(this);
        this.events.modelAdded = new events.EventType(this);
        this.events.modelReparented = new events.EventType(this);
        this.events.modelDeleted = new events.EventType(this);
        this.events.localStateChanged = new events.EventType(this);

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
            shouldSync = true;

            delete currentObject[path[0]];
        }

        return shouldSync;
    }

    emitTransactionEvents(transaction) {
        var pathHash = transaction.path.join(".");

        if (transaction instanceof SetDataTransaction) {
            this.modelPropertyEventAssociations[pathHash]?.emit({value: transaction.value});
            this.modelReferencePropertyEventAssociations[pathHash]?.emit({value: Array.isArray(transaction.value) ? this.getOrCreateModel(transaction.value) : null});
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
        var thisScope = this;
        var unregisteredModels = [...this.unregisteredModels];

        thisScope.unregisteredModels = [];

        this.models.push(...unregisteredModels);

        setTimeout(function() {
            for (var model of unregisteredModels) {
                thisScope.events.modelAdded.emit({model});
            }
        });
    }

    deleteModel(model) {
        var modelIndex = this.models.indexOf(model);

        if (modelIndex >= 0) {
            this.models.splice(modelIndex, 1);
        }

        this.delete(model.path);

        this.events.modelDeleted.emit({model});
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

        this.events.modelDeleted.connect(function(event) {
            var child = view.children.find((child) => child.model == event.model);

            if (child != null) {
                view.remove(child);
            }
        });
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
        for (var model of this.models) {
            if (!this.get(model.path)) {
                this.deleteModel(model);
            }
        }

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

    setLocalProperty(property, value, setExternally = false) {
        this.localState[property] = value;

        this.events.localStateChanged.emit({property, value, setExternally});
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
        this.lastAttributeTypes = {};
        this.templateOptions = {};
    }

    get exists() {
        return !!this.project.get(this.path);
    }

    registerProperty(name, defaultValue = null, propertyEventName = null, canTemplate = true, override = false) {
        var thisScope = this;

        this[`${name}:canTemplate`] = canTemplate;

        if (this.hasOwnProperty(name) && !override) {
            this[name] = defaultValue;

            return;
        }

        if (propertyEventName != null) {
            this.events[propertyEventName] ??= new events.EventType(this);
            this.propertyEventAssociations[name] = propertyEventName;
            this.project.modelPropertyEventAssociations[[...this.path, name].join(".")] = this.events[propertyEventName];
        }

        Object.defineProperty(this, name, {
            configurable: true,
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

    registerReferenceProperty(name, defaultValue = null, propertyEventName = null, canTemplate = false) {
        var thisScope = this;

        this[`${name}:canTemplate`] = canTemplate;

        if (propertyEventName != null) {
            this.events[propertyEventName] ??= new events.EventType(this);
            this.propertyEventAssociations[name] = propertyEventName;
            this.project.modelReferencePropertyEventAssociations[[...this.path, name].join(".")] = this.events[propertyEventName];
        }

        Object.defineProperty(this, name, {
            configurable: true,
            get: function() {
                var path = thisScope.project.get([...thisScope.path, name]);

                if (path == undefined || path == null) {
                    return path;
                }

                if (typeof(path) == "string") {
                    path = templates.evaluateDirectTemplate(path, `prop=${name}|path=${thisScope.path.join(".")}`, thisScope.templateOptions);
                }

                if (!Array.isArray(path)) {
                    return null;
                }

                return thisScope.project.getOrCreateModel(path);
            },
            set: function(newValue) {
                thisScope.project.set([...thisScope.path, name], newValue?.path ?? newValue);

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

        this.registerProperty(`${name}:timeline`, null, null, false);
        this.registerReferenceProperty(`${name}:timelineModel`);

        this.animationInterpolationMethods[name] = interpolationMethod;
    }

    getValue(name) {
        if (!name.startsWith("attr:") && !this[`${name}:canTemplate`]) {
            return this[name];
        }

        return templates.evaluateTemplate(this[name], `prop=${name}|path=${this.path.join(".")}`, this.templateOptions);
    }

    getNumericValue(name) {
        return templates.evaluateNumericTemplate(this[name], `prop=${name}|path=${this.path.join(".")}`, this.templateOptions);
    }

    getAnimatedValue(name, type = "number") {
        var thisScope = this;
        var timeline = this[`${name}:timeline`];

        function getFallback() {
            return type == "number" ? thisScope.getNumericValue(name) : thisScope.getValue(name);
        }

        if (!timeline || timeline.keyframes.length == 0) {
            return getFallback();
        }

        return animations.getValueInTimeline(timeline, animations.INTERPOLATION_METHODS[this.animationInterpolationMethods[name]]) ?? getFallback();
    }

    getValueComputationStatus(name) {
        if (this[`${name}:timeline`]) {
            return "animated";
        }

        if (String(this[name]).match(/{{.*}}/)) {
            return "computed";
        }

        return null;
    }

    get attributeTypeListOwner() {
        return this;
    }

    getAttributeType(id, attributeTypeList = this.attributeTypeListOwner?.attributeTypes) {
        if (!attributeTypeList) {
            return "string";
        }

        for (var attribute of attributeTypeList.getModelList()) {
            if (attribute.id == id) {
                return attribute.type;
            }
        }

        return "string";
    }

    ensureAttributeProperty(id) {
        var key = `attr:${id}`;
        var type = this.getAttributeType(id);

        if (this.lastAttributeTypes[id] != type) {
            this.lastAttributeTypes[id] = type;

            if (type == "scene") {
                this.registerReferenceProperty(key, null, "attributeChanged", true);
                return;
            }

            this.registerAnimationProperty(key, {
                "number": animations.INTERPOLATION_METHODS.number
            }[this.getAttributeType(id)] ?? animations.INTERPOLATION_METHODS.number, null, "attributeChanged", true, true);
        }
    }

    serialise() {
        return this.path;
    }

    propertyIsKeyframedNow(name) {
        var timeline = this[`${name}:timeline`];
        
        if (!timeline) {
            return false;
        }

        var dt = timeline.step != null ? timeline.step : Date.now() - timeline.start;

        return timeline.keyframes.find((keyframe) => keyframe.t == dt) != null;
    }

    addOrEditKeyframeNow(name, value, doNotChangeComputationStatus) {
        var timeline = this[`${name}:timeline`];
        var timelineModel = this[`${name}:timelineModel`];

        if (doNotChangeComputationStatus) {
            var currentStatus = this.getValueComputationStatus(name);

            if (currentStatus != null && currentStatus != "animated") {
                return;
            }
        }

        if (!timeline || !timelineModel) {
            this[name] = value;

            return;
        }

        var dt = timeline.step;

        if (dt == null) {
            this[name] = value;

            return;
        }

        for (var keyframe of timelineModel.keyframes.getModelList()) {
            if (keyframe.time == dt) {
                keyframe.value = value;

                timelineModel.parentAnimationController?.update();

                return;
            }
        }

        timelineModel.addDeserialisedKeyframe({
            t: dt,
            value: value
        });

        this.project.registerNewModels();
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

    getItemKey(item) {
        var items = this.getItems();

        return Object.keys(items).find((key) => items[key] == item);
    }

    hasItemKey(key) {
        return !!(this.getItemKeys().find((currentKey) => currentKey == key));
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

    getModelKey(model) {
        var items = this.getItems();

        return Object.keys(items).find((key) => items[key].join(".") == model.path.join("."));
    }

    hasModel(model) {
        return !!this.getModelKey(model);
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
        var paths = this.getItems();

        for (var key in paths) {
            if (paths[key].join(".") == model.path.join(".")) {
                return key;
            }
        }

        return null;
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

    clearModels() {
        var keys = this.getModelKeys();

        for (var key of keys) {
            this.removeModel(key);
        }
    }
}

export function generateKey() {
    return common.generateKey(...arguments);
}

export function getOrCreateProjectById(id) {
    return projectsById[id] ?? new Project(id);
}

export function registerModelSyncHandler(rootPath, modelType, condition = undefined) {
    modelSyncHandlers.push(new ModelSyncHandler(rootPath, modelType, condition));
}