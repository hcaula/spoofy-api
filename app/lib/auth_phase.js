const winston = require('winston');

const Session = require('mongoose').model('Session');
const User = require('mongoose').model('User');

const errors = require('./errors');

module.exports = [
    function(req, res, next) {
        let access_token = req.cookies.spoofy;

        if(!access_token) {
            res.set('WWW-Authenticate', 'spoofy-cookie');
            res.status(401).json(errors[401]('no_token_provided'));
        } else {
            Session.findOne({"token": access_token}, function(error, session){
                if(!session) {
                    res.set('WWW-Authenticate', 'spoofy-cookie');
                    res.status(401).json(errors[401]('permission_denied'));
                } else {
                    let expiration_date = session.expiration_date;
                    let today = new Date();
                    if(today > expiration_date) {
                        res.set('WWW-Authenticate', 'spoofy-cookie');
                        res.status(401).json(errors[401]('session_expired'));
                    } else {
                        req.user = session.user;
                        next();
                    }
                }
            });
        }
    },
    function(req, res, next) {
        User.findById(req.user, function(error, user){
            if(error) {
                winston.error(error.stack);
                res.status(500).json(errors[500]);
            } else if (!user){
                res.status(400).json({
                    error: "user_not_found",
                    message: "No user could be retrieved from this token."
                });
            } else {
                req.user = user;
                next();
            }
        });
    }
];