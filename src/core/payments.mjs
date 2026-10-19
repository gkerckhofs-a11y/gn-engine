import { createHash } from 'node:crypto';
import { documentId, requireThat, whole } from './validation.mjs';

const digest = text => createHash('sha256').update(text).digest('hex');
export const accessDocument = (sid, uid) => {
  requireThat(typeof uid === 'string' && uid.length > 0 && uid.length <= 128, 'AUTH_REQUIRED');
  return `sessions/${documentId(sid)}/access/${digest(uid)}`;
};

/**
 * Paiement de crédits fictifs uniquement. Le service appelant doit authentifier
 * actorUid avec Firebase Admin. L'identité ne provient jamais du corps HTTP.
 * store.runTransaction doit être atomique et réessayer les lectures périmées.
 * Ce module ne constitue ni une API HTTP ni un serveur d'authentification.
 */
export async function transferCredits(store, actorUid, input, serverNow) {
  const sid = documentId(input.sessionId);
  const requestId = documentId(input.requestId);
  const fromId = documentId(input.fromAccountId);
  const toId = documentId(input.toAccountId);
  const amount = whole(input.amount, 'INVALID_AMOUNT');
  requireThat(amount > 0 && fromId !== toId, 'INVALID_TRANSFER');
  requireThat(typeof input.memo === 'string' && input.memo.length <= 1000, 'INVALID_MEMO');
  whole(serverNow);
  const accessPath = accessDocument(sid, actorUid);
  const key = digest(JSON.stringify([sid, actorUid, requestId]));
  const fingerprint = digest(JSON.stringify(['payment-v1', fromId, toId, amount, input.memo]));
  const base = `sessions/${sid}`;
  const operationPath = `${base}/operations/${key}`;

  return store.runTransaction(async tx => {
    // L'accès est revérifié même pour une répétition : une révocation interdit
    // aussi de relire un résultat privé ancien.
    const grant = await tx.get(accessPath);
    requireThat(grant?.active === true, 'FORBIDDEN');
    const previous = await tx.get(operationPath);
    if (previous) {
      requireThat(previous.fingerprint === fingerprint, 'REQUEST_ID_REUSED');
      return {...previous.result, replayed: true};
    }
    requireThat(grant.spendAccountIds?.includes(fromId), 'FORBIDDEN');
    const session = await tx.get(base);
    requireThat(session?.status === 'EN_JEU', 'SESSION_NOT_RUNNING');
    requireThat(session.modules?.economy === true, 'MODULE_DISABLED');
    const fromPath = `${base}/accounts/${fromId}`;
    const toPath = `${base}/accounts/${toId}`;
    const from = await tx.get(fromPath);
    const to = await tx.get(toPath);
    // Les comptes bénéficiaires doivent être accessibles via le réseau de
    // paiement autorisé (QR, contact ou droit explicite). Aucun annuaire global.
    requireThat(grant.payeeAccountIds?.includes(toId), 'FORBIDDEN');
    requireThat(from?.sessionId === sid && to?.sessionId === sid, 'ACCOUNT_UNAVAILABLE');
    requireThat(from.status === 'ACTIVE' && to.status === 'ACTIVE', 'ACCOUNT_UNAVAILABLE');
    whole(from.balance); whole(to.balance); whole(from.reserved); whole(to.reserved);
    requireThat(from.reserved <= from.balance && to.reserved <= to.balance, 'INVALID_ACCOUNT');
    requireThat(from.balance - from.reserved >= amount, 'INSUFFICIENT_FUNDS');
    const debit = whole(from.balance - amount);
    const credit = whole(to.balance + amount, 'BALANCE_OVERFLOW');
    const result = {operationId: key, fromAccountId: fromId, toAccountId: toId,
      amount, balance: debit, available: debit - from.reserved, replayed: false};

    // Toutes les lectures précèdent les écritures, comme requis par Firestore.
    tx.set(fromPath, {...from, balance: debit});
    tx.set(toPath, {...to, balance: credit});
    tx.set(`${base}/ledger/${key}`, {id: key, actorUid, at: serverNow,
      kind: 'TRANSFER', fromAccountId: fromId, toAccountId: toId,
      amount, memo: input.memo, createdCurrency: 0, removedCurrency: 0,
      entries: [{accountId: fromId, delta: -amount}, {accountId: toId, delta: amount}]});
    tx.set(operationPath, {fingerprint, actorUid, result, at: serverNow});
    return result;
  });
}
