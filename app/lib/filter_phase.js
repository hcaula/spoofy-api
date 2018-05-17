const winston = require('winston');
const async = require('async');

const Track = require('mongoose').model('Track');
const Play = require('mongoose').model('Play');

const errors = require('./errors');
const { getUserPlays, getPlayTracks } = require('./tracks');

const getLoggedUserPlays = function (req, res, next) {
    const user = req.user;

    getUserPlays(user, req.query, (error, plays) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            req.plays = plays;
            next();
        }
    });
}

const getLoggedUserTracks = function (req, res, next) {
    const plays = req.plays;
    const sort_by = (req.query.sort_by || "hour");

    getPlayTracks(plays, sort_by, (error, tracks) => {
        if(error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            req.tracks = tracks;
            next();
        }
    });
}

module.exports = [getLoggedUserPlays, getLoggedUserTracks];