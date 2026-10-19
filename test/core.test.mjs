import test from 'node:test';
import assert from 'node:assert/strict';
import {createClock, resumeClock, pauseClock, gameTime, invitationIsValid} from '../src/core/clock.mjs';
import {publicCharacter, participantCharacter} from '../src/core/projections.mjs';
import {transferCredits, accessDocument} from '../src/core/payments.mjs';

// Simulateur atomique en mémoire : vérifie le contrat métier, pas les garanties
// opérationnelles de Firebase. Les essais émulateur/charge sont encore requis.
class MemoryStore {
  constructor(entries = []) { this.data = new Map(entries); this.queue = Promise.resolve(); }
  runTransaction(callback) {
    const run = this.queue.then(async () => {
      const copy = structuredClone(this.data);
      const tx = {get: async key => structuredClone(copy.get(key) ?? null),
        set: (key, value) => copy.set(key, structuredClone(value))};
      const result = await callback(tx);
      this.data = copy;
      return result;
    });
    this.queue = run.catch(() => {});
    return run;
  }
}
const uid = 'participant-1';
function fixture() {
  return new MemoryStore([
    ['sessions/game-a', {status: 'EN_JEU', modules: {economy: true}}],
    [accessDocument('game-a', uid), {active: true, spendAccountIds: ['alice'], payeeAccountIds: ['bob']}],
    ['sessions/game-a/accounts/alice', {sessionId: 'game-a', balance: 100, reserved: 0, status: 'ACTIVE'}],
    ['sessions/game-a/accounts/bob', {sessionId: 'game-a', balance: 0, reserved: 0, status: 'ACTIVE'}],
  ]);
}
const payment = (changes = {}) => ({sessionId: 'game-a', requestId: 'request-1',
  fromAccountId: 'alice', toAccountId: 'bob', amount: 80, memo: 'Essai, crédits fictifs', ...changes});
const account = (store, id) => store.data.get(`sessions/game-a/accounts/${id}`);
const error = code => ({code});

test('une pause fige les échéances de jeu mais pas les invitations réelles', () => {
  let clock = resumeClock(createClock(), 1000);
  clock = pauseClock(clock, 5000);
  assert.equal(gameTime(clock, 90000), 4000);
  assert.equal(invitationIsValid({status: 'ACTIVE', expiresAt: 10000}, 90000), false);
  clock = resumeClock(clock, 90000);
  assert.equal(gameTime(clock, 92000), 6000);
});
test('un second démarrage et un retour de l’horloge serveur sont refusés', () => {
  const clock = resumeClock(createClock(), 500);
  assert.throws(() => resumeClock(clock, 600), error('CLOCK_ALREADY_RUNNING'));
  assert.throws(() => gameTime(clock, 499), error('CLOCK_MOVED_BACKWARDS'));
});
test('une invitation consommée, révoquée ou arrivée à échéance ne fonctionne plus', () => {
  for (const status of ['CONSUMED', 'REVOKED'])
    assert.equal(invitationIsValid({status, expiresAt: 10000}, 0), false);
  assert.equal(invitationIsValid({status: 'ACTIVE', expiresAt: 10000}, 10000), false);
});

const character = {id: 'char-a', sessionId: 'game-a', publicCode: 'badge-1',
  public: {publicationState: 'PUBLISHED', displayName: 'Alias', profession: 'Mécanicien'},
  publicationState: 'PUBLISHED', biography: 'Histoire', playerSecrets: 'Mon secret',
  gmNotes: 'Infiltré', participantEmail: 'test@example.invalid', secretGroups: ['cellule'],
  objectives: [{id: 'm1', title: 'Rencontrer un contact', published: true, gmNotes: 'Piège',
    steps: [{id: 's1', title: 'Au comptoir', published: true, gmTruth: 'Faux'},
      {id: 's2', title: 'Secret à révéler plus tard', published: false}]},
    {id: 'm2', title: 'Mission non publiée', published: false}]};
const assignment = {active: true, uid, characterId: 'char-a', sessionId: 'game-a'};
test('le badge public ne contient ni secret, ni appartenance cachée, ni donnée du participant', () => {
  assert.deepEqual(publicCharacter(character), {id: 'char-a', displayName: 'Alias',
    profession: 'Mécanicien', description: '', publicCode: 'badge-1'});
});
test('les missions publiées ne transmettent ni notes MJ ni étapes futures', () => {
  const view = participantCharacter(character, assignment, uid);
  assert.equal(view.secrets, 'Mon secret');
  assert.deepEqual(view.objectives, [{id: 'm1', title: 'Rencontrer un contact', description: '',
    steps: [{id: 's1', title: 'Au comptoir', description: ''}]}]);
  assert.equal('gmNotes' in view, false);
});
test('réattribution, autre session et brouillon bloquent la fiche privée', () => {
  for (const override of [{uid: 'other'}, {sessionId: 'game-b'}, {active: false}])
    assert.throws(() => participantCharacter(character, {...assignment, ...override}, uid), error('FORBIDDEN'));
  assert.throws(() => participantCharacter({...character, publicationState: 'DRAFT'}, assignment, uid),
    error('CONTENT_UNPUBLISHED'));
});

