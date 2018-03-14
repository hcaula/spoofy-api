const winston = require('winston');

const User = require('mongoose').model('User');
const Track = require('mongoose').model('Track');
const User_Track = require('mongoose').model('User_Track');

const util = require('../lib/util');
const authenticateUser = require('../lib/auth').authenticateUser;
const errors = require('../lib/errors').errors;

module.exports = function(app) {
    app.get('/v1/stats/genre/user', authenticateUser, getUserTracks, getGenresByTracks);
    app.get('/v1/stats/genre/user/hour', authenticateUser, getUserTracksByHour, getGenresByTracks);
}

let getUserTracks = function(req, res, next) {
    let user = req.user;

    User_Track.find({user: user}, function(error, uTracks){
        if(error) {
            winston.error(error);
            res.status(500).json(errors[500]);
        } else if(uTracks.length == 0) res.status(200).json({genres: []});
        else {
            req.track_ids = uTracks.map(u => u.track);
            next();
        }
    });
}

let getUserTracksByHour = function(req, res, next) {
    let user = req.user;
    let begin = req.query.begin;
    let end = (req.query.end || 0);

    if(!begin) res.status(400).json(errors[400]('begin'));
    else if (parseInt(begin) >= parseInt(end)) {
        res.status(400).json({
            type: 'bad_request',
            error: 'The end time should be bigger than the begin time.'
        });
    } else {
        begin = parseInt(begin), end = parseInt(end);

        let hours = [];
        if(!end) hours = [begin];
        else for(let i = begin; i <= (end - begin); i++) hours.push(i);

        User_Track.find({user: user}, function(error, _uTracks){
            if(error) {
                winston.error(error.stack);
                res.status(500).json(errors[500]);
            } else {
                let uTracks = [];
                _uTracks.forEach(function(ut){
                    for(let i = 0; i < ut.played_at.length; i++) {
                        let date = ut.played_at[i];
                        if(hours.includes(date.getUTCHours())) {
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