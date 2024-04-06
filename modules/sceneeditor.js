import * as workspaces from "./workspaces.js";

export class SceneEditorPanel extends workspaces.Panel {
    constructor(scene) {
        super(scene.name || "Untitled scene");

        this.scene = scene;

        this.toolbar = new workspaces.Toolbar();
        this.workArea = new workspaces.WorkArea();

        this.add(this.toolbar, this.workArea);

        scene.events.renamed.connect(() => this.name = scene.name);
    }
}