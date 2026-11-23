// The glass and radar use CSS-pixel coordinates, including on high-density monitors.
export function fitDisplay(ctx) {
  const c=ctx.canvas,w=c.clientWidth,h=c.clientHeight;
  const scale=Math.min(window.devicePixelRatio || 1,2);
  const width=Math.round(w*scale),height=Math.round(h*scale);
  if(c.width!==width||c.height!==height){c.width=width;c.height=height;}
  ctx.setTransform(scale,0,0,scale,0,0);
  return {w,h};
}

export function mountCanopy() {
  const surface=document.createElement('canvas'), metal=surface.getContext('2d');
  function paint(w,h) {
    surface.width=w;surface.height=h;
    // Cast edge light onto both bevels. The centre of each rib stays dark.
    for(const side of [0,1]){
      metal.save();
      if(side){metal.translate(w,0);metal.scale(-1,1);}
      const foot=w*.125;
      function rib(points,fill){
        metal.fillStyle=fill;metal.beginPath();
        for(const [x,y] of points) metal.lineTo(x,y);
        metal.closePath();metal.fill();
      }
      rib([[0,-8],[13,0],[foot+20,h-4],[foot+12,h],[0,20]],'#03080bd9');
      const edge=metal.createLinearGradient(0,0,foot,h);
      edge.addColorStop(0,'#506067');edge.addColorStop(.28,'#242f35');edge.addColorStop(.75,'#34414a');edge.addColorStop(1,'#697078');
      rib([[0,0],[10,0],[foot+13,h],[foot-5,h]],edge);
      rib([[0,7],[4,0],[foot+6,h],[foot-4,h]],'#1a2229');
      rib([[9,0],[11,0],[foot+14,h],[foot+12,h]],'#849397');
      for(const t of [.18,.52,.86]){
        const x=4+t*foot,y=h*t;
        metal.beginPath();metal.arc(x,y,2,0,Math.PI*2);metal.fillStyle='#11191e';metal.fill();
        metal.fillStyle='#7d8584';metal.fillRect(x-1,y-.6,1.8,.7);
      }
      const rim=metal.createLinearGradient(0,h-29,0,h);
      rim.addColorStop(0,'#838982');rim.addColorStop(.12,'#293133');rim.addColorStop(.26,'#546066');rim.addColorStop(.35,'#171e20');rim.addColorStop(1,'#101518');
      rib([[0,h*.91],[foot+16,h-13],[w*.32,h-5],[w*.5,h-3],[w*.5,h],[0,h]],rim);
      metal.restore();
    }
  }
  return (ctx,w,h)=>{
    if(surface.width!==w||surface.height!==h)paint(w,h);
    ctx.drawImage(surface,0,0,w,h);
  };
}

export function drawRadar(ctx,contact,distance) {
  const {w,h}=fitDisplay(ctx),x=w/2,y=h/2,rad=Math.min(w,h)*.45;
  ctx.clearRect(0,0,w,h);
  const fill=ctx.createRadialGradient(x,y,0,x,y,rad);
  fill.addColorStop(0,'#152e28');fill.addColorStop(1,'#0a1a1b');
  ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
  for(const r of [.33,.67,1]){
    ctx.strokeStyle=r===1?'#658977':'#304c42';
    ctx.lineWidth=r===1?1.5:1;ctx.beginPath();ctx.arc(x,y,rad*r,0,2*Math.PI);ctx.stroke();
  }
  ctx.strokeStyle='#3d5d50';ctx.beginPath();
  ctx.moveTo(x-rad,y);ctx.lineTo(x+rad,y);ctx.moveTo(x,y-rad);ctx.lineTo(x,y+rad);ctx.stroke();
  ctx.fillStyle='#91dcb3';ctx.beginPath();ctx.moveTo(x,y-4);ctx.lineTo(x+3,y+3);ctx.lineTo(x-3,y+3);ctx.closePath();ctx.fill();
  const bearing=Math.atan2(contact.x,contact.z),range=rad*Math.min(.92,distance/550);
  const bx=x+Math.sin(bearing)*range,by=y-Math.cos(bearing)*range;
  ctx.shadowColor='#ffad64';ctx.shadowBlur=6;ctx.fillStyle='#ffc38c';
  ctx.beginPath();ctx.arc(bx,by,3.2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
}
