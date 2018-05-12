
const winston = require('winston');
const async = require('async');
const simple_statistics = require('simple-statistics');

const Track = require('mongoose').model('Track');
const User = require('mongoose').model('User');

const filter_phase = require('../lib/filter_phase');
const auth_phase = require('../lib/auth_phase');
const { 
    organizeGenres, 
    getUserPlays, 
    getPlayTracks,
    generateRelationByGenre } = require('../lib/util');

module.exports = function (app) {
    app.get('/api/v1/stats/tracks', auth_phase, filter_phase, getTracks);
    app.get('/api/v1/stats/genres/', auth_phase, filter_phase, getGenres);
    app.get('/api/v1/stats/features/', auth_phase, filter_phase, getFeatures);
    app.get('/api/v1/stats/features/statistics', auth_phase, filter_phase, getFeaturesStatistics);

    app.get('/api/v1/stats/relations/', auth_phase, filter_phase, getRelations);
}

const getTracks = function (req, res) {
    res.status(200).json({ tracks: req.tracks });
}

const getGenres = function (req, res) {
    const tracks = req.tracks;
    const genres = organizeGenres(tracks);

    res.status(200).json({ genres: genres });
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
    const user_tracks = req.tracks;
    const user_genres = organizeGenres(user_tracks);

    let ret = {user: req.user.display_name, relations: []}
    User.find({ _id: { $ne: req.user._id } }, (error, users) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            async.eachSeries(users, (user, next) => {
                getUserPlays(user, {}, (error, plays) => {
                    if (error) next(error);
                    else {
                        getPlayTracks(plays, {}, (error, tracks) => {
                            if (error) next(error);
                            else {
                                const u2genres = organizeGenres(tracks);
                                const relation = generateRelationByGenre(user_genres, u2genres);

                                ret.relations.push({
                                    user: user.display_name,
                                    relation: relation
                                });

                                winston.info(`Relation between ${req.user.display_name} and ${user.display_name}: ${relation}`);
                                next();
                            }
                        });
                    }
                });
            }, error => {
                if (error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else {
                    ret.relations = ret.relations.sort((a, b) => a.relation - b.relation);
                    res.status(200).json({
                        relations: ret
                    });
                }
            });
        }
    });
}