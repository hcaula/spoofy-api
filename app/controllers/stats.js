
const async = require('async');
const simple_statistics = require('simple-statistics');

const Track = require('mongoose').model('Track');

const filter_phase = require('../lib/filter_phase');
const auth_phase = require('../lib/auth_phase');
const { countElement } = require('../lib/util');

module.exports = function (app) {
    app.get('/api/v1/stats/tracks', auth_phase, filter_phase, getTracks);
    app.get('/api/v1/stats/genres/', auth_phase, filter_phase, getGenres);
    app.get('/api/v1/stats/features/', auth_phase, filter_phase, getFeatures);
    app.get('/api/v1/stats/features/statistics', auth_phase, filter_phase, getFeaturesStatistics);
}

const getTracks = function (req, res) {
    res.status(200).json({ tracks: req.tracks });
}

const getGenres = function (req, res) {
    const tracks = req.tracks;
    let genres = [], counted_genres = [], ret_genres = [];

    tracks.forEach(track => {
        track.genres.forEach(g => genres.push(g));
    });

    genres.forEach(g => {
        if (!counted_genres.includes(g)) {
            counted_genres.push(g);
            ret_genres.push({
                genre: g,
                times_listened: countElement(g, genres)
            });
        }
    });

    const sorted = ret_genres.sort((a, b) => b.times_listened - a.times_listened)

    res.status(200).json({ genres: sorted });
}

const getFeatures = function (req, res) {
    const tracks = req.tracks;
    const features = tracks.map(t => { return { features: t.features, played_at: t.played_at } });

    res.status(200).json({ features: features });
}

const getFeaturesStatistics = function (req, res) {
    const tracks = req.tracks;
    let stats = {}, features = {};

    tracks.forEach(track => {
        for (let param in track.features) {
            const elem = track.features[param];
            if (typeof elem == "number" && elem) {
                if (!features[param]) features[param] = [];
                features[param].push(elem);
            }
        }
    });

    for (let feature in features) {
        const arr = features[feature];
        if (arr.length > 1) {
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

    res.status(200).json({ statistics: stats })
}