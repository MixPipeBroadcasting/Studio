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

export class Project {
    constructor() {
        this.data = {};
        this.timeline = [];
        this.createdAt = Date.now();
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
}

export class ProjectModel {
    constructor(project, path) {
        this.project = project;
        this.path = path;

        this.project.softSet(this.path, {});
    }

    registerProperty(name, defaultValue = null) {
        var thisScope = this;

        Object.defineProperty(this, name, {
            get: function() {
                return thisScope.project.get([...thisScope.path, name]);
            },
            set: function(newValue) {
                return thisScope.project.set([...thisScope.path, name], newValue);
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

                if (path == null) {
                    return null;
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