const mongoose = require('mongoose');

module.exports = function () {
    const RelationSchema = mongoose.Schema({
        user_1: String,
        user_2: String,
        afinity: Number,
        genres: [{
            name: String,
            times_listened_user_1: Number,
            times_listened_user_2: Number,
            normalized_user_1: Number,
            normalized_user_2: Number,
            common_interest: Number
        }]
    });

    mongoose.model('Relation', RelationSchema);
}
