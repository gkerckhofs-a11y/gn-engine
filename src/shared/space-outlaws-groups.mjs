// M2 proposals keep the original permissions. Wallet mandates are granted in session.
export const soGroupPermissions=Object.freeze(['readBriefing','readMembers']);
export const soStockPermissions=Object.freeze(['readStock','depositStock','withdrawStock']);
const walletPermissions=Object.freeze([...soGroupPermissions,'readWallet','payWallet']);
export const soGroupLimit=50;
export const hasSoGroupWallets=s=>s.spaceOutlaws?.actionsVersion===1&&
 s.spaceOutlaws.groupsVersion===1&&s.spaceOutlaws.groupWalletVersion===1&&s.modules?.groups===true;
export const hasSoGroupStock=s=>s.spaceOutlaws?.actionsVersion===1&&
 s.spaceOutlaws.groupsVersion===1&&s.spaceOutlaws.groupStockVersion===1&&s.modules?.groups===true;
export const hasSoGroupPilot=s=>s.spaceOutlaws?.actionsVersion===1&&
 s.spaceOutlaws.groupsVersion===1&&s.spaceOutlaws.groupPilotVersion===1&&s.modules?.groups===true;
export const soSessionGroupPermissions=s=>[
 ...(hasSoGroupWallets(s)?walletPermissions:soGroupPermissions),
 ...(hasSoGroupStock(s)?soStockPermissions:[]),
 ...(hasSoGroupPilot(s)?['pilotShip']:[])
];
