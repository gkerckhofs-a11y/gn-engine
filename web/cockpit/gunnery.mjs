// Local instruments only. A callback reports audiovisual cues, never a GN order.
export function targetPosition(time) {
  return {x:.5+Math.sin(time*.66)*.26,y:.48+Math.cos(time*.91)*.19};
}
export function lockPossible(aim,target) {
  return Math.hypot(aim.x-target.x,aim.y-target.y)<.085;
}
export function mountGunnery(host,canvas,notify) {
  let aim={x:.5,y:.5},target=targetPosition(0),time=0,beam=0,locked=false,active=false;
  host.innerHTML='<p><em>Visez à la souris ou avec les flèches dans la verrière. L verrouille le contact, Espace tire. Les salves sont visuelles.</em></p><button type="button" data-lock>Verrouiller (L)</button> <button type="button" data-fire>Salve (Espace)</button> <output aria-live="polite"></output>';
  const report=t=>{host.querySelector('output').textContent=t;};
  const lock=()=>{if(!active)return;locked=lockPossible(aim,target);report(locked?'Contact verrouillé':'Rapprochez le viseur du contact');};
  const fire=()=>{if(!active)return;beam=.24;report(locked?'Salve guidée émise':'Salve libre émise');notify?.();};
  host.querySelector('[data-lock]').onclick=lock;host.querySelector('[data-fire]').onclick=fire;
  function move(x,y){aim={x:Math.min(1,Math.max(0,x)),y:Math.min(1,Math.max(0,y))};locked=locked&&lockPossible(aim,target);}
  canvas.addEventListener('pointermove',e=>{if(active){const r=canvas.getBoundingClientRect();move((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);}});
  canvas.addEventListener('pointerdown',()=>{if(active){canvas.focus();fire();}});
  canvas.addEventListener('keydown',e=>{
    if(!active)return;
    const vectors={ArrowLeft:[-.025,0],ArrowRight:[.025,0],ArrowUp:[0,-.025],ArrowDown:[0,.025]};
    if(vectors[e.key]){e.preventDefault();const [x,y]=vectors[e.key];move(aim.x+x,aim.y+y);}
    else if(e.code==='Space'){e.preventDefault();fire();}else if(e.key.toLowerCase()==='l')lock();
  });
  return {
    enable(on){if(active===on)return;active=on;host.hidden=!on;locked=false;beam=0;report('');if(!on){time=0;aim={x:.5,y:.5};}},
    draw(ctx,w,h,dt,reduced){
      if(!active)return;
      if(!reduced)time+=dt;
      target=targetPosition(reduced?0:time);if(locked)aim={...target};
      const x=target.x*w,y=target.y*h;
      ctx.save();ctx.translate(x,y);ctx.fillStyle='#be7e58';ctx.strokeStyle='#ffcb85';
      ctx.beginPath();for(const [a,b] of [[0,-14],[26,12],[8,8],[0,16],[-8,8],[-26,12]])ctx.lineTo(a,b);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
      ctx.strokeStyle=locked?'#ffcd79':'#9ef2e1';ctx.lineWidth=2;ctx.beginPath();ctx.arc(aim.x*w,aim.y*h,18,0,Math.PI*2);ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.fillRect(aim.x*w-2,aim.y*h-2,4,4);
      if(beam>0){for(const side of [.13,.87]){ctx.beginPath();ctx.moveTo(w*side,h);ctx.lineTo(w*aim.x,h*aim.y);ctx.stroke();}beam-=dt;}
      ctx.strokeRect(12,h-72,90,58);ctx.fillRect(12+90*target.x,h-72+58*target.y,4,4);
    }
  };
}
