// Injection d'une instance Firebase Admin Firestore authentifiée côté serveur.
// Aucun SDK client et aucune clé de compte de service dans le dépôt.
export function firestoreStore(firestore) {
  const read = snapshot => snapshot.exists ? snapshot.data() : null;
  const query = (path, filter, options={}) => {
    let q=filter ? firestore.collection(path).where(filter[0], '==', filter[1]) : firestore.collection(path);
    if(options.orderBy)q=q.orderBy(options.orderBy,options.direction??'asc');
    if(options.limit)q=q.limit(options.limit);
    return q;
  };
  return {
    async get(path) { return read(await firestore.doc(path).get()); },
    async list(path, filter, options) { return (await query(path, filter, options).get()).docs.map(x => x.data()); },
    runTransaction(callback) {
      return firestore.runTransaction(transaction => callback({
        async get(path) {
          const snapshot = await transaction.get(firestore.doc(path));
          return snapshot.exists ? snapshot.data() : null;
        },
        async list(path, filter, options) { return (await transaction.get(query(path, filter, options))).docs.map(x => x.data()); },
        set(path, data) { transaction.set(firestore.doc(path), data); },
      }));
    },
  };
}
