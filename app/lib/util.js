const async = require('async');

const Play = require('mongoose').model('Play');
const Track = require('mongoose').model('Track');

/*
 * Exportable functions
*/

exports.takePairs = function (array) {
    let pairs = [];
    array.forEach(i => {
        array.forEach(j => {
            if(i != j) {
                let found = false;
                pairs.forEach(p => {
                    if((p[0] == i && p[1] == j) || (p[1] == i && p[0] == j)) {
                        found = true;
                        return;
                    }
                });

                if(!found) pairs.push([i, j]);
            } else return;
        });
    });

    return pairs;
}

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

exports.organizeMeta = function(tracks, meta, search, field) {
    let metas = [], counted_metas = [], ret_metas = [];

    tracks.forEach(track => {
        track[meta].forEach(m => {
            if(search) metas.push(m[search]);
            else metas.push(m);
        });
    });

    metas.forEach(m => {
        let included = counted_metas.includes(m);
        if (!included) {
            counted_metas.push(m);
            let obj = {};
            obj[(field || meta)] = m;
            obj.times_listened = exports.countElement(m, metas);
            ret_metas.push(obj);
        }
    });

    const sorted = ret_metas.sort((a, b) => b.times_listened - a.times_listened)

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

exports.normalize = function (array) {
    const { max, min } = getMinAndMax(array);
    const diff = max - min;

    let normalized = [];
    array.forEach((el, i) => normalized[i] = ((el - min) / diff));

    return normalized;
}

/*
 * Auxiliar functions
*/

const getMinAndMax = function (array) {
    let max = -Infinity, min = Infinity;
    array.forEach(el => {
        if (el > max) max = el;
        if (el < min) min = el;
    });

    return { max: max, min: min }
}