test('deux paiements concurrents de 80 sur 100 : un seul est appliqué', async () => {
  const store = fixture();
  const results = await Promise.allSettled([
    transferCredits(store, uid, payment(), 1000),
    transferCredits(store, uid, payment({requestId: 'request-2'}), 1000),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(account(store, 'alice').balance, 20);
  assert.equal(account(store, 'bob').balance, 80);
});
test('réponse perdue : rejouer la même demande rend le même résultat sans redébiter', async () => {
  const store = fixture();
  const result = await transferCredits(store, uid, payment(), 1000);
  store.data.get('sessions/game-a').status = 'PAUSE';
  const replay = await transferCredits(store, uid, payment(), 2000);
  assert.deepEqual(replay, {...result, replayed: true});
  assert.equal(account(store, 'alice').balance, 20);
  assert.equal([...store.data.keys()].filter(x => x.includes('/ledger/')).length, 1);
});
test('la même référence ne peut pas porter un nouveau montant', async () => {
  const store = fixture();
  await transferCredits(store, uid, payment(), 1000);
  await assert.rejects(transferCredits(store, uid, payment({amount: 1}), 2000), error('REQUEST_ID_REUSED'));
  assert.equal(account(store, 'bob').balance, 80);
});
test('les réservations empêchent de dépenser une somme déjà engagée', async () => {
  const store = fixture();
  account(store, 'alice').reserved = 30;
  await assert.rejects(transferCredits(store, uid, payment(), 1000), error('INSUFFICIENT_FUNDS'));
  assert.equal(account(store, 'alice').balance, 100);
  assert.equal(account(store, 'bob').balance, 0);
});
test('les permissions de caisse et les destinataires sont vérifiés séparément', async () => {
  for (const denied of ['spendAccountIds', 'payeeAccountIds']) {
    const store = fixture(); store.data.get(accessDocument('game-a', uid))[denied] = [];
    await assert.rejects(transferCredits(store, uid, payment(), 1000), error('FORBIDDEN'));
    assert.equal(account(store, 'alice').balance, 100);
  }
});
test('une révocation interdit aussi la consultation du résultat par réessai', async () => {
  const store = fixture(); await transferCredits(store, uid, payment(), 1000);
  store.data.get(accessDocument('game-a', uid)).active = false;
  await assert.rejects(transferCredits(store, uid, payment(), 2000), error('FORBIDDEN'));
});
test('changer de session dans la requête ne transfère aucun bien', async () => {
  const store = fixture();
  await assert.rejects(transferCredits(store, uid, payment({sessionId: 'game-b'}), 1000), error('FORBIDDEN'));
  assert.equal(account(store, 'alice').balance, 100);
});
test('pauses et module désactivé refusent les nouvelles opérations', async () => {
  for (const state of [{status: 'PAUSE', modules: {economy: true}},
    {status: 'EN_JEU', modules: {economy: false}}]) {
    const store = fixture(); store.data.set('sessions/game-a', state);
    await assert.rejects(transferCredits(store, uid, payment(), 1000));
    assert.equal(account(store, 'alice').balance, 100);
  }
});
test('les montants invalides et le débordement du compte bénéficiaire n’écrivent rien', async () => {
  const store = fixture();
  for (const amount of [-1, 0, 0.5, NaN, Infinity, '10'])
    await assert.rejects(transferCredits(store, uid, payment({amount}), 1000));
  account(store, 'bob').balance = Number.MAX_SAFE_INTEGER;
  await assert.rejects(transferCredits(store, uid, payment(), 1000), error('BALANCE_OVERFLOW'));
  assert.equal(account(store, 'alice').balance, 100);
});
test('un transfert conserve la masse monétaire et produit une écriture équilibrée', async () => {
  const store = fixture(); const result = await transferCredits(store, uid, payment({amount: 60}), 1000);
  const entry = store.data.get(`sessions/game-a/ledger/${result.operationId}`);
  assert.equal(account(store, 'alice').balance + account(store, 'bob').balance, 100);
  assert.equal(entry.entries.reduce((sum, e) => sum + e.delta, 0), 0);
  assert.equal(entry.createdCurrency, 0);
  assert.equal('recipientBalance' in result, false);
});
