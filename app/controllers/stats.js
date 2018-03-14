const winston = require('winston');

const User = require('mongoose').model('User');
const Track = require('mongoose').model('Track');
const User_Track = require('mongoose').model('User_Track');

const util = require('../lib/util');
const authenticateUser = require('../lib/auth').authenticateUser;
const errors = require('../lib/errors').errors;

module.exports = function(app) {
    app.get('/v1/stats/genre/user', authenticateUser, getUserTracksByHourDay, getGenresByTracks);
}

/* Gets ser tracks by hour */
/* If a begin_hour time comes with the request, gets only the user-tracks for this hour */
/* If an end_hour time comes with the request, gets the user-tracks for the period begin_hour-end_hour */
/* If neither begin_hour or end_hour time come with the request, gets all user-tracks */
let getUserTracksByHourDay = function(req, res, next) {
    let user = req.user;
    let begin_hour = (parseInt(req.query.begin_hour) || 0);
    
    let end_hour;
    if(!req.query.begin_hour && !req.query.end_hour) end_hour = 24;
    else if (req.query.begin_hour && !req.query.end_hour) end_hour = begin_hour;
    else if (req.query.begin_hour && req.query.end_hour) end_hour = parseInt(req.query.end_hour)
    else {
        res.status(400).json({
            type: 'bad_request',
            error: "An end hour should come with a begin hour."
        });
    }

    let begin_day = (parseInt(req.query.begin_day) || 0);

    let end_day;
    if(!req.query.begin_day && !req.query.end_day) end_day = 7;
    else if (req.query.begin_day && !req.query.end_day) end_day = begin_day;
    else if (req.query.begin_day && req.query.end_day) end_day = parseInt(req.query.end_day)
    else {
        res.status(400).json({
            type: 'bad_request',
            error: "An end day day should come with a begin day."
        });
    }

    if(begin_hour < 0 || begin_hour > 24 || end_hour < 0 || end_hour > 24) {
        res.status(400).json({
            type: 'bad_request',
            error: 'Invalid hour.'
        });
    } else if (begin_hour > end_hour) {
        res.status(400).json({
            type: 'bad_request',
            error: 'The end hour should be bigger than the begin hour.'
        });
    } else if(begin_day < 0 || begin_day > 7 || end_day < 0 || end_day > 7) {
        res.status(400).json({
            type: 'bad_request',
            error: 'Invalid day.'
        });
    } else if (begin_day > end_day) {
        res.status(400).json({
            type: 'bad_request',
            error: 'The end day should be bigger than the begin day.'
        });
    } else {
        let hours = [];
        if(end_hour == begin_hour) hours = [begin_hour];
        else for(let i = begin_hour; i <= end_hour; i++) hours.push(i);

        let days = [];
        if(end_day == begin_day) days = [begin_day];
        else for(let i = begin_day; i <= end_day; i++) days.push(i);

        User_Track.find({user: user}, function(error, _uTracks){
            if(error) {
                winston.error(error.stack);
                res.status(500).json(errors[500]);
            } else {
                let uTracks = [];
                _uTracks.forEach(function(ut){
                    for(let i = 0; i < ut.played_at.length; i++) {
                        let date = ut.played_at[i];
                        if(hours.includes(date.getUTCHours()) && days.includes(date.getUTCDay())) {
                            uTracks.push(ut);
                            i = ut.played_at.length;
                        }
                    }
                });

                req.track_ids = uTracks.map(u => u.track);
                next();
            }
        });

    }

}

let getGenresByTracks = function(req, res) {
    let page = (req.query.page || 0);
    let limit = 20;

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
        });
    }
}