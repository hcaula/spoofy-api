const mongoose = require('mongoose');

module.exports = function() {
    let PlaySchema = mongoose.Schema({
        user: {type: String},
        track: {type: String},
        played_at: {
            fullDate: Date,
            year: Number,
            day: Number,
            hour: Number,
            minutes: Number
        }
    });

    mongoose.model('Play', PlaySchema);
}
