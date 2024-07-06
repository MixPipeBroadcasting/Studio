import * as windows from "./modules/windows.js";
import * as workspaces from "./modules/workspaces.js";
import * as projects from "./modules/projects.js";
import * as animations from "./modules/animations.js";
import * as timelines from "./modules/timelines.js";
import * as storyboardObjects from "./modules/storyboardobjects.js";
import * as sceneObjects from "./modules/sceneobjects.js";
import * as storyboards from "./modules/storyboards.js";

windows.init();

document.querySelector("#root").append(workspaces.mainWorkspace.element);

if (!opener) {
    var project = new projects.Project();

    var storyboardPanel = new storyboards.StoryboardPanel(project);

    workspaces.mainWorkspace.add(storyboardPanel);

    var scene = new storyboardObjects.Scene(project);
    var scene2 = new storyboardObjects.Scene(project);
    var scene3 = new storyboardObjects.Scene(project);
    var storyboardGroup = new storyboardObjects.StoryboardGroup(project);

    scene.name = "Scene 1";
    scene.x = 16;
    scene.y = 24;
    scene.parentGroup = storyboardGroup;

    for (var i = 0; i < 16; i++) {
        var rectangle = new sceneObjects.Rectangle(project);

        rectangle.x = (scene.width / 8) * i;
        rectangle.y = 0;
        rectangle.width = scene.width / 8;
        rectangle.height = scene.height;

        rectangle.y_timeline = {
            start: Date.now() + 3000 + (i * 100),
            keyframes: [
                {t: 0, value: 1080},
                {t: 500, value: 0, easing: animations.EASING_METHODS.ease},
                {t: 2000, value: 540, easing: animations.EASING_METHODS.ease},
                {t: 2500, value: 0, easing: animations.EASING_METHODS.ease}
            ]
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
    scene2.x = 400;
    scene2.y = 180;

    var textBackground = new sceneObjects.Rectangle(project);

    textBackground.backgroundFill = "black";
    textBackground.x = 700;
    textBackground.y = `{{ 400 + (Math.sin(Date.now() * 0.01) * 100) }}`;
    textBackground.width = 500;
    textBackground.height = 200;

    scene2.objects.addModel(textBackground);

    var text = new sceneObjects.Text(project);

    text.text = "MPS";
    text.font = "160px monospace";
    text.backgroundFill = "white";
    text.x = 810;
    text.y = `{{ 550 + (Math.sin(Date.now() * 0.01) * 100) }}`;

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

    compositedScene2.x_timeline = {
        start: Date.now() + 6000,
        keyframes: [
            {t: 0, value: -1920},
            {t: 1500, value: 0, easing: animations.EASING_METHODS.easeOut}
        ]
    };

    compositedScene2.width_timeline = {
        start: Date.now() + 6500,
        keyframes: [
            {t: 0, value: 2880},
            {t: 1000, value: 1920, easing: animations.EASING_METHODS.easeOut}
        ]
    };

    var clock = new sceneObjects.Text(project);

    clock.text = `{{ new Date().toISOString() }}`;
    clock.font = "120px monospace";
    clock.backgroundFill = "black";
    clock.x = 10;
    clock.y = 1080 - 10;

    scene3.objects.addModel(clock);
    scene3.objects.addModel(compositedScene2);

    storyboardGroup.name = "Storyboard group";
    storyboardGroup.width = 280;
    storyboardGroup.height = 200;

    var animationController = new storyboardObjects.AnimationController(project);

    animationController.x = 180;
    animationController.y = 350;

    var timeline = new timelines.TimelineSource(project);

    timeline.keyframes = [
        {t: 0, value: 0},
        {t: 5000, value: 1}
    ];

    animationController.timelines.addModel(timeline);

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
}