const mongoose = require('mongoose');

module.exports = function() {
    const TrackSchema = mongoose.Schema({
        _id: String,
        name: String,
        artists: [],
        album: {}
    });

    mongoose.model('Track', TrackSchema);
}
