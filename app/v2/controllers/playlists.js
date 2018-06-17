const winston = require('winston');
const async = require('async');

const User = require('mongoose').model('User');

const errors = require('../lib/errors');
const auth = require('../lib/auth');
const { getShared, getSharedGenres } = require('../lib/shared');
const { request } = require('../lib/requests');

module.exports = function (app) {
    app.get('/api/v2/playlists/shared/genres', auth, getUsers, sharedGenres);
    app.get('/api/v2/playlists/shared/artists', auth, getUsers, sharedArtists);
    app.get('/api/v2/playlists/shared/tracks', auth, getUsers, sharedTracks);

    app.get('/api/v2/playlists/artists', auth, getUsers, artistsPlaylist);
    app.get('/api/v2/playlists/seeds', auth, getUsers, seedsPlaylist);
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

const artistsPlaylist = function (req, res) {
    const users = req.users;
    const multipliers = (req.query.multipliers ? req.query.multipliers.split(',') : [].fill.call({ length: users.length }, 1));
    const top_artists = 10;
    const top_tracks = 5;

    getShared('artists', users, multipliers, (error, artists) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            const access_token = req.user.token.access_token;
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
    });
}

const seedsPlaylist = function (req, res) {
    const users = req.users;
    const multipliers = (req.query.multipliers ? req.query.multipliers.split(',') : [].fill.call({ length: users.length }, 1));
    const limit = 25;
    const access_token = req.user.token.access_token;
    const avaiable_seeds = require('../../../config/jsons/seeds');

    let genres = getSharedGenres(users, multipliers);
    genres = genres.filter(g => avaiable_seeds.includes(g.name));
    genres = genres.slice(0, 5);

    let genresStr = '';
    genres.forEach(g => genresStr += g.name + ',');

    const path = `/v1/recommendations/?limit=${limit}&seed_genres=${genresStr}`;

    const options = {
        host: 'api.spotify.com',
        path: path,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${access_token}` }
    }

    let tracks = [];
    request('https', options, (error, response) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            response.tracks.forEach(t => tracks.push({
                name: t.name,
                artist: t.artists[0].name,
                album: t.album.name,
                image: t.album.images[0].url,
                href: t.href,
                uri: t.uri,
                id: t.id
            }));

            res.status(200).json({ genres: genres.map(g => g.name), tracks: tracks });
        }
    });


}