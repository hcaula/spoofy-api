const { getSharedGenres, getShared } = require('./shared');
const { request } = require('./requests');

exports.generateSeedsPlaylist = function (options, next) {
    const access_token = options.access_token;
    const multipliers = options.multipliers;
    const users = options.users;
    const limit = 25;

    let media;
    let media_str = '';

    const spotifyRequest = function () {
        media = media.slice(0, 5);

        const path = `/v1/recommendations/?limit=${limit}&seed_genres=${media_str}`;

        const options = {
            host: 'api.spotify.com',
            path: path,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${access_token}` }
        }

        let tracks = [];
        request('https', options, (error, response) => {
            if (error) next(error);
            else {
                response.tracks.forEach(t => tracks.push({
                    name: t.name,
                    artist: t.artists[0].name,
                    album: t.album.name,
                    image: t.album.images[0].url,
                    href: t.href,
                    uri: t.uri,
                    id: t.id
                }));

                let results = { tracks: tracks };
                results[seed_type] = media;

                next(null, results);
            }
        });
    }

    if (seed_type == 'genres') {
        const avaiable_seeds = require('../../../config/jsons/seeds');

        media = getSharedGenres(users, multipliers);
        media = media.filter(g => avaiable_seeds.includes(g.name));

        media_str = '';
        media.forEach(m => media_str += m.name + ',');

        spotifyRequest();
    } else {
        getShared('artists', users, multipliers, (error, artists) => {
            if (error) next(error);
            else {
                media = artists;

                media_str = '';
                media.forEach(m => media_str += m.id + ',');

                spotifyRequest();
            }
        });
    }
}