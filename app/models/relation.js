const mongoose = require('mongoose');

module.exports = function () {
    const RelationSchema = mongoose.Schema({
        user_1: String,
        user_2: String,
        afinity: Number,
        genres: [{
            name: String,
            times_listened_user1: Number,
            times_listened_user2: Number,
            commom_interest: Number
        }]
    });

    mongoose.model('Relation', RelationSchema);
}
