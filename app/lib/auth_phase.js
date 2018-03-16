const User = require('mongoose').model('User');

const errors = require('./errors');

module.exports = [
    function(req, res, next) {
        let access_token = req.headers.access_token;
        if(!access_token) {
            res.set('WWW-Authenticate', 'access-token');
            res.status(401).json(errors[401]('no_token_provided'));
        } else {
            User.findOne({"token.access_token": access_token}, function(error, user){
                if(!user) {
                    res.set('WWW-Authenticate', 'access-token');
                    res.status(401).json(errors[401]('permission_denied'));
                } else {
                    let expiration_date = user.token.expiration_date;
                    let today = new Date();
                    if(today > expiration_date) {
                        res.set('WWW-Authenticate', 'access-token');
                        res.status(401).json(errors[401]('session_expired'));
                    } else {
                        req.user = user;
                        next();
                    }
                }
            });
        }
    }
];