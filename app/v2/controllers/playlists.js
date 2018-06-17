const winston = require('winston');
const async = require('async');

const User = require('mongoose').model('User');

const errors = require('../lib/errors');
const auth = require('../lib/auth');
const { getShared, getSharedGenres } = require('../lib/shared');

module.exports = function (app) {
    app.get('/api/v2/playlists/genres', auth, getUsers, sharedGenres);
    app.get('/api/v2/playlists/artists', auth, getUsers, sharedArtists);
    app.get('/api/v2/playlists/tracks', auth, getUsers, sharedTracks);
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

    let genres = getSharedGenres(users, multipliers);

    if (seeded) {
        const avaiable_seeds = require('../../../config/jsons/seeds');
        genres = genres.filter(g => avaiable_seeds.includes(g.name));
    }

    res.status(200).json({ genres: genres });

}

const sharedArtists = function (req, res) {
    const users = req.users;
    const multipliers = (req.query.multipliers ? req.query.multipliers.split(',') : [].fill.call({ length: users.length }, 1));

    getShared("artists", users, multipliers, (error, artists) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else res.status(200).json({ artists: artists });
    });
}

const sharedTracks = function (req, res) {
    const users = req.users;
    const multipliers = (req.query.multipliers ? req.query.multipliers.split(',') : [].fill.call({ length: users.length }, 1));

    getShared("tracks", users, multipliers, (error, tracks) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else res.status(200).json({ tracks: tracks });
    });
}