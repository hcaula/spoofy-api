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