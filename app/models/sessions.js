const mongoose = require('mongoose');

module.exports = function() {
    let SessionSchema = mongoose.Schema({
        token: String,
        user: String,
        expiration_date: Date
    });

    mongoose.model('Session', SessionSchema);
}
