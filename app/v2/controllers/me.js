
const winston = require('winston');

const Track = require('mongoose').model('Track');
const Artist = require('mongoose').model('Artist');

const errors = require('../lib/errors');
const auth = require('../lib/auth');

const top_tracks = require('../lib/top_tracks');

module.exports = function (app) {
    app.get('/api/v2/me', auth, getUser);
    app.get('/api/v2/me/tracks/', auth, getTracks);
    app.get('/api/v2/me/artists/', auth, getArtists);
    app.get('/api/v2/me/genres/', auth, getGenres);

    app.post('/api/v2/me/top/', auth, requestTop);
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
    const tracks = req.user.tracks;
    Track.find({ _id: { $in: tracks } }, (error, tracks) => {
        if (error) {
            winston.error(req.query.error);
            res.status(500).json(errors[500]);
        } else res.status(200).json({ tracks: tracks });
    });
}

const getArtists = function (req, res) {
    const artists = req.user.artists;
    Artist.find({ _id: { $in: artists } }, (error, artists) => {
        if (error) {
            winston.error(req.query.error);
            res.status(500).json(errors[500]);
        } else res.status(200).json({ artists: artists });
    });
}

const getGenres = function (req, res) {
    const genres = req.user.genres;
    res.status(200).json({ genres: genres });
}

const requestTop = function (req, res) {
    top_tracks(req.user, (error, results) => {
        if (error) {
            winston.error(req.query.error);
            res.status(500).json(errors[500]);
        } else res.status(200).json({ message: "Requested user's top tracks, artists and genres successfully." });
    });
}