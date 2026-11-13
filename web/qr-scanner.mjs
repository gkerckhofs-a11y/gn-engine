import jsQR from 'jsqr';
// Every field keeps its existing parser and confirmation. Scanning never submits an action.
const fields='input[name="badgeUrl"],input[name="badge"],input[name="code"],input[name="destinationQr"],input[name="navigationCode"],input[data-qr]';
export function installQrScanner(doc,{mediaDevices=globalThis.navigator?.mediaDevices,decode=jsQR}={}){
 let active=null,sequence=0;
 const stop=()=>{sequence++;if(!active)return;active.stream?.getTracks().forEach(t=>t.stop());clearTimeout(active.timer);active.panel.remove();active=null;};
 const enhance=()=>{
  for(const input of doc.querySelectorAll(fields)){
   if(['hidden','password'].includes(input.type)||input.dataset.scannerReady)continue;
   input.dataset.scannerReady='true';input.maxLength=2048;if(input.type==='url')input.type='text';
   input.placeholder='Scannez un QR ou saisissez son ID';
   const b=doc.createElement('button');b.type='button';b.className='quiet qr-scan-button';b.textContent='Scanner un QR';input.insertAdjacentElement('afterend',b);
   b.addEventListener('click',async()=>{
    stop();const generation=sequence;
    const panel=doc.createElement('section');panel.className='qr-scanner';
    panel.innerHTML='<video autoplay muted playsinline aria-label="Caméra QR"></video><p role="status">Autorisez la caméra puis cadrez le QR.</p><button type="button" class="quiet">Fermer la caméra</button>';
    b.insertAdjacentElement('afterend',panel);const video=panel.querySelector('video'),status=panel.querySelector('p');panel.querySelector('button').onclick=stop;
    const state={panel,stream:null,timer:null};active=state;
    try{
     if(!mediaDevices?.getUserMedia)throw new Error('CAMERA_UNAVAILABLE');
     const stream=await mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
     if(sequence!==generation||!input.isConnected){stream.getTracks().forEach(t=>t.stop());return;}
     state.stream=stream;video.srcObject=stream;await video.play();
     const canvas=doc.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
     const frame=()=>{
      if(active!==state||!input.isConnected){if(active===state)stop();return;}
      if(video.readyState>=2&&video.videoWidth){
       canvas.width=Math.min(720,video.videoWidth);canvas.height=Math.round(canvas.width*video.videoHeight/video.videoWidth);
       ctx.drawImage(video,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),found=decode(pixels.data,pixels.width,pixels.height,{inversionAttempts:'attemptBoth'});
       if(found?.data){input.value=found.data;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));stop();input.focus();return;}
      }
      state.timer=setTimeout(frame,160);
     };frame();
    }catch{if(active===state){state.stream?.getTracks().forEach(t=>t.stop());status.textContent='Caméra indisponible ou refusée. Saisissez l’ID ou collez le lien QR.';}}
   });
  }
  if(active&&!active.panel.isConnected)stop();
 };
 const observer=new MutationObserver(enhance);observer.observe(doc.body,{childList:true,subtree:true});enhance();
 doc.addEventListener('close',stop,true);globalThis.addEventListener('hashchange',stop);globalThis.addEventListener('pagehide',stop);
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)stop();});
 doc.addEventListener('input',e=>{if(e.target.matches('input[type="range"][name="remaining"]')){const output=e.target.closest('label').querySelector('output');if(output)output.textContent=e.target.value;const down=e.target.closest('form').querySelector('[data-down-time]');if(down)down.hidden=Number(e.target.value)!==0;}});
 return stop;
}
