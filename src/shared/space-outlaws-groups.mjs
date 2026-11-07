// M2 proposals keep the original permissions. Wallet mandates are granted in session.
export const soGroupPermissions=Object.freeze(['readBriefing','readMembers']);
const walletPermissions=Object.freeze([...soGroupPermissions,'readWallet','payWallet']);
export const soGroupLimit=50;
export const hasSoGroupWallets=s=>s.spaceOutlaws?.actionsVersion===1&&
 s.spaceOutlaws.groupsVersion===1&&s.spaceOutlaws.groupWalletVersion===1&&s.modules?.groups===true;
export const soSessionGroupPermissions=s=>hasSoGroupWallets(s)?walletPermissions:soGroupPermissions;
