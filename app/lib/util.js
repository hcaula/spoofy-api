exports.calculateExpirationDate = function(expires_in){
    const now = Date.now();
    return new Date(now + (expires_in*1000));
}

exports.calculateNextWeek = function() {
    const today = new Date();
    const nextweek = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()+7,
        today.getHours(),
        today.getMinutes(),
        today.getSeconds(),
        today.getMilliseconds()
    );
    return nextweek;
}

exports.searchByField = function(value, field, array) {
    let index = -1;
    array.forEach((el, i) => {
        if(el[field] == value) {
            index = i;
            return;
        }
    });
    return index;
}

exports.countElement = function(elem, array) {
    return array.filter(x => (x == elem)).length;
}

exports.organizeGenres = function(tracks) {
    let genres = [], counted_genres = [], ret_genres = [];

    tracks.forEach(track => {
        track.genres.forEach(g => genres.push(g));
    });

    genres.forEach(g => {
        if (!counted_genres.includes(g)) {
            counted_genres.push(g);
            ret_genres.push({
                genre: g,
                times_listened: exports.countElement(g, genres)
            });
        }
    });

    const sorted = ret_genres.sort((a, b) => b.times_listened - a.times_listened)

    return sorted;
}