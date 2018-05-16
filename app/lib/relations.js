const { searchByField } = require('./util');

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