
const winston = require('winston');

const User = require('mongoose').model('User');
const Relation = require('mongoose').model('Relation');

const errors = require('../lib/errors');
const auth_phase = require('../lib/auth_phase');

module.exports = function (app) {
    app.get('/api/v1/relations/', auth_phase, getRelations);
}

const getRelations = function (req, res, next) {
    Relation.find({}, (error, relations) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            User.find({}, (error, users) => {
                let ret_users = users.map(u => {
                    return {
                        _id: u._id,
                        display_name: u.display_name,
                        href: u.href,
                        uri: u.uri,
                        images: u.images
                    }
                });
                if (error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else {
                    res.status(200).json({
                        users: ret_users,
                        relations: relations
                    });
                }
            })
        }
    });
}