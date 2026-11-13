const CACHE='sabacc-shell-v1',SHELL=['/sabacc/','/sabacc/app.js','/sabacc/sabacc.css'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sabacc-shell-')&&k!==CACHE).map(k=>caches.delete(k)))));});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;const key=u.pathname==='/sabacc/'?'/sabacc/':u.pathname;if(!SHELL.includes(key))return;e.respondWith(fetch(e.request).then(async r=>{if(r.ok){const c=await caches.open(CACHE);await c.put(key,r.clone());}return r;}).catch(()=>caches.match(key)));});
