const winston = require('winston');

const User = require('mongoose').model('User');
const Track = require('mongoose').model('Track');
const User_Track = require('mongoose').model('User_Track');

const authenticateUser = require('../lib/auth').authenticateUser;
const errors = require('../lib/errors').errors;

module.exports = function(app) {
    app.get('/v1/stats/genre/user', authenticateUser, getUsersMostListenedGenres);
}

let getUsersMostListenedGenres = function(req, res) {
    let user = req.user;
    User_Track.find({user: user}, function(error, uTracks){
        if(error) {
            winston.error(error);
            res.status(500).json(errors[500]);
        } else if(uTracks.length == 0) res.status(200).json({genres: []});
        else {
            uTracks.sort((a, b) => {
                let lastA = a.played_at[a.played_at.length-1];
                let lastB = b.played_at[b.played_at.length-1];
                if(lastA < lastB) return 1;
                else if (lastB < lastA) return -1;
                else return 0;
            });

            let trackIds = uTracks.map(u => u.track);
            Track.find({_id: {$in: trackIds}}, function(error, tracks){
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
                    res.status(200).json({genres: genres});
                }
            });
        }
    });
}