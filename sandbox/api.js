(function() {
    var lastSentValue = null;

    globalThis.Send = function(result) {
        if (!(result instanceof Promise)) {
            result = Promise.resolve(result);
        }

        return result.then(function(value) {
            if (value == lastSentValue) {
                return Promise.resolve();
            }

            lastSentValue = value;

            self.postMessage({status: "ok", value});

            return Promise.resolve();
        });
    }

    var setExpression = globalThis._setExpression = function(producer, silent = false) {
        if (globalThis._setExpression) {
            delete globalThis._setExpression;
        }

        function schedule() {
            requestAnimationFrame(function() {
                setExpression(producer, true);
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
})();