
const winston = require('winston');
const async = require('async');
const simple_statistics = require('simple-statistics');

const User = require('mongoose').model('User');
const Track = require('mongoose').model('Track');

const filter_phase = require('../lib/filter_phase');
const auth_phase = require('../lib/auth_phase');
const errors = require('../lib/errors');
const util = require('../lib/util');

module.exports = function(app) {
    app.get('/api/v1/stats/tracks', auth_phase, filter_phase, getTracks);
    app.get('/api/v1/stats/genres/', auth_phase, filter_phase, getGenres);
    app.get('/api/v1/stats/features/', auth_phase, filter_phase, getFeatures);
    app.get('/api/v1/stats/features/statistics', auth_phase, filter_phase, getFeaturesStatistics);
}

let getTracks = function(req, res) {
    res.status(200).json({tracks: req.tracks});
}

let getGenres = function(req, res) {
    let tracks = req.tracks;
    let genres = [], counted_genres = [], ret_genres = [];

    tracks.forEach(function(track){
        track.genres.forEach(g => genres.push(g));
    });

    genres.forEach(function(g){
        if(!counted_genres.includes(g)) {
            counted_genres.push(g);
            ret_genres.push({
                genre: g,
                times_listened: util.countElement(g, genres)
            });
        }
    });

    let sorted = ret_genres.sort((a, b) => b.times_listened - a.times_listened)

    res.status(200).json({genres: sorted});
}

let getFeatures = function(req, res) {
    let tracks = req.tracks;
    let features = [];
    
    tracks.forEach(function(track){
        features.push({features: track.features, played_at: track.played_at});
    });

    res.status(200).json({features: features});
}

let getFeaturesStatistics = function(req, res) {
    let tracks = req.tracks;
    let stats = {}, features = {};

    tracks.forEach(function(track){
        for(let param in track.features) {
            let elem = track.features[param]; 
            if(typeof elem == "number" && elem) {
                if(!features[param]) features[param] = [];
                features[param].push(elem);
            }
        }
    });

    for(let feature in features) {
        let arr = features[feature];
        if(arr.length > 1) {
            stats[feature] = {
                mean: simple_statistics.mean(arr),
                median: simple_statistics.median(arr),
                mode: simple_statistics.mode(arr),
                variance: simple_statistics.variance(arr),
                sample_variance: simple_statistics.sampleVariance(arr),
                standard_deviation: simple_statistics.standardDeviation(arr),
                sample_standard_deviation: simple_statistics.sampleStandardDeviation(arr),
                median_absolute_deviation: simple_statistics.medianAbsoluteDeviation(arr),
                interquartile_range: simple_statistics.interquartileRange(arr)
            }
        }
    }

    res.status(200).json({statistics: stats})
}