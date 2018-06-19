const { getShared } = require('./shared');
const { request } = require('./requests');

exports.generateSeedsPlaylist = function (options, next) {
    const access_token = options.access_token;
    const multipliers = options.multipliers;
    const users = options.users;
    const type = options.type;
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

    const path = `/v1/recommendations/?limit=${limit}&seed_${type}=${media_str}`;

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