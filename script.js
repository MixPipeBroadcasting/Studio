import * as windows from "./modules/windows.js";
import * as workspaces from "./modules/workspaces.js";
import * as projects from "./modules/projects.js";
import * as animations from "./modules/animations.js";
import * as timelines from "./modules/timelines.js";
import * as storyboardObjects from "./modules/storyboardobjects.js";
import * as sceneObjects from "./modules/sceneobjects.js";
import * as storyboards from "./modules/storyboards.js";
import * as home from "./modules/home.js";

windows.init();

document.querySelector("#root").append(
    workspaces.mainWorkspace.element,
    workspaces.mainSubSplitter.element,
    workspaces.subWorkspace.element,
    workspaces.modeTooltipContainer.element
);

if (!opener) {
    var homePanel = new home.HomePanel();

    var project = new projects.Project();

    var storyboardPanel = new storyboards.StoryboardPanel(project);

    workspaces.mainWorkspace.add(homePanel);
    workspaces.mainWorkspace.add(storyboardPanel);
    workspaces.addEventListenersForProject(project);

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

        rectangle["y:timeline"] = {
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
    scene2.x = 550;
    scene2.y = 400;

    var testAttribute = new storyboardObjects.AttributeType(project);

    testAttribute.id = "test";
    testAttribute.name = "Test";
    testAttribute.type = "number";

    scene2.addAttributeType(testAttribute);

    var textBackground = new sceneObjects.Rectangle(project);

    textBackground.backgroundFill = "black";
    textBackground.x = 700;
    textBackground.y = `{{ 400 + (Math.sin(Date.now() * 0.01) * 100) }}`;
    textBackground.width = 500;
    textBackground.height = 200;

    scene2.objects.addModel(textBackground);

    var text = new sceneObjects.Text(project);

    text.text = "MPS";
    text.font = "monospace";
    text.fontSize = 160;
    text.backgroundFill = "white";
    text.x = 810;
    text.y = `{{ 400 + (Math.sin(Date.now() * 0.01) * 100) }}`;
    text.width = 300;
    text.height = 240;

    scene2.objects.addModel(text);

    scene3.name = "Scene 3";
    scene3.x = 600;
    scene3.y = 150;

    var compositedScene = new sceneObjects.CompositedScene(project);

    compositedScene.scene = scene;
    compositedScene.x = 0;
    compositedScene.y = 0;
    compositedScene.width = 1920;
    compositedScene.height = 1080;

    scene3.objects.addModel(compositedScene);

    var compositedScene2 = new sceneObjects.CompositedScene(project);

    compositedScene2.scene = scene2;
    compositedScene2.x = -1920;
    compositedScene2.y = 0;
    compositedScene2.width = 1920;
    compositedScene2.height = 1080;

    var clock = new sceneObjects.Text(project);

    clock.text = `{{ new Date().toISOString() }}`;
    clock.font = "monospace";
    clock.fontSize = 120;
    clock.backgroundFill = "black";
    clock.x = 10;
    clock.y = 1080 - 120 - 10;
    clock.width = 1920 - 20;
    clock.height = 180;

    scene3.objects.addModel(clock);
    scene3.objects.addModel(compositedScene2);

    storyboardGroup.name = "Storyboard group";
    storyboardGroup.width = 280;
    storyboardGroup.height = 200;

    var animationController = new storyboardObjects.AnimationController(project);

    animationController.name = "Animate logo in";
    animationController.x = 180;
    animationController.y = 350;

    var xTimeline = new timelines.TimelineSource(project);

    xTimeline.object = compositedScene2;
    xTimeline.property = "x";

    xTimeline.setFromSerialisedKeyframes([
        {t: 0, value: -1920},
        {t: 1500, value: 0, easing: animations.EASING_METHODS.easeOut}
    ]);

    animationController.addTimeline(xTimeline);

    var widthTimeline = new timelines.TimelineSource(project);

    widthTimeline.object = compositedScene2;
    widthTimeline.property = "width";

    widthTimeline.setFromSerialisedKeyframes([
        {t: 500, value: 2880, easing: animations.EASING_METHODS.linear},
        {t: 1500, value: 1920, easing: animations.EASING_METHODS.linear}
    ]);

    animationController.addTimeline(widthTimeline);

    var visionMixer = new storyboardObjects.VisionMixer(project);

    visionMixer.name = "Vision mixer";
    visionMixer.x = 650;
    visionMixer.y = 600;

    visionMixer.sourceScenes.addModel(scene2);
    visionMixer.sourceScenes.addModel(scene3);

    visionMixer.programmeScene = scene3;
    visionMixer.previewScene = scene2;

    project.registerNewModels();

    window.project = project;

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