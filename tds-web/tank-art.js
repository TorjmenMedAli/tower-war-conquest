/* ===== Cartoon Battle Tank — procedural SVG, 7 upgrade levels (faces right) =====
   Ported from the Claude Design component "Cartoon Tank.dc.html"
   (project 40a83e7f-4d72-4985-9974-442ada797b2a).
   TankArt.svg(level, prefix, withFire, px) -> SVG string.
     level   1..7  (Scout, Ranger, Guardian, Vanguard, Crusher, Warlord, Titan)
     prefix  unique id seed so multiple tanks on one page don't share element ids
     withFire  include the muzzle-flash / shell elements (for a fire animation)
     px        emit pixel width/height (640x400) instead of 100% — needed to rasterize to <canvas>
   The SVG carries its own SMIL animations (tracks, wheels, bob, antenna, exhaust). */
window.TankArt = (() => {
  const P = {
    outline:'#241f1a',
    grLi:'#aebb4f', gr:'#8c9b33', grDk:'#6a7820', grSh:'#55631a',
    mLi:'#d2d7dd', m:'#a7adb5', mDk:'#767c85', mSh:'#565b63',
    track:'#3a3d42', trackLi:'#50545b', lug:'#26282c',
    tire:'#33363b', rim:'#565a61',
    hub:'#e8b73c', hubDk:'#b88a22',
    seat:'#b06a32', seatLi:'#d2884a', seatDk:'#7c4a20',
    red:'#e23b2e', redLi:'#ff6a4d',
    bolt:'#c9d16c', boltHi:'#eef0bc',
    flY:'#ffe24d', flO:'#ff8a1e',
    white:'#f4f3ed', smoke:'#c9ced4'
  };

  const CFG = {
    1:{wheels:4,trackH:54,barrelLen:118,bw:13,muzzle:'none',turret:'low',skirts:false,reactive:0,rockets:false,secGuns:0,exhaust:0,antenna:false,name:'Scout',armor:1,fire:1,speed:7},
    2:{wheels:4,trackH:56,barrelLen:138,bw:15,muzzle:'small',turret:'low',skirts:false,reactive:0,rockets:false,secGuns:0,exhaust:1,antenna:true,name:'Ranger',armor:2,fire:2,speed:6},
    3:{wheels:5,trackH:60,barrelLen:158,bw:17,muzzle:'brake',turret:'mid',skirts:true,reactive:0,rockets:false,secGuns:1,exhaust:1,antenna:true,name:'Guardian',armor:3,fire:3,speed:5},
    4:{wheels:5,trackH:64,barrelLen:176,bw:19,muzzle:'brake',turret:'mid',skirts:true,reactive:1,rockets:false,secGuns:1,exhaust:2,antenna:true,name:'Vanguard',armor:4,fire:4,speed:5},
    5:{wheels:6,trackH:68,barrelLen:194,bw:21,muzzle:'brake2',turret:'heavy',skirts:true,reactive:1,rockets:true,secGuns:2,exhaust:2,antenna:true,name:'Crusher',armor:5,fire:5,speed:4},
    6:{wheels:6,trackH:72,barrelLen:206,bw:23,muzzle:'brake2',turret:'heavy',skirts:true,reactive:2,rockets:true,secGuns:2,exhaust:2,antenna:true,name:'Warlord',armor:6,fire:6,speed:3},
    7:{wheels:7,trackH:78,barrelLen:220,bw:27,muzzle:'mega',turret:'mega',skirts:true,reactive:2,rockets:true,secGuns:2,exhaust:2,antenna:true,name:'Titan',armor:7,fire:7,speed:2}
  };

  const f = n => Math.round(n * 10) / 10;

  // fr (frame) = optional { wheelDeg, trackShift, recoil, flash } -> render a STATIC frame (no SMIL),
  // used to bake movement/fire frames for the gameplay <canvas>. No fr => animated SMIL (for the DOM menu).
  function build(level, prefix, withFire, fr){
    const c = CFG[level], SMIL = !fr;
    const rr=(x,y,w,h,r,fill,st,sw)=>`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${fill}"${st?` stroke="${st}" stroke-width="${sw||6}"`:''} stroke-linejoin="round"/>`;
    const ci=(cx,cy,r,fill,st,sw)=>`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${st?` stroke="${st}" stroke-width="${sw||5}"`:''}/>`;
    const pth=(d,fill,st,sw)=>`<path d="${d}" fill="${fill}"${st?` stroke="${st}" stroke-width="${sw||6}"`:''} stroke-linejoin="round" stroke-linecap="round"/>`;
    const pl=(pts,fill,st,sw)=>`<polygon points="${pts}" fill="${fill}"${st?` stroke="${st}" stroke-width="${sw||6}"`:''} stroke-linejoin="round"/>`;
    const bolt=(cx,cy,r)=>ci(cx,cy,r,P.bolt,P.outline,2.5)+ci(cx-r*.3,cy-r*.3,r*.34,P.boltHi);

    // ---- geometry ----
    const trackBottom=340, trackLeft=54, trackH=c.trackH;
    const trackTop=trackBottom-trackH, wheelR=trackH/2-9, wheelCy=trackBottom-trackH/2;
    const gap=16, spacing=wheelR*2+gap, firstCx=trackLeft+wheelR+12;
    const cxs=[]; for(let i=0;i<c.wheels;i++) cxs.push(firstCx+i*spacing);
    const trackRight=cxs[cxs.length-1]+wheelR+12, trackW=trackRight-trackLeft;
    const hullLeft=trackLeft+4, hullRight=trackRight-4, hullH=58, hullBottom=trackTop+10, hullTop=hullBottom-hullH;
    const deckLeft=hullLeft+14, deckRight=hullRight-46, deckW=deckRight-deckLeft;
    const TUR={low:{w:66,h:30},mid:{w:84,h:42},heavy:{w:102,h:52},mega:{w:120,h:62}}[c.turret];
    const tw=TUR.w, th=TUR.h, turretCX=deckRight-tw/2-4, turretTopY=hullTop-th;
    const seatCX=Math.min(deckLeft+Math.max(60,deckW*0.32), turretCX-tw/2-44);
    const barrelCY=turretTopY+th*0.55, barrelBaseX=turretCX+tw/2-8;
    const muzExtra={none:8,small:14,brake:28,brake2:42,mega:52}[c.muzzle];
    let barrelLen=Math.min(c.barrelLen, 624-barrelBaseX-muzExtra); if(barrelLen<70) barrelLen=70;
    const tip=barrelBaseX+barrelLen;
    let G='';

    // ---- exhaust (rear-left) ----
    if(c.exhaust>0){
      const ex=(ey)=>{ let s=rr(hullLeft-18,ey-5,22,12,5,P.mDk,P.outline,4)+rr(hullLeft-21,ey-7,7,16,3,P.m,P.outline,3.5);
        if(SMIL){
        s+=`<g opacity="0">${ci(hullLeft-24,ey-2,5,P.smoke)}<animateTransform attributeName="transform" type="translate" values="0 0;-14 -22" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.7;0" dur="2.4s" repeatCount="indefinite"/></g>`;
        s+=`<g opacity="0">${ci(hullLeft-22,ey-2,4,P.smoke)}<animateTransform attributeName="transform" type="translate" values="0 0;-10 -18" dur="2.4s" begin="1.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.6;0" dur="2.4s" begin="1.2s" repeatCount="indefinite"/></g>`;
        }
        return s; };
      G+=ex(hullTop+22);
      if(c.exhaust>1) G+=ex(hullTop+40);
    }

    // ---- track belt ----
    G+=rr(trackLeft,trackTop,trackW,trackH,trackH/2,P.track,P.outline,7);
    G+=rr(trackLeft+9,trackTop+9,trackW-18,trackH-18,(trackH-18)/2,P.trackLi,'',0);
    const clipId='clip-'+prefix;
    let lugs='';
    for(let x=trackLeft-20;x<trackRight+20;x+=17){
      lugs+=rr(x,trackTop+1,7,7,2,P.lug,'',0);
      lugs+=rr(x,trackBottom-8,7,7,2,P.lug,'',0);
    }
    G+=`<clipPath id="${clipId}"><rect x="${f(trackLeft)}" y="${f(trackTop)}" width="${f(trackW)}" height="${f(trackH)}" rx="${f(trackH/2)}"/></clipPath>`;
    G+=`<g clip-path="url(#${clipId})"><g${SMIL?'':` transform="translate(${f(-((fr.trackShift||0)%17))} 0)"`}>${lugs}${SMIL?'<animateTransform attributeName="transform" type="translate" from="0 0" to="-17 0" dur="0.5s" repeatCount="indefinite"/>':''}</g></g>`;
    cxs.forEach((cx,i)=>{
      const sprk=(i===cxs.length-1);
      G+=ci(cx,wheelCy,wheelR,P.tire,P.outline,5);
      G+=ci(cx,wheelCy,wheelR*0.7,P.rim,P.outline,4);
      let spin=SMIL?`<g><animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 ${f(cx)} ${f(wheelCy)}" to="360 ${f(cx)} ${f(wheelCy)}" dur="1.1s" repeatCount="indefinite"/>`:`<g transform="rotate(${f(fr.wheelDeg||0)} ${f(cx)} ${f(wheelCy)})">`;
      spin+=ci(cx,wheelCy,wheelR*0.42,P.hub,P.outline,3.5)+ci(cx,wheelCy,wheelR*0.15,P.hubDk);
      for(let k=0;k<5;k++){const a=k/5*Math.PI*2;spin+=ci(cx+Math.cos(a)*wheelR*0.5,wheelCy+Math.sin(a)*wheelR*0.5,wheelR*0.09,P.hubDk);}
      if(sprk) spin+=`<circle cx="${f(cx)}" cy="${f(wheelCy)}" r="${f(wheelR*0.9)}" fill="none" stroke="${P.outline}" stroke-width="8" stroke-dasharray="5 9"/>`;
      spin+='</g>';
      G+=spin;
    });

    // ---- side skirts ----
    if(c.skirts){
      G+=rr(trackLeft+6,trackTop-7,trackW-12,22,8,P.gr,P.outline,5);
      G+=rr(trackLeft+12,trackTop-4,trackW-24,5,2,P.grLi,'',0);
      for(let x=trackLeft+24;x<trackRight-14;x+=34) G+=bolt(x,trackTop+5,3.2);
    }

    // ---- hull body ----
    const glX=deckRight;
    const hullD=`M ${f(hullLeft)} ${f(hullBottom)} L ${f(hullLeft)} ${f(hullTop+16)} L ${f(hullLeft+14)} ${f(hullTop)} L ${f(glX)} ${f(hullTop)} L ${f(hullRight)} ${f(hullTop+30)} L ${f(hullRight)} ${f(hullBottom)} Z`;
    G+=pth(hullD,P.gr,P.outline,7);
    G+=pth(`M ${f(hullLeft+16)} ${f(hullTop+4)} L ${f(glX-4)} ${f(hullTop+4)} L ${f(glX-4)} ${f(hullTop+11)} L ${f(hullLeft+16)} ${f(hullTop+11)} Z`,P.grLi,'',0);
    G+=rr(hullLeft+4,hullBottom-14,hullRight-hullLeft-8,12,4,P.grSh,'',0);
    G+=`<line x1="${f(hullLeft+8)}" y1="${f(hullBottom-20)}" x2="${f(hullRight-8)}" y2="${f(hullBottom-20)}" stroke="${P.grDk}" stroke-width="3"/>`;
    G+=bolt(hullLeft+18,hullTop+13,3.4)+bolt(glX-16,hullTop+13,3.4);

    // glacis reactive armor
    if(c.reactive>0){
      const A={x:glX,y:hullTop},B={x:hullRight,y:hullTop+30};
      [0.32,0.66].forEach(t=>{const cx=A.x+(B.x-A.x)*t,cy=A.y+(B.y-A.y)*t;
        G+=`<g transform="rotate(33 ${f(cx)} ${f(cy)})">`+rr(cx-10,cy-7,20,14,3,P.grDk,P.outline,3.5)+rr(cx-7,cy-5,14,4,2,P.gr)+`</g>`;});
      if(c.reactive>1){ for(let x=hullRight-58;x<hullRight-12;x+=22) G+=rr(x,hullBottom-19,18,12,3,P.grDk,P.outline,3); }
    }

    // ---- decal star ----
    const sx=hullLeft+(c.skirts?40:34), sy=hullBottom-7, sr=10;
    let starPts=''; for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,rad=(k%2?sr*0.42:sr);starPts+=`${f(sx+Math.cos(a)*rad)},${f(sy+Math.sin(a)*rad)} `;}
    G+=ci(sx,sy,sr+4,P.white,P.outline,3)+pl(starPts,P.red,'',0);

    // ---- antenna (behind turret) ----
    if(c.antenna){
      const ax=deckRight-8, ay=hullTop+2;
      const antBody=`${pth(`M ${f(ax)} ${f(ay)} Q ${f(ax+10)} ${f(ay-40)} ${f(ax-4)} ${f(ay-72)}`,'none',P.outline,3.5)}${ci(ax-4,ay-72,4.5,P.red,P.outline,2.5)}`;
      G+=SMIL?`<g><animateTransform attributeName="transform" type="rotate" values="-2.5 ${f(ax)} ${f(ay)};2.5 ${f(ax)} ${f(ay)};-2.5 ${f(ax)} ${f(ay)}" dur="2.8s" repeatCount="indefinite"/>${antBody}</g>`:antBody;
    }

    // ---- seat (driver cockpit) ----
    G+=rr(seatCX-32,hullTop-8,64,20,9,P.grDk,P.outline,5);
    G+=rr(seatCX-26,hullTop-4,52,15,7,'#2c2824','',0);
    G+=pl(`${f(seatCX-13)},${f(hullTop-16)} ${f(seatCX-25)},${f(hullTop-44)} ${f(seatCX-13)},${f(hullTop-47)} ${f(seatCX-1)},${f(hullTop-18)}`,P.seat,P.outline,4);
    G+=pl(`${f(seatCX-15)},${f(hullTop-18)} ${f(seatCX-23)},${f(hullTop-42)} ${f(seatCX-19)},${f(hullTop-42)} ${f(seatCX-12)},${f(hullTop-19)}`,P.seatDk,'',0);
    G+=rr(seatCX-16,hullTop-18,36,15,5,P.seat,P.outline,4);
    G+=rr(seatCX-11,hullTop-16,20,4,2,P.seatLi,'',0);
    G+=`<line x1="${f(seatCX+22)}" y1="${f(hullTop-4)}" x2="${f(seatCX+26)}" y2="${f(hullTop-20)}" stroke="${P.outline}" stroke-width="4" stroke-linecap="round"/>`+ci(seatCX+26,hullTop-21,4,P.red,P.outline,2.5);

    // ---- rocket pod (rear deck) ----
    if(c.rockets){
      const rx=seatCX-58, ry=hullTop-6;
      G+=`<g transform="rotate(-12 ${f(rx)} ${f(ry)})">`;
      G+=rr(rx-14,ry-30,28,34,5,P.mDk,P.outline,5)+rr(rx-10,ry-28,7,30,3,P.mSh,'',0);
      for(let t=0;t<3;t++){const ty=ry-26+t*11;G+=ci(rx+4,ty,4,'#1c1916','',0);G+=ci(rx+4,ty,2.4,P.red);}
      G+='</g>';
    }

    // ---- turret ----
    const tL=turretCX-tw/2, tR=turretCX+tw/2;
    G+=pth(`M ${f(tL)} ${f(hullTop+2)} L ${f(tL+8)} ${f(turretTopY)} L ${f(tR-10)} ${f(turretTopY)} L ${f(tR)} ${f(hullTop+2)} Z`,P.gr,P.outline,6);
    G+=rr(tL+10,turretTopY+4,tw-26,6,3,P.grLi,'',0);
    G+=bolt(tL+12,hullTop-6,3.2)+bolt(tR-12,hullTop-6,3.2);
    if(c.turret==='heavy'||c.turret==='mega'){ G+=ci(turretCX-tw*0.18,turretTopY+9,6,P.grDk,P.outline,3); }
    if(c.turret==='mega'){
      G+=pl(`${f(tL-12)},${f(hullTop-2)} ${f(tL+2)},${f(turretTopY+8)} ${f(tL+2)},${f(hullTop-2)}`,P.grDk,P.outline,4);
      G+=bolt(tL-4,hullTop-8,3);
    }
    if(c.turret!=='low'){ G+=rr(tR-14,barrelCY-th*0.34,20,th*0.68,6,P.grDk,P.outline,5); }

    // ---- barrel group (recoils) ----
    const recoil = fr ? (fr.recoil || 0) : 0;
    let B=`<g id="barrel-${prefix}"${recoil?` transform="translate(${f(-recoil)} 0)"`:''}>`;
    B+=rr(barrelBaseX,barrelCY-c.bw/2,barrelLen,c.bw,c.bw/2,P.m,P.outline,5);
    B+=rr(barrelBaseX+4,barrelCY-c.bw/2+3,barrelLen-12,c.bw*0.28,c.bw*0.14,P.mLi,'',0);
    B+=rr(barrelBaseX,barrelCY+c.bw*0.18,barrelLen-6,c.bw*0.22,2,P.mSh,'',0);
    B+=rr(barrelBaseX+8,barrelCY-c.bw/2-2,9,c.bw+4,3,P.mDk,P.outline,3.5);
    if(c.muzzle==='none'){ B+=rr(tip-12,barrelCY-c.bw/2-2,8,c.bw+4,3,P.mDk,P.outline,3.5); }
    else if(c.muzzle==='small'){ B+=rr(tip-14,barrelCY-(c.bw+8)/2,13,c.bw+8,4,P.mDk,P.outline,4); }
    else if(c.muzzle==='brake'){ B+=rr(tip-4,barrelCY-(c.bw+10)/2,26,c.bw+10,5,P.mDk,P.outline,5)+rr(tip+5,barrelCY-(c.bw+10)/2+3,4,c.bw+4,2,P.outline)+ci(tip+22,barrelCY,c.bw*0.42,'#1c1916'); }
    else if(c.muzzle==='brake2'){ B+=rr(tip-4,barrelCY-(c.bw+12)/2,40,c.bw+12,6,P.mDk,P.outline,5)+rr(tip+6,barrelCY-(c.bw+12)/2+3,4,c.bw+6,2,P.outline)+rr(tip+18,barrelCY-(c.bw+12)/2+3,4,c.bw+6,2,P.outline)+ci(tip+36,barrelCY,c.bw*0.42,'#1c1916'); }
    else if(c.muzzle==='mega'){ B+=rr(tip-6,barrelCY-(c.bw+20)/2,50,c.bw+20,8,P.mDk,P.outline,6)+rr(tip+2,barrelCY-(c.bw+20)/2,6,c.bw+20,2,P.red)+rr(tip+12,barrelCY-(c.bw+20)/2+4,5,c.bw+12,2,P.outline)+rr(tip+26,barrelCY-(c.bw+20)/2+4,5,c.bw+12,2,P.outline)+ci(tip+46,barrelCY,c.bw*0.5,'#1c1916'); }
    B+='</g>';
    G+=B;

    // ---- secondary guns ----
    if(c.secGuns>0){ const gx=turretCX-tw*0.1,gy=turretTopY-1; G+=rr(gx,gy-3,4,6,1,P.mDk,P.outline,2.5)+rr(gx+3,gy-1.5,26,4,2,P.m,P.outline,3); }
    if(c.secGuns>1){ const gx=hullRight-30,gy=hullTop+18; G+=rr(gx,gy-3,4,6,1,P.mDk,P.outline,2.5)+rr(gx+3,gy-1.5,24,4,2,P.m,P.outline,3); }

    // ---- shell + muzzle flash (when withFire) ----
    const muzEnd={none:tip+4,small:tip+2,brake:tip+24,brake2:tip+38,mega:tip+48}[c.muzzle];
    if(withFire){
      G+=`<g id="shell-${prefix}" opacity="0" style="transform-box:fill-box;transform-origin:center;">${rr(muzEnd+10,barrelCY-5,22,10,5,P.m,P.outline,3)}${ci(muzEnd+32,barrelCY,5,P.red,P.outline,2.5)}${rr(muzEnd+12,barrelCY-3,8,3,1.5,P.mLi)}</g>`;
      let fl=`<g id="flash-${prefix}" opacity="0" style="transform-box:fill-box;transform-origin:center;">`;
      let p1='',p2=''; const fcx=muzEnd+4,fcy=barrelCY,R1=26,R2=15;
      for(let k=0;k<12;k++){const a=k/12*Math.PI*2,rad=(k%2?R1:R1*0.5);p1+=`${f(fcx+Math.cos(a)*rad)},${f(fcy+Math.sin(a)*rad)} `;}
      for(let k=0;k<12;k++){const a=k/12*Math.PI*2+0.26,rad=(k%2?R2:R2*0.5);p2+=`${f(fcx+Math.cos(a)*rad)},${f(fcy+Math.sin(a)*rad)} `;}
      fl+=pl(p1,P.flO,'',0)+pl(p2,P.flY,'',0)+ci(fcx,fcy,7,P.white);
      fl+='</g>';
      G+=fl;
    }
    // static muzzle flash (baked into a fire frame, shifts with recoil)
    if(fr && fr.flash){
      const fEnd=muzEnd-recoil; let p1='',p2=''; const fcx=fEnd+4,fcy=barrelCY,R1=26,R2=15;
      for(let k=0;k<12;k++){const a=k/12*Math.PI*2,rad=(k%2?R1:R1*0.5);p1+=`${f(fcx+Math.cos(a)*rad)},${f(fcy+Math.sin(a)*rad)} `;}
      for(let k=0;k<12;k++){const a=k/12*Math.PI*2+0.26,rad=(k%2?R2:R2*0.5);p2+=`${f(fcx+Math.cos(a)*rad)},${f(fcy+Math.sin(a)*rad)} `;}
      G+=pl(p1,P.flO,'',0)+pl(p2,P.flY,'',0)+ci(fcx,fcy,7,P.white);
    }

    const inner = SMIL
      ? `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 0" dur="2.7s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>${G}</g>`
      : `<g>${G}</g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" style="display:block;overflow:visible;">${inner}</svg>`;
  }

  function svg(level, prefix, withFire, px, fr){
    let s = build(level, prefix || ('t' + level), !!withFire, fr || null);
    if (px) s = s.replace('width="100%" height="100%"', 'width="640" height="400"');
    return s;
  }
  return { P, CFG, svg, LEVELS: 7, name: lv => (CFG[lv] || CFG[1]).name };
})();
