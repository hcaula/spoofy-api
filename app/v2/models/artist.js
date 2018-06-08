const mongoose = require('mongoose');

module.exports = function () {

    const ArtistSchema = mongoose.Schema({
        _id: String,
        name: String,
        external_urls: [],
        genres: [String],
        href: String,
        images: [],
        popularity: Number,
        uri: String
    });

    mongoose.model('Artist', ArtistSchema);
}
