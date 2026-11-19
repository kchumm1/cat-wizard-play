// Articulated paper layers for expedition monsters. Each creature draws its whole atlas in one mesh.
(function (CW) {
  'use strict';
  const TAU = 2 * Math.PI;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  function atlasArt(id, layout, image, T) {
    const [width, height] = layout.size;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    for (const [, , , x, y, w, h, sx, sy] of layout.layers) ctx.drawImage(image, sx, sy, w, h, x, y, w, h);
    const texture = new T.Texture(image);
    texture.minFilter = T.LinearFilter; texture.generateMipmaps = false;
    texture.encoding = T.sRGBEncoding; texture.needsUpdate = true;
    return { id, tex: texture, canvas, aspect: width / height, puppet: layout };
  }

  function geometry(art, T) {
    const [width, height] = art.puppet.size, atlas = art.tex.image;
    const positions = [], uvs = [], weights0 = [], weights1 = [], indices = [];
    for (const [bone, , , left, top, w, h, sx, sy] of art.puppet.layers) {
      const wing = art.id === 'exmob-bat' && (bone === 1 || bone === 2);
      const cols = wing ? 8 : 1, first = positions.length / 3;
      for (let row = 0; row <= 1; row++) {
        for (let col = 0; col <= cols; col++) {
          const portion = col / cols, px = left + w * portion, py = top + h * row;
          positions.push((px - width / 2) / height, 1 - py / height, 0);
          uvs.push((sx + w * portion) / atlas.width, 1 - (sy + h * row) / atlas.height);
          const weights = [0,0,0,0,0,0,0,0];
          if (bone >= 0) weights[bone] = 1;
          if (wing) {
            const tip = clamp(bone === 1 ? (0.21 - px/width)*8 : (px/width - 0.74)*8, 0, 1);
            weights[bone] -= tip; weights[bone + 5] = tip;
          }
          weights0.push(...weights.slice(0,4)); weights1.push(...weights.slice(4));
        }
      }
      for (let i = 0; i < cols; i++) {
        const a = first+i, b = a+cols+1;
        indices.push(a,b,a+1, a+1,b,b+1);
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(positions,3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uvs,2));
    geo.setAttribute('aW0', new T.Float32BufferAttribute(weights0,4));
    geo.setAttribute('aW1', new T.Float32BufferAttribute(weights1,4));
    geo.setIndex(indices); geo.userData.cached = true;
    return geo;
  }

  function prepare(art, material) {
    const u = material.uniforms;
    for (const [bone,x,y] of art.puppet.layers) {
      if (bone >= 0) u.uBP.value[bone].set((x/100-0.5)*art.aspect, 1-y/100);
    }
    if (art.id === 'exmob-bat') {
      u.uBP.value[6].set(-0.30*art.aspect,0.64);
      u.uBP.value[7].set(0.25*art.aspect,0.64);
    }
    if (art.id === 'exmob-tablet') {
      u.uBuried = {value:0};
      material.vertexShader = 'uniform float uBuried; varying float vFloor;\n' + material.vertexShader.replace(
        'gl_Position =', 'p.y -= uBuried; vFloor = p.y; gl_Position =');
      material.fragmentShader = 'varying float vFloor;\n' + material.fragmentShader.replace(
        'vec4 t = texture2D', 'if(vFloor < 0.0) discard; vec4 t = texture2D');
    }
  }

  // The wingtip turns about a second joint, following the motion of its shoulder.
  function wingTip(u, tip, shoulder, flex) {
    const P = u.uBP.value, A = u.uBA.value, TT = u.uBT.value;
    const dx = P[tip].x-P[shoulder].x, dy = P[tip].y-P[shoulder].y;
    const a = A[shoulder], c = Math.cos(a), s = Math.sin(a);
    A[tip] = a+flex;
    TT[tip].set(dx*c-dy*s-dx, dx*s+dy*c-dy);
  }

  function pose(m, dt) {
    const d = m.group.userData, an = d.anim, u = d.u, A = u.uBA.value, T = u.uBT.value;
    const dx = m.x - (an.lastX ?? m.x), dz = m.z - (an.lastZ ?? m.z);
    an.lastX = m.x; an.lastZ = m.z;
    if (!dt) return false;
    const travel = Math.hypot(dx,dz);
    const walking = m.walk > 0.02 && !m.stun && m.pull === undefined;
    const stepLength = d.h * (m.id === 'exmob-gecko' ? 1.02 : m.id === 'exmob-fox' ? 1.38 : 0.93);
    an.ph += walking ? Math.min(travel / stepLength * TAU, dt*19) : 0;
    an.walk += ((walking ? clamp(travel/(dt*1.05),0,1) : 0)-an.walk) * Math.min(1,dt*10);
    an.t += dt;
    const phase = an.ph, s = Math.sin(phase), w = an.walk, time = an.t;
    const breath = Math.sin(time*2.4), hurt = m.hurt || 0;
    for (let i = 0; i < 8; i++) { A[i]=0; T[i].set(0,0); }
    function limb(i, offset, swing, reach, lift) {
      const p = phase + offset;
      A[i] = Math.sin(p) * swing * w;
      T[i].set(-Math.sin(p)*reach*w, Math.max(0, Math.cos(p))*lift*w);
    }
    A[0] = 0.035*breath - hurt*0.12;
    switch (m.id) {
      case 'exmob-golem':
        limb(3,0,0.22,0.055,0.095); limb(4,Math.PI,0.22,0.055,0.095);
        A[1] = -0.29*s*w - 0.38*m.atk + breath*0.045;
        A[2] = 0.29*s*w + 0.46*m.atk - breath*0.045;
        T[0].set(0.019*s*w, -Math.abs(s)*0.026*w);
        break;
      case 'exmob-core': {
        const wave = Math.sin(time*2.8);
        A[0] += 0.1*Math.sin(time*1.9); T[0].y = 0.026*wave;
        A[1] = -0.15 + 0.19*wave - 0.25*m.atk;
        A[2] = 0.15 - 0.19*Math.sin(time*2.8-0.45) + 0.25*m.atk;
        T[1].y = 0.04*Math.sin(time*2.8-0.7); T[2].y = -T[1].y;
        A[3]=0.085*wave; A[4]=-A[3]; A[5]=0.10*Math.sin(time*2.8-0.9);
        T[5].y=-0.025*wave;
        break;
      }
      case 'exmob-gecko':
        limb(1,0,0.36,0.067,0.077); limb(2,Math.PI,0.31,0.062,0.064);
        limb(3,Math.PI,0.39,0.078,0.082); limb(4,0,0.32,0.066,0.068);
        A[0] += s*w*0.085; T[0].y = -Math.abs(s)*w*0.018;
        A[5] = Math.sin(phase-0.85)*w*0.15 + breath*0.045;
        break;
      case 'exmob-bat': {
        const glide = (1 + Math.sin(time*1.8)) / 2;
        const beat = Math.sin(time*9.5), power = 0.14+0.86*glide;
        A[1] = -0.07 - beat*0.43*power; A[2] = -A[1];
        const flex = Math.sin(time*9.5-0.84)*0.33*power;
        wingTip(u,6,1,-flex); wingTip(u,7,2,flex);
        A[3]=0.19*Math.sin(time*4.1); A[4]=-A[3]*0.6;
        T[0].y=-beat*power*0.028; A[0]+=0.045*Math.sin(time*3.2);
        break;
      }
      case 'exmob-tablet': {
        const buried = u.uBuried.value;
        const push = m.state === 'unseal' ? Math.sin((1-buried)*Math.PI) : 0;
        limb(3,0,0.17,0.05,0.085); limb(4,Math.PI,0.17,0.05,0.085);
        A[1]=0.18*s*w+0.26*push+0.08*breath;
        A[2]=-0.18*s*w-0.26*push-0.08*breath;
        T[1].y=0.66*buried*buried-0.08*push; T[2].y=0.59*buried*buried-0.08*push;
        T[0].y=0.09*buried+0.015*breath;
        A[0]+=0.13*push; break;
      }
      case 'exmob-fox':
        limb(1,0,0.5,0.083,0.095); limb(2,0.8,0.43,0.073,0.084);
        limb(3,Math.PI,0.54,0.092,0.102); limb(4,Math.PI+0.72,0.45,0.077,0.083);
        A[0] += Math.sin(phase-0.3)*w*0.095; T[0].y = -0.023*Math.cos(phase)*w;
        A[5] = Math.sin(phase-0.85)*w*0.17 + Math.sin(time*2.1)*0.07;
        break;
    }
    const sign = s>=0 ? 1 : -1, footstep = w>0.32 && an.lastS!==sign;
    an.lastS=sign;
    return footstep;
  }

  CW.expeditionPuppet = {atlasArt, geometry, prepare, pose};
})(window.CW);

