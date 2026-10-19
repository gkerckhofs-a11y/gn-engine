// Injection d'une instance Firebase Admin Firestore authentifiée côté serveur.
// Aucun SDK client et aucune clé de compte de service dans le dépôt.
// L'adaptateur doit encore être validé dans Firebase Emulator Suite.
export function firestoreStore(firestore) {
  return {
    runTransaction(callback) {
      return firestore.runTransaction(transaction => callback({
        async get(path) {
          const snapshot = await transaction.get(firestore.doc(path));
          return snapshot.exists ? snapshot.data() : null;
        },
        set(path, data) { transaction.set(firestore.doc(path), data); },
      }));
    },
  };
}
