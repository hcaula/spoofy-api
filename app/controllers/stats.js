const winston = require('winston');
const async = require('async');

const User = require('mongoose').model('User');
const Track = require('mongoose').model('Track');

const filter_phase = require('../lib/filter_phase');
const auth_phase = require('../lib/auth_phase');
const errors = require('../lib/errors');
const statistics = require('../lib/statistics');

module.exports = function(app) {
    app.get('/api/v1/tracks/time', auth_phase, filter_phase, getTracks);
    app.get('/api/v1/genres/time', auth_phase, filter_phase, getGenres);
    app.get('/api/v1/features/tracks', auth_phase, filter_phase, getFeaturesForAllTracks);
    app.get('/api/v1/features/stats', auth_phase, filter_phase, getFeaturesStatistics);
}

let getTracks = function(req, res) {
    let stamp = req.stamp;
    let name = stamp + (stamp[stamp.length-1] != 's' ? 's' : '');
    let obj = {};
    obj[name] = req.tracks;

    res.status(200).json(obj);
}

let getGenres = function(req, res) {
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

let getFeaturesForAllTracks = function(req, res) {
    let stamp = req.stamp;
    let divisions = req.tracks;
    let name = stamp + (stamp[stamp.length-1] != 's' ? 's' : '');
    let feature = req.query.feature;
    let obj = {};
    
    let all_features = [];
    divisions.forEach(function(division){
        let features = [];
        division.tracks.forEach(function(track){
            features.push(track.features);
        });
        let obj = {features: features};
        obj[stamp] = division[stamp];
        all_features.push(obj);
    });

    res.status(200).json({features: all_features});
}

let getFeaturesStatistics = function(req, res) {
    let stamp = req.stamp;
    let divisions = req.tracks;
    let name = stamp + (stamp[stamp.length-1] != 's' ? 's' : '');
    let obj = {};
    
    stats = statistics.getTracksFeaturesStatistics(divisions, stamp);

    res.status(200).json(stats);
}