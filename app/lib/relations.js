const { searchByField } = require('./util');

exports.calculateRelation = function (user_1, user_2) {
    const limit = 50;
    const searches = ['genre', 'artist'];
    let affinity = 0;
    let shared = {genres: [], artists: []}

    const cut = [
        {
            genres: user_1.genres.slice(0, limit),
            artists: user_1.artists.slice(0, limit)
        },
        {
            genres: user_2.genres.slice(0, limit),
            artists: user_2.artists.slice(0, limit)
        }
    ]

    const concatened = {
        genres: cut[0].genres.concat(cut[1].genres),
        artists: cut[0].artists.concat(cut[1].artists)
    }

    let index = 0;
    for (let meta in concatened) {
        const metas = [user_1[meta], user_2[meta]];
        const cuts = [cut[0][meta], cut[1][meta]]
        const concats = concatened[meta];

        let relation = relationByMeta(metas, cuts, concats, searches[index]);
        affinity += relation.affinity;
        shared[meta] = relation.shared;

        index++;
    }

    let ret = {
        affinity: affinity,
        shared: shared
    }

    return ret;
}

const relationByMeta = function (metas, cuts, concatened, meta) {
    let shared = [];
    let affinity = 0;

    for (let i = 0; i < concatened.length; i++) {
        let meta_u1, meta_u2, common_interest = 0;

        if (i < cuts[0].length) {
            meta_u1 = concatened[i];
            const index = searchByField(meta_u1[meta], meta, metas[1]);
            if (index > -1) meta_u2 = metas[1][index];
        } else {
            meta_u2 = concatened[i];
            const index = searchByField(meta_u2[meta], meta, metas[0]);
            const isShared = (searchByField(meta_u2[meta], 'name', shared) > -1);

            if (index > -1 && !isShared) meta_u1 = metas[0][index];
        }

        if (meta_u1 && meta_u2) {
            let max = Math.max(meta_u1.normalized, meta_u2.normalized);

            /* Avoid division by zero */
            if (max == 0) max = 0.0001;
            const min = Math.min(meta_u1.normalized, meta_u2.normalized);
            const ratio = min / max;

            common_interest = (0.5 * ratio + 1.5 * min) / 2;

            shared.push({
                name: meta_u1[meta],
                times_listened_user_1: meta_u1.times_listened,
                times_listened_user_2: meta_u2.times_listened,
                interest_user_1: meta_u1.normalized,
                interest_user_2: meta_u2.normalized,
                common_interest: common_interest
            });
        }
        affinity += common_interest;
    }

    shared = shared.sort((a, b) => b.common_interest - a.common_interest).slice(0, 10);
    return {
        affinity: affinity,
        shared: shared
    }

}

exports.relationByGenre = function (genres_u1, genres_u2) {
    const limit = 50;
    let affinity = 0;
    let sharedGenres = [];

    const cut_u1 = genres_u1.slice(0, limit);
    const cut_u2 = genres_u2.slice(0, limit);

    const concatened = cut_u1.concat(cut_u2);

    for (let i = 0; i < concatened.length; i++) {
        let genre_u1, genre_u2, common_interest = 0;

        if (i < cut_u1.length) {
            genre_u1 = concatened[i];
            const index = searchByField(genre_u1.genre, 'genre', genres_u2);
            if (index > -1) genre_u2 = genres_u2[index];
        } else {
            genre_u2 = concatened[i];
            const index = searchByField(genre_u2.genre, 'genre', genres_u1);
            const isShared = (searchByField(genre_u2.genre, 'name', sharedGenres) > -1);

            if (index > -1 && !isShared) genre_u1 = genres_u1[index];
        }

        if (genre_u1 && genre_u2) {
            let max = Math.max(genre_u1.normalized, genre_u2.normalized);

            /* Avoid division by zero */
            if (max == 0) max = 0.0001;
            const min = Math.min(genre_u1.normalized, genre_u2.normalized);
            const ratio = min / max;

            common_interest = (0.5 * ratio + 1.5 * min) / 2;

            sharedGenres.push({
                name: genre_u1.genre,
                times_listened_user_1: genre_u1.times_listened,
                times_listened_user_2: genre_u2.times_listened,
                interest_user_1: genre_u1.normalized,
                interest_user_2: genre_u2.normalized,
                common_interest: common_interest
            });
        }
        affinity += common_interest;
    }

    sharedGenres = sharedGenres.sort((a, b) => b.common_interest - a.common_interest).slice(0, 10);
    return {
        affinity: affinity,
        sharedGenres: sharedGenres
    }
}