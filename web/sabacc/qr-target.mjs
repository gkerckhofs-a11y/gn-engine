export function sabaccTarget(value,origin){
 const code=String(value??'').trim(),plain=/^([A-Za-z0-9_-]{1,128})\.([A-Za-z0-9_-]{1,128})$/.exec(code);
 if(plain)return {id:plain[1],qrToken:plain[2]};
 let u;try{u=new URL(code);}catch{throw new Error('Saisissez le code complet affiché sous le QR de la table.');}
 const id=u.searchParams.get('table'),qrToken=u.searchParams.get('key'),valid=x=>/^[A-Za-z0-9_-]{1,128}$/.test(x??'');
 if(u.origin!==origin||u.pathname!=='/sabacc/'||u.username||u.password||u.hash||!valid(id)||!valid(qrToken))throw new Error('Ce QR doit désigner une table de cette application.');
 return {id,qrToken};
}
