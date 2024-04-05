export class EventConnection {
    constructor(component, callback) {
        this.component = component;
        this.callback = callback;
    }

    call(data) {
        this.callback.apply(this.component, [data]);
    }
}

export class EventType {
    constructor(component) {
        this.component = component;

        this.connections = [];
    }

    connect(callback, component = this.component) {
        var connection = new EventConnection(component, callback);

        this.connections.push(connection);

        return connection;
    }

    disconnect(connection) {
        this.connections = this.connections.filter((currentConnection) => currentConnection != connection);
    }

    emit(data = {}) {
        this.connections.forEach((callback) => callback.call(data));
    }
}

export class EventDrivenObject {
    constructor() {
        this.events = {};
    }
}