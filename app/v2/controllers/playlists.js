const winston = require('winston');
const async = require('async');

const User = require('mongoose').model('User');
const Artist = require('mongoose').model('Artist');
const Track = require('mongoose').model('Track');
const Playlist = require('mongoose').model('Playlist');

const errors = require('../lib/errors');
const auth = require('../lib/auth');
const { getShared } = require('../lib/shared');
const { generateSeedsPlaylist, mediasPlaylists } = require('../lib/playlists');
const { searchByField } = require('../lib/util');

module.exports = function (app) {
    app.get('/api/v2/playlists/shared/genres', auth, getUsers, sharedGenres);
    app.get('/api/v2/playlists/shared/artists', auth, getUsers, sharedArtists);
    app.get('/api/v2/playlists/shared/tracks', auth, getUsers, sharedTracks);

    app.get('/api/v2/playlists/artists', auth, getUsers, artistsPlaylist);

    app.get('/api/v2/playlists/seeds/genres', auth, getUsers, seedGenrePlaylist);
    app.get('/api/v2/playlists/seeds/artists', auth, getUsers, seedArtistPlaylist);
    app.get('/api/v2/playlists/seeds/tracks', auth, getUsers, seedTracksPlaylist);

    app.post('/api/v2/playlists/vote', auth, registerVote);
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
            const status = (error.status ? error.status : 500);
            const message = (error.message ? error.message : errors[500])
            res.status(status).json({error: message});
        } else {
            let artists = [];
            tracks.forEach(t => {
                if (!artists.includes(t.artist)) artists.push(t.artist);
            });

            const results = {
                seeds: artists,
                playlist: tracks,
                type: "Simple artist mix",
                multipliers: multipliers
            }

            savePlaylist(req.user._id, users, results, (error, playlist_id) => {
                if (error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else {
                    results._id = playlist_id;
                    res.status(200).json(results);
                };
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
            const status = (error.status ? error.status : 500);
            const message = (error.message ? error.message : errors[500])
            res.status(status).json({error: message});
        } else {
            results.seeds = results.genres.map(g => g.id);
            results.type = 'Seeded by genres';
            results.multipliers = multipliers;
            results.min_popularity = min_popularity;
            results.max_popularity = max_popularity;

            savePlaylist(req.user._id, users, results, (error, playlist_id) => {
                if (error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else {
                    results._id = playlist_id;
                    res.status(200).json(results);
                };
            });
        }
    });
}

const seedArtistPlaylist = function (req, res) {
    const users = req.users;
    const min_popularity = (req.query.min_popularity || 0);
    const max_popularity = (req.query.max_popularity || 100);
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
            const status = (error.status ? error.status : 500);
            const message = (error.message ? error.message : errors[500])
            res.status(status).json({error: message});
        } else {
            Artist.find({ _id: { $in: results.artists.map(a => a.id) } }, (error, artists) => {
                if (error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else {
                    results.seeds = artists.map(a => a.name);
                    results.type = 'Seeded by artists';
                    results.multipliers = multipliers;
                    results.min_popularity = min_popularity;
                    results.max_popularity = max_popularity;

                    savePlaylist(req.user._id, users, results, (error, playlist_id) => {
                        if (error) {
                            winston.error(error.stack);
                            res.status(500).json(errors[500]);
                        } else {
                            results._id = playlist_id;
                            res.status(200).json(results);
                        };
                    });
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
            const status = (error.status ? error.status : 500);
            const message = (error.message ? error.message : errors[500])
            res.status(status).json({error: message});
        } else {
            Track.find({ _id: { $in: results.tracks.map(a => a.id) } }, (error, tracks) => {
                if (error) {
                    winston.error(error.stack);
                    res.status(500).json(errors[500]);
                } else {
                    results.seeds = tracks.map(t => t.name);
                    results.type = 'Seeded by tracks';
                    results.multipliers = multipliers;
                    results.min_popularity = min_popularity;
                    results.max_popularity = max_popularity;

                    savePlaylist(req.user._id, users, results, (error, playlist_id) => {
                        if (error) {
                            winston.error(error.stack);
                            res.status(500).json(errors[500]);
                        } else {
                            results._id = playlist_id;
                            res.status(200).json(results);
                        }
                    });
                }
            });
        }
    });
}

const registerVote = function (req, res) {
    const playlist_id = req.body.playlist_id;
    const track_id = req.body.track_id;
    const vote = req.body.vote;

    Playlist.findById(playlist_id, (error, playlist) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else if (!playlist) {
            res.status(400).json({
                error: "No playlist was found with the requested ID.",
                type: "playlist_not_found"
            });
        } else {
            const index = searchByField(track_id, 'id', playlist.tracks);
            if (index < 0) {
                res.status(400).json({
                    error: "This playlist does not contain this track.",
                    type: "track_not_on_playlist"
                });
            } else {
                playlist.tracks[index].vote = vote;
                playlist.voted = true;

                playlist.save((error, playlist) => {
                    if (error) {
                        winston.error(error.stack);
                        res.status(500).json(errors[500]);
                    } else res.status(200).json({
                        message: "Vote registered successfully.",
                        playlist: playlist
                    });
                });
            }
        }
    });
}

const savePlaylist = function (user, users, results, callback) {
    let playlist = new Playlist({
        user: user,
        tracks: results.playlist,
        type: results.type,
        seeds: results.seeds,
        multipliers: results.multipliers,
        min_popularity: results.min_popularity,
        max_popularity: results.max_popularity,
        users: users
    });

    playlist.save((error, playlist) => callback(error, playlist._id));
}