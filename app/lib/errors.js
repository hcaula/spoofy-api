exports.errors = {
    "500": {
        "type": "internal_server_error",
        "message": "We messed up. We're very sorry. Try again in a while, please."
    },
    "404": {
        "type": "not_found",
        "message": "We looked very hard, but we couldn't find the resource you're looking for."
    }
}

exports.errors[400] = function(param) {
    if(param) {
        return {
            "type": "missing_params",
            "message": `Field "${param}" was not found on your request.`
        }
    } else {
        return {
            "type": "bad_request",
            "message": "Your request has some invalid fields or has syntax errors."
        }
    }
}

exports.errors[401] = function(type) {
    let error = {type: type}
    if(type == 'no_token_provided') error.error = "Aren't you missing something on your request?";
    else if (type == 'session_expired') error.error = "You're too slow. The access token you've sent has expired.";
    else error.error = "Are you sure you have the right permissions to request what you're requesting?";

    return error;
}