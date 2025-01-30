import * as projects from "./projects.js";
import * as workspaces from "./workspaces.js";

export var allWindows = [];

export function handleMessage(data) {
    if (data.type == "incomingTransaction") {
        var transaction = projects.Transaction.deserialise(data.transaction);

        transaction.createdExternally = true;

        projects.getOrCreateProjectById(data.projectId).addTransaction(transaction, true);

        return;
    }

    if (data.type == "localStateChanged") {
        projects.getOrCreateProjectById(data.projectId).setLocalProperty(data.property, data.value, true);

        return;
    }

    if (data.type == "loadProject") {
        var project = new projects.Project(data.projectId);

        project.events.transactionAdded.connect(function(event) {
            if (event.transaction.createdExternally) {
                return;
            }

            parent.postMessage({
                type: "incomingTransaction",
                projectId: project.id,
                transaction: event.transaction.serialise()
            }, window.location.origin);
        });

        project.events.localStateChanged.connect(function(event) {
            if (event.setExternally) {
                return;
            }
    
            parent.postMessage({
                type: "localStateChanged",
                projectId: project.id,
                property: event.property,
                value: event.value
            }, window.location.origin);
        });

        project.data = data.projectData;
        project.localState = data.projectLocalState;

        project.sync();

        if (data.panel != null) {
            var panel = workspaces.Panel.deserialise(data.panel);

            workspaces.mainWorkspace.add(panel);
            workspaces.addEventListenersForProject(project);
        }

        console.log(project);

        return;
    }
}

export function open(project, panelToOpen = null) {
    var childWindow = window.open(window.location.href, "_blank", "popup");

    allWindows.push(childWindow);

    project.events.transactionAdded.connect(function(event) {
        if (event.transaction.createdExternally) {
            return;
        }

        childWindow.postMessage({
            type: "incomingTransaction",
            projectId: project.id,
            transaction: event.transaction.serialise()
        }, window.location.origin);
    });

    project.events.localStateChanged.connect(function(event) {
        if (event.setExternally) {
            return;
        }

        childWindow.postMessage({
            type: "localStateChanged",
            projectId: project.id,
            property: event.property,
            value: event.value
        }, window.location.origin);
    });

    childWindow.addEventListener("message", function(event) {
        if (event.origin != window.location.origin || event.source.window == window) {
            return;
        }

        for (var otherWindow of allWindows) {
            if (otherWindow == childWindow) {
                continue;
            }

            otherWindow.postMessage(event.data, window.location.origin);
        }

        if (event.data.type == "ready") {
            childWindow.postMessage({
                type: "loadProject",
                projectId: project.id,
                projectData: project.data,
                projectLocalState: project.localState,
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

    if (opener) {
        parent.postMessage({type: "ready"}, window.location.origin);
    }
}