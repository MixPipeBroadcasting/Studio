import * as components from "./modules/components.js";
import * as workspaces from "./modules/workspaces.js";

var mainWorkspace = new workspaces.Workspace();
var mainPanel = new workspaces.Panel("Main panel");
var otherPanel = new workspaces.Panel("Other panel");
var thirdPanel = new workspaces.Panel("Third panel");

mainPanel.childContainerElement.append(components.text("Main panel!"));
otherPanel.childContainerElement.append(components.text("Other panel!"));
thirdPanel.childContainerElement.append(components.text("Third panel!"));

mainWorkspace.add(mainPanel, otherPanel, thirdPanel);

document.querySelector("#root").append(mainWorkspace.element);