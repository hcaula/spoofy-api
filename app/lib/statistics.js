const statistics = require('simple-statistics');

exports.getTracksFeaturesStatistics = function(divisions, stamp) {
    let all_stats = [];
    divisions.forEach(function(division){

        let features = [];
        division.tracks.forEach(function(track){
            features.push(track.features);
        });

        let stats = {
            duration_ms: {values: []},
            explicit: {values: []},
            danceability: {values: []},
            energy: {values: []},
            key: {values: []},
            loudness: {values: []},
            mode: {values: []},
            speechiness: {values: []},
            acousticness: {values: []},
            instrumentalness: {values: []},
            liveness: {values: []},
            valence: {values: []},
            tempo: {values: []},
            time_signature: {values: []}
        };

        
        features.forEach(function(feature){
            stats.danceability.values.push(feature["danceability"]);
            stats.energy.values.push(feature["energy"]);
            stats.key.values.push(feature["key"]);
            stats.loudness.values.push(feature["loudness"]);
            stats.mode.values.push(feature["mode"]);
            stats.speechiness.values.push(feature["speechiness"]);
            stats.acousticness.values.push(feature["acousticness"]);
            stats.instrumentalness.values.push(feature["instrumentalness"]);
            stats.liveness.values.push(feature["liveness"]);
            stats.valence.values.push(feature["valence"]);
            stats.tempo.values.push(feature["tempo"]);
            stats.time_signature.values.push(feature["time_signature"]);
        });

        for(let stat in stats) {
            if(stats[stat].values.length > 1){
                stats[stat].mean = statistics.mean(stats[stat].values);
                stats[stat].median = statistics.median(stats[stat].values);
                stats[stat].mode = statistics.mode(stats[stat].values);
                stats[stat].variance = statistics.variance(stats[stat].values);
                stats[stat].sample_variance = statistics.sampleVariance(stats[stat].values);
                stats[stat].standard_deviation = statistics.standardDeviation(stats[stat].values);
                stats[stat].sample_standard_deviation = statistics.sampleStandardDeviation(stats[stat].values);
                stats[stat].median_absolute_deviation = statistics.medianAbsoluteDeviation(stats[stat].values);
                stats[stat].interquartile_range = statistics.interquartileRange(stats[stat].values);
            }
        }

        let obj = {stats: stats};
        obj[stamp] = division[stamp];
        all_stats.push(obj);
    });

    return all_stats;
}