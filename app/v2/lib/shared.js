const { searchByField } = require('../lib/util');

exports.getShared = function (options) {
    const type = options.type;
    const users = options.users;
    const seeded = options.seeded;

    let multipliers = [].fill.call({ length: users.length }, 1);
    if (options.multipliers.length == users.length) multipliers = options.multipliers;

    let medias = [];
    users.forEach((user, i) => {
        const u_multiplier = multipliers[i];
        user[type].forEach((m, j) => {
            const m_multiplier = (type == 'genres' ? m.weight : 1);
            const id = (type == 'genres' ? m.name : m);

            const index = searchByField(id, "id", medias);

            if (index > -1) medias[index].weight += u_multiplier * m_multiplier;
            else {
                medias.push({
                    id: id,
                    weight: u_multiplier * m_multiplier
                });
            }
        });
    });

    if (type == 'genres' && seeded) {
        const available_seeds = require('../../../config/jsons/seeds');
        medias = medias.filter(m => available_seeds.includes(m.id));
    }
    
    medias.sort((a, b) => (b.weight - a.weight));

    return medias;
}