const mongoose = require('mongoose');

const { calculateExpirationDate } = require('../lib/util');

module.exports = function() {
    const UserSchema = mongoose.Schema({
        _id: String,
        display_name: String,
        email: String,
        uri: String,
        href: String,
        images: [{
            height: Number,
            width: Number,
            url: String
        }],
        token: {
            access_token: String,
            token_type: String,
            scope: String,
            expires_in: Number,
            expiration_date: Date,
            refresh_token: String
        },
        role: {type: String, default: "user"}
    });

    /* Calculating the expiration_date previous of the save function */
    UserSchema.pre('save', function(next) {
        this.token.expiration_date = calculateExpirationDate(this.token.expires_in);
        next();
    });

    mongoose.model('User', UserSchema);
}
