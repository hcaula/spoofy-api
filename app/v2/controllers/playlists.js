const winston = require('winston');
const async = require('async');

const User = require('mongoose').model('User');
const Artist = require('mongoose').model('Artist');

const errors = require('../lib/errors');
const auth = require('../lib/auth');
const { getShared, getSharedGenres } = require('../lib/shared');
const { generateSeedsPlaylist } = require('../lib/playlists');
const { request } = require('../lib/requests');

module.exports = function (app) {
    app.get('/api/v2/playlists/shared/genres', auth, getUsers, sharedGenres);
    app.get('/api/v2/playlists/shared/artists', auth, getUsers, sharedArtists);
    app.get('/api/v2/playlists/shared/tracks', auth, getUsers, sharedTracks);

    app.get('/api/v2/playlists/artists', auth, getUsers, artistsPlaylist);
    app.get('/api/v2/playlists/seeds/genres', auth, getUsers, seedGenrePlaylist);
    app.get('/api/v2/playlists/seeds/artists', auth, getUsers, seedArtistPlaylist);
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
    const top_artists = 10;
    const top_tracks = 5;

    const artists = getShared({
        users: users,
        multipliers: multipliers,
        type: "artists"
    });

    let tracks = [];
    async.each(artists.splice(0, top_artists), (artist, next) => {

        const options = {
            host: 'api.spotify.com',
            path: `/v1/artists/${artist.id}/top-tracks?country=BR`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${access_token}` }
        }

        request('https', options, (error, response) => {
            if (error) next(error);
            else {
                response.tracks = response.tracks.slice(0, top_tracks);
                response.tracks.forEach(t => tracks.push({
                    name: t.name,
                    artist: t.artists[0].name,
                    album: t.album.name,
                    image: t.album.images[0].url,
                    href: t.href,
                    uri: t.uri,
                    id: t.id,
                    weight: artist.weight
                }));

                next();
            }
        });
    }, error => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            tracks.sort((a, b) => b.weight - a.weight);
            res.status(200).json({ tracks: tracks });
        }
    });
}

const seedGenrePlaylist = function (req, res) {
    const users = req.users;
    const multipliers = (req.query.multipliers ? req.query.multipliers.split(',') : [].fill.call({ length: users.length }, 1));

    const options = {
        type: 'genres',
        users: users,
        multipliers: multipliers,
        access_token: req.user.token.access_token
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
    const multipliers = (req.query.multipliers ? req.query.multipliers.split(',') : [].fill.call({ length: users.length }, 1));

    const options = {
        type: 'artists',
        users: users,
        multipliers: multipliers,
        access_token: req.user.token.access_token
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