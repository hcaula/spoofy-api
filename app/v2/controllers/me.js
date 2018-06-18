const winston = require('winston');

const User = require('mongoose').model('User');
const Track = require('mongoose').model('Track');
const Artist = require('mongoose').model('Artist');

const errors = require('../lib/errors');
const auth = require('../lib/auth');

const top_tracks = require('../lib/top_tracks');

module.exports = function (app) {
    app.get('/api/v2/me', auth, getUser);
    app.patch('/api/v2/me/update', auth, updateUser);

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

const updateUser = function (req, res) {
    const display_name = req.body.display_name;
    const image = req.body.image;
    let user = req.user;

    if (display_name) user.display_name = display_name;
    if (image) user.images[0] = image;

    user.save((error, user) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        }
        res.status(200).json(user);
    });
}


const getTracks = function (req, res) {
    const tracks = req.user.tracks;
    Track.find({ _id: { $in: tracks } }, (error, tracks) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else res.status(200).json({ tracks: tracks });
    });
}

const getArtists = function (req, res) {
    const artists = req.user.artists;
    Artist.find({ _id: { $in: artists } }, (error, artists) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else res.status(200).json({ artists: artists });
    });
}

const getGenres = function (req, res) {
    const genres = req.user.genres;
    res.status(200).json({ genres: genres });
}

const requestTop = function (req, res) {
    top_tracks(req.user, error => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else res.status(200).json({ message: "Requested user's top tracks, artists and genres successfully." });
    });
}