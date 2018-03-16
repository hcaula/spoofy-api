const winston = require('winston');
const async = require('async');
const statistics = require('simple-statistics');

const User = require('mongoose').model('User');
const Track = require('mongoose').model('Track');

const filter_phase = require('../lib/filter_phase');
const auth_phase = require('../lib/auth_phase');
const errors = require('../lib/errors');

module.exports = function(app) {
    app.get('/v1/tracks/time', auth_phase, filter_phase, getTracks);
    app.get('/v1/genres/time', auth_phase, filter_phase, getGenres);
    app.get('/v1/features/tracks', auth_phase, filter_phase, getFeaturesForAllTracks);
    app.get('/v1/features/stats', auth_phase, filter_phase, getFeaturesStatistics);
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
    
    let all_stats = [];
    divisions.forEach(function(division){

        let features = [];
        division.tracks.forEach(function(track){
            features.push(track.features);
        });

        let stats = {
            duration_ms: {values: []},
            explicit: {values: []},
            danceability: {values: []},
            energy: {values: []},
            key: {values: []},
            loudness: {values: []},
            mode: {values: []},
            speechiness: {values: []},
            acousticness: {values: []},
            instrumentalness: {values: []},
            liveness: {values: []},
            valence: {values: []},
            tempo: {values: []},
            time_signature: {values: []}
        };

        
        features.forEach(function(feature){
            stats.danceability.values.push(feature["danceability"]);
            stats.energy.values.push(feature["energy"]);
            stats.key.values.push(feature["key"]);
            stats.loudness.values.push(feature["loudness"]);
            stats.mode.values.push(feature["mode"]);
            stats.speechiness.values.push(feature["speechiness"]);
            stats.acousticness.values.push(feature["acousticness"]);
            stats.instrumentalness.values.push(feature["instrumentalness"]);
            stats.liveness.values.push(feature["liveness"]);
            stats.valence.values.push(feature["valence"]);
            stats.tempo.values.push(feature["tempo"]);
            stats.time_signature.values.push(feature["time_signature"]);
        });

        for(let stat in stats) {
            if(stats[stat].values.length > 1){
                stats[stat].mean = statistics.mean(stats[stat].values);
                stats[stat].median = statistics.median(stats[stat].values);
                stats[stat].mode = statistics.mode(stats[stat].values);
                stats[stat].variance = statistics.variance(stats[stat].values);
                stats[stat].sample_variance = statistics.sampleVariance(stats[stat].values);
                stats[stat].standard_deviation = statistics.standardDeviation(stats[stat].values);
                stats[stat].sample_standard_deviation = statistics.sampleStandardDeviation(stats[stat].values);
                stats[stat].median_absolute_deviation = statistics.medianAbsoluteDeviation(stats[stat].values);
                stats[stat].interquartile_range = statistics.interquartileRange(stats[stat].values);
            }
        }

        let obj = {stats: stats};
        obj[stamp] = division[stamp];
        all_stats.push(obj);
    });

    res.status(200).send(all_stats);
}