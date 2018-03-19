const winston = require('winston');
const config = require('../../config/config');

const Session = require('mongoose').model('Session');
const User = require('mongoose').model('User');

const errors = require('./errors');
const util = require('./util');

let getSession = function(req, res, next) {
    let access_token = req.headers.access_token;
    let caller = req.path.slice(1);
    caller = caller.slice(0, caller.indexOf('/'));

    if(!access_token) {
        if(caller == 'api') {
            res.set('WWW-Authenticate', 'access_token');
            res.status(401).json(errors[401]('no_token_provided'));
        } else next();
    } else {
        Session.findOne({"token": access_token}, function(error, session){
            if(error) {
                winston.error(error.stack);
                res.status(500).json(errors[500]);
            } else if(!session) {
                if(caller == 'api'){
                    res.set('WWW-Authenticate', 'access_token');
                    res.status(401).json(errors[401]('permission_denied'));
                } else next();
            } else {
                let expiration_date = session.expiration_date;
                let today = new Date();
                if(today > expiration_date) {
                    if(caller == 'api'){
                        res.set('WWW-Authenticate', 'access_token');
                        res.status(401).json(errors[401]('session_expired'));
                    } else next();
                } else {
                    let next_week = util.calculateNextWeek();
                    session.expiration_date = next_week;
                    session.save(function(error){
                        if(error) {
                            winston.error(error.stack);
                            res.status(500).json(errors[500]);
                        } else {
                            req.user = (session.user || '');
                            next();
                        }
                    })
                }
            }
        });
    }
};

let getUser = function(req, res, next) {
    if(!req.user) next();
    else {
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
}

module.exports = [
    getSession,
    getUser
];