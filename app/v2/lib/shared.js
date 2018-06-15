const async = require('async');

const Artist = require('mongoose').model('Artist');
const Track = require('mongoose').model('Track');

const { searchByField } = require('../lib/util');

exports.getShared = function (type, users, multipliers, next) {
    const medias = [];
    users.forEach((user, i) => {
        const u_multiplier = multipliers[i];
        user[type].forEach((m, j) => {
            const m_multiplier = user[type].length - j;
            const index = searchByField(m, "id", medias);
            if (index > -1) medias[index].weight += u_multiplier * m_multiplier;
            else {
                medias.push({
                    id: m,
                    weight: u_multiplier * m_multiplier
                });
            }
        });
    });

    let new_medias = [];
    const Model = (type == 'tracks' ? Track : Artist);
    async.each(medias, (m, next) => {
        Model.findById(m.id, (error, media) => {
            if (error) next(error);
            else {
                new_medias.push({
                    id: m.id,
                    name: media.name,
                    weight: m.weight
                });
                next();
            }
        });
    }, error => {
        if (error) next(error)
        else {
            new_medias = new_medias.sort((a, b) => b.weight - a.weight);
            next(null, new_medias);
        }
    });
}

exports.getSharedGenres = function(users, multipliers) {
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

    return genres;
}