exports.calculateExpirationDate = function(expires_in){
    let now = Date.now();
    return new Date(now + (expires_in*1000));
}

exports.calculateNextWeek = function() {
    let today = new Date();
    let nextweek = new Date(
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
    array.forEach(function(el, i){
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