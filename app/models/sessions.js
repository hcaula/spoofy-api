const mongoose = require('mongoose');

module.exports = function () {
    const SessionSchema = mongoose.Schema({
        token: String,
        user: String,
        expiration_date: Date
    });

    mongoose.model('Session', SessionSchema);
}
