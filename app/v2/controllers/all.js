const winston = require('winston');
const async = require('async');

const User = require('mongoose').model('User');
const Track = require('mongoose').model('Track');
const Artist = require('mongoose').model('Artist');

const errors = require('../lib/errors');
const auth = require('../lib/auth');

module.exports = function (app) {
    app.get('/api/v2/all/users', auth, getUsers);
}

const getUsers = function (req, res) {
    User.find({}, (error, users) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            let ret_users = [];
            async.each(users, (user, next) => {
                let ret_user = JSON.parse(JSON.stringify(user));
                delete ret_user.token;
                Track.find({ _id: { $in: user.tracks } }, (error, tracks) => {
                    if (error) next(error);
                    else {
                        ret_user.tracks = tracks.map(t => t.name);
                        Artist.find({ _id: { $in: user.artists } }, (error, artists) => {
                            if (error) next(error);
                            else {
                                ret_user.artists = artists.map(a => a.name);
                                ret_users.push(ret_user);
                                next();
                            }
                        });
                    }
                });
            }, error => {
                if (error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else res.status(200).json({ users: ret_users });
            });
        }
    });
}