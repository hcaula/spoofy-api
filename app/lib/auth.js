const User = require('mongoose').model('User');

const errors = require('./errors').errors;

exports.authenticateUser = function(req, res, next) {
    let access_token = req.headers.access_token;
    if(!access_token) {
        res.setHeaders({'WWW-Authenticate': 'access-token'});
        res.status(401).json(errors[401]);
    } else {
        User.findOne({token: {$elemMatch: {access_token: token}}}, function(error, user){
            let expiration_date = user.token.expiration_date;
            let today = new Date();
            if(today > expiration_date) {
                res.setHeaders({'WWW-Authenticate': 'access-token'});
                res.status(401).json({
                    type: "session_expired",
                    error: "You're too slow. The access token you've sent has expired."
                });
            } else {
                req.user = user;
                next();
            }
        });
    }
}