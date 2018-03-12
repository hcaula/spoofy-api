const mongoose = require('mongoose');

module.exports = function() {
    let GenreSchema = mongoose.Schema({
        name: {type: String, unique: true},
        artists: [String]
    });

    mongoose.model('Genre', GenreSchema);
}
