const async = require('async');
const config = require('../../config/config');
const base64 = require('base-64');
const winston = require('winston');

const request = require('./requests').request;

const User = require('mongoose').model('User');
const User_Track = require('mongoose').model('User_Track');
const Track = require('mongoose').model('Track');

let results;

/* Request new token using the refresh token */
const refreshToken = function(next) {
    let now = Date.now();

    /* We add a little limit so that the token doesn't expire mid-request */
    let limit = now + 60000;
    let today = new Date(limit);

    let user = results.user;

    if(today < user.token.expiration_date) {
        winston.info("Token hasn't expired yet, so it doesn't need to be refreshed.");

        results.token = user.token;
        next();
    } else {
        winston.info("Token has expired. Requesting new access_token from Spotify.");

        let refresh_token = user.token.refresh_token;
        let client_id = (process.env.SPOTIFY_CLIENTID || config.spotify.client_id);
        let client_secret = (process.env.SPOTIFY_CLIENTSECRET|| config.spotify.client_secret);
        let encoded = base64.encode(`${client_id}:${client_secret}`);

        let body = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token
        }

        let options = {
            host: 'accounts.spotify.com',
            path: '/api/token',
            method: 'POST',
            headers: {'Authorization': `Basic ${encoded}`}
        }

        request('https', options, body, function(error, response){
            if(error) {
                let err = new Error(error.message);
                err.message = 'Authentication error.';
                next(err);
            } else {
                winston.info("New access_token has been requested successfully.");
                
                results.token = response;
                next();
            }
        });
    }
}

/* Update token on our database */
const updateToken = function(next) {
    let user = results.user;
    let token = results.token;

    /* If both access tokens are equal, then the token 
    has not been refreshed and we can skip this function */
    if(user.token.access_token == token.access_token) next();
    else {
        winston.info("Updating user token on local DB.");

        let user = results.user, token = results.token;

        token.refresh_token = user.token.refresh_token;
        user.token = token;

        user.save(function(error, newUser){
            if(error) {
                let err = new Error(error.message);
                err.type = 'db_error';
                next(err);
            } else {
                winston.info("User token updated successfully.");

                results.user = newUser;
                next();
            }
        });
    }
}

/* Request recently played tracks */
const getRecentlyPlayedTracks = function(next) {
    winston.info("Requesting recently played tracks.");
    
    let token = results.token;

    let access_token = token.access_token;
    let type = "track";
    let limit = 50;

    let options = {
        host: 'api.spotify.com',
        path: `/v1/me/player/recently-played/?type=${type}&limit=${limit}`,
        method: 'GET',
        headers: {'Authorization': `Bearer ${access_token}`}
    }

    request('https', options, function(error, response){
        if(error) {
            let err = new Error(error.message);
            err.message = 'Authentication error.';
            next(err);
        } else {
            winston.info("Recently played tracks requested successfully.");

            results.tracks = response.items;
            next();
        }
    });
}

/* Reduce the quantity of tracks by checking if they're already on our DB */
const shaveTracks = function(next) {
    winston.info("Shaving tracks.");
    let tracks = results.tracks;
    let user = results.user;

    let trackIds = tracks.map(t => t.track.id);
    let played_ats = (tracks.map(t => new Date(t.played_at)));
    let userId = user._id;

    let query = {user: userId, track: {$in: trackIds}, played_at: {$in: played_ats}};

    User_Track.find(query, function(error, uTracks){
        if(error) {
            let err = new Error(error);
            err.type = "db_error";
            next(err);
        } else {
            let diff = tracks.length - uTracks.length;

            if(diff == 0) {
                winston.warn("User has not listened to any new tracks.");
                next({stop: true});
            } else {
                let uTracksIds = uTracks.map(s => s.track);
                let shavedTracks = tracks.filter(t => !uTracksIds.includes(t.track.id));

                /* We have to check again in case the user has listened to the same song
                more than once on his/her last recently played tracks */
                if(shavedTracks.length == 0) {
                    winston.warn("User has not listened to any new tracks.");
                    next({stop: true});
                } else {
                    diff = shavedTracks.length;
                    winston.info(`${diff} new listened track${(diff > 1 ? 's' : '')} found.`);

                    results.tracks = shavedTracks;
                    next();
                }
            }
        }
    });
}

/* Request tracks features */
const getTracksFeatures = function(next) {
    winston.info("Requesting several tracks features.");

    let tracks = results.tracks;
    let user = results.user;

    let ids = '';
    ids += tracks.map((track, i) => `${track.track.id}${(i<(this.length-1) ? ',' : '')}`);

    let options = {
        host: 'api.spotify.com',
        path: `/v1/audio-features/?ids=${ids}`,
        method: 'GET',
        headers: {'Authorization': `Bearer ${user.token.access_token}`}
    }

    request('https', options, function(error, response){
        if(error) {
            let err = new Error(error.message);
            err.message = error.message;
            next(err);
        } else {
            winston.info("Several tracks features requested successfully");

            results.features = response.audio_features;
            next();
        }
    });
}

