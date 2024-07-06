var cachedValues = {};
var currentExpressions = {};
var runningWorkers = {};

var apiResponse = await fetch("sandbox/api.js");
var apiCode = await apiResponse.text();

export function evaluateExpression(expression, id) {
    if (currentExpressions[id] != expression) {
        runningWorkers[id]?.terminate();

        var url = URL.createObjectURL(new Blob([`${apiCode}\n\nSetExpression(() => (${expression}));`], {type: "script/javascript"}));
        var worker = new Worker(url);

        runningWorkers[id] = worker;

        worker.addEventListener("message", function(event) {
            cachedValues[id] = event.data.value;
        });

        URL.revokeObjectURL(url);

        currentExpressions[id] = expression;
    }

    return cachedValues[id] || "";
}

export function evaluateTemplate(template, id) {
    if (typeof(template) != "string") {
        return template;
    }

    if (template.split("{{").length == 1) {
        return template;
    }

    var evaluatedParts = [];
    var regex = /((?:[^{]|{[^{])*)(?:{{(.*?)}})?/g;
    var match;
    var expressionId = 0;

    while (match = regex.exec(template)) {
        if (match[1] == "" && match[2] == undefined) {
            break;
        }

        evaluatedParts.push(match[1]);

        if (match[2] != undefined) {
            evaluatedParts.push(evaluateExpression(match[2], `${id}|expr=${expressionId++}`));
        }
    }

    return evaluatedParts.join("");
}

export function evaluateNumericTemplate(template, id) {
    if (typeof(template) == "number") {
        return template;
    }

    var evaluatedTemplate = evaluateTemplate(template, id);

    if (evaluatedTemplate == "") {
        return 0;
    }

    return parseFloat(evaluatedTemplate);
}