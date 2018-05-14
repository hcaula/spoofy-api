const async = require('async');

const Play = require('mongoose').model('Play');
const Track = require('mongoose').model('Track');

/*
 * Exportable functions
*/

exports.calculateExpirationDate = function (expires_in) {
    const now = Date.now();
    return new Date(now + (expires_in * 1000));
}

exports.calculateNextWeek = function () {
    const today = new Date();
    const nextweek = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 7,
        today.getHours(),
        today.getMinutes(),
        today.getSeconds(),
        today.getMilliseconds()
    );
    return nextweek;
}

exports.searchByField = function (value, field, array) {
    let index = -1;
    array.forEach((el, i) => {
        if (el[field] == value) {
            index = i;
            return;
        }
    });
    return index;
}

exports.countElement = function (elem, array) {
    return array.filter(x => (x == elem)).length;
}

exports.organizeGenres = function (tracks) {
    let genres = [], counted_genres = [], ret_genres = [];

    tracks.forEach(track => {
        track.genres.forEach(g => genres.push(g));
    });

    genres.forEach(g => {
        if (!counted_genres.includes(g)) {
            counted_genres.push(g);
            ret_genres.push({
                genre: g,
                times_listened: exports.countElement(g, genres)
            });
        }
    });

    const sorted = ret_genres.sort((a, b) => b.times_listened - a.times_listened)

    return sorted;
}

exports.getUserPlays = function (user, options, callback) {
    let begin_hour = options.begin_hour;
    let begin_day = options.begin_day;
    if (begin_hour) begin_hour = parseInt(begin_hour);
    if (begin_day) begin_day = parseInt(begin_day);
    let end_hour, end_day;

    let query = { user: user._id };

    let error;
    if (typeof begin_hour == 'number') {
        end_hour = (options.end_hour || begin_hour);
        parseInt(end_hour);
        if (end_hour < begin_hour) {
            error = {
                error: "invalid_end_hour",
                message: "Your end_hour should be larger than your begin_hour."
            }
        } else query["played_at.hour"] = { $gte: begin_hour, $lte: end_hour }
    }

    if (typeof begin_day == 'number') {
        end_day = (options.end_day || begin_day);
        parseInt(end_day);
        if (end_day < begin_day) {
            error = {
                error: "invalid_end_day",
                message: "Your end_day should be larger than your begin_day."
            };
        } else query["played_at.day"] = { $gte: begin_day, $lte: end_day }
    }

    if (error) callback(error);
    else if (end_hour > 23 || begin_hour < 0 || end_day > 6 || begin_day < 0) {
        callback({
            error: "invalid_date",
            message: "One of your query options constitutes an invalid date."
        });
    } else {
        Play.find(query, (error, plays) => {
            if (error) callback(error);
            else callback(null, plays);
        });
    }
}

exports.getPlayTracks = function (plays, sort_by, callback) {
    const group = plays.map(p => { return { track_id: p.track, played_at: p.played_at } });

    let tracks = [];
    async.each(group, (elem, next) => {
        Track.findById(elem.track_id, (error, track) => {
            if (error) next(error);
            else {
                track.played_at = elem.played_at;
                tracks.push(track);
                next();
            }
        });
    }, (error) => {
        if (error) callback(error);
        else {
            tracks.sort((a, b) => a.played_at[sort_by] - b.played_at[sort_by]);
            callback(null, tracks);
        }
    });
}

exports.relationByGenre = function (genres_u1, genres_u2) {
    const limit = 50;
    let usersRelation = 0;
    let sharedGenres = [];

    const normalized_u1 = normalize(genres_u1.map(g => g.times_listened));
    const normalized_u2 = normalize(genres_u2.map(g => g.times_listened));

    genres_u1.map((e, i) => genres_u1[i].normalized = normalized_u1[i]);
    genres_u2.map((e, i) => genres_u2[i].normalized = normalized_u2[i]);

    genres_u1.forEach((genre_u1, i) => {
        if (i < limit) {
            const index = exports.searchByField(genre_u1.genre, 'genre', genres_u2);
            let genreRelation = 0;

            if (index > -1) {
                genre_u2 = genres_u2[index];

                let max = Math.max(genre_u1.normalized, genre_u2.normalized);

                /* Avoid division by zero */
                if (max == 0) max = 0.0001;
                const min = Math.min(genre_u1.normalized, genre_u2.normalized);
                const ratio = min/max;

                genreRelation = (ratio + min) / 2;

                sharedGenres.push({
                    genre: genre_u1.genre,
                    times_listened_u1: genre_u1.times_listened,
                    times_listened_u2: genre_u2.times_listened,
                    normalized_u1: genre_u1.normalized,
                    normalized_u2: genre_u2.normalized,
                    relation: genreRelation
                });
            }

            usersRelation += genreRelation;
            
        } else return;
    });

    genres_u2.forEach((genre_u2, i) => {
        if (i < limit) {
            const index = exports.searchByField(genre_u2.genre, 'genre', genres_u1);
            let genreRelation = 0;

            if (index > -1 && exports.searchByField(genre_u2.genre, 'genre', sharedGenres) == -1) {
                genre_u1 = genres_u1[index];

                let max = Math.max(genre_u2.normalized, genre_u1.normalized);

                /* Avoid division by zero */
                if (max == 0) max = 0.0001;
                const min = Math.min(genre_u2.normalized, genre_u1.normalized);
                const ratio = min/max;

                genreRelation = (ratio + min) / 2;

                sharedGenres.push({
                    genre: genre_u2.genre,
                    times_listened_u1: genre_u1.times_listened,
                    times_listened_u2: genre_u2.times_listened,
                    normalized_u1: genre_u1.normalized,
                    normalized_u2: genre_u2.normalized,
                    relation: genreRelation
                });
            }

            usersRelation += genreRelation;
            
        } else return;
    });

    sharedGenres = sharedGenres.sort((a, b) => b.relation - a.relation).slice(0, 10);
    return {
        afinity: usersRelation,
        sharedGenres: sharedGenres
    }
}

/*
 * Auxiliar functions
*/
const normalizeGenres = function (genres) {
    let max = -Infinity, min = Infinity;
    genres.forEach(genre => {
        if (genre.times_listened > max) max = genre.times_listened;
        if (genre.times_listened < min) min = genre.times_listened;
    });

    const diff = max - min;
    const ret = genres.map(genre => {
        return {
            genre: genre.genre,
            times_listened: genre.times_listened,
            normalized: ((genre.times_listened - min) / diff)
        }
    });

    return ret;
}

const normalize = function (array) {
    const { max, min } = getMinAndMax(array);
    const diff = max - min;

    let normalized = [];
    array.forEach((el, i) => normalized[i] = ((el - min) / diff));

    return normalized;
}

const getMinAndMax = function (array) {
    let max = -Infinity, min = Infinity;
    array.forEach(el => {
        if (el > max) max = el;
        if (el < min) min = el;
    });

    return { max: max, min: min }
}