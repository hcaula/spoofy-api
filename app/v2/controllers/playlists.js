const winston = require('winston');
const async = require('async');

const User = require('mongoose').model('User');
const Artist = require('mongoose').model('Artist');
const Track = require('mongoose').model('Track');

const errors = require('../lib/errors');
const auth = require('../lib/auth');
const { searchByField } = require('../lib/util');

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

    const genres = [];
    users.forEach((user, i) => {
        const multiplier = multipliers[i];
        user.genres.forEach(g => {
            const index = searchByField(g.name, "name", genres);
            if (index > -1) genres[index].weight += g.weight * multiplier;
            else {
                genres.push({
                    name: g.name,
                    weight: g.weight * multiplier
                });
            }
        });
    });

    genres.sort((a, b) => b.weight - a.weight);

    res.status(200).json({ genres: genres });

}

const sharedArtists = function (req, res) {
    const users = req.users;
    const multipliers = (req.query.multipliers ? req.query.multipliers.split(',') : [].fill.call({ length: users.length }, 1));

    const artists = [];
    users.forEach((user, i) => {
        const multiplier = multipliers[i];
        user.artists.forEach((a, j) => {
            const a_multiplier = user.artists.length - j;
            const index = searchByField(a, "id", artists);
            if (index > -1) artists[index].weight += multiplier * a_multiplier;
            else {
                artists.push({
                    id: a,
                    weight: multiplier * a_multiplier
                });
            }
        });
    });    
    
    let new_artists = [];
    async.each(artists, (a, next) => {
        Artist.findById(a.id, (error, artist) => {
            if (error) next(error);
            else {
                new_artists.push({
                    id: a.id,
                    name: artist.name,
                    weight: a.weight
                });
                next();
            }
        });
    }, error => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            new_artists = new_artists.sort((a, b) => b.weight - a.weight);        
            res.status(200).json({ artists: new_artists });
        }
    });
}

const sharedTracks = function (req, res) {
    const users = req.users;
    const multipliers = (req.query.multipliers ? req.query.multipliers.split(',') : [].fill.call({ length: users.length }, 1));

    const tracks = [];
    users.forEach((user, i) => {
        const multiplier = multipliers[i];
        user.tracks.forEach((t, j) => {
            const t_multiplier = user.tracks.length - j;
            const index = searchByField(t, "id", tracks);
            if (index > -1) tracks[index].weight += multiplier * t_multiplier;
            else {
                tracks.push({
                    id: t,
                    weight: multiplier * t_multiplier
                });
            }
        });
    });

    let new_tracks = [];
    async.each(tracks, (t, next) => {
        Track.findById(t.id, (error, track) => {
            if (error) next(error);
            else {
                new_tracks.push({
                    id: t.id,
                    name: track.name,
                    weight: t.weight
                });
                next();
            }
        });
    }, error => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            new_tracks = new_tracks.sort((a, b) => b.weight - a.weight);        
            res.status(200).json({ tracks: new_tracks });
        }
    });
}