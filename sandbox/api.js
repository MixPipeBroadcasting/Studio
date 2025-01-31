function Send(result) {
    if (!(result instanceof Promise)) {
        result = Promise.resolve(result);
    }

    return result.then(function(value) {
        self.postMessage({status: "ok", value});
    });
}

function SetExpression(producer, silent = false) {
    function schedule() {
        requestAnimationFrame(function() {
            SetExpression(producer, true);
        });
    }

    try {
        Send(producer()).then(schedule);
    } catch (error) {
        if (!silent) {
            console.error(error);
        }

        schedule();
    }
}

self.addEventListener("message", function(event) {
    if (event.data.type == "setEnv") {
        for (var name of Object.keys(event.data.env)) {
            globalThis[name] = event.data.env[name];
        }
    }
});