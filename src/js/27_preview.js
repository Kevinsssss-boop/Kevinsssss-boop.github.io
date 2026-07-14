// --- Canvas-based skin preview: renders actual in-game appearance ---
const PREVIEW_W = 64, PREVIEW_H = 72;


function renderSkinPreview(canvas, skin) {
  const cx = canvas.getContext('2d');
  const W = PREVIEW_W, H = PREVIEW_H;
  canvas.width = W; canvas.height = H;

  // Dark background so glows are visible
  cx.fillStyle = '#12121e';
  cx.fillRect(0, 0, W, H);

  const style = skin.style || 'classic';
  const effect = skin.effect || {};
  const time = Date.now() * 0.003;

  // Mini snake layout: 3 body segments + head, angled from lower-left to upper-right
  const segs = [
    { x: W * 0.28, y: H * 0.70 }, // tail
    { x: W * 0.38, y: H * 0.52 }, // mid-body
    { x: W * 0.52, y: H * 0.36 }, // neck
    { x: W * 0.68, y: H * 0.24 }, // head
  ];
  const beadR = 9; // preview segment radius
  const headW = 14, headH = 11;
  const headAngle = -Math.PI / 6; // facing upper-right

  // ===== BODY SEGMENTS (segments 0-2) =====
  for (let i = 2; i >= 0; i--) {
    const sx = segs[i].x, sy = segs[i].y;
    const t = i / 3; // 0=head-adjacent, 1=tail
    const drawR = beadR * 1.6;

    switch (style) {
      case 'neon': {
        cx.save();
        cx.globalCompositeOperation = 'lighter';
        const pulse = Math.sin(time + i * 0.5) * 0.5 + 0.5;
        cx.shadowColor = skin.glow || skin.body;
        cx.shadowBlur = 10 * (0.6 + pulse * 0.4);
        const cr = lerpColor(skin.head, skin.dark, t);
        cx.globalAlpha = 0.75 + pulse * 0.25;
        cx.fillStyle = cr;
        cx.beginPath(); cx.arc(sx, sy, drawR, 0, Math.PI * 2); cx.fill();
        // bright core
        cx.shadowBlur = 0;
        cx.beginPath(); cx.arc(sx - drawR*0.15, sy - drawR*0.15, drawR*0.28, 0, Math.PI*2);
        cx.fillStyle = `rgba(255,255,255,${0.25+pulse*0.15})`; cx.fill();
        cx.restore();
        break;
      }
      case 'pixel': {
        const cr = lerpColor(skin.head, skin.dark, t);
        cx.fillStyle = cr;
        const sz = drawR * 1.7, r2 = 2;
        cx.beginPath();
        cx.moveTo(sz/2-r2+sx-sz/2, sy-sz/2); cx.lineTo(sx+sz/2-r2, sy-sz/2);
        cx.quadraticCurveTo(sx+sz/2, sy-sz/2, sx+sz/2, sy-sz/2+r2);
        cx.lineTo(sx+sz/2, sy+sz/2-r2); cx.quadraticCurveTo(sx+sz/2, sy+sz/2, sx+sz/2-r2, sy+sz/2);
        cx.lineTo(sx-sz/2+r2, sy+sz/2); cx.quadraticCurveTo(sx-sz/2, sy+sz/2, sx-sz/2, sy+sz/2-r2);
        cx.lineTo(sx-sz/2, sy-sz/2+r2); cx.quadraticCurveTo(sx-sz/2, sy-sz/2, sx-sz/2+r2, sy-sz/2);
        cx.closePath(); cx.fill();
        // blocky highlight
        cx.fillStyle = `rgba(255,255,255,${0.15+(1-t)*0.06})`;
        cx.fillRect(sx-sz*0.22, sy-sz*0.26, 4, 4);
        break;
      }
      case 'metallic': {
        const cr = lerpColor(skin.head, skin.dark, t);
        const sz = drawR * 1.7;
        cx.beginPath();
        const cR = sz*0.18; cx.moveTo(sz/2-cR+sx-sz/2,sy-sz/2);cx.lineTo(sx+sz/2-cR,sy-sz/2);
        cx.quadraticCurveTo(sx+sz/2,sy-sz/2,sx+sz/2,sy-sz/2+cR);cx.lineTo(sx+sz/2,sy+sz/2-cR);
        cx.quadraticCurveTo(sx+sz/2,sy+sz/2,sx+sz/2-cR,sy+sz/2);cx.lineTo(sx-sz/2+cR,sy+sz/2);
        cx.quadraticCurveTo(sx-sz/2,sy+sz/2,sx-sz/2,sy+sz/2-cR);cx.lineTo(sx-sz/2,sy-sz/2+cR);
        cx.quadraticCurveTo(sx-sz/2,sy-sz/2,sx-sz/2+cR,sy-sz/2);cx.closePath();
        const lg = cx.createLinearGradient(sx-sz/2, sy-sz/2, sx+sz/2, sy+sz/2);
        lg.addColorStop(0, darkenStr(cr,0.4)); lg.addColorStop(0.3, lightenStr(cr,0.3));
        lg.addColorStop(0.5, cr); lg.addColorStop(0.75, darkenStr(cr,0.3)); lg.addColorStop(1, darkenStr(cr,0.5));
        cx.fillStyle = lg; cx.fill();
        // chrome stripe
        cx.save(); cx.clip();
        cx.fillStyle = 'rgba(255,255,255,0.16)';
        cx.beginPath(); cx.moveTo(sx-sz*0.3,sy-sz*0.5);cx.lineTo(sx+sz*0.1,sy-sz*0.5);
        cx.lineTo(sx-sz*0.3,sy+sz*0.2);cx.lineTo(sx-sz*0.5,sy+sz*0.05);cx.closePath();cx.fill();
        cx.restore();
        break;
      }
      case 'dragon': {
        const cr = lerpColor(skin.head, skin.dark, t);
        cx.fillStyle = cr;
        cx.beginPath(); cx.arc(sx, sy, drawR, 0, Math.PI*2); cx.fill();
        // scale pattern
        if (drawR > 6) {
          cx.save(); cx.beginPath(); cx.arc(sx, sy, drawR-0.5, 0, Math.PI*2); cx.clip();
          for (let row=0;row<2;row++) for(let col=0;col<2;col++){
            const ox=(row%2)*drawR*0.3, px=sx-drawR*0.5+col*drawR*0.55+ox+drawR*0.27, py=sy-drawR*0.5+row*drawR*0.55+drawR*0.27;
            cx.fillStyle=(row+col)%2?`rgba(255,230,150,0.25)`:`rgba(100,60,0,0.2)`;
            cx.beginPath();cx.arc(px,py,drawR*0.32,0,Math.PI*2);cx.fill();
          } cx.restore();
        }
        cx.beginPath();cx.arc(sx-drawR*0.2,sy-drawR*0.2,drawR*0.26,0,Math.PI*2);
        cx.fillStyle=`rgba(255,255,255,${0.1+(1-t)*0.05})`;cx.fill();
        break;
      }
      case 'galaxy': {
        const hue = ((i / 3) * 50) % 360;
        cx.fillStyle = `hsl(${260+hue},65%,${35+(1-t)*18}%)`;
        cx.beginPath(); cx.arc(sx, sy, drawR, 0, Math.PI*2); cx.fill();
        // stars
        const seed = (i * 7919 + 997) % 1000;
        for (let si=0;si<2;si++) {
          const ox=((seed*(si+1)*137)%1000)/500-1, oy=((seed*(si+1)*269)%1000)/500-1;
          cx.globalAlpha = 0.5 + Math.sin(time*3+i+si)*0.3;
          cx.fillStyle='#fff';
          cx.beginPath();cx.arc(sx+ox*drawR*1.2,sy+oy*drawR*1.2,0.8+((seed*(si+3)*43)%100)/150,0,Math.PI*2);cx.fill();
        }
        cx.globalAlpha=1;
        break;
      }
      case 'cartoon': {
        const cr = lerpColor(skin.head, skin.dark, t);
        cx.fillStyle = cr;
        cx.beginPath(); cx.arc(sx, sy, drawR*1.04, 0, Math.PI*2); cx.fill();
        // sugar rim
        cx.strokeStyle=`rgba(255,255,255,${0.18+(1-t)*0.08})`; cx.lineWidth=1.2;
        cx.beginPath();cx.arc(sx,sy,drawR*1.01,0,Math.PI*2);cx.stroke();
        // glossy highlight
        cx.beginPath();cx.arc(sx-drawR*0.2,sy-drawR*0.25,drawR*0.34,0,Math.PI*2);
        cx.fillStyle=`rgba(255,255,255,${0.2+(1-t)*0.07})`;cx.fill();
        break;
      }
      case 'lava': {
        const temp = 1 - t;
        const pulse = Math.sin(time*2.5+i*0.4)*0.03;
        const pr = drawR*(1+pulse);
        const lg=cx.createRadialGradient(sx,sy,0,sx,sy,pr);
        if(temp>0.6){lg.addColorStop(0,'#ffffaa');lg.addColorStop(0.3,'#ffcc00');lg.addColorStop(0.7,'#ff6600');lg.addColorStop(1,'#cc2200');}
        else if(temp>0.3){lg.addColorStop(0,'#ffcc00');lg.addColorStop(0.4,'#ff8800');lg.addColorStop(0.8,'#cc3300');lg.addColorStop(1,'#661100');}
        else{lg.addColorStop(0,'#ff8800');lg.addColorStop(0.5,'#cc4400');lg.addColorStop(1,'#330800');}
        cx.fillStyle=lg;cx.beginPath();cx.arc(sx,sy,pr,0,Math.PI*2);cx.fill();
        break;
      }
      case 'ice': {
        const cr = lerpColor(skin.head, skin.dark, t);
        const size = drawR*1.05;
        cx.beginPath();
        for(let j=0;j<6;j++){const a=Math.PI/3*j-Math.PI/6;const px=sx+Math.cos(a)*size,py=sy+Math.sin(a)*size;if(j===0)cx.moveTo(px,py);else cx.lineTo(px,py);}
        cx.closePath();
        const ig=cx.createLinearGradient(sx-size,sy-size,sx+size,sy+size);
        ig.addColorStop(0,lightenStr(cr,0.25));ig.addColorStop(0.5,cr);ig.addColorStop(1,darkenStr(cr,0.2));
        cx.fillStyle=ig;cx.globalAlpha=0.78;cx.fill();cx.globalAlpha=1;
        // facet lines
        cx.strokeStyle='rgba(255,255,255,0.12)';cx.lineWidth=0.5;
        for(let f=0;f<3;f++){cx.beginPath();cx.moveTo(sx,sy);cx.lineTo(sx+Math.cos(Math.PI/3*f)*size*0.85,sy+Math.sin(Math.PI/3*f)*size*0.85);cx.stroke();}
        break;
      }
      default: { // classic
        const cr = lerpColor(skin.head, skin.dark, t);
        cx.fillStyle = cr;
        cx.globalAlpha = 0.85 - t * 0.2;
        cx.beginPath(); cx.arc(sx, sy, drawR, 0, Math.PI * 2); cx.fill();
        cx.globalAlpha = 1;
        cx.beginPath(); cx.arc(sx - drawR*0.22, sy - drawR*0.22, drawR*0.32, 0, Math.PI*2);
        cx.fillStyle = `rgba(255,255,255,${0.14+(1-t)*0.06})`; cx.fill();
      }
    }
  }

  // ===== HEAD (segment 3) =====
  const hx = segs[3].x, hy = segs[3].y;
  cx.save(); cx.translate(hx, hy); cx.rotate(headAngle);

  switch (style) {
    case 'neon': {
      cx.globalCompositeOperation='lighter';
      cx.shadowColor=skin.glow||skin.body; cx.shadowBlur=14;
      const hg=cx.createRadialGradient(-headW*0.05,-headH*0.15,headW*0.04,0,0,headW);
      hg.addColorStop(0,'#fff');hg.addColorStop(0.12,skin.head);hg.addColorStop(0.6,skin.body);hg.addColorStop(1,skin.dark);
      cx.beginPath();cx.ellipse(0,0,headW,headH,0,0,Math.PI*2);cx.fillStyle=hg;cx.fill();
      cx.shadowBlur=0;
      // scan lines
      for(let sc=0;sc<4;sc++){const sy2=-headH+(headH*2/4)*sc+headH/4;
        cx.fillStyle=`rgba(255,255,255,${0.06+Math.sin(time*3+sc)*0.04})`;
        cx.fillRect(-headW,sy2-0.5,headW*2,1);}
      // glowing eyes
      for(let side=-1;side<=1;side+=2){
        const ey=headW*0.42*side;
        cx.shadowColor='#fff';cx.shadowBlur=7;
        cx.beginPath();cx.arc(headW*0.08,ey,headW*0.3,0,Math.PI*2);cx.fillStyle='rgba(255,255,255,0.9)';cx.fill();
        cx.shadowBlur=0;cx.beginPath();cx.arc(headW*0.08,ey,headW*0.15,0,Math.PI*2);cx.fillStyle='#fff';cx.fill();
      }
      cx.globalCompositeOperation='source-over';
      break;
    }
    case 'pixel': {
      const cR=2;
      cx.beginPath();
      cx.moveTo(-headW+cR,-headH);cx.lineTo(headW-cR,-headH);cx.quadraticCurveTo(headW,-headH,headW,-headH+cR);
      cx.lineTo(headW,headH-cR);cx.quadraticCurveTo(headW,headH,headW-cR,headH);
      cx.lineTo(-headW+cR,headH);cx.quadraticCurveTo(-headW,headH,-headW,headH-cR);
      cx.lineTo(-headW,-headH+cR);cx.quadraticCurveTo(-headW,-headH,-headW+cR,-headH);cx.closePath();
      const hg=cx.createRadialGradient(-headW*0.1,-headH*0.2,headW*0.06,0,0,headW);
      hg.addColorStop(0,skin.head);hg.addColorStop(0.6,skin.body);hg.addColorStop(1,skin.dark);
      cx.fillStyle=hg;cx.fill();
      // square eyes
      const er=headW*0.26;
      for(let side=-1;side<=1;side+=2){const ey=headW*0.42*side;
        cx.fillStyle='#fff';cx.fillRect(headW*0.08-er,ey-er,er*2,er*1.6);
        cx.fillStyle='#111';cx.fillRect(headW*0.08-er*0.5,ey-er*0.5,er,er);
        cx.fillStyle='#fff';cx.fillRect(headW*0.08-er*0.4+1,ey-er*0.5+1,2,2);}
      break;
    }
    case 'metallic': {
      const cR=headW*0.12;
      cx.beginPath();
      cx.moveTo(-headW+cR,-headH);cx.lineTo(headW-cR,-headH);cx.quadraticCurveTo(headW,-headH,headW,-headH+cR);
      cx.lineTo(headW,headH-cR);cx.quadraticCurveTo(headW,headH,headW-cR,headH);
      cx.lineTo(-headW+cR,headH);cx.quadraticCurveTo(-headW,headH,-headW,headH-cR);
      cx.lineTo(-headW,-headH+cR);cx.quadraticCurveTo(-headW,-headH,-headW+cR,-headH);cx.closePath();
      const hg=cx.createLinearGradient(-headW,-headH,headW,headH);
      hg.addColorStop(0,skin.dark);hg.addColorStop(0.2,lightenStr(skin.body,0.15));
      hg.addColorStop(0.45,skin.head);hg.addColorStop(0.55,skin.body);hg.addColorStop(0.8,darkenStr(skin.body,0.12));hg.addColorStop(1,skin.dark);
      cx.fillStyle=hg;cx.fill();
      cx.save();cx.clip();
      cx.fillStyle='rgba(255,255,255,0.22)';
      cx.beginPath();cx.moveTo(-headW*0.5,-headH);cx.lineTo(-headW*0.1,-headH);cx.lineTo(-headW*0.5,-headH*0.2);cx.lineTo(-headW*0.7,-headH*0.4);cx.closePath();cx.fill();
      cx.restore();
      // LED eyes
      const er=headW*0.23;
      for(let side=-1;side<=1;side+=2){const ey=headW*0.42*side;
        cx.fillStyle='#222';cx.fillRect(headW*0.08-er,ey-er*0.55,er*2,er*1.1);
        cx.fillStyle='#ff3333';cx.fillRect(headW*0.08-er*0.45,ey-er*0.28,er*0.9,er*0.56);}
      break;
    }
    case 'dragon': {
      const hg=cx.createRadialGradient(-headW*0.1,-headH*0.2,headW*0.06,0,0,headW);
      hg.addColorStop(0,skin.head);hg.addColorStop(0.6,skin.body);hg.addColorStop(1,skin.dark);
      cx.beginPath();cx.ellipse(0,0,headW,headH,0,0,Math.PI*2);cx.fillStyle=hg;cx.fill();
      // horns
      cx.fillStyle=darkenStr(skin.body,0.12);
      cx.beginPath();cx.moveTo(-headW*0.35,-headH*0.55);cx.quadraticCurveTo(-headW*0.55,-headH*1.3,-headW*0.2,-headH*1.45);
      cx.quadraticCurveTo(-headW*0.4,-headH*1.1,-headW*0.15,-headH*0.5);cx.closePath();cx.fill();
      cx.beginPath();cx.moveTo(-headW*0.35,headH*0.55);cx.quadraticCurveTo(-headW*0.55,headH*1.3,-headW*0.2,headH*1.45);
      cx.quadraticCurveTo(-headW*0.4,headH*1.1,-headW*0.15,headH*0.5);cx.closePath();cx.fill();
      // slit eyes
      const er=headW*0.26;
      for(let side=-1;side<=1;side+=2){const ey=headW*0.42*side;
        cx.beginPath();cx.ellipse(headW*0.08,ey,er*1.05,er*0.82,side*0.15,0,Math.PI*2);cx.fillStyle='#fffaea';cx.fill();
        cx.fillStyle='#111';cx.beginPath();cx.ellipse(headW*0.13,ey,er*0.14,er*0.5,0,0,Math.PI*2);cx.fill();
        cx.fillStyle=skin.glow||'#ff6600';cx.beginPath();cx.ellipse(headW*0.14,ey,er*0.05,er*0.18,0,0,Math.PI*2);cx.fill();}
      break;
    }
    case 'galaxy': {
      const hg=cx.createRadialGradient(-headW*0.08,-headH*0.18,headW*0.04,0,0,headW);
      hg.addColorStop(0,'#fff');hg.addColorStop(0.1,skin.head);hg.addColorStop(0.4,skin.body);
      hg.addColorStop(0.7,'#2a0050');hg.addColorStop(1,skin.dark);
      cx.beginPath();cx.ellipse(0,0,headW,headH,0,0,Math.PI*2);cx.fillStyle=hg;cx.fill();
      // ring
      cx.strokeStyle='rgba(180,130,255,0.2)';cx.lineWidth=1;
      cx.beginPath();cx.ellipse(0,0,headW*1.25,headH*0.4,Math.PI*0.1,0,Math.PI*2);cx.stroke();
      // star specks on head
      for(let si=0;si<4;si++){
        const ax=((((42*(si+1)*137+50)%10000)/10000)-0.5)*headW*1.5;
        const ay=((((42*(si+1)*269+30)%10000)/10000)-0.5)*headH*1.5;
        cx.globalAlpha=0.5+Math.sin(time*4+si*1.5)*0.3;cx.fillStyle='#fff';
        cx.beginPath();cx.arc(ax,ay,0.8+((42*(si+5)*43)%100)/120,0,Math.PI*2);cx.fill();}
      cx.globalAlpha=1;
      // dreamy eyes
      const er=headW*0.28;
      for(let side=-1;side<=1;side+=2){const ey=headW*0.42*side;
        cx.beginPath();cx.arc(headW*0.08,ey,er,0,Math.PI*2);cx.fillStyle='#e8dff5';cx.fill();
        cx.beginPath();cx.arc(headW*0.16,ey,er*0.42,0,Math.PI*2);cx.fillStyle='#4a0080';cx.fill();
        cx.beginPath();cx.arc(headW*0.18,ey,er*0.11,0,Math.PI*2);cx.fillStyle='#c77dff';cx.fill();
        cx.beginPath();cx.arc(headW*0.1,ey-er*0.1,er*0.09,0,Math.PI*2);cx.fillStyle='#fff';cx.fill();}
      break;
    }
    case 'cartoon': {
      const pw=headW*1.05,ph=headH*1.04;
      const hg=cx.createRadialGradient(-pw*0.08,-ph*0.22,pw*0.05,0,0,pw);
      hg.addColorStop(0,'#fff');hg.addColorStop(0.1,skin.head);hg.addColorStop(0.5,skin.body);hg.addColorStop(1,skin.dark);
      cx.beginPath();cx.ellipse(0,0,pw,ph,0,0,Math.PI*2);cx.fillStyle=hg;cx.fill();
      cx.strokeStyle='rgba(255,255,255,0.22)';cx.lineWidth=1.5;
      cx.beginPath();cx.ellipse(0,0,pw-1,ph-1,0,0,Math.PI*2);cx.stroke();
      // big cute eyes
      const er=pw*0.35;
      for(let side=-1;side<=1;side+=2){const ey=pw*0.44*side;
        cx.beginPath();cx.arc(pw*0.06,ey,er,0,Math.PI*2);cx.fillStyle='#fff';cx.fill();
        cx.beginPath();cx.arc(pw*0.12,ey,er*0.7,0,Math.PI*2);cx.fillStyle=skin.body;cx.fill();
        cx.beginPath();cx.arc(pw*0.16,ey,er*0.38,0,Math.PI*2);cx.fillStyle='#222';cx.fill();
        cx.beginPath();cx.arc(pw*0.06,ey-er*0.14,er*0.18,0,Math.PI*2);cx.fillStyle='#fff';cx.fill();
        cx.beginPath();cx.arc(pw*0.22,ey+er*0.07,er*0.08,0,Math.PI*2);cx.fillStyle='#fff';cx.fill();}
      // blush
      const br=pw*0.18;
      for(let side=-1;side<=1;side+=2){const by=(pw*0.44+pw*0.04)*side;
        const bgr=cx.createRadialGradient(-pw*0.02,by,br*0.02,-pw*0.02,by,br);
        bgr.addColorStop(0,'rgba(255,120,150,0.45)');bgr.addColorStop(1,'rgba(255,120,150,0)');
        cx.beginPath();cx.arc(-pw*0.02,by,br,0,Math.PI*2);cx.fillStyle=bgr;cx.fill();}
      // smile
      cx.strokeStyle='rgba(80,40,50,0.3)';cx.lineWidth=1;cx.lineCap='round';
      cx.beginPath();cx.arc(pw*0.05,ph*0.14,pw*0.11,0.2*Math.PI,0.8*Math.PI);cx.stroke();
      break;
    }
    case 'lava': {
      const pulse=Math.sin(time*2.5)*0.04, pw=headW*(1+pulse), ph=headH*(1+pulse);
      const hg=cx.createRadialGradient(-pw*0.05,-ph*0.15,pw*0.02,0,0,pw);
      hg.addColorStop(0,'#ffffee');hg.addColorStop(0.13,'#ffee55');hg.addColorStop(0.4,skin.head||'#ff8c00');
      hg.addColorStop(0.7,skin.body||'#ff4500');hg.addColorStop(1,skin.dark||'#8b0000');
      cx.shadowColor='#ff4400';cx.shadowBlur=10;
      cx.beginPath();cx.ellipse(0,0,pw,ph,0,0,Math.PI*2);cx.fillStyle=hg;cx.fill();cx.shadowBlur=0;
      // fiery eyes
      const er=pw*0.26;
      for(let side=-1;side<=1;side+=2){const ey=pw*0.42*side;
        cx.shadowColor='#ff6600';cx.shadowBlur=6;
        cx.beginPath();cx.arc(pw*0.08,ey,er,0,Math.PI*2);cx.fillStyle='#ffdd44';cx.fill();cx.shadowBlur=0;
        cx.beginPath();cx.arc(pw*0.13,ey,er*0.36,0,Math.PI*2);cx.fillStyle='#331100';cx.fill();
        cx.beginPath();cx.arc(pw*0.16,ey-er*0.1,er*0.1,0,Math.PI*2);cx.fillStyle='#ffffaa';cx.fill();}
      break;
    }
    case 'ice': {
      // hexagonal head
      cx.beginPath();
      const pts=[];
      for(let j=0;j<12;j++){const a=Math.PI/6*j;const rx=j%2===0?headW:headW*0.82,ry=j%2===0?headH:headH*0.85;
        pts.push({x:Math.cos(a)*rx,y:Math.sin(a)*ry});}
      cx.moveTo(pts[0].x,pts[0].y);for(let j=1;j<pts.length;j++)cx.lineTo(pts[j].x,pts[j].y);cx.closePath();
      const hg=cx.createRadialGradient(-headW*0.08,-headH*0.2,headW*0.04,0,0,headW);
      hg.addColorStop(0,'#fff');hg.addColorStop(0.15,skin.head||'#e0ffff');hg.addColorStop(0.5,skin.body||'#87ceeb');hg.addColorStop(1,skin.dark||'#4682b4');
      cx.shadowColor=skin.glow||'#aaddff';cx.shadowBlur=8;
      cx.fillStyle=hg;cx.fill();cx.shadowBlur=0;
      // facet lines
      cx.strokeStyle='rgba(255,255,255,0.15)';cx.lineWidth=0.6;
      for(let f=0;f<4;f++){const ang=Math.PI/4*f+0.3;
        cx.beginPath();cx.moveTo(Math.cos(ang)*headW*0.1,Math.sin(ang)*headH*0.1);
        cx.lineTo(Math.cos(ang)*headW*0.82,Math.sin(ang)*headH*0.82);cx.stroke();}
      // diamond eyes
      const er=headW*0.26;
      for(let side=-1;side<=1;side+=2){const ey=headW*0.42*side;
        cx.save();cx.translate(headW*0.08,ey);cx.rotate(side*0.1);
        cx.beginPath();cx.moveTo(0,-er);cx.lineTo(er*0.68,0);cx.lineTo(0,er);cx.lineTo(-er*0.68,0);cx.closePath();
        cx.fillStyle='#d0f0ff';cx.fill();cx.strokeStyle='rgba(150,220,255,0.35)';cx.lineWidth=0.6;cx.stroke();
        cx.beginPath();cx.moveTo(0,-er*0.43);cx.lineTo(er*0.23,0);cx.lineTo(0,er*0.43);cx.lineTo(-er*0.23,0);cx.closePath();
        cx.fillStyle='#4488aa';cx.fill();
        cx.beginPath();cx.arc(-er*0.08,-er*0.14,er*0.1,0,Math.PI*2);cx.fillStyle='rgba(255,255,255,0.65)';cx.fill();
        cx.restore();}
      break;
    }
    default: { // classic
      const hg=cx.createRadialGradient(-headW*0.1,-headH*0.2,headW*0.06,0,0,headW);
      hg.addColorStop(0,skin.head);hg.addColorStop(0.6,skin.body);hg.addColorStop(1,skin.dark);
      cx.beginPath();cx.ellipse(0,0,headW,headH,0,0,Math.PI*2);cx.fillStyle=hg;cx.fill();
      cx.beginPath();cx.ellipse(-headW*0.12,-headH*0.2,headW*0.26,headH*0.16,0,0,Math.PI*2);
      cx.fillStyle='rgba(255,255,255,0.22)';cx.fill();
      // round eyes
      const er=headW*0.28;
      for(let side=-1;side<=1;side+=2){const ey=headW*0.42*side;
        cx.beginPath();cx.arc(headW*0.08,ey,er,0,Math.PI*2);cx.fillStyle='#fff';cx.fill();
        cx.beginPath();cx.arc(headW*0.16,ey,er*0.48,0,Math.PI*2);cx.fillStyle='#111';cx.fill();
        cx.beginPath();cx.arc(headW*0.08-er*0.08,ey-er*0.1,er*0.17,0,Math.PI*2);cx.fillStyle='#fff';cx.fill();}
      // blush
      const br=headW*0.13;
      for(let side=-1;side<=1;side+=2){const by=(headW*0.42+headW*0.06)*side;
        const bgr=cx.createRadialGradient(-headW*0.04,by,br*0.03,-headW*0.04,by,br);
        bgr.addColorStop(0,'rgba(255,135,150,0.35)');bgr.addColorStop(1,'rgba(255,135,150,0)');
        cx.beginPath();cx.arc(-headW*0.04,by,br,0,Math.PI*2);cx.fillStyle=bgr;cx.fill();}
    }
  }
  cx.restore();
}

