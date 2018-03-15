const winston = require('winston');
const async = require('async');

const User = require('mongoose').model('User');
const Track = require('mongoose').model('Track');
const User_Track = require('mongoose').model('User_Track');

const util = require('../lib/util');
const filters = require('../lib/filters');
const authenticateUser = require('../lib/auth').authenticateUser;
const errors = require('../lib/errors').errors;

module.exports = function(app) {
    app.get('/v1/stats/genre', authenticateUser, getUserTracks, filterUserTracks, getTracks)
}

/*
 * MIDDLEWARE FUNCTIONS
*/

/* Gets user-tracks for the token passed user */
let getUserTracks = function(req, res, next) {
    let user = req.user;

    User_Track.find({user: user._id}, function(error, user_tracks){
        if(error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else {
            req.user_tracks = user_tracks;
            next();
        }
    });
}

let filterUserTracks = function(req, res, next) {
    let user_tracks = req.user_tracks;

    let day = req.query.day;
    let hour = req.query.hour;

    if((day && hour) || (!day && !hour)) {
        res.status(400).json({
            type: 'bad_param',
            error: 'Choose either day or hour for frequency'
        });
    } else {
        let frequency = (day ? day : hour);
        let choice = (day ? 'day' : 'hour');

        req.user_tracks = filters.dividePerTime(frequency, choice, user_tracks);
        req.choice = choice;
        next();
    }
}

let getTracks = function(req, res, next) {
    let divided_uTracks = req.user_tracks;
    let stamp = (req.choice == 'hour' ? 'day' : 'hour');

    let divided_track_ids = [];
    divided_uTracks.forEach(function(division){
        track_ids = division.user_tracks.map(ut => ut.track);

        let obj = {tracks: track_ids};
        obj[stamp] = division[stamp];
        divided_track_ids.push(obj); 
    });
    res.status(200).send(divided_track_ids);

}

/* Returns an array of tracks ID's on a pair (begin_hour, end_hour) and/or (begin_day, end_day) */
let getUserTracksByHourDay = function(req, res, next) {
    let user_tracks = req.user_tracks;
    
    let period = util.filterPerPeriod({
        begin_hour: req.query.begin_hour,
        begin_day: req.query.begin_day,
        end_hour: req.query.end_hour,
        end_day: req.query.end_day
    }, "played_at", user_tracks);

    if(period.error) res.status(400).json(period.error);
    else {
        req.track_ids = period.array.map(u => u.track);
        next();
    }
}

/* Gets user-tracks divided by time - ex.: for each day of the week, which tracks were
played at 4 AM? Or for each hour of the day, which tracks were played on mondays? */
let getUserTracksDividedByTime = function(req, res, next) {
    
}

/* Given an array of Tracks IDs', returns their genres */
let getGenresByTracks = function(req, res, next) {
    let track_ids = (req.body.track_ids || req.track_ids);
    if(!track_ids) res.status(400).json(errors[400]('track_ids'));
    else {
        Track.find({_id: {$in: track_ids}}, function(error, tracks){
            if(error) {
                winston.error(error);
                res.status(500).json(errors[500]);   
            } else {
                let genres = []
                tracks.forEach(t => {
                    t.genres.forEach(g => {
                        genres.push(g);
                    })
                });

                req.genres = genres;
                next();
            }
        });
    }
}

let getGenresDividedByTime = function(req, res, next) {
}


/*
 * RETURN FUNCTIONS
*/

/* Count */
let countAndPaginateGenres = function(req, res, next) {
    let genres = req.genres;
    let page = (req.query.page || 0);
    let limit = 20;

    let countedGenres = [];
    let count = 0;
    for(let i = 0; i < genres.length; i++) {
        if(util.searchByField("genre", genres[i], countedGenres) == -1){
            let a = genres[i];
            for(let j = 0; j < genres.length; j++) {
                let b = genres[j];
                if(a == b) count++;
            }
            countedGenres.push({
                genre: a,
                times_listened: count
            });
            count = 0;
        }
    }

    countedGenres.sort((a, b) => b.times_listened - a.times_listened);

    let total = countedGenres.length;
    genres = countedGenres.splice(page*limit, limit);

    res.status(200).json({genres: genres, total: total});
}