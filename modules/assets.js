import * as common from "./common.js";

export class AssetStore {
    constructor() {}

    async readAsset(path) {
        throw new Error("Not implemented");
    }

    async writeAsset(path, data) {
        throw new Error("Not implemented");
    }

    async processRemoteRequest(payload) {
        var result = null;

        switch (payload.type) {
            case "readAsset":
                result = await this.readAsset(payload.path);
                break;

            case "writeAsset":
                result = await this.writeAsset(payload.path, payload.data);
                break;
        }

        return {id: payload.id, result};
    }
}

export class FileSystemAssetStore extends AssetStore {
    constructor(root) {
        super();

        this.root = root;
    }

    async _resolvePath(path, create = false) {
        var currentDir = this.root;
        var parts = path.split("/");

        for (var part of parts.slice(0, -1)) {
            currentDir = await currentDir.getDirectoryHandle(part, {create});
        }

        return await currentDir.getFileHandle(parts.at(-1), {create});
    }

    async readAsset(path) {
        var fileHandle = await this._resolvePath(path);

        return await fileHandle.getFile();
    }
    
    async writeAsset(path, data) {
        var fileHandle = await this._resolvePath(path, true);
        var writable = await fileHandle.createWritable();

        await writable.write(data);
        await writable.close();
    }
}

export class TemporaryAssetStore extends AssetStore {
    constructor() {
        super();

        this._assets = {};
    }

    async readAsset(path) {
        return new File([new Blob([this._assets[path] ?? new Uint8Array(0)])], path.split("/").at(-1));
    }

    async writeAsset(path, data) {
        this._assets[path] = data;
    }
}

export class RemoteAssetStore extends AssetStore {
    constructor() {
        super();

        this._responseHandlers = {};
        this._requestHandler = function(payload) {};
    }

    _sendRequest(data) {
        var thisScope = this;

        return new Promise(function(resolve, reject) {
            var id = common.generateKey();

            thisScope._responseHandlers[id] = resolve;

            thisScope._requestHandler({id, ...data});
        });
    }

    setRequestHandler(callback) {
        this._requestHandler = callback;
    }

    processResponse(response) {
        this._responseHandlers[response.id](response.result);
    }

    async readAsset(path) {
        return await this._sendRequest({type: "readAsset", path});
    }

    async writeAsset(path, data) {
        return await this._sendRequest({type: "writeAsset", path, data});
    }
}