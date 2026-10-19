// Injection d'une instance Firebase Admin Firestore authentifiée côté serveur.
// Aucun SDK client et aucune clé de compte de service dans le dépôt.
export function firestoreStore(firestore) {
  const read = snapshot => snapshot.exists ? snapshot.data() : null;
  const query = (path, filter) => filter
    ? firestore.collection(path).where(filter[0], '==', filter[1]) : firestore.collection(path);
  return {
    async get(path) { return read(await firestore.doc(path).get()); },
    async list(path, filter) { return (await query(path, filter).get()).docs.map(x => x.data()); },
    runTransaction(callback) {
      return firestore.runTransaction(transaction => callback({
        async get(path) {
          const snapshot = await transaction.get(firestore.doc(path));
          return snapshot.exists ? snapshot.data() : null;
        },
        async list(path, filter) { return (await transaction.get(query(path, filter))).docs.map(x => x.data()); },
        set(path, data) { transaction.set(firestore.doc(path), data); },
      }));
    },
  };
}
