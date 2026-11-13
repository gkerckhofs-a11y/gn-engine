import {installQrScanner} from '../../web/qr-scanner.mjs';
import {playerShell,playerRoute,actionIntroHtml} from '../../web/player-spaces.mjs';
import QRCode from 'qrcode';
const d={session:{id:'session',stage:'EN_JEU',spaceOutlaws:{healthVersion:1,actionsVersion:1}},character:{id:'hero-123',displayName:'Bela',profession:'Pilote'},economyEnabled:true,wallet:{account:{available:250}},health:{hp:3,maxHp:3,protection:1,stage:'EN_JEU',spaceOutlaws:true,convalescenceMs:0},actionPoints:{available:5,maximum:5}};
document.body.innerHTML='<main id="app">'+playerShell(d,playerRoute('action','session'),actionIntroHtml('session','hero-123',true,true,true,true))+'</main>';
window.cameraStreams=[];window.cameraMode='ok';
installQrScanner(document,{mediaDevices:{async getUserMedia(){
 if(window.cameraMode==='denied')throw new Error('NotAllowedError');
 const canvas=document.createElement('canvas');await QRCode.toCanvas(canvas,location.origin+'/#/badge/session/other',{width:420,margin:4});
 const stream=canvas.captureStream(10);window.cameraStreams.push(stream);window.qrCanvas=canvas;return stream;
}}});
