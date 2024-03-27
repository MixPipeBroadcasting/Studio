import * as components from "./modules/components.js";
import * as workspaces from "./modules/workspaces.js";
import * as projects from "./modules/projects.js";
import * as scenes from "./modules/scenes.js";
import * as storyboards from "./modules/storyboards.js";

var project = new projects.Project();

var mainWorkspace = new workspaces.Workspace();
var mainPanel = new workspaces.Panel("Main panel");
var otherPanel = new workspaces.Panel("Other panel");
var thirdPanel = new workspaces.Panel("Third panel");
var storyboardPanel = new storyboards.StoryboardPanel(project);

mainPanel.childContainerElement.append(components.text("Main panel!"));
otherPanel.childContainerElement.append(components.text("Other panel!"));
thirdPanel.childContainerElement.append(components.text("Third panel!"));

mainWorkspace.add(mainPanel, otherPanel, thirdPanel, storyboardPanel);

var scene = new scenes.Scene(project);
var scene2 = new scenes.Scene(project);
var sceneGroup = new scenes.SceneGroup(project);

scene.name = "Scene 1";
scene.position = {x: 16, y: 24};
scene.parentGroup = sceneGroup;

scene2.name = "Scene 2";
scene2.position = {x: 400, y: 180};

sceneGroup.name = "Scene group";
sceneGroup.size = {width: 240, height: 180};

project.registerNewModels();

console.log(project);

document.querySelector("#root").append(mainWorkspace.element);