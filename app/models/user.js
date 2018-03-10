const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const idValidator = require('mongoose-id-validator');

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
        }
    });

    UserSchema.plugin(idValidator);
    mongoose.model('User', UserSchema);
}
