// Valeurs du Master SO_Master_Recette_Commerce_Galactique.xlsx.
const materials = [
  ['WATER', 'rec-eau', 'eau'],
  ['RATIONS', 'rec-rations', 'rat'],
  ['ORE', 'rec-minerai', 'min'],
  ['PARTS', 'rec-pieces', 'pie'],
];
export const commerceCounters = [
  ['home', 'breach', [['SURPLUS', 20, 6], ['NORMAL', 12, 10], ['TENSION', 8, 12], ['SHORTAGE', 6, 16]]],
  ['away', 'kessel', [['SHORTAGE', 5, 12], ['TENSION', 10, 14], ['SURPLUS', 18, 5], ['NORMAL', 10, 8]]],
  ['ord-recette', 'ord', [['NORMAL', 10, 9], ['SURPLUS', 18, 5], ['SHORTAGE', 5, 15], ['TENSION', 8, 10]]],
].map(([portId, counter, rows]) => ({
  portId,
  shopId: `rec-comptoir-${counter}`,
  markets: rows.map(([marketState, quantity, demand], i) => ({
    commodityCode: materials[i][0],
    itemId: materials[i][1],
    offerId: `rec-${counter}-${materials[i][2]}`,
    marketState, quantity, demand,
  })),
}));
export const commerceDocks = [
  ['home', 'Réserve du quai', 24, 6, 60, 1],
  ['home', 'Petite consigne', 6, 2, 30, 2],
  ['away', 'Réserve du relais', 20, 8, 60, 2],
  ['ord-recette', 'Magasin de transit', 16, 0, 60, 1],
];
export const commerceFuel = { shopId: 'rec-comptoir-breach', offerId: 'rec-breach-fuel', itemId: 'kit-fuel' };
