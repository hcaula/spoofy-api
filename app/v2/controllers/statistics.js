const Playlist = require('mongoose').model('Playlist');

const errors = require('../lib/errors');
const auth = require('../lib/auth');

module.exports = function (app) {
    app.get('/api/v2/votes/', auth, getAllVotes);
    app.get('/api/v2/votes/user', auth, getVotesWithUser);
    app.get('/api/v2/votes/nouser', auth, getVotesWithoutUser);
}

const countVotes = function (playlists) {
    const byRating = [0, 0, 0, 0, 0];
    let tracks_voted = 0;

    playlists.forEach(p => {
        const hasVote = p.tracks.filter(t => t.vote);
        tracks_voted += hasVote.length;
        hasVote.forEach(v => byRating[v.vote - 1]++);
    });

    const means = byRating.map(r => r/tracks_voted);

    return {
        playlist_voted: playlists.length,
        tracks_voted: tracks_voted,
        byRating: byRating,
        means: means
    }
}

const getAllVotes = function (req, res) {
    Playlist.find({ "voted": true }, (error, playlists) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else res.status(200).json(countVotes(playlists));
    });
}

const getVotesWithUser = function (req, res) {
    const user_id = req.user._id;
    Playlist.find({ "voted": true, "users": user_id }, (error, playlists) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else res.status(200).json(countVotes(playlists));
    });
}

const getVotesWithoutUser = function (req, res) {
    const user_id = req.user._id;
    Playlist.find({ "voted": true, "users": { $ne: user_id} }, (error, playlists) => {
        if (error) {
            winston.error(error.stack);
            res.status(500).json(errors[500]);
        } else res.status(200).json(countVotes(playlists));
    });
}