import * as projects from "./projects.js";
import * as workspaces from "./workspaces.js";

export function handleMessage(data) {
    if (data.type == "incomingTransaction") {
        projects.getOrCreateProjectById(data.projectId).addTransaction(projects.Transaction.deserialise(data.transaction));

        return;
    }

    if (data.type == "loadProject") {
        var project = new projects.Project(data.projectId);

        project.data = data.projectData;

        if (data.panel != null) {
            var panel = workspaces.Panel.deserialise(data.panel);

            workspaces.mainWorkspace.add(panel);
        }

        project.sync();

        return;
    }
}

export function open(project, panelToOpen = null) {
    var childWindow = window.open(window.location.href, "newwindow", "popup");

    project.events.transactionAdded.connect(function(event) {
        childWindow.postMessage({
            type: "incomingTransaction",
            projectId: project.id,
            transaction: event.transaction.serialise()
        }, window.location.origin);
    });

    childWindow.addEventListener("message", function(event) {
        if (event.origin != window.location.origin || event.source.window == window) {
            return;
        }

        if (event.data.type == "ready") {
            childWindow.postMessage({
                type: "loadProject",
                projectId: project.id,
                projectData: project.data,
                panel: panelToOpen ? panelToOpen.serialise() : null
            }, window.location.origin);

            return;
        }

        handleMessage(event.data);
    });

    return childWindow;
}

export function init() {
    window.addEventListener("message", function(event) {
        if (event.origin != window.location.origin || event.source.window == window) {
            return;
        }

        handleMessage(event.data);
    });

    parent.postMessage({type: "ready"}, window.location.origin);
}