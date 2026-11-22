// Balance bot used to tune the prototype (runs inside reference/prototype-v1.html via window.__ql).
// Simulates N days: 5 tasks/day (3 medium, 1 easy, 1 hard), greedy shopping, plays all torches.
// Port this to a headless TS simulation (vitest) against the real game modules.
const simulate = async (days)=>{
 const Q=__ql, MW=32, MH=24; const out=[];
 const D=[[1,0],[-1,0],[0,1],[0,-1]];
 function step(){
   const r=Q.S.run; const S=Q.S;
   if(r.hp<Q.maxHp()*.35 && S.potions>0){Q.usePotion();return}
   const vis=(x,y)=>r.seen[y*MW+x];
   const goal=(x,y)=>{
     if(r.mons.some(m=>m.x===x&&m.y===y&&vis(x,y)&&(!m.boss||true)))return 3;
     if(r.items.some(i=>i.x===x&&i.y===y&&vis(x,y)&&i.k!=='altar'))return 2;
     return 0;};
   // BFS
   const prev=new Map(); const q=[[r.px,r.py]]; prev.set(r.px+','+r.py,null); let best=null, stairs=null, frontier=null;
   while(q.length){const [x,y]=q.shift();
     const g=(x===r.px&&y===r.py)?0:goal(x,y); if(g&&!best){best=[x,y];break}
     if(!stairs&&x===r.stairs[0]&&y===r.stairs[1]&&!(x===r.px&&y===r.py))stairs=[x,y];
     if(!frontier&&D.some(([dx,dy])=>!r.seen[(y+dy)*MW+x+dx]&&r.map[y+dy][x+dx]!=='#'))frontier=[x,y];
     if(r.mons.some(m=>m.x===x&&m.y===y)&&!(x===r.px&&y===r.py))continue;
     for(const [dx,dy] of D){const nx=x+dx,ny=y+dy,k=nx+','+ny; if(prev.has(k)||r.map[ny][nx]==='#'||!r.seen[ny*MW+nx])continue; prev.set(k,[x,y]); q.push([nx,ny]);}
   }
   let tgt=best||(r.bossDead&&stairs)||frontier||stairs;
   if(!tgt){Q.act(0,0,true);return}
   let c=tgt; while(true){const p=prev.get(c[0]+','+c[1]); if(!p||(p[0]===r.px&&p[1]===r.py))break; c=p;}
   Q.act(c[0]-r.px,c[1]-r.py,true);
 }
 for(let d=1;d<=days;d++){
   const S=Q.S;
   // daily tasks: 3 medium, 1 easy, 1 hard
   S.gold+=Math.round(145*(1+Math.min(.5,.05*d))); S.torches+=6; S.totalDone+=5;
   // shopping
   const W=[0,60,200,500,1100,2400],A=[0,80,250,600,1400];
   let bought=true; while(bought){bought=false;
     const wn=S.weapon+1<W.length?W[S.weapon+1]:1e9, an=S.armor+1<A.length?A[S.armor+1]:1e9;
     if(Math.min(wn,an)<=S.gold){ if(wn<=an){S.gold-=wn;S.weapon++}else{S.gold-=an;S.armor++}; bought=true}
     const we=[15*(S.wEnh+1),8*(S.wEnh+1)]; if(S.wEnh<10&&S.gold>=we[0]+30&&S.shards>=we[1]){S.gold-=we[0];S.shards-=we[1];S.wEnh++;bought=true}
     const ae=[20*(S.aEnh+1),10*(S.aEnh+1)]; if(S.aEnh<10&&S.gold>=ae[0]+30&&S.shards>=ae[1]){S.gold-=ae[0];S.shards-=ae[1];S.aEnh++;bought=true}
   }
   while(S.potions<3&&S.shards>=12){S.shards-=12;S.potions++}
   let deaths=0, maxf=0;
   while(Q.S.torches>0){
     const fo=Q.floorsOpen(); Q.setStart(fo[fo.length-1]); Q.startRun();
     let n=0;
     while(Q.S.run&&n<4000){n++;
       const r=Q.S.run;
       if(r.over==='dead'){deaths++;maxf=Math.max(maxf,r.f);Q.endDead();break}
       if(document.querySelector('#modal').classList.contains('on')){const kind=document.querySelector('#modal').dataset.kind;
          if(kind==='altar'){const y=document.querySelector('#aYes');if(r.hp>Q.maxHp()*.6&&y&&!y.disabled)y.click();else Q.closeModal();step();continue}
          if(kind==='death'){deaths++;maxf=Math.max(maxf,r.f);Q.endDead();break}
          if(r.hp>Q.maxHp()*.5||Q.S.potions>0){Q.descend()}else{maxf=Math.max(maxf,r.f);Q.leaveRun()} continue}
       if(r.cd===0&&r.mons.filter(m=>Math.abs(m.x-r.px)<=1&&Math.abs(m.y-r.py)<=1).length>=2){Q.whirl();continue}
       step();
     }
     if(Q.S.run){maxf=Math.max(maxf,Q.S.run.f);Q.S.run=null}
   }
   out.push({sc:Q.S.scrolls,d,lvl:Q.S.lvl,w:Q.S.weapon,a:Q.S.armor,we:Q.S.wEnh,ae:Q.S.aEnh,maxf,best:Q.S.best,cp:Q.S.checkpoint,deaths,gold:Q.S.gold,sh:Q.S.shards,atk:Q.atk(),def:Q.def(),hp:Q.maxHp()});
 }
 return out;
};
