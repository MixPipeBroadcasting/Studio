function Send(result) {
    if (!(result instanceof Promise)) {
        result = Promise.resolve(result);
    }

    return result.then(function(value) {
        self.postMessage({status: "ok", value: String(value)});
    });
}

function SetExpression(producer) {
    Send(producer()).then(function() {
        requestAnimationFrame(function() {
            SetExpression(producer);
        });
    });
}