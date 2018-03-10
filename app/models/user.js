const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const idValidator = require('mongoose-id-validator');

const calculateExpirationDate = require('../lib/util').calculateExpirationDate;

module.exports = function() {
    let UserSchema = mongoose.Schema({
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
        tracks: [
            {
                track: {
                    type: Schema.Types.ObjectId,
                    refId: 'Track'
                },
                listenedAt: [Date]
            }
        ],
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

    UserSchema.plugin(idValidator);

    /* Calculating the expiration_date previous the save function */
    UserSchema.pre('save', function(next){
        this.token.expiration_date = calculateExpirationDate(this.token.expires_in);
        next();
    });

    mongoose.model('User', UserSchema);
}
