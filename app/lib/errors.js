exports.errors = {
    "500": {
        "type": "internal_server_error",
        "message": "We messed up. We're very sorry. Try again in a while, please."
    },
    "401": {
        "type": "permission_denied",
        "message": "Are you sure you have the right permissions to request what you're requesting?"
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
            "message": `Field ${param} was not found on your request.`
        }
    } else {
        return {
            "type": "bad_request",
            "message": "Your request has some missing fields or has syntax errors."
        }
    }
}