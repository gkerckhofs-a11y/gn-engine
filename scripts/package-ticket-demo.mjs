import {build} from 'esbuild';
import {writeFile} from 'node:fs/promises';
import {zipSync,strToU8} from 'fflate';
import {demoAssets} from './ticket-demo.mjs';
const output=process.argv[2];if(!output)throw Error('Indiquez le fichier ZIP de destination.');
const assets=await demoAssets();
const compiled=await build({entryPoints:['scripts/ticket-demo.mjs'],bundle:true,format:'esm',platform:'node',target:'node22',external:['esbuild'],write:false});
const launcher='@echo off\r\ncd /d "%~dp0"\r\nwhere node >nul 2>nul || (echo Installez Node.js 22 ou plus recent puis relancez. & pause & exit /b 1)\r\nstart "" "http://127.0.0.1:4179/aventures/"\r\nnode demo.mjs --portable\r\npause\r\n';
const readme=`SPACE OUTLAWS — BILLETTERIE DE DÉMONSTRATION

Décompressez l’archive. Node.js 22 ou plus récent doit être installé.
Windows : lancez Demarrer-Windows.cmd. Si le navigateur s’ouvre avant la
console, rechargez la page. Mac ou Linux : depuis le dossier décompressé,
exécutez « node demo.mjs --portable », puis ouvrez
http://127.0.0.1:4179/aventures/ dans votre navigateur.

Commencez comme Visiteur. Cliquez sur « S’inscrire à une aventure », puis
« Voir la session » et « Réserver ma place ». La connexion est simulée.
Utilisez un nom de test. Acceptez les conditions fictives, simulez le paiement
et choisissez un personnage. Le menu Profil permet de passer à la régie
pour ouvrir le briefing, puis de reprendre le profil Nouvel inscrit.
Les six profils, le prix et toute la session sont fictifs.
Fermez la console pour terminer. Chaque démarrage recrée la démonstration.
Aucune clé, carte bancaire, installation npm ou connexion Firebase nécessaire.
`;
await writeFile(output,zipSync({'demo.mjs':compiled.outputFiles[0].contents,'assets.json':strToU8(JSON.stringify(Object.fromEntries([...assets].map(([k,v])=>[k,Buffer.from(v).toString('base64')])))),'Demarrer-Windows.cmd':strToU8(launcher),'Lisez-moi.txt':strToU8(readme)},{level:8}));
