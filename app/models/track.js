const mongoose = require('mongoose');

module.exports = function() {
    let TrackSchema = mongoose.Schema({
        _id: String,
        name: String,
        artists: [
           {
               name: String,
               href: String
           }
        ],
        album: {
            id: String,
            name: String,
            images: [
                {
                    height: Number,
                    width: Number,
                    url: String
                }
            ],
            release_date: String,
            release_date_precision: String,
            href: String
        },
        genres: [String],
        features: {
            duration_ms: Number,
            explicit: Boolean,
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
        },
        duration_ms: Number,
        explicit: Boolean,
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
