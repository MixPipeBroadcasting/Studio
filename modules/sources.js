export var registeredSources = {};

export class Source {
    constructor() {
        this.isConnected = false;
    }

    connect() {
        this.isConnected = true;

        return Promise.resolve();
    }

    invalidate() {
        this.isConnected = false;

        return Promise.resolve();
    }
}

export class CameraSource extends Source {
    constructor() {
        super();

        this.stream = null;
    }

    connect() {
        var thisScope = this;
        var superConnect = () => super.connect();

        return new Promise(function(resolve, reject) {
            navigator.getUserMedia({video: true}, function(stream) {
                superConnect();

                resolve(thisScope.stream = stream);
            }, function(error) {
                reject(error);
            });
        });
    }

    invalidate() {
        this.stream = null;

        return Promise.resolve();
    }
}

export function get(sourceId) {
    var existingSource = registeredSources[sourceId];

    if (existingSource) {
        return existingSource;
    }

    if (sourceId.startsWith("camera:")) {
        return registeredSources[sourceId] = new CameraSource();
    }

    throw new TypeError(`Unknown source type for source ID: \`${sourceId}\``);
}