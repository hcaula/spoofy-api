const winston = require('winston');
const async = require('async');

const Track = require('mongoose').model('Track');
const Play = require('mongoose').model('Play');

const errors = require('../lib/errors');
const { getPlays } = require('../lib/util');

const getUserPlays = function (req, res, next) {
    const user = req.user;

    getPlays(user, req.query, (error, plays) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            req.plays = plays;
            next();
        }
    });
}

const getUserTracks = function (req, res, next) {
    const plays = req.plays;
    const sort_by = (req.query.sort_by || "hour");

    const group = plays.map(p => { return { track_id: p.track, played_at: p.played_at } });

    let tracks = [];
    async.each(group, (elem, next) => {
        Track.findById(elem.track_id, (error, track) => {
            if (error) {
                winston.error(error.stack);
                res.status(500).json(errors[500]);
            } else {
                track.played_at = elem.played_at;
                tracks.push(track);
                next();
            }
        });
    }, (error) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            tracks.sort((a, b) => a.played_at[sort_by] - b.played_at[sort_by]);
            req.tracks = tracks;
            next();
        }
    });
}

module.exports = [getUserPlays, getUserTracks];