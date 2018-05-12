const Play = require('mongoose').model('Play');

exports.calculateExpirationDate = function(expires_in){
    const now = Date.now();
    return new Date(now + (expires_in*1000));
}

exports.calculateNextWeek = function() {
    const today = new Date();
    const nextweek = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()+7,
        today.getHours(),
        today.getMinutes(),
        today.getSeconds(),
        today.getMilliseconds()
    );
    return nextweek;
}

exports.searchByField = function(value, field, array) {
    let index = -1;
    array.forEach((el, i) => {
        if(el[field] == value) {
            index = i;
            return;
        }
    });
    return index;
}

exports.countElement = function(elem, array) {
    return array.filter(x => (x == elem)).length;
}

exports.organizeGenres = function(tracks) {
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

exports.getPlays = function(user, options, callback) {
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