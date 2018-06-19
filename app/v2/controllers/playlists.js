const winston = require('winston');
const async = require('async');

const User = require('mongoose').model('User');
const Artist = require('mongoose').model('Artist');
const Track = require('mongoose').model('Track');

const errors = require('../lib/errors');
const auth = require('../lib/auth');
const { getShared } = require('../lib/shared');
const { generateSeedsPlaylist, mediasPlaylists } = require('../lib/playlists');
const { request } = require('../lib/requests');

module.exports = function (app) {
    app.get('/api/v2/playlists/shared/genres', auth, getUsers, sharedGenres);
    app.get('/api/v2/playlists/shared/artists', auth, getUsers, sharedArtists);
    app.get('/api/v2/playlists/shared/tracks', auth, getUsers, sharedTracks);

    app.get('/api/v2/playlists/artists', auth, getUsers, artistsPlaylist);

    app.get('/api/v2/playlists/seeds/genres', auth, getUsers, seedGenrePlaylist);
    app.get('/api/v2/playlists/seeds/artists', auth, getUsers, seedArtistPlaylist);
    app.get('/api/v2/playlists/seeds/tracks', auth, getUsers, seedTracksPlaylist);
}

const getUsers = function (req, res, next) {
    const users = (req.query.users ? req.query.users.split(',') : []);
    if (!users.length) res.status(400).json(errors[400]('users'));
    else {
        req.users = [];
        async.eachSeries(users, (id, next) => {
            User.findById(id, (error, user) => {
                if (error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else {
                    req.users.push(user);
                    next();
                }
            });
        }, error => {
            if (error) {
                winston.error(error.stack);
                res.status(500).json(errors[500]);
            } else next();
        });
    }
}

const sharedGenres = function (req, res) {
    const users = req.users;
    const multipliers = (req.query.multipliers ? req.query.multipliers.split(',') : [].fill.call({ length: users.length }, 1));
    const seeded = req.query.seeded;

    const options = {
        users: users,
        multipliers: multipliers,
        seeded: seeded,
        type: "genres"
    }

    const genres = getShared(options);
    res.status(200).json({ genres: genres });

}

const sharedArtists = function (req, res) {
    const users = req.users;
    const multipliers = (req.query.multipliers ? req.query.multipliers.split(',') : [].fill.call({ length: users.length }, 1));

    const options = {
        users: users,
        multipliers: multipliers,
        type: "artists"
    }

    const artists = getShared(options);
    res.status(200).json({ artists: artists });

}

const sharedTracks = function (req, res) {
    const users = req.users;
    const multipliers = (req.query.multipliers ? req.query.multipliers.split(',') : [].fill.call({ length: users.length }, 1));

    const options = {
        users: users,
        multipliers: multipliers,
        type: "tracks"
    }

    const tracks = getShared(options);
    res.status(200).json({ tracks: tracks });
}

const artistsPlaylist = function (req, res) {
    const users = req.users;
    const access_token = req.user.token.access_token;
    const multipliers = (req.query.multipliers ? req.query.multipliers.split(',') : [].fill.call({ length: users.length }, 1));

    const options = {
        users: users,
        multipliers: multipliers,
        type: "artists",
        access_token: access_token
    }

    mediasPlaylists(options, (error, tracks) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            let artists = [];
            tracks.forEach(t => {
                if (!artists.includes(t.artist)) artists.push(t.artist);
            });

            res.status(200).json({
                tracks: tracks,
                artists: artists
            });
        }
    });
}

const seedGenrePlaylist = function (req, res) {
    const users = req.users;
    const min_popularity = (req.query.min_popularity || 0);
    const max_popularity = (req.query.max_popularity || 100);
    const multipliers = (req.query.multipliers ? req.query.multipliers.split(',') : [].fill.call({ length: users.length }, 1));

    const options = {
        type: 'genres',
        users: users,
        multipliers: multipliers,
        access_token: req.user.token.access_token,
        min_popularity: min_popularity,
        max_popularity: max_popularity
    }

    generateSeedsPlaylist(options, (error, results) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else res.status(200).json(results);
    });
}

const seedArtistPlaylist = function (req, res) {
    const users = req.users;
    const min_popularity = (req.query.min_popularity || 0);
    const max_popularity = (req.query.max_popularity || 0);
    const multipliers = (req.query.multipliers ? req.query.multipliers.split(',') : [].fill.call({ length: users.length }, 1));

    const options = {
        type: 'artists',
        users: users,
        multipliers: multipliers,
        access_token: req.user.token.access_token,
        min_popularity: min_popularity,
        max_popularity: max_popularity
    }

    generateSeedsPlaylist(options, (error, results) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            Artist.find({ _id: { $in: results.artists.map(a => a.id) } }, (error, artists) => {
                if (error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else {
                    results.artists = artists.map(a => a.name);
                    res.status(200).json(results);
                }
            });
        }
    });
}

const seedTracksPlaylist = function (req, res) {
    const users = req.users;
    const min_popularity = (req.query.min_popularity || 0);
    const max_popularity = (req.query.max_popularity || 100);
    const multipliers = (req.query.multipliers ? req.query.multipliers.split(',') : [].fill.call({ length: users.length }, 1));

    const options = {
        type: 'tracks',
        users: users,
        multipliers: multipliers,
        access_token: req.user.token.access_token,
        min_popularity: min_popularity,
        max_popularity: max_popularity
    }

    generateSeedsPlaylist(options, (error, results) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            Track.find({ _id: { $in: results.tracks.map(a => a.id) } }, (error, tracks) => {
                if (error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else {
                    results.tracks = tracks.map(t => t.name);
                    res.status(200).json(results);
                }
            });
        }
    });
}