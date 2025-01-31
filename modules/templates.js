var cachedValues = {};
var currentExpressions = {};
var currentEnvs = {};
var runningWorkers = {};

var apiResponse = await fetch("sandbox/api.js");
var apiCode = await apiResponse.text();

export function evaluateExpression(expression, id, options) {
    var env = {};

    for (var key of Object.keys(options?.env || {})) {
        var value = options.env[key];

        if (value && typeof(value) == "object" && "serialise" in value) {
            env[key] = value.serialise();
            continue;
        }

        try {
            JSON.stringify(value);

            env[key] = value;
        } catch (error) {}
    }

    if (options.hasOwnProperty("compositionId")) {
        id += `|cid=${options.compositionId}`;

        var serialisedEnv = JSON.stringify(env);

        if (currentEnvs[id] != serialisedEnv) {
            currentEnvs[id] = serialisedEnv;

            if (runningWorkers[id]) {
                runningWorkers[id].postMessage({type: "setEnv", env});
            }
        }
    }

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

export function evaluteDirectTemplate(template, id, options) {
    if (typeof(template) != "string") {
        return template;
    }

    var match = template.match(/{{(.*?)}}/);

    if (!match) {
        return template;
    }

    return evaluateExpression(match[1], `${id}|expr=0`, options);
}

export function evaluateTemplate(template, id, options) {
    if (typeof(template) != "string" || template.split("{{").length == 1) {
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
            evaluatedParts.push(evaluateExpression(match[2], `${id}|expr=${expressionId++}`, options));
        }
    }

    return evaluatedParts.join("");
}

export function evaluateNumericTemplate(template, id, options) {
    if (typeof(template) == "number") {
        return template;
    }

    var evaluatedTemplate = evaluateTemplate(template, id, options);

    if (evaluatedTemplate == "") {
        return 0;
    }

    return parseFloat(evaluatedTemplate);
}