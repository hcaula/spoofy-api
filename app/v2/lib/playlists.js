const async = require('async');

const { getShared } = require('./shared');
const { request } = require('./requests');
const { encodeJPG } = require('./util');

const req = require('request');

const Playlist = require('mongoose').model('Playlist');
const User = require('mongoose').model('User');


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

    const path = `/v1/recommendations/?limit=${limit}&` +
        `seed_${type}=${media_str}&` +
        `min_popularity=${min_popularity}&` +
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

            let results = { playlist: tracks };
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

const createPlaylist = function (user, users, title, next) {
    const access_token = user.token.access_token;
    const user_id = user._id;

    let users_str = '';
    users.forEach((u, i) => {
        users_str += u;
        if (i < users.lenght - 2) users_str += ", ";
        else if (i < users.length - 1) users_str += " and ";
    });

    const description = `Have you ever wondered what ${users_str} would listen to if they were a single person?`;

    const body = {
        'name': title,
        'description': description,
        'public': true
    }

    const options = {
        url: 'https://api.spotify.com/v1/users/' + user_id + '/playlists',
        body: JSON.stringify(body),
        dataType: 'json',
        headers: {
            'Authorization': 'Bearer ' + access_token,
            'Content-Type': 'application/json',
        }
    };

    req.post(options, (error, res, body) => {
        if (error) next(error);
        else if (res.statusCode != 201) next(JSON.parse(body).error);
        else next(null, JSON.parse(body));
    });

}

const addTracks = function (user, play_id, playlist, next) {
    const access_token = user.token.access_token;
    const user_id = user._id;
    const uris = playlist.tracks.map(t => t.uri).join(',');

    const path = `/v1/users/${user_id}/playlists/${play_id}/tracks?` +
        `position=0&` +
        `uris=${uris}`

    const options = {
        url: `https://api.spotify.com${path}`,
        headers: {
            'Authorization': 'Bearer ' + access_token,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
    };
    req.post(options, (error, res, body) => {
        if (error) next(error);
        else if (res.statusCode != 201) next(JSON.parse(body).error);
        else next();
    });
}

const changeImage = function (user, play_id, next) {
    const access_token = user.token.access_token;
    const user_id = user._id;
    const image64 = encodeJPG('assets/imgs/spoofy_playlist.jpg');

    const path = `/v1/users/${user_id}/playlists/${play_id}/images`;

    const options = {
        url: `https://api.spotify.com${path}`,
        body: image64,
        headers: {
            'Authorization': 'Bearer ' + access_token,
            'Content-Type': 'image/jpeg',
        }
    };

    req.put(options, (error, res, body) => {
        if (error) next(error);
        else if (res.statusCode != 202) next(JSON.parse(body).error);
        else next();
    });
}

exports.savePlaylistOnSpotify = function (user, title, playlist_id, next) {
    Playlist.findById(playlist_id, (error, playlist) => {
        if (error) next(error);
        else {
            playlist.exported = true;
            playlist.save(error => {
                if (error) next(error);
                else {
                    User.find({ _id: { $in: playlist.users } }, (error, users) => {
                        if (error) next(error);
                        else {
                            if (!title) {
                                title = '';
                                users.forEach((u, i) => {
                                    let index = (u.display_name.indexOf(' '));
                                    if (index < 0) index = u.display_name.lenght;
                                    const name = u.display_name.substring(0, index);

                                    title += name;
                                    if (i < users.length - 1) title += " + ";
                                });
                            }
                            const user_names = users.map(u => u.display_name);
                            createPlaylist(user, user_names, title, (error, sptfy_playlist) => {
                                if (error) next(error);
                                else addTracks(user, sptfy_playlist.id, playlist, error => {
                                    if (error) next(error);
                                    else changeImage(user, sptfy_playlist.id, error => next(error, sptfy_playlist));
                                });
                            });
                        }
                    });
                }
            })
        }
    });
}