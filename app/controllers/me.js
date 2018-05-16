
const winston = require('winston');
const async = require('async');
const simple_statistics = require('simple-statistics');

const Track = require('mongoose').model('Track');
const User = require('mongoose').model('User');
const Relation = require('mongoose').model('Relation');

const errors = require('../lib/errors');
const filter_phase = require('../lib/filter_phase');
const auth_phase = require('../lib/auth_phase');
const { organizeMeta } = require('../lib/util');

module.exports = function (app) {
    app.get('/api/v1/me', auth_phase, getUser);
    app.get('/api/v1/me/tracks/', auth_phase, filter_phase, getTracks);
    app.get('/api/v1/me/genres/', auth_phase, filter_phase, getGenres);
    app.get('/api/v1/me/artists/', auth_phase, filter_phase, getArtists);
    app.get('/api/v1/me/features/', auth_phase, filter_phase, getFeatures);
    app.get('/api/v1/me/statistics/', auth_phase, filter_phase, getFeaturesStatistics);
    app.get('/api/v1/me/relations/', auth_phase, filter_phase, getRelations);
}

const getUser = function (req, res) {
    const user = req.user;
    res.status(200).json({
        _id: user._id,
        display_name: user.display_name,
        email: user.email,
        uri: user.uri,
        href: user.href,
        images: user.images
    });
}

const getTracks = function (req, res) {
    res.status(200).json({ tracks: req.tracks });
}

const getGenres = function (req, res) {
    const tracks = req.tracks;
    const genres = organizeMeta(tracks, 'genres', null, 'genre');

    res.status(200).json({ genres: genres });
}

const getArtists = function(req, res) {
    const tracks = req.tracks;
    const artists = organizeMeta(tracks, 'artists', 'name', 'artist');

    res.status(200).json({ artists: artists });
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

const getRelations = function (req, res, next) {
    let ret = [];

    Relation.find({ $or: [{ user_1: req.user._id }, { user_2: req.user._id }] }, (error, relations) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {

            async.eachSeries(relations, (relation, next) => {
                let rel;
                let _id = ((relation.user_1 == req.user._id ? relation.user_2 : relation.user_1));

                User.findById(_id, (error, user) => {
                    let ret_user = {
                        _id: user._id,
                        display_name: user.display_name,
                        href: user.href,
                        uri: user.uri,
                        images: user.images
                    }
                    if (error) next(error);
                    else {
                        rel = {
                            user: ret_user,
                            affinity: relation.affinity,
                            genres: relation.genres
                        }
                        ret.push(rel);
                        next();
                    }
                });
            }, error => {
                if (error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else {
                    let sorted = ret.sort((a, b) => b.affinity - a.affinity);
                    res.status(200).json({
                        relations: sorted
                    });
                }
            });

        }
    });
}