// Helper: interpolate two hex colors and return rgb string

function lerpColor(hexA, hexB, t) {
  const rA=parseInt(hexA.slice(1,3),16), gA=parseInt(hexA.slice(3,5),16), bA=parseInt(hexA.slice(5,7),16);
  const rB=parseInt(hexB.slice(1,3),16), gB=parseInt(hexB.slice(3,5),16), bB=parseInt(hexB.slice(5,7),16);
  return `rgb(${Math.round(rA+(rB-rA)*t)},${Math.round(gA+(gB-gA)*t)},${Math.round(bA+(bB-bA)*t)})`;
}

// Helper: darken an rgb color string by factor (returns rgba string)
function darkenStr(rgbStr, amt) {
  var m = rgbStr.match(/\d+/g);
  var r = Math.round(parseInt(m[0]) * (1 - amt));
  var g = Math.round(parseInt(m[1]) * (1 - amt));
  var b = Math.round(parseInt(m[2]) * (1 - amt));
  return 'rgba(' + r + ',' + g + ',' + b + ',1)';
}

// Helper: lighten an rgb color string by factor (returns rgba string)
function lightenStr(rgbStr, amt) {
  var m = rgbStr.match(/\d+/g);
  var r = Math.min(255, parseInt(m[0]) + Math.round((255 - parseInt(m[0])) * amt));
  var g = Math.min(255, parseInt(m[1]) + Math.round((255 - parseInt(m[1])) * amt));
  var b = Math.min(255, parseInt(m[2]) + Math.round((255 - parseInt(m[2])) * amt));
  return 'rgba(' + r + ',' + g + ',' + b + ',1)';
}


function buildSkinGrid() {
  const g = document.getElementById('skin-grid'); g.innerHTML = '';
  // Refresh unlocks from achievements before building
  refreshSkinUnlocks();
  SKINS.forEach(sk => {
    const d = document.createElement('div');
    const styleClass = sk.style || 'classic';
    const selClass = (sk.id === playerSkin.id && !sk.locked) ? ' selected' : '';
    const lockClass = sk.locked ? ' locked' : '';
    d.className = 'skin-card skin-' + styleClass + selClass + lockClass;

    // Canvas preview showing actual in-game appearance
    const cv = document.createElement('canvas');
    cv.className = 'skin-preview';
    cv.width = PREVIEW_W; cv.height = PREVIEW_H;
    renderSkinPreview(cv, sk);

    const nm = document.createElement('div');
    nm.className = 'skin-name';
    nm.textContent = sk.locked ? '???' : sk.name;

    d.appendChild(cv);
    d.appendChild(nm);
    if (!sk.locked) {
      d.onclick = () => { playerSkin = sk; saveSetting('skin', sk.id); buildSkinGrid(); };
    }
    g.appendChild(d);
  });
}
// buildSkinGrid() called from init() after all modules loaded
