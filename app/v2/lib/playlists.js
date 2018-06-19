const async = require('async');

const { getShared } = require('./shared');
const { request } = require('./requests');

exports.generateSeedsPlaylist = function (options, next) {
    const access_token = options.access_token;
    const multipliers = options.multipliers;
    const users = options.users;
    const type = options.type;
    const min_popularity = options.min_popularity;
    const max_popularity = options.max_popularity;
    const limit = 25;

    let media = getShared({
        users: users,
        multipliers: multipliers,
        type: type
    });

    if (type == 'genres') {
        const available_seeds = require('../../../config/jsons/seeds');
        media = media.filter(g => available_seeds.includes(g.id));
    }
    media = media.slice(0, 5);

    let media_str = '';
    media.forEach(m => media_str += m.id + ',');

    const path = `/v1/recommendations/?limit=${limit}&`+
    `seed_${type}=${media_str}&`+
    `min_popularity=${min_popularity}&`+
    `max_popularity=${max_popularity}`;

    options = {
        host: 'api.spotify.com',
        path: path,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${access_token}` }
    }

    let tracks = [];
    request('https', options, (error, response) => {
        if (error) next(error);
        else {
            response.tracks.forEach(t => {
                tracks.push({
                    name: t.name,
                    popularity: t.popularity,
                    artist: t.artists[0].name,
                    album: t.album.name,
                    image: t.album.images[0].url,
                    href: t.href,
                    uri: t.uri,
                    id: t.id
                });
            });

            let results = { tracks: tracks };
            results[type] = media;

            next(null, results);
        }
    });
}

exports.mediasPlaylists = function (options, next) {
    const users = options.users;
    const multipliers = options.multipliers;
    const access_token = options.access_token;
    const type = options.type;

    const top_media = 10;
    const top_tracks = 5;

    let media = getShared({
        users: users,
        multipliers: multipliers,
        type: type
    });

    let tracks = [];
    async.each(media.splice(0, top_media), (m, next) => {

        const options = {
            host: 'api.spotify.com',
            path: `/v1/artists/${m.id}/top-tracks?country=BR`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${access_token}` }
        }

        request('https', options, (error, response) => {
            if (error) next(error);
            else {
                response.tracks = response.tracks.slice(0, top_tracks);
                response.tracks.forEach(t => tracks.push({
                    name: t.name,
                    popularity: t.popularity,
                    artist: t.artists[0].name,
                    album: t.album.name,
                    image: t.album.images[0].url,
                    href: t.href,
                    uri: t.uri,
                    id: t.id,
                    weight: m.weight
                }));
                next();
            }
        });
    }, error => next(error, tracks));
}