const winston = require('winston');
const async = require('async');

const Track = require('mongoose').model('Track');
const User_Track = require('mongoose').model('User_Track');

const filters = require('../lib/filters');
const errors = require('../lib/errors');

let getUserTracks = function(req, res, next) {
    let user = req.user;

    User_Track.find({user: user._id}, function(error, user_tracks){
        if(error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            req.user_tracks = user_tracks;
            next();
        }
    });
}

let filterUserTracks = function(req, res, next) {
    let user_tracks = req.user_tracks;

    let day = req.query.day;
    let hour = req.query.hour;

    if(day && hour) {
        res.status(400).json({
            type: 'bad_param',
            error: 'Choose either day or hour for frequency'
        });
    } else {
        let frequency = (day ? day : hour);
        let choice = (day ? 'day' : 'hour');

        req.user_tracks = filters.dividePerTime(frequency, choice, user_tracks);
        req.choice = choice;
        next();
    }
}

let getTrackIds = function(req, res, next) {
    let divided_uTracks = req.user_tracks;
    let stamp = (req.choice == 'hour' ? 'day' : 'hour');

    let divided_tracks = [];
    divided_uTracks.forEach(function(division){
        track_ids = division.user_tracks.map(ut => ut.track);

        let obj = {tracks: track_ids};
        obj[stamp] = division[stamp];
        divided_tracks.push(obj); 
    });
    req.tracks = divided_tracks;
    req.stamp = stamp;
    next();
}

let getTracks = function(req, res, next) {
    let track_ids = req.tracks;
    let stamp = req.stamp;

    let divisions = [];
    async.each(track_ids, function(division, next){
        Track.find({_id: {$in: division.tracks}}, function(error, tracks){
            if(error) next(error);
            else {
                let obj = {tracks: tracks};
                obj[stamp] = division[stamp];
                divisions.push(obj);
                next();
            }
        });
    }, function(error){
        if(error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            req.tracks = divisions.sort((a,b) => a[stamp] - b[stamp]);
            next();
        }
    });
}

module.exports = [getUserTracks, filterUserTracks, getTrackIds, getTracks];