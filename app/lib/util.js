exports.calculateExpirationDate = function(expires_in){
    let now = Date.now();
    return new Date(now + (expires_in*1000));
}