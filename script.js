import * as components from "./modules/components.js";
import * as workspaces from "./modules/workspaces.js";
import * as projects from "./modules/projects.js";
import * as scenes from "./modules/scenes.js";

var project = new projects.Project();

var mainWorkspace = new workspaces.Workspace();
var mainPanel = new workspaces.Panel("Main panel");
var otherPanel = new workspaces.Panel("Other panel");
var thirdPanel = new workspaces.Panel("Third panel");

mainPanel.childContainerElement.append(components.text("Main panel!"));
otherPanel.childContainerElement.append(components.text("Other panel!"));
thirdPanel.childContainerElement.append(components.text("Third panel!"));

mainWorkspace.add(mainPanel, otherPanel, thirdPanel);

var scene = new scenes.Scene(project);
var sceneGroup = new scenes.SceneGroup(project);

scene.position = {x: 150, y: 150};
scene.parentGroup = sceneGroup;

console.log(project.timeline, scene);

document.querySelector("#root").append(mainWorkspace.element);