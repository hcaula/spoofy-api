exports.calculateExpirationDate = function(expires_in){
    let now = Date.now();
    return new Date(now + (expires_in*1000));
}

exports.searchByField = function(field, value, array) {
    let index = -1;
    array.forEach(function(el, i){
        if(el[field] == value) {
            index = i;
            return;
        }
    });
    return index;
}