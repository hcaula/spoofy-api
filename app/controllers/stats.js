const winston = require('winston');
const async = require('async');

const User = require('mongoose').model('User');
const Track = require('mongoose').model('Track');

const filter_phase = require('../lib/filter_phase');
const auth_phase = require('../lib/auth_phase');
const errors = require('../lib/errors');

module.exports = function(app) {
    app.get('/v1/stats/tracks/time', auth_phase, filter_phase, getTracksByTime);
    app.get('/v1/stats/genres/time', auth_phase, filter_phase, getGenresByTime);
}

let getTracksByTime = function(req, res) {
    let stamp = req.stamp;
    let name = stamp + (stamp[stamp.length-1] != 's' ? 's' : '');
    let obj = {};
    obj[name] = req.tracks;

    res.status(200).json(obj);
}

let getGenresByTime = function(req, res) {
    let divisions = req.tracks;
    let stamp = req.stamp;
    let name = stamp + (stamp[stamp.length-1] != 's' ? 's' : '');

    let genres = [];
    divisions.forEach(function(division){
        let all_genres = [];
        division.tracks.forEach(function(track){
            track.genres.forEach(function(genre){
                if(!all_genres.includes(genre)) all_genres.push(genre);
            });
        });
        let obj = {genres: all_genres};
        obj[stamp] = division[stamp];
        genres.push(obj);
    });

    let obj = {};
    obj[name] = genres;
    res.status(200).json(obj);
}

