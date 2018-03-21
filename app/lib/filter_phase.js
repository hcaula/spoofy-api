const winston = require('winston');
const async = require('async');

const Track = require('mongoose').model('Track');
const Play = require('mongoose').model('Play');

const errors = require('../lib/errors');

let getPlays = function(req, res, next) {
    let user = req.user;

    let begin_hour = (req.query.begin_hour || req.body.begin_hour);
    let begin_day = (req.query.begin_day || req.body.begin_day);
    let end_hour, end_day;

    let query = {user: user._id};

    if(end_hour > 23 || begin_hour < 0 || end_day > 6 || begin_day < 0) {
        res.status(400).json({
            error: "invalid_date",
            message: "One of your query options are invalid dates."
        });
    } else {
        let error;

        if(begin_hour) {
            end_hour = (req.query.end_hour || req.body.end_hour || begin_hour);
            if(end_hour < begin_hour) {
                error = {
                    error: "invalid_end_hour",
                    message: "Your end_hour should be larger than your begin_hour."
                }
            } else query["played_at.hour"] = {$gte: begin_hour, $lte: end_hour}
        }

        if(begin_day) {
            end_day = (req.query.end_day || req.body.end_day || begin_day);
            if(end_day < begin_day) {
                error = {
                    error: "invalid_end_day",
                    message: "Your end_day should be larger than your begin_day."
                };
            } else query["played_at.day"] = {$gte: begin_day, $lte: end_day}
        }

        if(error) res.status(400).json(error);
        else {
            Play.find(query, function(error, plays){
                if(error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else {
                    req.plays = plays;
                    next();
                }
            });
        }
    }
}

let getTracks = function(req, res, next) {
    let plays = req.plays;
    let sort_by = (req.query.sort_by || "hour");

    let group = plays.map(p =>{ return {track_id: p.track, played_at: p.played_at} });

    let tracks = [];
    async.each(group, function(elem, next){
        Track.findById(elem.track_id, function(error, track){
            if(error) {
                winston.error(error.stack);
                res.status(500).json(errors[500]);
            } else {
                track.played_at = elem.played_at;
                tracks.push(track);
                next();
            }
        })
    }, function(error){
        if(error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            tracks.sort((a, b) => a.played_at[sort_by] - b.played_at[sort_by]);
            req.tracks = tracks;
            next();
        }
    });
}

module.exports = [getPlays, getTracks];