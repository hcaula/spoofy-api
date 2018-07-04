const async = require('async');
const winston = require('winston');
const { request } = require('./requests');

const User = require('mongoose').model('User');
const Track = require('mongoose').model('Track');
const Artist = require('mongoose').model('Artist');

const { searchByField } = require('./util');

let results;

const requestTop = function (next) {
    const token = results.user.token;
    const term = results.term;
    const access_token = token.access_token;
    const limit = 25;
    const types = ["tracks", "artists"];
    let options = {
        host: 'api.spotify.com',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${access_token}` }
    }

    async.eachSeries(types, (type, next) => {
        options.path = `/v1/me/top/${type}?limit=${limit}&time_range=${term}`;
        request('https', options, (error, response) => {
            if (error) {
                winston.info(error.message);
                winston.info(error.stack);
                error.stop = true;
                next(error);
            } else {
                results[type] = response.items;
                next();
            }
        });
    }, error => {
        if (error) next(error);
        else {
            winston.info('Top tracks and artists requested successfully.');
            next();
        }
    });
}

const saveTop = function (next) {
    const models = [Track, Artist];
    const types = ["tracks", "artists"];

    let count = 0;
    async.eachSeries(types, (type, next) => {
        const Model = models[count];
        count++;
        const objs = results[type];
        async.eachSeries(objs, (obj, next) => {
            Model.findById(obj.id, (error, m) => {
                if (error) next(error);
                else if (m) next();
                else {
                    m = new Model(obj);
                    m._id = obj.id;
                    m.save(obj, error => next(error));
                }
            });
        }, error => next(error));
    }, error => {
        if (error) next(error);
        else {
            winston.info('Top tracks and artists saved successfully.');
            next();
        }
    });
}

const getGenres = function (next) {
    const artists_ids = results.artists.map(a => a.id);
    let total_genres = [];

    Artist.find({ _id: { $in: artists_ids } }, (error, artists) => {
        if (error) next(error);
        else {
            artists.forEach(a => {
                a.genres.forEach(g => {
                    const i = searchByField(g, 'name', total_genres);
                    if (i > 0) total_genres[i].weight++;
                    else total_genres.push({
                        name: g,
                        weight: 1
                    });
                });
            });

            total_genres = total_genres.sort((a, b) => b.weight - a.weight);
            results.genres = total_genres;
            winston.info(`Total genres: ${total_genres.length}`);
            next();
        }
    });
}


const updateUser = function (next) {
    const user = results.user;
    const artists = results.artists;
    const tracks = results.tracks;
    const genres = results.genres;

    User.findById(user._id, (error, user) => {
        if (error) next(error);
        else {
            user.tracks = tracks.map(t => t.id);
            user.artists = artists.map(a => a.id);
            user.genres = genres;
            user.save(error => {
                if (error) next(error);
                else {
                    winston.info("User updated successfully.");
                    next();
                }
            });
        }
    });
}

module.exports = function (u, term, next) {
    results = { user: u, term: term };
    async.series([
        requestTop,
        saveTop,
        getGenres,
        updateUser
    ], error => next(error, results));
}