import * as windows from "./modules/windows.js";
import * as workspaces from "./modules/workspaces.js";
import * as projects from "./modules/projects.js";
import * as scenes from "./modules/scenes.js";
import * as sceneObjects from "./modules/sceneobjects.js";
import * as storyboards from "./modules/storyboards.js";

windows.init();

document.querySelector("#root").append(workspaces.mainWorkspace.element);

if (!opener) {
    var project = new projects.Project();

    var storyboardPanel = new storyboards.StoryboardPanel(project);

    workspaces.mainWorkspace.add(storyboardPanel);

    var scene = new scenes.Scene(project);
    var scene2 = new scenes.Scene(project);
    var scene3 = new scenes.Scene(project);
    var sceneGroup = new scenes.SceneGroup(project);
    
    scene.name = "Scene 1";
    scene.x = 16;
    scene.y = 24;
    scene.parentGroup = sceneGroup;
    
    for (var i = 0; i < 16; i++) {
        var rectangle = new sceneObjects.Rectangle(project);
    
        rectangle.x = (scene.width / 8) * i;
        rectangle.y = 0;
        rectangle.width = scene.width / 8;
        rectangle.height = scene.height;
    
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
    scene2.x = 400;
    scene2.y = 180;
    
    var textBackground = new sceneObjects.Rectangle(project);
    
    textBackground.backgroundFill = "black";
    textBackground.x = 700;
    textBackground.y = 400;
    textBackground.width = 500;
    textBackground.height = 200;
    
    scene2.objects.addModel(textBackground);
    
    var text = new sceneObjects.Text(project);
    
    text.text = "MPS";
    text.font = "160px monospace";
    text.backgroundFill = "white";
    text.x = 810;
    text.y = 550;
    
    scene2.objects.addModel(text);
    
    scene3.name = "Scene 3";
    scene3.x = 700;
    scene3.y = 180;
    
    var compositedScene = new sceneObjects.CompositedScene(project);
    
    compositedScene.scene = scene;
    compositedScene.x = 0;
    compositedScene.y = 0;
    compositedScene.width = 1920;
    compositedScene.height = 1080;
    
    scene3.objects.addModel(compositedScene);
    
    var compositedScene2 = new sceneObjects.CompositedScene(project);
    
    compositedScene2.scene = scene2;
    compositedScene2.x = 0;
    compositedScene2.y = 0;
    compositedScene2.width = 1920;
    compositedScene2.height = 1080;
    
    scene3.objects.addModel(compositedScene2);
    
    sceneGroup.name = "Scene group";
    sceneGroup.width = 280;
    sceneGroup.height = 200;
    
    project.registerNewModels();
    
    console.log(project);
    
    setInterval(function() {
        for (var rectangle of scene.objects.getModelList()) {
            var newX = rectangle.x - 1;
    
            while (newX < -(scene.width / 8)) {
                newX += 1920 * 2;
            }
    
            rectangle.x = newX;
        }
    });
    
    setInterval(function() {
        textBackground.y = 400 + (Math.sin(Date.now() * 0.01) * 100);
        text.y = 550 + (Math.sin(Date.now() * 0.01) * 100);
    });
}