const mongoose = require('mongoose');

module.exports = function() {
    let User_TrackSchema = mongoose.Schema({
        user: {type: String},
        track: {type: String},
        played_at: [{type: Date}]
    });

    mongoose.model('User_Track', User_TrackSchema);
}
