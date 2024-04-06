import * as workspaces from "./modules/workspaces.js";
import * as projects from "./modules/projects.js";
import * as scenes from "./modules/scenes.js";
import * as sceneObjects from "./modules/sceneobjects.js";
import * as storyboards from "./modules/storyboards.js";

var project = new projects.Project();

var mainWorkspace = new workspaces.Workspace();
var storyboardPanel = new storyboards.StoryboardPanel(project);

mainWorkspace.add(storyboardPanel);

var scene = new scenes.Scene(project);
var scene2 = new scenes.Scene(project);
var scene3 = new scenes.Scene(project);
var sceneGroup = new scenes.SceneGroup(project);

scene.name = "Scene 1";
scene.position = {x: 16, y: 24};
scene.parentGroup = sceneGroup;

for (var i = 0; i < 16; i++) {
    var rectangle = new sceneObjects.Rectangle(project);

    rectangle.position = {
        x: (scene.size.width / 8) * i,
        y: 0
    };

    rectangle.size = {
        width: scene.size.width / 8,
        height: scene.size.height
    };

    rectangle.backgroundFill = [
        "rgb(255, 255, 255)",
        "rgb(192, 192, 0)",
        "rgb(0, 192, 192)",
        "rgb(0, 192, 0)",
        "rgb(192, 0, 192)",
        "rgb(192, 0, 0)",
        "rgb(0, 0, 192)",
        "rgb(0, 0, 0)"
    ][i % 8];

    scene.objects.addModel(rectangle);
}

scene2.name = "Scene 2";
scene2.position = {x: 400, y: 180};

var textBackground = new sceneObjects.Rectangle(project);

textBackground.backgroundFill = "black";
textBackground.position = {x: 700, y: 400};
textBackground.size = {width: 500, height: 200};

scene2.objects.addModel(textBackground);

var text = new sceneObjects.Text(project);

text.text = "MPS";
text.font = "160px monospace";
text.backgroundFill = "white";
text.position = {x: 810, y: 550};

scene2.objects.addModel(text);

scene3.name = "Scene 3";
scene3.position = {x: 700, y: 180};

var compositedScene = new sceneObjects.CompositedScene(project);

compositedScene.scene = scene;
compositedScene.position = {x: 0, y: 0};
compositedScene.size = {width: 1920, height: 1080};

scene3.objects.addModel(compositedScene);

var compositedScene2 = new sceneObjects.CompositedScene(project);

compositedScene2.scene = scene2;
compositedScene2.position = {x: 0, y: 0};
compositedScene2.size = {width: 1920, height: 1080};

scene3.objects.addModel(compositedScene2);

sceneGroup.name = "Scene group";
sceneGroup.size = {width: 280, height: 200};

project.registerNewModels();

console.log(project);

document.querySelector("#root").append(mainWorkspace.element);

setInterval(function() {
    for (var rectangle of scene.objects.getModelList()) {
        var newX = rectangle.position.x - 1;

        while (newX < -(scene.size.width / 8)) {
            newX += 1920 * 2;
        }

        rectangle.position = {
            x: newX,
            y: rectangle.position.y
        };
    }
});

setInterval(function() {
    textBackground.position = {
        x: textBackground.position.x,
        y: 400 + (Math.sin(Date.now() * 0.01) * 100)
    };

    text.position = {
        x: text.position.x,
        y: 550 + (Math.sin(Date.now() * 0.01) * 100)
    };
});