import express from 'express';
import {origin} from './config.mjs';
import {guideHtml} from './guide.mjs';

export function recetteApp({api,directory,metadata,scenario,port=4173}){
  const app=express(),hosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
  app.use((req,res,next)=>{
    let sameOrigin=!req.headers.origin;
    try{if(req.headers.origin){const u=new URL(req.headers.origin);sameOrigin=u.protocol==='http:'&&hosts.has(u.host);}}catch{}
    if(!hosts.has(req.headers.host)||!sameOrigin||req.headers['sec-fetch-site']==='cross-site')return res.status(403).end();
    res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob: http://127.0.0.1:9199; connect-src 'self' http://127.0.0.1:9099 http://127.0.0.1:9199; frame-src http://127.0.0.1:9099; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});next();
  });
  app.use(express.json({limit:'24mb'}));app.post(['/api','/api/command'],api);
  app.all(['/api','/api/command'],(_req,res)=>res.status(405).json({error:'METHOD_NOT_ALLOWED'}));
  app.get('/recette.json',(_req,res)=>scenario.sessionId?res.json({origin,...metadata,...scenario}):res.status(503).json({error:'RECETTE_STARTING'}));
  app.get('/recette.html',(_req,res)=>res.type('html').send(guideHtml(metadata,scenario)));
  app.use(express.static(directory,{dotfiles:'deny',index:'index.html',fallthrough:false}));
  app.use((error,_req,res,_next)=>res.status(error.status===404?404:400).json({error:'LOCAL_REQUEST_REJECTED'}));
  return app;
}
