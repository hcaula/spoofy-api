const mongoose = require('mongoose');
const Schema = mongoose.Schema;

module.exports = function() {
    let TrackSchema = mongoose.Schema({
        name: String,
        artists: [
           {
               name: String,
               href: String
           }
        ],
        duration_ms: Number,
        expicit: Boolean,
        href: String,
        danceability: Number,
        energy: Number,
        key: Number,
        loudness: Number,
        mode: Number,
        speechiness: Number,
        acousticness: Number,
        instrumentalness: Number,
        liveness: Number,
        valence: Number,
        tempo: Number,
        time_signature: Number
    });

    mongoose.model('Track', TrackSchema);
}