/* Request artists */
const getArtists = function(next) {
    winston.info("Requesting several artists for genres retrieval.");

    let tracks = results.tracks;
    let user = results.user;
    let features = results.features;

    let ids = '';
    ids += tracks.map((track, i) => `${track.track.artists[0].id}${(i<(this.length-1) ? ',' : '')}`);

    let options = {
        host: 'api.spotify.com',
        path: `/v1/artists/?ids=${ids}`,
        method: 'GET',
        headers: {'Authorization': `Bearer ${user.token.access_token}`}
    }

    request('https', options, function(error, response){
        if(error) {
            let err = new Error(error.message);
            err.message = error.message;
            next(err);
        } else {
            winston.info("Several artists requested successfully.");

            results.artists = response.artists;
            next();
        }
    });
}

/* Create an array of saveable tracks - matching with our model */
const gatherTracksInfo = function(next) {
    winston.info("Gathering tracks information.");

    let tracks = results.tracks;
    let artists = results.artists;
    let features = results.features;

    let saveableTracks = [];
    tracks.forEach(function(track, i){
        let tr = track.track;
        let ft = features[i];
        let ar = artists[i];

        let saveableTrack = {
            _id: tr.id,
            name: tr.name,
            duration_ms: tr.duration_ms,
            explicit: tr.explicit,
            href: tr.href,

            album: {
                id: tr.album.id,
                name: tr.album.name,
                images: tr.album.images,
                href: tr.uri
            },

            danceability: ft.danceability,
            energy: ft.energy,
            key: ft.key,
            loudness: ft.loudness,
            mode: ft.mode,
            speechiness: ft.speechiness,
            acousticness: ft.acousticness,
            instrumentalness: ft.instrumentalness,
            liveness: ft.liveness,
            valence: ft.valence,
            tempo: ft.tempo,
            time_signature: ft.time_signature,
            
            genres: ar.genres,
            artists: [],

            played_at: track.played_at
        };

        tr.artists.forEach(function(artist){
            saveableTrack.artists.push({
                name: artist.name,
                href: artist.href,
                id: artist.id
            });
        });

        saveableTracks.push(saveableTrack);
    });

    winston.info("Tracks information gathered successfully")

    results.tracks = saveableTracks;
    next();
}

/* Save tracks on our DB */
const saveTracks = function(next) {
    winston.info("Saving tracks on local DB");

    let tracks = results.tracks;
    let newTracks = [];

    async.eachSeries(tracks, function(track, next){
        let newTrack = new Track(track);
        newTrack.save(function(error){
            let trackStr = `${track.name} by ${track.artists[0].name}.`
            if(error) {
                if(error.code == 11000) next();
                else {
                    let err = new Error(error);
                    err.type = "db_error";
                    next(err);
                }
            } else {
                newTracks.push(newTrack);
                next();
            } 
        });
    }, function(error){
        if(error) next(error);
        else {
            winston.info("Tracks saved successfully.");
            results.newTracks = newTracks;
            next();
        }
    });
}

/* Update user-tracks on our DB */
const createOrUpdateUserTracks = function(next) {
    winston.info("Creating/updating new user-track relationships.");

    let user = results.user;
    let tracks = results.tracks;

    async.eachSeries(tracks, function(track, next){
        User_Track.update(
            {user: user._id, track: track._id},
            {$addToSet: {played_at: track.played_at}},
            {upsert: true},
            function(error) {
                if(error) {
                    let err = new Error(error);
                    err.type = "db_error";
                    next(err);
                } else next();
            }
        );
    }, function(error){
        if(error) next(error);
        else {
            winston.info("New user-track relationships created/updated successfully.")
            next();
        }
    });
}


exports.initJob = function(users, next) {
    results = {};

    async.eachSeries(users, function(user, next){
        winston.info(`Getting recently played tracks for user ${user.display_name}.`);

        results.user = user;

        async.series([
            refreshToken,
            updateToken,
            getRecentlyPlayedTracks,
            shaveTracks,
            getTracksFeatures,
            getArtists,
            gatherTracksInfo,
            saveTracks,
            createOrUpdateUserTracks
        ], function(error){
            if(error && !error.stop) next(error);
            else if (error && error.stop) {
                winston.info(`Stoping init job for user ${results.user.display_name}.`);
                next();
            }  else {
                winston.info(`Recently played tracks for user ${user.display_name} have been updated successfully.`);
                next();
            }
        });
    }, function(error){
        if(error) {
            winston.error(error.stack);
            next(error);
        } else {
            winston.info('Recent tracks for all users have been updated successfully.');
            next();
        }
    });
}