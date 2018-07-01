const mongoose = require('mongoose');

module.exports = function () {

    const PlaylistSchema = mongoose.Schema({
        user: String,
        tracks: [{
            name: String,
            artist: String,
            href: String,
            id: String,
            image: String,
            popularity: Number,
            uri: String,
            vote: Number
        }],
        seeds: [String],
        users: [String],
        type: String,
        min_popularity: Number,
        max_populairty: Number,
        multipliers: []
    }, {
        strict: false
    });

    mongoose.model('Playlist', PlaylistSchema);
}
