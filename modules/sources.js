export var registeredSources = {};

export class Source {
    constructor(project, sourceId = null) {
        this.project = project;
        this.sourceId = sourceId;
    }

    get isConnected() {
        return false;
    }

    async connect() {
        throw new TypeError("Source does not support stream connections");
    }

    async invalidate() {
        throw new TypeError("Source does not support stream connections");
    }

    async getGraphic() {
        throw new TypeError("Source does not support graphics");
    }
}

export class CameraSource extends Source {
    constructor(project, sourceId) {
        super(project, sourceId);

        this.stream = null;
    }

    get isConnected() {
        return !!(this.stream && this.stream.getTracks().find((track) => !track.muted));
    }

    connect() {
        var thisScope = this;

        return new Promise(function(resolve, reject) {
            navigator.getUserMedia({video: true}, function(stream) {
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

export class GraphicSource extends Source {
    async getGraphic() {
        var thisScope = this;

        var image = new Image();
        var file = await this.project.assetStore.readAsset(this.sourceId.split(":")[1]);
        var reader = new FileReader();

        return new Promise(function(resolve, reject) {
            image.addEventListener("load", function() {
                resolve(image);
            });

            image.addEventListener("error", function() {
                reject(new ReferenceError(`Cannot load graphic for source ID: \`${thisScope.sourceId}\``));
            });

            reader.addEventListener("load", function(event) {
                image.src = event.target.result;
            });

            reader.addEventListener("error", function() {
                reject(new ReferenceError(`Cannot load graphic for source ID: \`${thisScope.sourceId}\``));
            });

            reader.readAsDataURL(file);
        });
    }
}

function registerSource(project, source) {
    return project.registeredSources[source.sourceId] = source;
}

export function get(project, sourceId, type = null) {
    var existingSource = project.registeredSources[sourceId];

    if (existingSource) {
        return existingSource;
    }

    if (sourceId.startsWith("camera:")) {
        return registerSource(project, new CameraSource(project, sourceId));
    }

    if (sourceId.startsWith("local:") && type == "graphic") {
        return registerSource(project, new GraphicSource(project, sourceId));
    }

    throw new TypeError(`Unknown source for source ID: \`${sourceId}\` (type: ${type})`);
}