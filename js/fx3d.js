// 3D spell parts. The spells were built only from flat cards (16 little pictures in js/vfx.js) and painted pictures,
// so a laser was a stretched card and a meteor a picture sliding down. These parts are real meshes whose surfaces keep
// moving (noise in the shader): the laser is a tube of light from the paw to its tip with light coiling round it, the
// meteor a tumbling rock that burns on the side it flies into and drags a fire tail, the black hole a dark ball with a
// turning disk that bends the picture around it (sc.lens). fx.js places and moves them; nothing here decides a hit.
(function (root) {
  var CW = root.CW = root.CW || {};
  var T = root.THREE;

  var NOISE = [
    'vec3 h3(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return fract(sin(p)*43758.5453)*2.0-1.0;}',
    'float n3(vec3 p){vec3 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);',
    ' return mix(mix(mix(dot(h3(i),f),dot(h3(i+vec3(1.0,0.0,0.0)),f-vec3(1.0,0.0,0.0)),u.x),mix(dot(h3(i+vec3(0.0,1.0,0.0)),f-vec3(0.0,1.0,0.0)),dot(h3(i+vec3(1.0,1.0,0.0)),f-vec3(1.0,1.0,0.0)),u.x),u.y),',
    '  mix(mix(dot(h3(i+vec3(0.0,0.0,1.0)),f-vec3(0.0,0.0,1.0)),dot(h3(i+vec3(1.0,0.0,1.0)),f-vec3(1.0,0.0,1.0)),u.x),mix(dot(h3(i+vec3(0.0,1.0,1.0)),f-vec3(0.0,1.0,1.0)),dot(h3(i+vec3(1.0,1.0,1.0)),f-vec3(1.0,1.0,1.0)),u.x),u.y),u.z);}',
    'float fbm(vec3 p){float a=0.5,s=0.0;for(int i=0;i<4;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=0.5;}return s;}',
    'float fb(vec3 p){return clamp(fbm(p)*1.6+0.5,0.0,1.0);}',
    // fire colours: t 0 = dark red, 0.5 = the spell colour, 1 = white hot
    'vec3 ramp3(float t,vec3 lo,vec3 mid){t=clamp(t,0.0,1.0);return t<0.5?mix(lo,mid,t*2.0):mix(mid,vec3(1.0,0.97,0.86),(t-0.5)*2.0);}',
    'vec3 ramp(float t,vec3 mid){return ramp3(t,vec3(0.42,0.05,0.07),mid);}'
  ].join('\n');
  // vIC: the instance's own colour when a mesh draws many copies at once (the ice crystal layer), else white.
  // A copy's normal for vN goes through the inverse-transpose of its own (unevenly scaled) matrix, as normalMatrix does
  // for one mesh: im*(n/s^2) = R*S^-1*n; vWN keeps the plain im*n, as one mesh's mat3(modelMatrix)*n did
  var VARY = 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vWN; varying vec3 vIC; uniform float uTime,uBright;\n';
  var VS = VARY + 'void main(){vUv=uv;vP=position;vec4 lp=vec4(position,1.0);vec3 ln=normal,cn=normal;vIC=vec3(1.0);\n' +
    '#ifdef USE_INSTANCING\nmat3 im=mat3(instanceMatrix);lp=instanceMatrix*lp;ln=im*normal;cn=im*(normal/vec3(dot(im[0],im[0]),dot(im[1],im[1]),dot(im[2],im[2])));\n#endif\n' +
    '#ifdef USE_INSTANCING_COLOR\nvIC=instanceColor;\n#endif\n' +
    'vec4 mv=modelViewMatrix*lp;vN=normalize(normalMatrix*cn);vV=normalize(-mv.xyz);vWN=normalize(mat3(modelMatrix)*ln);gl_Position=projectionMatrix*mv;}';
  // the beam tube: grows from the paw (thin there), its width ripples along it as the light pours out
  var VS_TUBE = VARY + 'uniform float uLen,uOpen,uWob;\n' +
    'void main(){vUv=uv;vec3 p=position;float s=uv.y*uLen;' +
    'float taper=0.45+0.55*smoothstep(0.0,0.08,uv.y);' +
    'float rip=1.0+uWob*(0.07*sin(s*3.0-uTime*30.0)+0.03*sin(s*9.0+uTime*19.0));' +
    'p.xz*=taper*rip*uOpen;vP=p;vec4 mv=modelViewMatrix*vec4(p,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vWN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*mv;}';

  // the fire wave: a sheet laid along x (uv.x 0 → 1 across uLen), running along z toward the camera (so its face and
  // curling lip are seen from the front) whose cross-section (uv.y 0 at the foot → 1 at the lip)
  // is a breaking wave — it rises from the ground and arcs over forward by uA radians (a curl), with a gentle back slope
  // behind it. The arc's radius is uH (its height); the height and the curl sway along it (uBow bows the front forward in
  // the middle), uDir +1/-1 is the way it runs. Built in the shader so one mesh does the whole changing shape.
  var VS_WAVE = VARY + 'uniform float uH,uA,uLen,uDir,uBow,uSway;\n' +
    'void main(){vUv=uv;float z=(uv.x-0.5)*uLen,s=uv.y;' +
    'float hz=uH*(0.78+0.22*sin(z*0.9-uTime*9.0)*uSway),az=uA*(0.85+0.15*sin(z*0.7-uTime*7.0+1.3)*uSway);' +
    // the back slope (s < 0.3) runs up from behind into the arc of the face and lip
    'float t=clamp((s-0.3)/0.7,0.0,1.0),a=az*t;' +
    'vec2 arc=vec2(hz*(1.0-cos(a)),hz*sin(a));' +
    'vec2 back=vec2(-hz*0.9*(1.0-s/0.3),hz*0.25*(s/0.3));' +
    'vec2 q=s<0.3?back:arc+vec2(0.0,hz*0.25*(1.0-t*0.5));' +
    'vec2 tg=s<0.3?vec2(0.9,0.25):vec2(sin(a),cos(a));' +
    'vec3 p=vec3(z,q.y,(q.x+uBow*cos(z*0.33)+0.25*uSway*sin(z*1.1-uTime*7.0))*uDir);' +
    'vec3 nrm=normalize(vec3(0.0,tg.x,-tg.y*uDir));' +
    'vP=p;vec4 mv=modelViewMatrix*vec4(p,1.0);vN=normalize(normalMatrix*nrm);vV=normalize(-mv.xyz);vWN=normalize(mat3(modelMatrix)*nrm);gl_Position=projectionMatrix*mv;}';
  // the user's painted fire wave (art/fx-firewave.webp) on a sheet that bends: the bottom 40 % stands, above that the
  // sheet folds forward toward the camera and down by uBend (the crest crashing over), uSquash pushes it down, the flames
  // ripple sideways with heat; uFlip -1 mirrors it
  var VS_PIC = VARY + 'uniform float uW,uH,uBend,uSquash,uFlip;\n' +
    'void main(){vUv=uv;float v=uv.y,y0=0.4*uH*uSquash;' +
    'vec3 p=vec3((uv.x-0.5)*uW*uFlip,v*uH*uSquash,0.0);' +
    'p.x+=sin(v*3.5+uTime*4.0)*0.035*uH*v;' +
    'if(v>0.4){float dy=p.y-y0,an=uBend*1.9*(v-0.4)/0.6;p.y=y0+dy*cos(an);p.z=dy*sin(an);}' +
    'vP=p;vec4 mv=modelViewMatrix*vec4(p,1.0);vN=normalize(normalMatrix*vec3(0.0,0.0,1.0));vV=normalize(-mv.xyz);vWN=vec3(0.0,0.0,1.0);gl_Position=projectionMatrix*mv;}';
  // the fire wave cut into pieces (one copy per piece, all drawn at once): iRect is the piece's part of the picture
  // (u0, v0, u1, v1, a little larger than its cell so neighbours overlap), iAD its alpha and how far it has burnt away
  var VS_SHARD = VARY + 'attribute vec4 iRect;attribute vec2 iAD;varying vec4 vRect;varying vec2 vAD;\n' +
    'void main(){vUv=uv;vRect=iRect;vAD=iAD;vec3 p=position;vP=p;vIC=vec3(1.0);\n' +
    '#ifdef USE_INSTANCING\nvec4 mv=modelViewMatrix*instanceMatrix*vec4(p,1.0);\n#else\nvec4 mv=modelViewMatrix*vec4(p,1.0);\n#endif\n' +
    'vN=vec3(0.0,0.0,1.0);vV=normalize(-mv.xyz);vWN=vec3(0.0,0.0,1.0);gl_Position=projectionMatrix*mv;}';
  // f: 1 where the surface faces the camera (the middle of a tube or ball), 0 at its outline
  var F = 'float f=abs(dot(normalize(vN),normalize(vV)));';
  var FS = {
    core: 'uniform vec3 uCol,uDeep;uniform float uLen,uAlpha;void main(){' + F +
      'float s=vUv.y*uLen,a=vUv.x*6.2832;' +
      'float fl=fb(vec3(cos(a)*0.8,sin(a)*0.8,s*1.7-uTime*18.0));' +
      'float band=pow(0.5+0.5*sin(s*2.6-uTime*34.0),8.0);' +
      'vec3 c=mix(uDeep,uCol,smoothstep(0.0,0.7,f));c=mix(c,vec3(1.0),clamp(pow(f,3.0)*0.85+band*0.3,0.0,1.0));' +
      'float al=(0.25+0.75*smoothstep(0.0,0.5,f))*(0.65+0.7*fl)+band*0.25*f;' +
      'al*=smoothstep(0.0,0.025,vUv.y)*(1.0-smoothstep(0.97,1.0,vUv.y))*uAlpha;gl_FragColor=vec4(c,clamp(al,0.0,1.0));}',
    coil: 'uniform vec3 uCol,uDeep;uniform float uLen,uAlpha;void main(){' + F +
      'float s=vUv.y*uLen,a=vUv.x*6.2832;' +
      'float h1=0.5+0.5*sin(a*2.0+s*3.2-uTime*28.0),h2=0.5+0.5*sin(-a*2.0+s*2.4-uTime*21.0);' +
      'float st=smoothstep(0.86,1.0,h1)+0.6*smoothstep(0.9,1.0,h2);' +
      'float fl=fb(vec3(cos(a),sin(a),s*1.1-uTime*9.0));' +
      'vec3 c=mix(mix(mix(uDeep,uCol,0.4+0.6*fl),vec3(1.0),st*0.3),uDeep,uBright*0.6);' +
      'float al=st*(0.25+0.75*f)*(0.6+0.8*fl);al*=smoothstep(0.0,0.05,vUv.y)*(1.0-smoothstep(0.93,1.0,vUv.y))*uAlpha;' +
      'gl_FragColor=vec4(c,clamp(al,0.0,1.0));}',
    halo: 'uniform vec3 uCol,uDeep;uniform float uLen,uAlpha;void main(){' + F +
      'float s=vUv.y*uLen,a=vUv.x*6.2832;float fl=fb(vec3(cos(a)*0.6,sin(a)*0.6,s*0.9-uTime*6.0));' +
      'float al=pow(f,1.6)*(0.5+0.7*fl)*0.32*(1.0+uBright*1.1)*uAlpha;al*=smoothstep(0.0,0.08,vUv.y)*(1.0-smoothstep(0.85,1.0,vUv.y));' +
      'gl_FragColor=vec4(uDeep,clamp(al,0.0,1.0));}',
    // a ball of light with a white heart and a boiling surface
    orb: 'uniform vec3 uCol,uDeep;uniform float uAlpha,uSeed;void main(){' + F +
      'float n=fb(vP*2.2+vec3(0.0,0.0,uTime*3.0+uSeed));' +
      'vec3 c=mix(uDeep,uCol,smoothstep(0.1,0.8,f));c=mix(c,vec3(1.0),pow(f,4.0)*0.9*(1.0-uBright*0.5));' +
      'float al=pow(f,1.3)*(0.55+0.7*n)*uAlpha;gl_FragColor=vec4(c,clamp(al,0.0,1.0));}',
    // a moon: lit from behind one side so a thick crescent shines, with dark seas and a soft rim
    moon: 'uniform vec3 uLit,uDark,uRim,uL;uniform float uAlpha,uSolid;void main(){vec3 N=normalize(vN);' + F +
      'float lit=smoothstep(-0.08,0.38,dot(N,normalize(uL)));' +
      'float sea=smoothstep(0.02,0.24,fbm(vP*2.6)),dots=smoothstep(0.5,0.72,n3(vP*7.5)*0.5+0.5);' +
      'vec3 surf=mix(uLit,uLit*0.7,sea*0.75+dots*0.35);surf*=1.0-0.2*uBright;vec3 c=mix(uDark,surf,lit);' +
      'c+=uRim*pow(1.0-f,3.0)*(0.35+0.9*lit)*(1.0-uBright);' +
      // on snow or sand the white face sinks into the ground and the see-through dark side reads as a faint disk:
      // there it is a little greyer, solid, and edged dark
      'c=mix(c,uDark*0.55,uBright*smoothstep(0.55,0.95,1.0-f));gl_FragColor=vec4(c,uAlpha*mix(mix(0.5+0.5*lit,1.0,uBright),1.0,uSolid));}',
    // a rock: faceted grey-brown stone lit from above, pitted, with thin glowing cracks; only the face it flies into is
    // white hot, so the dark body and its outline stay readable even when it is past in a moment
    rock: 'uniform vec3 uHot,uDir,uBase;uniform float uHeat;void main(){vec3 N=normalize(vWN);' +
      'float diff=max(dot(N,normalize(vec3(0.45,0.85,0.3))),0.0);float back=max(dot(N,normalize(vec3(-0.6,0.2,-0.5))),0.0);' +
      'float grain=fb(vP*7.0),pits=smoothstep(0.58,0.78,fb(vP*3.2+vec3(7.0)));' +
      'vec3 rock=uBase*(0.32+0.95*diff+0.18*back)*(0.78+0.4*grain)*(1.0-0.38*pits);' +
      'float crack=1.0-smoothstep(0.0,0.045,abs(fbm(vP*2.1+vec3(3.0))));' +
      'float front=smoothstep(0.15,0.95,dot(N,uDir));' +
      'float rim=pow(1.0-abs(dot(normalize(vN),normalize(vV))),3.0);' +
      'vec3 c=rock+uHot*uHeat*crack*(0.45+0.9*front)+mix(uHot,vec3(1.0,0.93,0.66),front)*front*front*1.15*uHeat+vec3(1.0,0.55,0.2)*rim*0.35*uHeat;' +
      'gl_FragColor=vec4(c,1.0);}',
    // fire wrapping the whole falling stone: flames lick round it and stream back (object +Y points backwards), thick at
    // its back and round its edge, thin over its face so the stone shows through the gaps
    blaze: 'uniform vec3 uCol;uniform float uSeed,uAlpha;void main(){' + F +
      'float b=vP.y;float n=fb(vec3(vP.x*2.6,vP.z*2.6,b*3.0-uTime*14.0+uSeed)),n2=fb(vec3(vP.x*5.5,vP.z*5.5,b*6.0-uTime*22.0+uSeed));' +
      'float fl=n*0.65+n2*0.35;float body=smoothstep(-0.8,0.7,b)*(0.55+0.45*f);' +
      'float al=smoothstep(0.44,0.66,fl+b*0.1)*body*uAlpha;' +
      'gl_FragColor=vec4(ramp(0.4+fl*0.48-b*0.22-uBright*0.15,uCol),clamp(al,0.0,1.0));}',
    // a ball of fire: rolling flames all over it running back the way it came (object +Y points backwards), white hot
    // in the middle where it faces the camera, torn into tongues at its outline
    fire: 'uniform vec3 uCol,uDeep;uniform float uSeed,uAlpha;void main(){' + F +
      'float b=vP.y;float n=fb(vec3(vP.x*2.2,vP.z*2.2,b*2.4-uTime*9.0+uSeed)),n2=fb(vec3(vP.x*4.8,vP.z*4.8,b*5.0-uTime*15.0+uSeed));' +
      'float fl=n*0.6+n2*0.4;float t=0.16+pow(f,2.0)*0.38+fl*0.34-b*0.1;' +
      'float al=smoothstep(0.28,0.58,fl+f*0.4)*(0.45+0.4*f)*uAlpha;' +
      'gl_FragColor=vec4(ramp3(t-uBright*0.18,uDeep,uCol),clamp(al,0.0,1.0));}',
    // ice: a clear blue crystal, each flat face lit a little differently, a cold light drifting inside it, white at its
    // edges with a hard glint; drawn over the picture (not added as light) so it reads on snow as well
    ice: 'uniform vec3 uCol,uDeep;uniform float uAlpha,uSeed;void main(){vec3 N=normalize(vWN);' + F +
      'float rim=pow(1.0-f,2.0),facet=0.5+0.5*dot(N,normalize(vec3(0.4,0.8,0.45)));' +
      'float glint=pow(max(dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(0.25,0.55,0.8))),0.0),20.0);' +
      'float inner=fb(vP*vec3(3.0,1.1,3.0)+vec3(0.0,-uTime*2.0,uSeed));' +
      'vec3 c=mix(uDeep,uCol*vIC,facet*0.75+inner*0.35);c=mix(c,vec3(1.0),clamp(rim*0.7+glint,0.0,1.0));' +
      'float al=(0.45+0.35*facet+rim*0.5+glint)*uAlpha;gl_FragColor=vec4(c,clamp(al,0.0,1.0));}',
    // the white-hot air in front of a falling rock: a cap (half ball, pole into the wind) that streams back
    sheath: 'uniform vec3 uCol;uniform float uAlpha;void main(){' + F +
      'float n=fb(vec3(vP.x*3.0,vP.z*3.0,vP.y*5.0+uTime*16.0));float front=smoothstep(0.0,1.0,vP.y);' +
      'float al=front*front*0.75*smoothstep(0.38,0.62,n+front*0.15)*smoothstep(0.35,0.75,vP.y)*uAlpha;' +
      'gl_FragColor=vec4(ramp(0.62+front*0.4+n*0.15-uBright*0.2,uCol),clamp(al,0.0,1.0));}',
    // smoke: a soft grey puff, lit from above, frayed at its edge, that thins away as uK goes 0 → 1
    smoke: 'uniform vec3 uDark,uLight;uniform float uK,uSeed,uAlpha;void main(){vec3 N=normalize(vWN);' + F +
      'float n=fb(vP*2.4+vec3(uSeed,uTime*0.5,0.0)),n2=fb(vP*5.2+vec3(0.0,uSeed,uTime*0.7));' +
      'float sh=0.4+0.6*max(dot(N,normalize(vec3(0.3,0.9,0.35))),0.0);vec3 c=mix(uDark,uLight,sh*(0.7+0.4*n2));' +
      'float edge=smoothstep(0.0,0.6,f);float al=smoothstep(uK*0.8,uK*0.8+0.3,n*0.65+edge*0.5)*edge*(1.0-uK*0.55)*uAlpha;' +
      'gl_FragColor=vec4(c,clamp(al,0.0,1.0));}',
    // where it will land: the ground darkens under the coming rock and is lit by its fire (uK 0 → 1 as it comes)
    shadow: 'uniform float uK,uAlpha;void main(){vec2 d=vUv*2.0-1.0;float r=length(d);' +
      'gl_FragColor=vec4(0.06,0.03,0.03,pow(1.0-smoothstep(0.0,1.0,r),1.4)*(0.15+0.55*uK*uK)*uAlpha);}',
    gglow: 'uniform vec3 uCol;uniform float uK,uAlpha;void main(){vec2 d=vUv*2.0-1.0;float r=length(d);' +
      'gl_FragColor=vec4(uCol,pow(1.0-smoothstep(0.0,1.0,r),2.0)*uK*uK*0.75*uAlpha);}',
    // the ring of dirt thrown up round the crater: an open cone of rays of earth, hot at its foot
    ejecta: 'uniform vec3 uDirt,uHot;uniform float uK,uSeed,uAlpha;void main(){float a=vUv.x*6.2832,y=vUv.y;' +
      'float ray=fb(vec3(cos(a)*7.0,sin(a)*7.0,uSeed+y*0.5)),clump=fb(vec3(cos(a)*3.0,sin(a)*3.0,y*3.0+uSeed*2.0));' +
      'float body=smoothstep(0.42,0.62,ray*0.7+clump*0.45-y*0.3);' +
      'float al=body*pow(1.0-y,1.1)*(1.0-uK*uK)*uAlpha;' +
      'vec3 c=mix(uHot,uDirt,smoothstep(0.0,0.35,y+uK*0.7))*(0.7+0.45*clump);gl_FragColor=vec4(c,clamp(al,0.0,1.0));}',
    // the scorched hollow: a dark ragged patch that fades slowly
    scorch: 'uniform float uK,uSeed;void main(){vec2 d=vUv*2.0-1.0;float r=length(d),a=atan(d.y,d.x);' +
      'float rr=r/(0.78+0.3*fb(vec3(cos(a)*2.2,sin(a)*2.2,uSeed)));float body=1.0-smoothstep(0.5,1.0,rr);' +
      'float rim=smoothstep(0.5,0.75,rr)*(1.0-smoothstep(0.75,1.0,rr));' +
      'vec3 c=mix(vec3(0.08,0.05,0.045),vec3(0.3,0.22,0.18),rim);gl_FragColor=vec4(c,(body*0.72+rim*0.2)*(1.0-uK*uK));}',
    // molten cracks running out of the crater, white in the middle, cooling to dark red
    cracks: 'uniform vec3 uCol;uniform float uK,uSeed;void main(){vec2 d=vUv*2.0-1.0;float r=length(d),a=atan(d.y,d.x);' +
      'float line=1.0-smoothstep(0.0,0.035+0.04*r,abs(fbm(vec3(cos(a)*2.6,sin(a)*2.6,r*1.3+uSeed))));' +
      'float core=1.0-smoothstep(0.0,0.4,r);float cool=1.0-uK;' +
      'float al=(core*0.9+line*(1.0-smoothstep(0.25,1.0,r)))*cool*step(r,1.0);' +
      'gl_FragColor=vec4(ramp(0.3+cool*0.7+core*0.15-uBright*0.2,uCol),clamp(al,0.0,1.0));}',
    // the ground under a black hole: a dark whirl sinking in, not a ring
    pit: 'uniform vec3 uCol;uniform float uAlpha,uSpin;void main(){vec2 d=vUv*2.0-1.0;float r=length(d),a=atan(d.y,d.x);' +
      'float sw=a+uSpin*0.6/(0.25+r)+log(r+0.02)*2.6;float n=fb(vec3(cos(sw)*(1.0+r*2.0),sin(sw)*(1.0+r*2.0),uTime*0.3));' +
      'float arms=smoothstep(0.4,0.75,n),body=pow(1.0-smoothstep(0.0,1.0,r),1.5);' +
      'vec3 c=mix(vec3(0.03,0.0,0.06),uCol*0.4,arms*smoothstep(0.2,0.9,r));gl_FragColor=vec4(c,clamp(body*(0.5+0.4*arms)*uAlpha*step(r,1.0),0.0,1.0));}',
    // the fire tail behind a rock: a cone (wide at the rock, uv.y 0) whose flames run back to its tip
    tail: 'uniform vec3 uCol;uniform float uSeed,uAlpha;void main(){' + F +
      'float y=vUv.y,a=vUv.x*6.2832;' +
      'float n=fb(vec3(cos(a)*1.3,sin(a)*1.3,y*4.0-uTime*10.0+uSeed)),n2=fb(vec3(cos(a)*2.6,sin(a)*2.6,y*8.0-uTime*16.0+uSeed*2.0));' +
      'float fl=n*0.65+n2*0.35,fade=pow(1.0-y,1.2);' +
      // flames break up into tongues further back: the cut-off rises along the tail
      'float al=smoothstep(0.42+0.35*y,0.66+0.25*y,fl+(1.0-y)*0.18)*fade*(0.35+0.65*f)*0.9*uAlpha;' +
      'gl_FragColor=vec4(ramp(pow(fade,1.6)*0.55+fl*0.4-uBright*0.18,uCol),clamp(al,0.0,1.0));}',
    // the painted fire wave (VS_PIC): the picture's own colours, its flames rippling and flickering with heat; uDis 0 → 1
    // burns it away from the top down in ragged patches with glowing edges, leaving the flames at its foot last
    pic: 'uniform sampler2D uMap;uniform float uAlpha,uDis,uGlow;void main(){' +
      'vec2 uv=vUv;uv.x+=sin(uv.y*16.0-uTime*8.0)*0.004*uv.y;' +
      'vec4 tx=texture2D(uMap,uv);' +
      'float n=fbm(vec3(uv*5.0,uTime*1.5))*0.5+0.5,d=n*0.65+(1.0-uv.y)*0.55;' +
      'float keep=smoothstep(uDis,uDis+0.08,d),edge=smoothstep(0.12,0.0,abs(d-uDis))*step(0.001,uDis);' +
      'vec3 c=tx.rgb*(1.0+uGlow*(0.12+0.1*sin(uTime*13.0+uv.y*7.0)))+vec3(1.0,0.55,0.15)*edge*0.6;' +
      'gl_FragColor=vec4(c,tx.a*keep*uAlpha);}',
    // one piece of the painted wave: its part of the picture, soft at the edges so the pieces blend into one wave while
    // they are together; it flickers, and burns away in ragged holes with glowing edges as vAD.y goes 0 → 1
    shard: 'uniform sampler2D uMap;varying vec4 vRect;varying vec2 vAD;void main(){' +
      'vec2 uv=mix(vRect.xy,vRect.zw,vUv);vec4 tx=texture2D(uMap,uv);' +
      'float e=min(min(vUv.x,1.0-vUv.x),min(vUv.y,1.0-vUv.y)),soft=smoothstep(0.0,0.24,e);' +
      'float n=fbm(vec3(uv*7.0,uTime*1.6+vRect.x*9.0))*0.5+0.5;' +
      'float keep=smoothstep(vAD.y,vAD.y+0.1,n),edge=smoothstep(0.1,0.0,abs(n-vAD.y))*step(0.001,vAD.y);' +
      'vec3 c=tx.rgb*(1.1+0.12*sin(uTime*14.0+vRect.x*20.0+vRect.y*13.0))+vec3(1.0,0.55,0.15)*edge*0.7;' +
      'gl_FragColor=vec4(c,tx.a*soft*keep*vAD.x);}',
    // the fire wave's face (VS_WAVE: uv.x across its length uLen, uv.y 0 at its foot → 1 at the lip): not a sheet of
    // colour but a blaze — tall tongues of flame streaming up the whole face, white-yellow where they are hottest, deep
    // red in the gaps between them, which are see-through; near the crest the flames are brightest and tear off the lip.
    // uK 0 → 1: it burns down and away
    wfire: 'uniform float uSeed,uAlpha,uK,uLen,uLand;void main(){' + F +
      'float y=vUv.y,x=vUv.x*uLen;' +
      // three layers of noise squeezed tall (so they read as tongues) racing upward at different speeds
      'float n=fb(vec3(x*0.9,y*2.2-uTime*3.2,uSeed)),n2=fb(vec3(x*2.3,y*5.0-uTime*7.5,uSeed*1.9)),st=fb(vec3(x*5.5,y*1.1-uTime*4.6,uSeed*3.1));' +
      'float fl=n*0.5+n2*0.3+st*0.2;' +
      // uLand 0 → 1 as it crashes: then its lip lies on the ground as solid fire, not torn tongues
      'float crest=smoothstep(0.55,0.8,y)*(1.0-uLand);' +
      // the gaps open more towards the lip, where it tears into separate tongues
      // the curl (crest) is the densest, brightest part, so the shape of the wave reads; only the very lip tears into tongues
      'float cut=0.4-0.1*crest+0.22*smoothstep(0.93,1.0,y)*(1.0-uLand)+uK*0.5;' +
      'float body=smoothstep(cut,cut+0.16,fl+0.08*(1.0-y));' +
      'float al=body*(0.55+0.45*f)*smoothstep(0.0,0.05,y)*(1.0+uBright*0.4)*uAlpha;' +
      // colour from how hot each bit of flame is: deep red → orange → yellow → white at the hottest tongue cores
      'float heat=clamp((fl-cut)*2.6+0.25+crest*0.35-uK*0.4+uBright*0.22,0.0,1.0);' +
      'vec3 c=heat<0.33?mix(vec3(0.45,0.04,0.02),vec3(0.95,0.25,0.03),heat*3.0):heat<0.66?mix(vec3(0.95,0.25,0.03),vec3(1.0,0.62,0.1),(heat-0.33)*3.0):mix(vec3(1.0,0.62,0.1),vec3(1.0,0.95,0.7),(heat-0.66)*3.0);' +
      'gl_FragColor=vec4(c,clamp(al,0.0,1.0));}',
    // a standing wall of flame on an open tube (uv.y 0 at the ground, 1 at the top): flames boil up it and break into
    // tongues towards the top; uR: how many flames go round (the tube's size), uK 0 → 1: it burns down and away;
    // uLo → uCol → white: its colours from the coolest to the hottest (fire, frost mist or sunlight)
    flame: 'uniform vec3 uCol,uLo;uniform float uSeed,uAlpha,uR,uK,uHeat,uTop,uCrest,uSpeed;void main(){' + F +
      'float y=vUv.y,a=vUv.x*6.2832;vec2 o=vec2(cos(a),sin(a))*uR;' +
      'float n=fb(vec3(o*1.0,y*2.6-uTime*5.5*uSpeed+uSeed)),n2=fb(vec3(o*2.1,y*5.5-uTime*10.0*uSpeed+uSeed*1.7));' +
      'float fl=n*0.62+n2*0.38;' +
      'float yt=max(0.0,(y-uTop)/(1.0-uTop));float cut=0.3+0.5*yt+uK*0.55;' +
      'float al=smoothstep(cut,cut+0.2,fl+(1.0-y)*0.3)*(0.45+0.55*f)*smoothstep(0.0,0.06,y)*(1.0+uBright*0.35)*uAlpha;' +
      // uCrest: a bright band where a wave curls over (just under where its tongues start), dark red in its trough below
      'float cr=uCrest*smoothstep(uTop-0.22,uTop,y)*(1.0-smoothstep(uTop+0.05,uTop+0.2,y));' +
      'al=max(al,cr*0.85*uAlpha*(1.0-uK));' +
      'gl_FragColor=vec4(ramp3(0.16+fl*0.44+(1.0-y)*0.16*(1.0-uCrest)+uHeat*0.16+cr*0.45-uCrest*0.12*(1.0-smoothstep(0.0,uTop,y))-uK*0.25+uBright*0.12,uLo,uCol),clamp(al,0.0,1.0));}',
    // a fireball dome rising off the ground that burns away in holes as uK goes 0 → 1
    dome: 'uniform vec3 uCol,uLow;uniform float uK,uSeed,uAlpha,uHot;void main(){' + F +
      'float n=fb(vP*3.4+vec3(uSeed,-uTime*3.0,0.0)),n2=fb(vP*7.0+vec3(-uTime*4.0,uSeed,0.0)),fl=n*0.7+n2*0.3;' +
      // full of holes from the start, and the holes eat it up as it rises
      'float al=smoothstep(0.32+uK*0.6,0.5+uK*0.6,fl+f*0.12-vP.y*0.1)*(1.0-uK*0.4)*0.6*(1.0+uBright*0.45)*uAlpha;float t=uHot-uK*0.45+fl*0.5;' +
      'gl_FragColor=vec4(ramp3(mix(t,clamp(t+0.2,0.42,0.8),uBright),uLow,uCol),clamp(al,0.0,1.0));}',
    // a ring rolling out over the ground with a torn, dusty edge
    shock: 'uniform vec3 uCol;uniform float uK,uW,uSeed,uAlpha;void main(){vec2 d=vUv*2.0-1.0;float r=length(d),a=atan(d.y,d.x);' +
      'float n=fb(vec3(cos(a)*3.0,sin(a)*3.0,uSeed+r*2.0));' +
      'float band=1.0-smoothstep(0.0,uW*(0.6+0.8*n),abs(r-uK));float inner=smoothstep(uK,uK-0.35,r)*0.25*(1.0-uK);' +
      'float al=(band*(0.6+0.6*n)+inner*n)*(1.0-uK)*step(r,1.0)*uAlpha;' +
      'gl_FragColor=vec4(mix(uCol,vec3(1.0),band*0.45*(1.0-uBright)),clamp(al,0.0,1.0));}',
    // the hot crater left on the ground: molten cracks that cool from white to dark red and fade
    crater: 'uniform vec3 uCol;uniform float uK,uSeed;void main(){vec2 d=vUv*2.0-1.0;float r=length(d);' +
      'float crack=1.0-smoothstep(0.0,0.09,abs(fbm(vec3(d*3.2,uSeed))));float core=1.0-smoothstep(0.0,0.55,r);float cool=1.0-uK;' +
      'float al=(core*0.75+crack*(1.0-smoothstep(0.4,1.0,r)))*cool*step(r,1.0)*0.85;' +
      'gl_FragColor=vec4(ramp(0.25+cool*0.75-uBright*0.2,uCol),clamp(al,0.0,1.0));}',
    // the black hole's ball: black, with a thin bright ring of trapped light at its edge
    horizon: 'uniform vec3 uRim;uniform float uAlpha;void main(){' + F +
      'float n=fb(vP*3.0+vec3(0.0,0.0,uTime*2.0));gl_FragColor=vec4(uRim*pow(1.0-f,5.0)*(1.2+n*0.8),uAlpha);}',
    // the disk round it: spiral arms of glowing gas, the inner part turning faster, one side brighter
    disk: 'uniform vec3 uIn,uMid,uOut;uniform float uAlpha,uSpin;void main(){float r=length(vP.xy),rn=clamp((r-1.0)/2.6,0.0,1.0),a=atan(vP.y,vP.x);' +
      'float sw=a+uSpin/(0.35+rn*1.6)+log(r)*2.2;vec3 q=vec3(cos(sw)*(1.0+rn*2.0),sin(sw)*(1.0+rn*2.0),uTime*0.6);' +
      'float n=fb(q*1.3),n2=fb(q*3.1+vec3(4.0)),arms=smoothstep(0.35,0.75,n*0.75+n2*0.35);' +
      'float rad=pow(1.0-rn,1.7)*smoothstep(0.0,0.05,rn),dop=0.7+0.45*sin(a+1.0),edge=1.0-smoothstep(0.0,0.1,rn);' +
      'vec3 c=rn<0.35?mix(uIn,uMid,rn/0.35):mix(uMid,uOut,(rn-0.35)/0.65);' +
      'float al=(rad*(0.35+0.85*arms)*dop+edge*0.9)*uAlpha;gl_FragColor=vec4(mix(c,vec3(1.0),edge*0.6*(1.0-uBright*0.7)),clamp(al,0.0,1.0));}'
  };

  // smooth value noise for shaping rocks once, on the CPU
  function hash(x, y, z) { var h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
  function vnoise(x, y, z) {
    var ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
    function L(a, b, t) { return a + (b - a) * t; }
    var v = L(L(L(hash(ix, iy, iz), hash(ix + 1, iy, iz), fx), L(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), fx), fy),
      L(L(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), fx), L(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), fx), fy), fz);
    return v * 2 - 1;
  }
  // A rock: a ball pushed in and out by three sizes of noise, with a few flat broken faces cut into it. Every triangle
  // keeps its own corners (the shape is not smoothed), so it is faceted like stone and its outline is jagged.
  function rockGeo(seed, detail, amp, squash) {
    var g = new T.IcosahedronGeometry(1, detail), p = g.attributes.position, v = new T.Vector3(), cuts = [];
    for (var c = 0; c < 4; c++) { var a = hash(seed, c, 1) * 6.283, b = Math.acos(2 * hash(seed, c, 2) - 1); cuts.push({ n: new T.Vector3(Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)), d: 0.72 + hash(seed, c, 3) * 0.18 }); }
    for (var i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      var n = vnoise(v.x * 1.4 + seed, v.y * 1.4, v.z * 1.4) * 0.6 + vnoise(v.x * 3.3, v.y * 3.3 + seed, v.z * 3.3) * 0.28 + vnoise(v.x * 7.5 + seed, v.y * 7.5, v.z * 7.5) * 0.12;
      v.multiplyScalar(1 + amp * n);
      cuts.forEach(function (k) { var dd = v.dot(k.n); if (dd > k.d) v.addScaledVector(k.n, k.d - dd); });   // broken flat faces
      v.y *= squash || 1;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals(); return g;
  }

  // Smoke puffs are drawn many at a time, but in the very order three.js draws see-through things one by one: within
  // one draw order, far to near (z: a thing's depth as the camera sees it; at the same depth the one made first, its
  // id). So a puff may lie between two other see-through things of its draw order (a glow on the ground, a crater, the
  // black hole) and is drawn between them: drawing all smoke in one go, before or after those, changed the picture
  // (the first attempt, which looked weaker, 2026-11-14).
  // things: [{ z, id, puff }], everything see-through of ONE draw order. Returns what to draw, far to near: each step is
  // { thing } (something that is not smoke) or { puffs: [...] } (puffs with nothing between them, at most cap of them).
  CW.smokeSteps = function (things, cap) {
    var list = things.slice().sort(function (a, b) { return a.z !== b.z ? b.z - a.z : a.id - b.id; }), steps = [], run = null;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (!t.puff) { steps.push({ thing: t }); run = null; continue; }
      if (!run || run.puffs.length >= cap) { run = { puffs: [] }; steps.push(run); }
      run.puffs.push(t);
    }
    return steps;
  };

  CW.createFx3d = function (sc) {
    var group = sc.fxGroup || sc.scene, parts = [], time = 0, bright = false, Y = new T.Vector3(0, 1, 0);
    var GEO = {
      tube: (function () { var g = new T.CylinderGeometry(1, 1, 1, 40, 60, true); g.translate(0, 0.5, 0); return g; })(),
      // wide end at y 0 (uv.y 0), point at y 1 (uv.y 1)
      cone: (function () { var g = new T.ConeGeometry(1, 1, 28, 20, true); g.translate(0, 0.5, 0); return g; })(),
      ball: new T.SphereGeometry(1, 40, 28),
      dome: new T.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
      flat: (function () { var g = new T.PlaneGeometry(2, 2); g.rotateX(-Math.PI / 2); return g; })(),
      disk: new T.RingGeometry(1, 3.6, 180, 8),
      rocks: [rockGeo(1.3, 3, 0.34, 0.85), rockGeo(4.1, 3, 0.38, 0.8), rockGeo(7.7, 3, 0.32, 0.9)],
      chips: [rockGeo(2.2, 1, 0.42, 0.7), rockGeo(5.5, 1, 0.45, 0.8), rockGeo(9.1, 1, 0.38, 0.75)],
      puff: new T.SphereGeometry(1, 18, 14),
      crystal: (function () { var g = new T.LatheGeometry([new T.Vector2(0, -0.42), new T.Vector2(0.8, -0.22), new T.Vector2(1, 0.02), new T.Vector2(0.62, 0.55), new T.Vector2(0, 1)], 6).toNonIndexed(); g.computeVertexNormals(); return g; })(),
      // the ring of thrown dirt: narrow at the ground (uv.y 0), wide at its top
      curtain: (function () { var g = new T.CylinderGeometry(1, 0.42, 1, 56, 6, true); g.translate(0, 0.5, 0); return g; })()
    };
    function C(hex) { return new T.Color(hex); }
    // Materials are kept and handed out again, never thrown away. When the last material of a kind is thrown away three.js
    // deletes its compiled program, and building it again on the next cast stalls the frame (for a long time on iPhone
    // Safari). A material is reused only for the same shader and side (what makes a different program); its uniform
    // values are copied in, its blending and depth set again.
    var pool = {};
    function mat(fs, uni, o, vs) {
      o = o || {}; var paint = bright && !o.keepAdd; uni.uTime = { value: time }; uni.uBright = { value: paint ? 1 : 0 };
      var blending = o.normal || o.solid || paint ? T.NormalBlending : T.AdditiveBlending, side = o.side || T.FrontSide, depthTest = o.depthTest !== false, depthWrite = !!(o.solid || o.depthWrite);
      var key = (vs === VS_WAVE ? 'wave' : vs === VS_PIC ? 'pic' : vs === VS_SHARD ? 'shard' : vs ? 'tube' : 'std') + '|' + side + '|' + (o.solid ? 1 : 0) + '|' + fs, list = pool[key], m = list && list.pop();
      if (m) {
        for (var k in uni) { var d = m.uniforms[k]; if (!d) continue; var v = uni[k].value; if (v && v.copy && d.value && d.value.copy) d.value.copy(v); else d.value = v; }
        m.blending = blending; m.depthTest = depthTest; m.depthWrite = depthWrite; m.transparent = !o.solid;
        return m;
      }
      m = new T.ShaderMaterial({ uniforms: uni, vertexShader: vs || VS, fragmentShader: VARY + NOISE + '\n' + fs, transparent: !o.solid, depthWrite: depthWrite, depthTest: depthTest, blending: blending, side: side });
      m.userData.poolKey = key; return m;
    }
    // one outline material for every falling stone
    var LINE = new T.MeshBasicMaterial({ color: 0x170d0a, side: T.BackSide }); LINE.userData.keep = true;
    var ICE_LINE = new T.MeshBasicMaterial({ color: 0x17407a, side: T.BackSide }); ICE_LINE.userData.keep = true;
    // a spear's outline in another colour: one kept material per colour
    var LINE_MATS = {}, OUTLINE_MATS = {};
    // an outline that is drawn over everything (for the moon, which is): one kept material per colour
    function outlineMat(hex) { var m = OUTLINE_MATS[hex]; if (!m) { m = new T.MeshBasicMaterial({ color: hex, side: T.BackSide, depthTest: false, depthWrite: false, transparent: true }); m.userData.keep = true; OUTLINE_MATS[hex] = m; } return m; }
    function lineMat(hex) {
      if (hex === undefined || hex === 0x17407a) return ICE_LINE;
      var m = LINE_MATS[hex]; if (!m) { m = new T.MeshBasicMaterial({ color: hex, side: T.BackSide }); m.userData.keep = true; LINE_MATS[hex] = m; }
      return m;
    }
    function add(mesh, o) {
      o = o || {}; mesh.renderOrder = o.order === undefined ? 6 : o.order; mesh.frustumCulled = false; group.add(mesh);
      var p = { mesh: mesh, upd: o.upd || null, t: 0, life: o.life || 1e9, dead: false }; parts.push(p); return p;
    }
    function drop(p) {
      if (!p || p.dead) return; p.dead = true; if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
      var m = p.mesh.material; if (!m || m.userData.keep) return;
      if (m.userData.poolKey) (pool[m.userData.poolKey] = pool[m.userData.poolKey] || []).push(m); else m.dispose();
    }
    function U(p) { return p.mesh.material.uniforms; }
    function ease(x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); }

    // ---------- the ice crystal layer ----------
    // Every ice spike is one copy in two shared meshes (the crystal and its outline), so all spikes together cost two
    // draws a frame; a mesh per spike cost two draws each (ice lance's group drew 341 times a frame, 2026-11-14). The
    // layer has its own materials: a material drawn both as many copies and as one mesh would switch programs each frame.
    var CAP = 256, spikes = [], spikeId = 0, IM = new T.Matrix4(), IP = new T.Vector3(), IS = new T.Vector3(), IV = new T.Vector3();
    var layerBody = new T.InstancedMesh(GEO.crystal, mat(FS.ice, { uCol: { value: C(0xffffff) }, uDeep: { value: C(0x2a6cff) }, uAlpha: { value: 0.9 }, uSeed: { value: 3.1 } }, { normal: true }), CAP);
    var layerLine = new T.InstancedMesh(GEO.crystal, ICE_LINE.clone(), CAP);
    [layerBody, layerLine].forEach(function (m) { m.renderOrder = 5; m.frustumCulled = false; m.count = 0; m.visible = false; m.name = 'spike3d layer'; group.add(m); });
    // (made at full size here: setColorAt would size it by the live count, which is 0 now)
    layerBody.instanceColor = new T.InstancedBufferAttribute(new Float32Array(CAP * 3), 3);
    // s: { x, z, h (height), w (width), tilt (Quaternion), col (Color), delay, life }
    function addSpike(s) { if (spikes.length >= CAP) spikes.shift(); s.id = ++spikeId; s.t = 0; spikes.push(s); }
    // shoots up in 0.1 s, stands, and in the last 32% of its life sinks all the way under the ground (tip and tilted edge
    // too), so it never vanishes in the air: when its life is over it is drawn once more fully sunk, then taken away
    // (at any frame rate; a frame of a short-lived spike can be longer than its whole sinking)
    function spikeNow(s) {
      var k = Math.max(0, s.t - s.delay), up = ease(k / 0.1), sink = Math.min(1, Math.max(0, (s.t - s.life * 0.68) / (s.life * 0.32))), hh = s.h * Math.max(0.001, up);
      IP.set(s.x, hh * 0.42 - sink * hh * 1.5, s.z); return hh;
    }
    function drawSpikes(dt) {
      for (var i = spikes.length - 1; i >= 0; i--) {
        var sp = spikes[i]; if (sp.sunk) { spikes.splice(i, 1); continue; }
        sp.t += dt; if (sp.t >= sp.life) { sp.t = sp.life; sp.sunk = true; }
      }
      for (var j = 0; j < spikes.length; j++) {
        var s = spikes[j], hh = spikeNow(s);
        layerBody.setMatrixAt(j, IM.compose(IP, s.tilt, IS.set(s.w, hh, s.w))); layerBody.setColorAt(j, s.col);
        layerLine.setMatrixAt(j, IM.compose(IP, s.tilt, IS.set(s.w * 1.18, hh * 1.04, s.w * 1.18)));
      }
      layerBody.count = layerLine.count = spikes.length; layerBody.visible = layerLine.visible = spikes.length > 0;
      layerBody.instanceMatrix.needsUpdate = layerLine.instanceMatrix.needsUpdate = layerBody.instanceColor.needsUpdate = true;
      layerBody.material.uniforms.uTime.value = time;
    }
    // for checks: each live spike's id and the highest point of its outline crystal
    var crystalPts = null;
    function spikeTops() {
      if (!crystalPts) { var a = GEO.crystal.attributes.position; crystalPts = []; for (var i = 0; i < a.count; i++) crystalPts.push(new T.Vector3(a.getX(i), a.getY(i), a.getZ(i))); }
      return spikes.map(function (s) {
        var hh = spikeNow(s), top = -1e9; IM.compose(IP, s.tilt, IS.set(s.w * 1.18, hh * 1.04, s.w * 1.18));
        crystalPts.forEach(function (v) { top = Math.max(top, IV.copy(v).applyMatrix4(IM).y); });
        return { id: s.id, top: top };
      });
    }

    // ---------- smoke and rock chips are drawn many at a time ----------
    // Meteor rain alone had about 490 puffs of smoke and 250 rock chips alive at once, one draw each (2026-11-14). Each puff
    // keeps its own colours and progress in per-copy attributes; the chips (three shapes) glow by a per-copy colour.
    var CHIP_CAP = 192, chips = [[], [], []], IQ = new T.Quaternion(), IE = new T.Euler();
    var VS_PUFF = VS.replace('void main(){', 'attribute vec3 iDark,iLight,iKSA;varying vec3 vDark,vLight,vKSA;void main(){vDark=iDark;vLight=iLight;vKSA=iKSA;');
    var FS_PUFF = 'varying vec3 vDark,vLight,vKSA;\n#define uDark vDark\n#define uLight vLight\n#define uK vKSA.x\n#define uSeed vKSA.y\n#define uAlpha vKSA.z\n' + FS.smoke.replace('uniform vec3 uDark,uLight;uniform float uK,uSeed,uAlpha;', '');
    var puffMat = mat(FS_PUFF, {}, { normal: true }, VS_PUFF);
    // A run of smoke: up to PUFF_RUN puffs in one draw. A puff is still a part like any other (made, moved and ended by
    // the same code at the same moments as a single puff: see puff below); only its drawing is shared. Just before each
    // picture (the scene's onBeforeRender, so with the camera of that picture) the live puffs and the other see-through
    // things of their draw order (4: chip and rock trails, ice mist; 5: the rest) are put in three.js's own order
    // (CW.smokeSteps), each run of puffs is written into the next free run mesh, and every thing and run gets a draw
    // order just above its own (4 + n/8192) in that sequence, which three.js then follows.
    // A run mesh has its own per-copy data and shares the puff's shape; 40 are made at the start and drawn once in the
    // first picture (one unseen puff far under the ground) so that their buffers exist before a spell needs them; more
    // are made when a picture needs more.
    var PUFF_RUN = 128, STEP = 1 / 8192, puffRuns = { 4: [], 5: [] }, primeRuns = true, hadSmoke = false, smokeNow = { puffs: 0, draws: 0 }, puffId = 0, HOLD = new T.Object3D();
    function makePuffRun(order) {
      var geo = new T.BufferGeometry(), at = function () { var a = new T.InstancedBufferAttribute(new Float32Array(PUFF_RUN * 3), 3); a.setUsage(T.DynamicDrawUsage); return a; }, R = { dark: at(), light: at(), ksa: at() };
      geo.setIndex(GEO.puff.index); ['position', 'normal', 'uv'].forEach(function (k) { geo.setAttribute(k, GEO.puff.attributes[k]); });
      geo.setAttribute('iDark', R.dark); geo.setAttribute('iLight', R.light); geo.setAttribute('iKSA', R.ksa);
      R.mesh = new T.InstancedMesh(geo, puffMat, PUFF_RUN); R.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      R.mesh.renderOrder = order; R.mesh.frustumCulled = false; R.mesh.count = 0; R.mesh.visible = false; R.mesh.name = 'smoke3d run'; R.mesh.userData.cwSmoke = true;
      group.add(R.mesh); puffRuns[order].push(R); return R;
    }
    function fillRun(R, list) {
      var n = list.length, M = R.mesh;
      for (var k = 0; k < n; k++) {
        var u = list[k]; M.setMatrixAt(k, IM.compose(u.p, u.q, IS.set(u.s, u.s, u.s)));
        R.dark.setXYZ(k, u.dark.r, u.dark.g, u.dark.b); R.light.setXYZ(k, u.light.r, u.light.g, u.light.b); R.ksa.setXYZ(k, u.k, u.seed, u.alpha);
      }
      M.count = n; M.visible = n > 0;
      M.instanceMatrix.updateRange.offset = 0; M.instanceMatrix.updateRange.count = n * 16; M.instanceMatrix.needsUpdate = true;
      R.dark.updateRange.offset = R.light.updateRange.offset = R.ksa.updateRange.offset = 0;
      R.dark.updateRange.count = R.light.updateRange.count = R.ksa.updateRange.count = n * 3;
      R.dark.needsUpdate = R.light.needsUpdate = R.ksa.needsUpdate = true;
    }
    for (var pr4 = 0; pr4 < 32; pr4++) makePuffRun(4);   // a meteor rain at its thickest took 28 runs (491 puffs)
    for (var pr5 = 0; pr5 < 8; pr5++) makePuffRun(5);
    var PSM = new T.Matrix4(), SV = new T.Vector3(), seen = { 4: [], 5: [] }, FAR_PUFF = [{ p: new T.Vector3(0, -40, 0), q: new T.Quaternion(), s: 0.001, k: 1, seed: 0, alpha: 0, dark: C(0), light: C(0) }];
    // The other see-through things of smoke's two draw orders, anywhere in the scene: not only effect parts (the glow under
    // a falling rock, a crater, the black hole) but the wizard's aura lights too, which are of draw order 4 (found by the
    // pixel check: smoke covered the light over the wizard's head). The scene is walked as three.js walks it: what is
    // not shown is skipped with all inside it, and a Group hands its draw order down as the group order (go), which
    // three.js sorts by first, so only things of the smoke's own group order (mine) can lie between puffs.
    // cwOrder: the draw order (4 or 5) such a thing was given; its renderOrder is moved a little above that, see above.
    function others(o, go, mine, live) {
      if (o.visible === false) return;
      if (o.isGroup) go = o.renderOrder;
      else if (go === mine && o.material && !o.userData.cwSmoke && (o.isMesh || o.isSprite || o.isPoints || o.isLine)) {
        var m = o.material, base = o.userData.cwOrder; if (base === undefined) { base = o.renderOrder; if (base === 4 || base === 5) o.userData.cwOrder = base; }
        if ((base === 4 || base === 5) && m.transparent === true && m.visible !== false) {
          if (!live[base]) o.renderOrder = base;   // no smoke of this order: three.js sorts them itself
          else { var w = o.userData.cwThing || (o.userData.cwThing = { puff: false, id: o.id, o: o, z: 0 }); w.z = SV.setFromMatrixPosition(o.matrixWorld).applyMatrix4(PSM).z; seen[base].push(w); }
        }
      }
      for (var ch = o.children, i = 0; i < ch.length; i++) others(ch[i], go, mine, live);
    }
    // (compiling: called while the programs are being readied, not for a picture)
    function layoutSmoke(camera, compiling) {
      var i, used = { 4: 0, 5: 0 }, live = { 4: 0, 5: 0 };
      puffMat.uniforms.uTime.value = time;
      seen[4].length = seen[5].length = 0;
      PSM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      for (i = 0; i < parts.length; i++) {
        var q = parts[i].puff; if (!q || parts[i].dead) continue;
        q.z = SV.copy(q.p).applyMatrix4(group.matrixWorld).applyMatrix4(PSM).z; seen[q.order].push(q); live[q.order]++;
      }
      if (live[4] || live[5] || hadSmoke) others(sc.scene || group, 0, group.isGroup ? group.renderOrder : 0, live);
      hadSmoke = !!(live[4] || live[5]);
      [4, 5].forEach(function (c) {
        if (!live[c]) return;
        var steps = CW.smokeSteps(seen[c], PUFF_RUN), n = 0;
        for (var j = 0; j < steps.length; j++) {
          var st = steps[j], ro = c + Math.min(8191, ++n) * STEP;
          if (st.thing) { st.thing.o.renderOrder = ro; continue; }
          var R = puffRuns[c][used[c]] || makePuffRun(c); used[c]++;
          R.mesh.renderOrder = ro; fillRun(R, st.puffs);
        }
      });
      [4, 5].forEach(function (c) {
        for (var k = used[c]; k < puffRuns[c].length; k++) {
          var R = puffRuns[c][k];
          if (primeRuns && !compiling) { fillRun(R, FAR_PUFF); R.mesh.renderOrder = c; } else if (R.mesh.visible) { R.mesh.visible = false; R.mesh.count = 0; }
        }
      });
      if (!compiling) primeRuns = false;
      smokeNow.puffs = live[4] + live[5]; smokeNow.draws = used[4] + used[5];
    }
    if (sc.scene) {
      var beforeRender = sc.scene.onBeforeRender;
      sc.scene.onBeforeRender = function (renderer, scene, camera) { if (beforeRender) beforeRender.apply(this, arguments); layoutSmoke(camera); };
    }
    // a chip: the same lit stone material as before (lit by the scene's lights), glowing by a per-copy heat colour (iEmi)
    var chipMatI = new T.MeshLambertMaterial({ color: 0x4a3a36 });
    chipMatI.onBeforeCompile = function (sh) {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 iEmi;\nvarying vec3 vIEmi;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvIEmi = iEmi;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vIEmi;').replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive + vIEmi;');
    };
    chipMatI.customProgramCacheKey = function () { return 'cw-chip-layer'; };
    var chipLayers = GEO.chips.map(function (g) {
      var geo = g.clone(); geo.setAttribute('iEmi', new T.InstancedBufferAttribute(new Float32Array(CHIP_CAP * 3), 3));
      return new T.InstancedMesh(geo, chipMatI, CHIP_CAP);
    });
    chipLayers.forEach(function (m) { m.renderOrder = 5; });
    chipLayers.forEach(function (m) { m.frustumCulled = false; m.count = 0; m.visible = false; group.add(m); });
    function drawChips(dt) {
      chips.forEach(function (list, g) {
        for (var i = list.length - 1; i >= 0; i--) {
          var c = list[i]; c.t += dt; if (c.t >= c.life) { list.splice(i, 1); continue; }
          c.v.y -= 16 * dt; c.p.addScaledVector(c.v, dt); c.ang += dt * 14;
          if (c.smoky && c.t < 0.5 && (c.trail -= dt) <= 0) { c.trail = 0.045; puff(c.p, { s0: c.s * 0.9, s1: c.s * 2.4, life: 0.55, vel: new T.Vector3(0, 0.3, 0), alpha: 0.6, order: 4 }); }
          if (c.p.y < c.s && c.v.y < 0) { c.p.y = c.s; c.v.y *= -0.35; c.v.x *= 0.6; c.v.z *= 0.6; }
        }
        var L = chipLayers[g];
        for (var j = 0; j < list.length; j++) {
          var d = list[j], sc2 = d.t > d.life * 0.75 ? d.s * Math.max(0, 1 - (d.t - d.life * 0.75) / (d.life * 0.25)) : d.s;
          L.setMatrixAt(j, IM.compose(d.p, IQ.setFromAxisAngle(d.ax, d.ang), IS.set(sc2, sc2, sc2)));
          var heat = Math.max(0, 1 - d.t / (d.life * 0.7)); L.geometry.attributes.iEmi.setXYZ(j, d.hot.r * heat, d.hot.g * heat, d.hot.b * heat);
        }
        L.count = list.length; L.visible = list.length > 0; L.instanceMatrix.needsUpdate = L.geometry.attributes.iEmi.needsUpdate = true;
      });
    }

    // ---------- the laser: three tubes of light, one inside the other ----------
    function beam(o) {
      var r = o.r || 0.18, dir = new T.Vector3(), q = new T.Quaternion(), list = [];
      [{ k: 3.2, fs: FS.halo, a: 0.6, w: 0.6, side: T.FrontSide }, { k: 1.9, fs: FS.coil, a: 0.9, w: 0.5, side: T.DoubleSide }, { k: 1, fs: FS.core, a: 1, w: 1, side: T.FrontSide }].forEach(function (L) {
        var m = new T.Mesh(GEO.tube, mat(L.fs, { uCol: { value: C(o.col) }, uDeep: { value: C(o.deep) }, uLen: { value: 1 }, uOpen: { value: 0 }, uAlpha: { value: L.a }, uWob: { value: L.w } }, { side: L.side }, VS_TUBE));
        m.userData.k = L.k; list.push(add(m, { order: 6 }));
      });
      return {
        set: function (a, b, open) {
          dir.copy(b).sub(a); var len = Math.max(0.01, dir.length()); dir.multiplyScalar(1 / len); q.setFromUnitVectors(Y, dir);
          list.forEach(function (p) { var m = p.mesh, k = m.userData.k; m.position.copy(a); m.quaternion.copy(q); m.scale.set(r * k, len, r * k); U(p).uLen.value = len; U(p).uOpen.value = open; });
        },
        kill: function () { list.forEach(drop); }
      };
    }
    // ---------- a ball of light (beam tip, muzzle, charge) ----------
    function orb(o) {
      var p = add(new T.Mesh(GEO.ball, mat(FS.orb, { uCol: { value: C(o.col) }, uDeep: { value: C(o.deep || o.col) }, uAlpha: { value: o.alpha === undefined ? 1 : o.alpha }, uSeed: { value: Math.random() * 9 } })), { order: o.order === undefined ? 7 : o.order });
      return {
        set: function (pos, size, alpha) { p.mesh.position.copy(pos); p.mesh.scale.setScalar(Math.max(0.001, size)); if (alpha !== undefined) U(p).uAlpha.value = alpha; },
        kill: function () { drop(p); }, part: p
      };
    }
    // ---------- a moon ----------
    function moon(o) {
      var body = add(new T.Mesh(GEO.ball, mat(FS.moon, { uLit: { value: C(o.lit || 0xf4f0ff) }, uDark: { value: C(o.dark || 0x372a72) }, uRim: { value: C(o.rim || 0xb8a8ff) }, uL: { value: new T.Vector3(-0.75, 0.42, 0.5) }, uAlpha: { value: 1 }, uSolid: { value: o.solid ? 1 : 0 } }, { normal: true, depthTest: false })), { order: 7 });
      // o.line: a dark outline round it (drawn just before it, over everything like the moon itself), for a ball that has
      // to stand out from busy light; o.solid: its dark side is not see-through
      var line = o.line === undefined ? null : add(new T.Mesh(GEO.ball, outlineMat(o.line)), { order: 6.9 });
      var glow = orb({ col: o.rim || 0xb8a8ff, deep: o.deep || 0x6a4cff, alpha: o.glowA === undefined ? 0.5 : o.glowA, order: 6 }), spin = 0, spinK = o.spin || 0.6;
      body.mesh.name = 'core3d moon';
      return {
        set: function (pos, radius, dt) {
          spin += (dt || 0) * spinK; body.mesh.position.copy(pos); body.mesh.scale.setScalar(Math.max(0.001, radius)); body.mesh.rotation.set(0.3, spin, 0.2);
          if (line) { line.mesh.position.copy(pos); line.mesh.scale.setScalar(Math.max(0.001, radius * 1.1)); }
          glow.set(pos, radius * 1.55);
        },
        // change its colours while it lives (lit face, dark side, rim and glow; a lit/dark/rim/deep set as for moon())
        tint: function (lit, dark, rim, deep) {
          var u = U(body); u.uLit.value.setHex(lit); u.uDark.value.setHex(dark); u.uRim.value.setHex(rim);
          var g = U(glow.part); g.uCol.value.setHex(rim); g.uDeep.value.setHex(deep);
          if (line && arguments.length > 4) line.mesh.material = outlineMat(arguments[4]);
        },
        kill: function () { drop(body); glow.kill(); if (line) drop(line); }
      };
    }
    // run fn after t seconds of effect time (cleared with everything else)
    function later(t, fn) { add(new T.Object3D(), { life: 1e9, upd: function (dt, tt) { if (tt >= t) { fn(); return true; } } }); }
    // ---------- smoke: a grey puff that swells, drifts and frays away ----------
    // Puffs are drawn in runs (above). The first time smoke was drawn as copies, all of it in one layer, the user found
    // the meteor rain weaker (2026-11-14) and each puff went back to its own mesh, 450 draws a frame: an iPhone 17 Pro
    // stuttered ("스킬 난사하다보면 엄청 버벅"). In runs the picture is the single puffs' picture, checked pixel by pixel
    // against it. batchSmoke(false) draws single puffs again, for such checks.
    // Rock chips are solid (drawn with the depth buffer, in any order), so drawing them as copies does not change how they
    // look: batchChips stays on (a quarter of the meteor rain's draws).
    var batchSmoke = true, batchChips = true;
    function puffMesh(pos, o) {
      var life = o.life || 0.9, s0 = o.s0 || 0.2, s1 = o.s1 || 0.6, v = o.vel ? o.vel.clone() : new T.Vector3(0, 0.6, 0), drag = o.drag === undefined ? 1.5 : o.drag;
      var m = new T.Mesh(GEO.puff, mat(FS.smoke, { uDark: { value: C(o.dark || 0x2c2624) }, uLight: { value: C(o.light || 0x9a908a) }, uK: { value: 0 }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: o.alpha === undefined ? 0.85 : o.alpha } }, { normal: true }));
      m.position.copy(pos); m.scale.setScalar(s0); m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
      var p = add(m, { order: o.order === undefined ? 5 : o.order, life: life, upd: function (dt, t) {
        var k = t / life; m.position.addScaledVector(v, dt); v.multiplyScalar(Math.max(0, 1 - dt * drag)); m.scale.setScalar(s0 + (s1 - s0) * ease(k)); U(p).uK.value = k;
      } });
      return p;
    }
    // (with batchSmoke: no mesh of its own, drawn in a run. Everything else is what puffMesh does, in the same order, the
    // three random numbers too: it is in parts, first moved in the frame after it was made, and ended, like a single puff.
    // id: which of two puffs at exactly the same depth was made first)
    function puff(pos, o) {
      if (CW.fxOff && CW.fxOff.smoke) return;   // (switches for measuring on a phone, dev/phone-perf-*.html)
      o = o || {}; if (!batchSmoke) return puffMesh(pos, o);
      var life = o.life || 0.9, s0 = o.s0 || 0.2, s1 = o.s1 || 0.6, v = o.vel ? o.vel.clone() : new T.Vector3(0, 0.6, 0), drag = o.drag === undefined ? 1.5 : o.drag;
      var q = { puff: true, id: ++puffId, z: 0, p: pos.clone(), q: null, s: s0, k: 0, dark: C(o.dark || 0x2c2624), light: C(o.light || 0x9a908a), seed: Math.random() * 9, alpha: o.alpha === undefined ? 0.85 : o.alpha, order: o.order === 4 ? 4 : 5 };
      q.q = new T.Quaternion().setFromEuler(IE.set(Math.random() * 6, Math.random() * 6, 0));
      var p = { mesh: HOLD, puff: q, t: 0, life: life, dead: false, upd: function (dt, t) {
        var k = t / life; q.p.addScaledVector(v, dt); v.multiplyScalar(Math.max(0, 1 - dt * drag)); q.s = s0 + (s1 - s0) * ease(k); q.k = k;
      } };
      parts.push(p); return p;
    }
    // ---------- a burning rock: faceted stone with a dark outline, a white-hot cap of air in front, a fire tail that
    // starts behind it (so the stone itself stays in sight) and a trail of smoke that hangs in the air after it ----------
    function rock(o) {
      var size = o.size || 0.3, tilt = new T.Vector3(Math.random(), Math.random(), Math.random()).normalize(), spin = 0, vd = new T.Vector3(0, -1, 0), back = new T.Vector3(), q = new T.Quaternion(), qb = new T.Quaternion(), puffT = 0, at = new T.Vector3();
      var geo = GEO.rocks[(Math.random() * 3) | 0];
      var body = add(new T.Mesh(geo, mat(FS.rock, { uHot: { value: C(o.hot || 0xff8a2b) }, uDir: { value: vd.clone() }, uBase: { value: C(o.base || 0x5e4f48) }, uHeat: { value: 1 } }, { solid: true })), { order: 5 });
      var line = add(new T.Mesh(geo, LINE), { order: 5 });
      body.mesh.name = 'core3d rock';
      var cap = add(new T.Mesh(GEO.dome, mat(FS.sheath, { uCol: { value: C(o.col || 0xffb030) }, uAlpha: { value: 1 } })), { order: 6 });
      var tail = add(new T.Mesh(GEO.cone, mat(FS.tail, { uCol: { value: C(o.col || 0xffb030) }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: 1 } })), { order: 6 });
      var glow = orb({ col: o.col || 0xffb030, deep: o.hot || 0xff6a1a, alpha: 0.26, order: 6 });
      var blaze = add(new T.Mesh(GEO.ball, mat(FS.blaze, { uCol: { value: C(o.col || 0xffb030) }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: 1 } })), { order: 6 });
      var blaze2 = add(new T.Mesh(GEO.ball, mat(FS.blaze, { uCol: { value: C(o.hot || 0xff7a1a) }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: 0.65 } })), { order: 6 });
      return {
        set: function (pos, vel, dt) {
          var sp = vel.length(); if (sp > 1e-4) vd.copy(vel).multiplyScalar(1 / sp);
          back.copy(vd).negate();
          spin += (dt || 0) * 6; body.mesh.position.copy(pos); body.mesh.quaternion.setFromAxisAngle(tilt, spin); body.mesh.scale.setScalar(size);
          line.mesh.position.copy(pos); line.mesh.quaternion.copy(body.mesh.quaternion); line.mesh.scale.setScalar(size * 1.09);
          U(body).uDir.value.copy(vd);
          q.setFromUnitVectors(Y, vd); cap.mesh.position.copy(pos).addScaledVector(vd, size * 0.12); cap.mesh.quaternion.copy(q); cap.mesh.scale.set(size * 1.35, size * 1.7, size * 1.35);
          qb.setFromUnitVectors(Y, back);
          var len = Math.max(1.6, Math.min(6.5, sp * 0.24)) * size / 0.3;
          tail.mesh.position.copy(pos).addScaledVector(back, size * 0.15); tail.mesh.quaternion.copy(qb); tail.mesh.scale.set(size * 0.9, len, size * 0.9);
          glow.set(pos, size * 2.5);
          // two shells of flame round the stone, the outer one longer and pulled back
          blaze.mesh.position.copy(pos).addScaledVector(back, size * 0.2); blaze.mesh.quaternion.copy(qb); blaze.mesh.scale.set(size * 1.3, size * 1.6, size * 1.3);
          blaze2.mesh.position.copy(pos).addScaledVector(back, size * 0.65); blaze2.mesh.quaternion.copy(qb); blaze2.mesh.scale.set(size * 1.55, size * 2.3, size * 1.55);
          // smoke left behind along the path: it hangs there after the rock has gone, so its way down stays in sight
          puffT -= dt || 0;
          if (puffT <= 0) {
            puffT = 0.038; at.copy(pos).addScaledVector(back, size * (1.4 + Math.random() * 1.2)).add(new T.Vector3((Math.random() - 0.5) * size * 0.4, (Math.random() - 0.5) * size * 0.4, 0));
            puff(at, { s0: size * 0.28, s1: size * (0.7 + Math.random() * 0.3), life: 0.7 + Math.random() * 0.3, vel: back.clone().multiplyScalar(0.6).add(new T.Vector3(0, 0.25, 0)), dark: o.smokeDark || 0x302826, light: o.smokeLight || 0x7e746e, alpha: 0.42, order: 4 });
          }
        },
        kill: function () { drop(body); drop(line); drop(cap); drop(tail); drop(blaze); drop(blaze2); glow.kill(); }
      };
    }
    // ---------- a fireball: rolling fire round a white-hot heart, flames streaming back off it, a fire tail and a little
    // smoke; it all points the way it flies. set() it every frame like a painted head; kill() when it lands ----------
    function fireball(o) {
      var size = o.size || 0.3, col = o.col || 0xff7a2b, vd = new T.Vector3(0, -1, 0), back = new T.Vector3(), qb = new T.Quaternion(), puffT = 0, at = new T.Vector3();
      // o.deep / o.glowDeep / o.smoke ([dark, light]): another fire than orange (a violet shooting star)
      var glow = orb({ col: col, deep: o.glowDeep || 0xff4a10, alpha: 0.18, order: 6 });
      var ball = add(new T.Mesh(GEO.ball, mat(FS.fire, { uCol: { value: C(col) }, uDeep: { value: C(o.deep || 0x8a1a08) }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: 1 } })), { order: 7 });
      var heart = orb({ col: o.hot || 0xfff2c0, deep: col, alpha: 0.6, order: 8 });
      var flames = add(new T.Mesh(GEO.ball, mat(FS.blaze, { uCol: { value: C(col) }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: 0.85 } })), { order: 7 });
      var tail = add(new T.Mesh(GEO.cone, mat(FS.tail, { uCol: { value: C(col) }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: 1 } })), { order: 6 });
      ball.mesh.name = 'core3d fire';   // (checks find the 3D bodies by this name)
      return {
        set: function (pos, vel, dt) {
          var sp = vel.length(); if (sp > 1e-4) vd.copy(vel).multiplyScalar(1 / sp);
          back.copy(vd).negate(); qb.setFromUnitVectors(Y, back);
          glow.set(pos, size * 2.0); heart.set(pos, size * 0.45);
          ball.mesh.position.copy(pos); ball.mesh.quaternion.copy(qb); ball.mesh.scale.set(size, size * 1.12, size);
          flames.mesh.position.copy(pos).addScaledVector(back, size * 0.45); flames.mesh.quaternion.copy(qb); flames.mesh.scale.set(size * 1.35, size * 2.1, size * 1.35);
          var len = Math.max(1.4, Math.min(4.5, sp * 0.2)) * size / 0.3;
          tail.mesh.position.copy(pos).addScaledVector(back, size * 0.3); tail.mesh.quaternion.copy(qb); tail.mesh.scale.set(size * 0.95, len, size * 0.95);
          puffT -= dt || 0;
          if (puffT <= 0 && sp > 1) { puffT = 0.05; at.copy(pos).addScaledVector(back, size * (1.6 + Math.random())); puff(at, { s0: size * 0.25, s1: size * 0.65, life: 0.55, vel: back.clone().multiplyScalar(0.5).add(new T.Vector3(0, 0.3, 0)), alpha: 0.35, order: 4, dark: o.smoke && o.smoke[0], light: o.smoke && o.smoke[1] }); }
        },
        resize: function (v) { size = v; },
        kill: function () { glow.kill(); drop(ball); heart.kill(); drop(flames); drop(tail); }
      };
    }
    // ---------- a column of fire standing on the ground: a hot wall of flame inside a wider one, a glow at its foot.
    // set(pos on the ground, height, radius, k): k 0 → 1 while it burns down and away. o.col / o.hot: outer / inner
    // flame colour, o.lo: the coolest colour (dark red for fire) ----------
    var FIRE_LO = 0x6b0d12, footAt = new T.Vector3();
    // o.speed: how fast the flames race up it (1 = a steady fire); geo: its shape (a tube, or the curtain that is narrow
    // at the ground and flares out at the top)
    function flameMesh(col, lo, a, heat, R, o, geo) {
      return add(new T.Mesh(geo || GEO.tube, mat(FS.flame, { uCol: { value: C(col) }, uLo: { value: C(lo) }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: a }, uR: { value: R }, uK: { value: 0 }, uHeat: { value: heat }, uTop: { value: 0 }, uCrest: { value: 0 }, uSpeed: { value: o.speed || 1 } }, { side: T.DoubleSide, keepAdd: o.keepAdd })), { order: 6 });
    }
    function column(o) {
      o = o || {}; var col = o.col || 0xff7a2b, hot = o.hot || 0xffc23a, lo = o.lo === undefined ? FIRE_LO : o.lo;
      var outer = flameMesh(col, lo, o.alpha === undefined ? 0.95 : o.alpha, 0, 1.2, o, o.flare ? GEO.curtain : null), inner = flameMesh(hot, lo, 0.75, 1, 0.9, o);
      var foot = orb({ col: col, deep: lo, alpha: 0.25, order: 6 });
      outer.mesh.name = 'core3d flame';
      return {
        // lean: radians it tips over sideways (x), as a wave leaning into the way it runs
        set: function (pos, h, r, k, lean) {
          k = k || 0; lean = lean || 0;
          outer.mesh.position.copy(pos); outer.mesh.scale.set(r, Math.max(0.001, h), r); outer.mesh.rotation.set(0, 0, lean); U(outer).uK.value = k;
          inner.mesh.position.copy(pos); inner.mesh.scale.set(r * 0.55, Math.max(0.001, h * 0.82), r * 0.55); inner.mesh.rotation.set(0, 0, lean); U(inner).uK.value = Math.min(1, k * 1.3);
          foot.set(footAt.set(pos.x, pos.y + r * 0.25, pos.z), r * 1.0, 0.25 * (1 - k));
        },
        kill: function () { drop(outer); drop(inner); foot.kill(); }
      };
    }
    // ---------- a low wall standing in a ring round a point, pushed outward over the ground: fire, frost (a cold mist
    // wall) or sunlight. set(centre on the ground, radius, height, k 0 → 1 burning away) ----------
    var WALL = { fire: [0xff7a2b, FIRE_LO], frost: [0xbfeaff, 0x1a3c8c], sun: [0xffc84a, 0x7a2a08] };
    function ringWall(o) {
      o = o || {}; var p = WALL[o.kind] || WALL.fire;
      var m = flameMesh(o.col || p[0], o.lo === undefined ? p[1] : o.lo, o.alpha === undefined ? 0.95 : o.alpha, o.heat || 0, 2, o);
      m.mesh.name = 'core3d wall';
      return {
        set: function (c, r, h, k) {
          // the flames keep their size as the ring grows: as many again round it for every unit it is across
          m.mesh.position.set(c.x, 0.02, c.z); m.mesh.scale.set(Math.max(0.001, r), Math.max(0.001, h), Math.max(0.001, r)); U(m).uR.value = Math.max(1.2, r * 1.5); U(m).uK.value = k || 0;
        },
        kill: function () { drop(m); }
      };
    }
    // ---------- a wave of fire: a sheet of flame shaped like a breaking sea wave (VS_WAVE) rolling down the field toward
    // the camera — a red outer sheet and a hotter one inside it. set(z of its foot, centre x, height, curl 0..~2.6 rad, k 0 → 1 burning
    // away, dir +1/-1, length along z, bow forward in the middle) ----------
    var WAVE_GEO = new T.PlaneGeometry(1, 1, 72, 26);
    function fireWave(o) {
      o = o || {};
      // two sheets of blazing flame (FS.wfire), one a little behind and inside the other, so the fire has depth
      function sheet(a) {
        return add(new T.Mesh(WAVE_GEO, mat(FS.wfire, { uSeed: { value: Math.random() * 9 }, uAlpha: { value: a }, uK: { value: 0 }, uLand: { value: 0 },
          uH: { value: 1 }, uA: { value: 1 }, uLen: { value: 9 }, uDir: { value: 1 }, uBow: { value: 0 }, uSway: { value: 1 } }, { side: T.DoubleSide, keepAdd: o.keepAdd }, VS_WAVE)), { order: 6 });
      }
      var outer = sheet(o.alpha === undefined ? 1 : o.alpha), inner = sheet(0.75);
      outer.mesh.name = 'core3d wave';
      return {
        set: function (z, xc, h, curl, k, dir, len, bow, tilt, sway) {
          var land = Math.max(0, Math.min(1, (curl - 1.6) / 1.2));
          [[outer, 1, 0], [inner, 0.78, -0.25]].forEach(function (L) {
            var m = L[0].mesh, u = U(L[0]);
            m.position.set(xc, 0.02, z + L[2] * dir * h);
            // leaned back like the characters (scene.js TILT), so the face is seen full on from the camera above, not squashed flat
            m.rotation.set(-(tilt === undefined ? 0.6 : tilt) * dir, 0, 0);
            u.uH.value = Math.max(0.001, h * L[1]); u.uA.value = curl * (L[1] < 1 ? 0.9 : 1); u.uLen.value = len; u.uDir.value = dir; u.uBow.value = bow || 0; u.uSway.value = sway === undefined ? 1 : sway; u.uLand.value = land; u.uK.value = Math.min(1, (k || 0) * (L[1] < 1 ? 1.3 : 1));
          });
        },
        kill: function () { drop(outer); drop(inner); }
      };
    }
    // ---------- the user's painted wave of fire (art/fx-firewave.webp, 2026-11-15) on a bending sheet, leaned back like
    // the characters so it faces the camera. set(pos of the middle of its foot, height, bend 0..1, squash, dis 0..1, flip)
    var waveTex = null, waveLoading = false;
    function loadWaveTex() {
      if (waveTex || waveLoading || !T.TextureLoader) return; waveLoading = true;
      new T.TextureLoader().load((root.CW && root.CW.ART_BASE || 'art/') + 'fx-firewave.webp', function (t) { t.anisotropy = 4; waveTex = t; parts.forEach(function (p) { if (p.waveSheet) U(p).uMap.value = t; }); }, undefined, function () { waveLoading = false; });
    }
    loadWaveTex();
    var PIC_GEO = new T.PlaneGeometry(1, 1, 24, 32);
    function picWave(o) {
      o = o || {}; loadWaveTex();
      var p = add(new T.Mesh(PIC_GEO, mat(FS.pic, { uMap: { value: waveTex }, uAlpha: { value: 1 }, uDis: { value: 0 }, uGlow: { value: 1 }, uW: { value: 1 }, uH: { value: 1 }, uBend: { value: 0 }, uSquash: { value: 1 }, uFlip: { value: 1 } }, { normal: true, side: T.DoubleSide }, VS_PIC)), { order: 6 });
      p.waveSheet = true; p.mesh.name = 'core3d picwave';
      return {
        set: function (pos, h, bend, squash, dis, flip, alpha) {
          var u = U(p); p.mesh.position.copy(pos); p.mesh.rotation.set(-0.6, 0, 0);
          u.uH.value = Math.max(0.001, h); u.uW.value = Math.max(0.001, h * 1.506); u.uBend.value = bend || 0; u.uSquash.value = squash === undefined ? 1 : squash;
          u.uDis.value = dis || 0; u.uFlip.value = flip || 1; u.uAlpha.value = alpha === undefined ? 1 : alpha; if (!u.uMap.value && waveTex) u.uMap.value = waveTex;
          p.mesh.visible = !!u.uMap.value;
        },
        kill: function () { drop(p); }
      };
    }
    // ---------- the painted wave cut into pieces (9 x 7 cells of the picture, the 55 that hold fire), each piece placed,
    // turned, sized and faded on its own (a skill moves them), all drawn at once. put(i, pos, rx, rz, sx, sy, alpha, dis),
    // then commit() once a frame ----------
    var SHARD_C = 9, SHARD_R = 7, SHARD_CELLS = [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[8,1],[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],
      [1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[2,6],[3,6],[4,6],[5,6],[6,6]];
    var SHARD_GEO = (function () {
      var g = new T.InstancedBufferGeometry().copy(new T.PlaneGeometry(1, 1)), n = SHARD_CELLS.length, rect = new Float32Array(n * 4), ad = new Float32Array(n * 2);
      SHARD_CELLS.forEach(function (cr, i) { var o = 0.25; rect.set([(cr[0] - o) / SHARD_C, (cr[1] - o) / SHARD_R, (cr[0] + 1 + o) / SHARD_C, (cr[1] + 1 + o) / SHARD_R], i * 4); });
      g.setAttribute('iRect', new T.InstancedBufferAttribute(rect, 4)); g.setAttribute('iAD', new T.InstancedBufferAttribute(ad, 2).setUsage(T.DynamicDrawUsage));
      return g;
    })();
    function waveShards(o) {
      o = o || {}; loadWaveTex();
      var n = SHARD_CELLS.length, m = new T.InstancedMesh(SHARD_GEO, mat(FS.shard, { uMap: { value: waveTex } }, { normal: true, side: T.DoubleSide }, VS_SHARD), n);
      m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.name = 'core3d shards';
      var p = add(m, { order: 6 }), ad = SHARD_GEO.attributes.iAD, q = new T.Quaternion(), e = new T.Euler(0, 0, 0, 'XYZ'), sc3 = new T.Vector3(), M = new T.Matrix4();
      p.waveSheet = true;
      return {
        cells: SHARD_CELLS.map(function (cr) { return { u: (cr[0] + 0.5) / SHARD_C, v: (cr[1] + 0.5) / SHARD_R }; }), C: SHARD_C, R: SHARD_R,
        put: function (i, pos, rx, rz, sx, sy, alpha, dis) {
          e.set(rx, 0, rz); q.setFromEuler(e); sc3.set(Math.abs(sx) < 0.001 ? 0.001 : sx, Math.max(0.001, sy), 1);   // a negative sx mirrors the piece
          m.setMatrixAt(i, M.compose(pos, q, sc3)); ad.setXY(i, alpha, dis || 0);
        },
        commit: function () { var u = U(p); if (!u.uMap.value && waveTex) u.uMap.value = waveTex; m.visible = !!u.uMap.value; m.instanceMatrix.needsUpdate = true; ad.needsUpdate = true; },
        kill: function () { drop(p); }
      };
    }
    // ---------- the user's drawn fire wave as it lives (art/fx-firewave-seq.webp, 2026-11-15: eight scenes — a small
    // flame, growing into a wave, its biggest, breaking, scattering, last wisps), each scene cut into 8 x 6 pieces. Two
    // scenes are shown at once while one turns into the next. put(slot 0/1, scene 0..7, piece, pos, rx, rz, sx, sy,
    // alpha, dis), then commit() once a frame ----------
    var seqTex = null, seqLoading = false, SEQ_GC = 8, SEQ_GR = 6, SEQ_N = SEQ_GC * SEQ_GR;
    function loadSeqTex() {
      if (seqTex || seqLoading || !T.TextureLoader) return; seqLoading = true;
      new T.TextureLoader().load((root.CW && root.CW.ART_BASE || 'art/') + 'fx-firewave-seq.webp', function (t) { t.anisotropy = 4; seqTex = t; parts.forEach(function (p) { if (p.seqSheet) U(p).uMap.value = t; }); }, undefined, function () { seqLoading = false; });
    }
    loadSeqTex();
    function seqWave() {
      loadSeqTex();
      var g = new T.InstancedBufferGeometry().copy(new T.PlaneGeometry(1, 1)), rect = new Float32Array(SEQ_N * 2 * 4), ad = new Float32Array(SEQ_N * 2 * 2), sceneOf = new Int8Array(SEQ_N * 2).fill(-1);
      g.setAttribute('iRect', new T.InstancedBufferAttribute(rect, 4).setUsage(T.DynamicDrawUsage)); g.setAttribute('iAD', new T.InstancedBufferAttribute(ad, 2).setUsage(T.DynamicDrawUsage));
      var m = new T.InstancedMesh(g, mat(FS.shard, { uMap: { value: seqTex } }, { normal: true, side: T.DoubleSide }, VS_SHARD), SEQ_N * 2);
      m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.name = 'core3d seqwave';
      var p = add(m, { order: 6 }), q = new T.Quaternion(), e = new T.Euler(0, 0, 0, 'XYZ'), sc3 = new T.Vector3(), M = new T.Matrix4();
      p.seqSheet = true;
      // the picture rect of one piece of one scene (a quarter piece wider on every side so neighbours overlap; kept
      // inside its own scene of the sheet)
      function pieceRect(scene, k) {
        var c = scene % 4, r = (scene / 4) | 0, u0 = c / 4, v0 = 1 - (r + 1) / 2, du = 0.25 / SEQ_GC, dv = 0.5 / SEQ_GR, pc = k % SEQ_GC, pr = (k / SEQ_GC) | 0, o = 0.25;
        return [Math.max(u0, u0 + (pc - o) * du), Math.max(v0, v0 + (pr - o) * dv), Math.min(u0 + 0.25, u0 + (pc + 1 + o) * du), Math.min(v0 + 0.5, v0 + (pr + 1 + o) * dv)];
      }
      return {
        GC: SEQ_GC, GR: SEQ_GR, N: SEQ_N, ASPECT: 384 / 304,
        // the piece k sits at (u, v) of its scene: u 0..1 left to right, v 0..1 bottom to top
        uv: function (k) { return { u: ((k % SEQ_GC) + 0.5) / SEQ_GC, v: (((k / SEQ_GC) | 0) + 0.5) / SEQ_GR }; },
        put: function (slot, scene, k, pos, rx, rz, sx, sy, alpha, dis) {
          var i = slot * SEQ_N + k;
          if (sceneOf[i] !== scene) { sceneOf[i] = scene; rect.set(pieceRect(scene, k), i * 4); }
          e.set(rx, 0, rz); q.setFromEuler(e); sc3.set(Math.abs(sx) < 0.001 ? 0.001 : sx, Math.max(0.001, sy), 1);
          m.setMatrixAt(i, M.compose(pos, q, sc3)); ad[i * 2] = alpha; ad[i * 2 + 1] = dis || 0;
        },
        commit: function () { var u = U(p); if (!u.uMap.value && seqTex) u.uMap.value = seqTex; m.visible = !!u.uMap.value; m.instanceMatrix.needsUpdate = true; g.attributes.iAD.needsUpdate = true; g.attributes.iRect.needsUpdate = true; },
        kill: function () { drop(p); g.dispose(); }
      };
    }
    // ---------- an ice spear: a long clear crystal with a dark blue outline, a cold glow round it and frost mist left
    // along its way. set(pos, vel, dt, grow): its middle at pos, its point along vel, grow 0..1 while it forms.
    // o.thin: its width for its length (0.13); o.line: another outline colour; o.mist false: no frost mist (a spear of light, not of ice) ----------
    function iceSpear(o) {
      var len = o.size || 1, col = o.col || 0x9fe4ff, deep = o.deep || 0x2a6cff, vd = new T.Vector3(0, 1, 0), q = new T.Quaternion(), spin = 0, mistT = 0, at = new T.Vector3(), mist = o.mist !== false;
      var glow = orb({ col: col, deep: deep, alpha: 0.35, order: 6 });
      var body = add(new T.Mesh(GEO.crystal, mat(FS.ice, { uCol: { value: C(col) }, uDeep: { value: C(deep) }, uAlpha: { value: 0.88 }, uSeed: { value: Math.random() * 9 } }, { normal: true })), { order: 7 });
      var line = add(new T.Mesh(GEO.crystal, lineMat(o.line)), { order: 7 });
      body.mesh.name = 'core3d ice';
      return {
        set: function (pos, vel, dt, grow) {
          var g = grow === undefined ? 1 : Math.max(0.001, grow), sp = vel.length(); if (sp > 1e-4) vd.copy(vel).multiplyScalar(1 / sp);
          spin += (dt || 0) * 4; q.setFromUnitVectors(Y, vd).multiply(new T.Quaternion().setFromAxisAngle(Y, spin));
          var L = len * g, r = len * (o.thin || 0.13) * g;
          body.mesh.position.copy(pos).addScaledVector(vd, -L * 0.3); body.mesh.quaternion.copy(q); body.mesh.scale.set(r, L, r);
          line.mesh.position.copy(body.mesh.position); line.mesh.quaternion.copy(q); line.mesh.scale.set(r * 1.18, L * 1.04, r * 1.18);
          glow.set(pos, L * 0.42);
          mistT -= dt || 0;
          // frost mist only while it flies (not while it forms, when vel is just where it aims)
          if (mist && grow === undefined && sp > 1 && mistT <= 0) { mistT = 0.04; at.copy(pos).addScaledVector(vd, -L * (0.5 + Math.random() * 0.4)); puff(at, { s0: r * 0.7, s1: r * 1.8, life: 0.45, vel: new T.Vector3(0, 0.2, 0), dark: 0x8fc0e8, light: 0xf0faff, alpha: 0.2, order: 4 }); }
        },
        kill: function () { glow.kill(); drop(body); drop(line); }
      };
    }
    // ---------- ice bursting up out of the ground round a spot: crystals shoot up leaning outward, stand a moment, then
    // sink back into the ground (size: how far they spread; n: how many) ----------
    function iceSpikes(pos, o) {
      o = o || {}; var R = o.size || 1, n = o.n || 7, col = C(o.col || 0x9fe4ff);
      for (var i = 0; i < n; i++) {
        var a = i / n * 6.283 + Math.random() * 0.4, d = i === 0 ? 0 : R * (0.35 + Math.random() * 0.3), h = R * (i === 0 ? 1.25 : 0.6 + Math.random() * 0.45);
        var tilt = new T.Quaternion().setFromAxisAngle(new T.Vector3(Math.sin(a), 0, -Math.cos(a)), i === 0 ? 0 : 0.35 + Math.random() * 0.3);
        addSpike({ x: pos.x + Math.cos(a) * d, z: pos.z + Math.sin(a) * d * 0.8, h: h, w: h * 0.2, tilt: tilt, col: col, delay: i === 0 ? 0 : 0.02 + Math.random() * 0.06, life: 1.0 });
      }
    }
    // ---------- one ice spike shooting up out of the ground (a row of these makes a path of ice); lean tips it sideways
    // (radians) ----------
    function iceSpike(pos, o) {
      o = o || {}; var h = o.h || 0.6;
      addSpike({ x: pos.x, z: pos.z, h: h, w: h * 0.2, tilt: new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), o.lean || 0), col: C(o.col || 0x9fe4ff), delay: 0, life: o.life || 0.6 });
    }
    // ---------- where a rock is about to land: the ground darkens under it and is lit by its fire ----------
    function mark(o) {
      var sh = add(new T.Mesh(GEO.flat, mat(FS.shadow, { uK: { value: 0 }, uAlpha: { value: 1 } }, { normal: true })), { order: 3 });
      var gl = add(new T.Mesh(GEO.flat, mat(FS.gglow, { uCol: { value: C(o.col || 0xff9a30) }, uK: { value: 0 }, uAlpha: { value: 1 } })), { order: 4 });
      return {
        set: function (pos, k, R) {
          sh.mesh.position.set(pos.x, 0.03, pos.z); sh.mesh.scale.setScalar(R * (1.6 - 0.7 * k)); U(sh).uK.value = k;
          gl.mesh.position.set(pos.x, 0.036, pos.z); gl.mesh.scale.setScalar(R * (2.6 - 1.0 * k)); U(gl).uK.value = k;
        },
        kill: function () { drop(sh); drop(gl); }
      };
    }
    // ---------- a meteor striking the ground ----------
    // In the first instant a white-hot flash; then a crown of dirt thrown up and out round the hit, a ball of fire that
    // rises and burns away, a ring rolling over the ground, a puff ring of dust and a column of smoke that rise after it,
    // rocks thrown out (some trailing smoke), and a scorched hollow with molten cracks that cool for a while.
    function impact(pos, o) {
      if (CW.fxOff && CW.fxOff.ground) return;
      o = o || {}; var R = o.size || 1, x = pos.x, z = pos.z, col = o.col || 0xff9a2a, dirt = o.dirt || 0x6a5546, calm = o.calm === undefined ? 1 : o.calm;
      var fl = orb({ col: bright ? 0xffd040 : 0xfff6d0, deep: bright ? 0xff6a10 : col, alpha: 1, order: 7 }), fT = 0.2;
      fl.set(new T.Vector3(x, R * 0.35, z), R * 0.4, calm);
      add(new T.Object3D(), { life: fT, upd: function (dt, t) { var k = t / fT; fl.set(new T.Vector3(x, R * 0.35, z), R * (0.4 + 0.8 * ease(k / 0.4)), Math.max(0, 1 - k * k) * calm); if (k >= 1) { fl.kill(); return true; } } });
      var fbL = 0.7, fb = add(new T.Mesh(GEO.ball, mat(FS.dome, { uCol: { value: C(col) }, uLow: { value: C(0x8a1a08) }, uHot: { value: 0.42 }, uK: { value: 0 }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: 0.4 + 0.6 * calm } })), {
        order: 6, life: fbL, upd: function (dt, t) { var k = t / fbL; fb.mesh.scale.setScalar(R * (0.28 + 0.62 * ease(k / 0.28))); fb.mesh.position.y = R * (0.3 + 0.9 * ease(k)); U(fb).uK.value = Math.min(1, Math.max(0, (k - 0.1) / 0.9)); }
      });
      fb.mesh.position.set(x, R * 0.2, z); fb.mesh.scale.setScalar(R * 0.22);
      var cuL = 0.5, cu = add(new T.Mesh(GEO.curtain, mat(FS.ejecta, { uDirt: { value: C(dirt) }, uHot: { value: C(o.hot || 0xff7a1a) }, uK: { value: 0 }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: 0.8 } }, { side: T.DoubleSide, normal: true })), {
        order: 6, life: cuL, upd: function (dt, t) { var k = t / cuL, e = ease(k / 0.7); cu.mesh.scale.set(R * (0.35 + 0.9 * e), R * (0.3 + 0.85 * e) * (1 - 0.3 * k), R * (0.35 + 0.9 * e)); U(cu).uK.value = k; }
      });
      cu.mesh.position.set(x, 0.02, z); cu.mesh.scale.setScalar(R * 0.35);
      var rgL = 0.5, rg = add(new T.Mesh(GEO.flat, mat(FS.shock, { uCol: { value: C(o.ringCol || 0xff8a2a) }, uK: { value: 0 }, uW: { value: 0.09 }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: 0.9 * calm } })), {
        order: 4, life: rgL, upd: function (dt, t) { U(rg).uK.value = ease(t / rgL); }
      });
      rg.mesh.position.set(x, 0.045, z); rg.mesh.scale.setScalar(R * (o.ring || 2.8));
      var scL = 1.8, sc2 = add(new T.Mesh(GEO.flat, mat(FS.scorch, { uK: { value: 0 }, uSeed: { value: Math.random() * 9 } }, { normal: true })), { order: 3, life: scL, upd: function (dt, t) { U(sc2).uK.value = t / scL; } });
      sc2.mesh.position.set(x, 0.032, z); sc2.mesh.scale.setScalar(R * 0.95);
      var ckL = 1.3, ck = add(new T.Mesh(GEO.flat, mat(FS.cracks, { uCol: { value: C(col) }, uK: { value: 0 }, uSeed: { value: Math.random() * 9 } })), { order: 4, life: ckL, upd: function (dt, t) { U(ck).uK.value = t / ckL; } });
      ck.mesh.position.set(x, 0.04, z); ck.mesh.scale.setScalar(R * 1.4);
      // dust rolling out along the ground, then smoke climbing out of the hollow
      for (var i = 0; i < 6; i++) { var a = i / 6 * 6.283 + Math.random() * 0.5; puff(new T.Vector3(x + Math.cos(a) * R * 0.4, R * 0.18, z + Math.sin(a) * R * 0.3), { s0: R * 0.16, s1: R * 0.38, life: 0.6, vel: new T.Vector3(Math.cos(a) * R * 4.0, 0.25, Math.sin(a) * R * 3.0), drag: 3.4, dark: 0x4a3e34, light: dirt, alpha: 0.42 }); }
      later(0.07, function () { for (var j = 0; j < 2; j++) puff(new T.Vector3(x + (Math.random() - 0.5) * R * 0.4, R * (0.3 + j * 0.18), z + (Math.random() - 0.5) * R * 0.3), { s0: R * 0.22, s1: R * (0.5 + Math.random() * 0.25), life: 1.0 + Math.random() * 0.4, vel: new T.Vector3((Math.random() - 0.5) * 0.4, 1.0 + j * 0.25, 0), drag: 1.2, dark: 0x3a3230, light: 0x8a807a, alpha: 0.38 }); });
      for (var c = 0; c < Math.round((o.chips === undefined ? 9 : o.chips) * (0.4 + 0.6 * calm)); c++) chip(pos, R, o.hot || 0xff7a1a, c < 2);
    }
    // ---------- an impact on the ground: fireball dome, rolling ring, hot crater, rocks thrown out ----------
    function blast(pos, o) {
      if (CW.fxOff && CW.fxOff.ground) return;
      o = o || {}; var R = o.size || 1, life = o.life || 0.9, col = o.col || 0xffa030, x = pos.x, z = pos.z;
      var dome = add(new T.Mesh(o.ball ? GEO.ball : GEO.dome, mat(FS.dome, { uCol: { value: C(col) }, uLow: { value: C(o.low === undefined ? 0x6b0d12 : o.low) }, uHot: { value: o.hotness === undefined ? 0.4 : o.hotness }, uK: { value: 0 }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: 1 } }, { side: T.DoubleSide, keepAdd: o.keepAdd })), {
        order: 6, life: life, upd: function (dt, t) { var k = t / life; dome.mesh.scale.setScalar(R * (0.25 + 0.95 * ease(k / 0.35))); U(dome).uK.value = Math.min(1, Math.max(0, (k - 0.12) / 0.88)); }
      });
      dome.mesh.position.set(x, o.ball ? (o.y || 0.8) : 0.02, z); dome.mesh.scale.setScalar(R * 0.25);
      var ring = add(new T.Mesh(GEO.flat, mat(FS.shock, { uCol: { value: C(o.ringCol || col) }, uK: { value: 0 }, uW: { value: 0.07 }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: o.ringAlpha === undefined ? 1 : o.ringAlpha } }, { keepAdd: o.keepAdd })), {
        order: 4, life: life * 0.8, upd: function (dt, t) { U(ring).uK.value = ease(t / (life * 0.8)); }
      });
      ring.mesh.position.set(x, 0.045, z); ring.mesh.scale.setScalar(R * (o.ring || 2.4));
      if (o.crater !== false) {
        var cl = (o.craterLife || 1.4), crat = add(new T.Mesh(GEO.flat, mat(FS.crater, { uCol: { value: C(col) }, uK: { value: 0 }, uSeed: { value: Math.random() * 9 } })), {
          order: 4, life: cl, upd: function (dt, t) { U(crat).uK.value = t / cl; }
        });
        crat.mesh.position.set(x, 0.04, z); crat.mesh.scale.setScalar(R * 0.75);
      }
      if (o.flash) {
        var fl = orb({ col: 0xfff4c8, deep: o.flashCol || col, alpha: 1, order: 7 }), fT = o.flashLife || 0.22;
        add(new T.Object3D(), { life: fT, upd: function (dt, t) { var k = t / fT; fl.set(new T.Vector3(x, R * 0.35, z), R * (0.35 + 1.15 * ease(k / 0.5)), Math.max(0, 1 - k * k)); if (k >= 1) { fl.kill(); return true; } } });
        fl.set(new T.Vector3(x, R * 0.35, z), R * 0.35, 1);
      }
      for (var i = 0; i < (o.chips === undefined ? 7 : o.chips); i++) chip(pos, R, o.hot || 0xff7a1a);
    }
    // a rock chip thrown out of a hit: flies, bounces, cools from glowing to dark stone, shrinks away (its own mesh; with
    // batchChips a copy in the chip layer of its shape, when full the oldest goes)
    function chipMat(hot) { var l = pool.chip, m = l && l.pop(); if (!m) { m = new T.MeshLambertMaterial({ color: 0x4a3a36 }); m.userData.poolKey = 'chip'; } m.emissive.setHex(hot); return m; }
    function chipMesh(pos, R, hot, smoky) {
      var m = new T.Mesh(GEO.chips[(Math.random() * 3) | 0], chipMat(hot)), a = Math.random() * 6.283, sp = (2 + Math.random() * 3.5) * Math.sqrt(R);
      var v = new T.Vector3(Math.cos(a) * sp, (3 + Math.random() * 4) * Math.sqrt(R), Math.sin(a) * sp * 0.75), ax = new T.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), s = (0.05 + Math.random() * 0.07) * Math.sqrt(R), ang = 0, life = 0.9 + Math.random() * 0.4, trail = 0;
      m.position.set(pos.x, 0.15, pos.z); m.scale.setScalar(s);
      return add(m, {
        order: 5, life: life, upd: function (dt, t) {
          v.y -= 16 * dt; m.position.addScaledVector(v, dt); ang += dt * 14;
          if (smoky && t < 0.5 && (trail -= dt) <= 0) { trail = 0.045; puff(m.position, { s0: s * 0.9, s1: s * 2.4, life: 0.55, vel: new T.Vector3(0, 0.3, 0), alpha: 0.6, order: 4 }); }
          if (m.position.y < s && v.y < 0) { m.position.y = s; v.y *= -0.35; v.x *= 0.6; v.z *= 0.6; }
          m.quaternion.setFromAxisAngle(ax, ang); m.material.emissive.setHex(hot).multiplyScalar(Math.max(0, 1 - t / (life * 0.7)));
          if (t > life * 0.75) m.scale.setScalar(s * Math.max(0, 1 - (t - life * 0.75) / (life * 0.25)));
        }
      });
    }
    function chip(pos, R, hot, smoky) {
      if (CW.fxOff && CW.fxOff.chips) return;
      if (!batchChips) return chipMesh(pos, R, hot, smoky);
      var a = Math.random() * 6.283, sp = (2 + Math.random() * 3.5) * Math.sqrt(R), list = chips[(Math.random() * 3) | 0];
      if (list.length >= CHIP_CAP) list.shift();
      list.push({ p: new T.Vector3(pos.x, 0.15, pos.z), v: new T.Vector3(Math.cos(a) * sp, (3 + Math.random() * 4) * Math.sqrt(R), Math.sin(a) * sp * 0.75),
        ax: new T.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), s: (0.05 + Math.random() * 0.07) * Math.sqrt(R), ang: 0,
        life: 0.9 + Math.random() * 0.4, t: 0, trail: 0, smoky: !!smoky, hot: C(hot) });
    }
    // ---------- a black hole: dark ball, turning disk, and the picture bent around it ----------
    // o.lens false: no bending of the picture (that is the black hole's own); o.pit false: no whirl on the ground (for a
    // small one flying through the air); move(pos) carries it along
    function hole(o) {
      var pos = o.pos.clone(), spin = 0, rippling = false, lens = { pos: pos, r: 0.01, k: 0, wr: 0, wa: 0 };
      var ball = add(new T.Mesh(GEO.ball, mat(FS.horizon, { uRim: { value: C(o.rim || 0xffd8ff) }, uAlpha: { value: 1 } }, { normal: true, depthTest: false, depthWrite: true })), { order: 5 });
      ball.mesh.name = 'core3d hole';
      var disk = add(new T.Mesh(GEO.disk, mat(FS.disk, { uIn: { value: C(0xfff0ff) }, uMid: { value: C(o.mid || 0xff6ad8) }, uOut: { value: C(o.out || 0x6a4cff) }, uAlpha: { value: 0 }, uSpin: { value: 0 } }, { side: T.DoubleSide, keepAdd: true })), { order: 6 });
      // the disk lies tilted, nearly edge on: its front half passes in front of the ball, the back half behind it
      var view = new T.Vector3(); sc.camera.getWorldDirection(view);
      disk.mesh.quaternion.setFromEuler(new T.Euler(1.06, 0, 0)).premultiply(new T.Quaternion().setFromAxisAngle(view, o.roll === undefined ? 0.32 : o.roll));
      ball.mesh.position.copy(pos); disk.mesh.position.copy(pos);
      // the ground under it darkens into a whirl that turns inward (no ring round it)
      var pit = o.pit === false ? null : add(new T.Mesh(GEO.flat, mat(FS.pit, { uCol: { value: C(o.out || 0x6a4cff) }, uAlpha: { value: 0 }, uSpin: { value: 0 } }, { normal: true })), { order: 3 });
      if (pit) pit.mesh.position.set(pos.x, 0.04, pos.z);
      if (o.lens !== false && sc.lens) sc.lens(lens);
      return {
        lens: lens,
        set: function (R, open, dt) {
          spin += (dt || 0) * 5; ball.mesh.scale.setScalar(Math.max(0.001, R)); disk.mesh.scale.setScalar(Math.max(0.001, R * 1.25));
          U(disk).uAlpha.value = open; U(disk).uSpin.value = spin; lens.r = R; lens.k = 0.38 * open;
          if (pit) { pit.mesh.scale.setScalar(Math.max(0.001, R * 4.2)); U(pit).uAlpha.value = 0.75 * open; U(pit).uSpin.value = spin; }
        },
        move: function (p) { pos.copy(p); ball.mesh.position.copy(p); disk.mesh.position.copy(p); if (pit) pit.mesh.position.set(p.x, 0.04, p.z); },
        kill: function () { drop(ball); drop(disk); if (pit) drop(pit); lens.k = 0; if (!rippling) lens.dead = true; },
        // the ripple of bent space that runs out from where it was (call before kill)
        ripple: function (speed, life, amp) {
          var t = 0; rippling = true; lens.k = 0; lens.wa = amp || 0.05;
          add(new T.Object3D(), {
            life: life, upd: function (dt) { t += dt; lens.wr = t * speed; lens.wa = (amp || 0.05) * Math.max(0, 1 - t / life); if (t >= life) { lens.wa = 0; lens.dead = true; return true; } }
          });
        }
      };
    }

    // =================== 9차: the five elements in 3D (the user's drawings, 2026-11-15) ===================
    // The elements, in the order of the drawings: 0 fire, 1 lightning, 2 star, 3 ice, 4 wind. Each one is a solid shape
    // cut out and thickened with rounded edges (a flame, a bolt, a five-point star, a snowflake, a swirl), shaded like
    // glossy candy glass; a glass ball can hold one with a crown of its element round it; a ring of rainbow light carries
    // them round the wizard; and a layer of crystals (one draw for all of them) flies off to the monsters.
    FS.gem = 'uniform vec3 uCol,uDeep,uHi;uniform float uSeed;void main(){vec3 N=normalize(vWN);' + F +
      'float d=max(dot(N,normalize(vec3(-0.35,0.75,0.55))),0.0),fill=max(dot(N,normalize(vec3(0.7,0.15,0.6))),0.0);' +
      'vec3 R=reflect(-normalize(vV),normalize(vN));float spec=pow(max(dot(R,normalize(vec3(-0.35,0.6,0.72))),0.0),30.0);' +
      'float inner=fb(vP*2.4+vec3(0.0,uTime*1.4,uSeed));' +
      'vec3 c=mix(uDeep,uCol,0.3+0.7*d)+uCol*fill*0.22;c=mix(c,uHi,pow(1.0-f,2.4)*0.5);c+=uCol*inner*0.18+vec3(1.0)*spec*0.95;' +
      'gl_FragColor=vec4(c,1.0);}';
    FS.glass = 'uniform vec3 uCol,uDeep;uniform float uAlpha;void main(){' + F +
      'float rim=pow(1.0-f,2.2);vec3 R=reflect(-normalize(vV),normalize(vN));' +
      'float spec=pow(max(dot(R,normalize(vec3(-0.45,0.62,0.65))),0.0),46.0),spec2=pow(max(dot(R,normalize(vec3(0.5,-0.45,0.72))),0.0),10.0)*0.22;' +
      'float sw=fb(vP*3.0+vec3(0.0,uTime*0.8,0.0));vec3 c=mix(uCol,uDeep,rim*0.45);c=mix(c,uCol+vec3(0.25),rim*0.35)+vec3(1.0)*(spec+spec2);' +
      'float al=(0.16+0.7*rim+sw*0.1)+spec;gl_FragColor=vec4(c,clamp(al*uAlpha,0.0,1.0));}';
    // the crown of an element round its glass ball, out from the glass (rho 0.59) towards the shell's edge (1): fire licks
    // up in tongues, lightning crackles in jumping lines, the star throws five rays, ice six crystal points, wind turns
    // in swirling bands
    FS.aura = 'uniform vec3 uCol,uDeep;uniform float uAlpha,uKind,uSeed;void main(){' + F +
      'vec3 p=normalize(vP);float a=atan(p.x,p.y),rho=sqrt(max(0.0,1.0-f*f)),n,reach;' +
      'if(uKind<0.5){n=fb(vec3(a*2.2,rho*3.0-uTime*5.0,uSeed));reach=0.68+0.3*n*(0.55+0.45*max(p.y,0.0));}' +
      'else if(uKind<1.5){float r=abs(fbm(vec3(a*3.2,rho*3.5,floor(uTime*14.0)+uSeed)));n=1.0-smoothstep(0.0,0.07,r);reach=0.7+0.28*n;}' +
      'else if(uKind<2.5){n=pow(abs(cos(a*2.5)),12.0);reach=0.66+0.33*n+0.04*fb(vec3(a*4.0,uTime*2.0,uSeed));}' +
      'else if(uKind<3.5){n=pow(abs(cos(a*3.0)),10.0);reach=0.66+0.3*n*(0.75+0.25*fb(vec3(a*5.0,1.0,uSeed)));}' +
      'else{n=0.5+0.5*sin(a*3.0+rho*14.0-uTime*7.0);reach=0.68+0.24*smoothstep(0.55,1.0,n);}' +
      'float body=1.0-smoothstep(reach-0.07,reach,rho);float al=body*smoothstep(0.55,0.62,rho)*uAlpha*(0.5+0.5*n);' +
      'vec3 c=mix(uDeep,uCol,0.45+0.55*n);c=mix(c,vec3(1.0),(1.0-smoothstep(0.6,0.75,rho))*0.4*(1.0-uBright));' +
      'gl_FragColor=vec4(c,clamp(al,0.0,1.0));}';
    // the wheel's ring (a torus, uv.x 0 → 1 round it): a faint rainbow all round, and behind each element riding on it
    // (at uPhase + i/5) a bright trail of its own colour fading out back along the ring
    FS.ering = 'uniform vec3 uC[5];uniform float uPhase,uAlpha,uTrail;void main(){' + F +
      'float a=vUv.x;vec3 tc=vec3(0.0),base=vec3(0.0);float tw=0.0;' +
      'for(int i=0;i<5;i++){float g=fract(uPhase+float(i)*0.2),d=fract(g-a),w=exp(-d*uTrail)*(1.0-smoothstep(0.3,0.45,d));tc+=uC[i]*w;tw+=w;' +
      'float e=abs(fract(a-uPhase-float(i)*0.2+0.5)-0.5);base+=uC[i]*max(0.0,1.0-e*5.0);}' +
      'vec3 c=mix(base,tc/max(tw,0.001),min(1.0,tw));c=mix(c,vec3(1.0),min(1.0,tw)*0.35*f*(1.0-uBright));' +
      'float al=(0.28+0.95*min(1.0,tw))*(0.45+0.55*f)*uAlpha;gl_FragColor=vec4(c,clamp(al,0.0,1.0));}';
    // a flying crystal (many copies in one mesh; vIC is the copy's colour): bright faces of its colour, darker in the
    // shade, white at its edges with a hard glint
    FS.cryst = 'void main(){vec3 N=normalize(vWN);' + F +
      'float rim=pow(1.0-f,2.0),facet=0.5+0.5*dot(N,normalize(vec3(0.4,0.8,0.45)));' +
      'float glint=pow(max(dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(0.25,0.55,0.8))),0.0),16.0);' +
      'vec3 c=mix(vIC*0.38,vIC,facet);c=mix(c,vec3(1.0),clamp(rim*0.5+glint,0.0,1.0));gl_FragColor=vec4(c,1.0);}';
    FS.xline = 'void main(){gl_FragColor=vec4(vIC,1.0);}';

    var EMB_GEO = [];
    function mergeGeos(list) {
      var pos = [], nrm = [];
      list.forEach(function (g) { if (g.index) g = g.toNonIndexed(); var p = g.attributes.position.array, n = g.attributes.normal.array; for (var i = 0; i < p.length; i++) { pos.push(p[i]); nrm.push(n[i]); } });
      var out = new T.BufferGeometry(); out.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3));
      out.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2)); return out;
    }
    // the emblem shapes, built once each, centred and sized to reach 1 from the middle (x, y), thick along z
    function embGeo(k) {
      if (EMB_GEO[k]) return EMB_GEO[k];
      var X = { depth: 0.34, bevelEnabled: true, bevelThickness: 0.13, bevelSize: 0.09, bevelSegments: 3, curveSegments: 12 }, parts = [];
      function poly(pts) { var s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); return s; }
      function ext(s, o) { return new T.ExtrudeGeometry(s, o || X); }
      if (k === 0) {
        // a flame: a round foot, a tall tip leaning a little, a tongue on each side
        var s = new T.Shape(); s.moveTo(0, -1);
        s.bezierCurveTo(0.62, -1, 0.92, -0.55, 0.8, -0.05); s.bezierCurveTo(0.72, 0.28, 0.6, 0.42, 0.62, 0.72);
        s.bezierCurveTo(0.42, 0.52, 0.3, 0.45, 0.26, 0.38); s.bezierCurveTo(0.3, 0.75, 0.15, 1.0, -0.06, 1.3);
        s.bezierCurveTo(-0.2, 0.92, -0.45, 0.66, -0.48, 0.5); s.bezierCurveTo(-0.55, 0.68, -0.62, 0.8, -0.72, 0.9);
        s.bezierCurveTo(-0.98, 0.4, -0.92, -0.55, -0.6, -0.86); s.bezierCurveTo(-0.44, -0.98, -0.24, -1, 0, -1);
        parts.push(ext(s));
      } else if (k === 1) {
        parts.push(ext(poly([[0.12, 1], [-0.52, -0.02], [-0.02, -0.02], [-0.28, -1], [0.58, 0.2], [0.08, 0.2], [0.52, 1]])));
      } else if (k === 2) {
        var st = []; for (var i = 0; i < 10; i++) { var a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.46 : 1; st.push([Math.cos(a) * r, Math.sin(a) * r]); }
        parts.push(ext(poly(st)));
      } else if (k === 3) {
        // a snowflake: six pointed arms, two pairs of branches on each, a hexagon in the middle
        var Y2 = { depth: 0.22, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.045, bevelSegments: 2, curveSegments: 4 };
        var bar = function (x0, y0, ang, len, w) {
          var dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy * w / 2, ny = dx * w / 2, x1 = x0 + dx * len, y1 = y0 + dy * len;
          return poly([[x0 - nx, y0 - ny], [x1 - nx, y1 - ny], [x1 + dx * w * 0.7, y1 + dy * w * 0.7], [x1 + nx, y1 + ny], [x0 + nx, y0 + ny]]);
        };
        for (var j = 0; j < 6; j++) {
          var A = Math.PI / 2 + j * Math.PI / 3, cx = Math.cos(A), cy = Math.sin(A);
          parts.push(ext(bar(0, 0, A, 0.9, 0.17), Y2));
          [0.48, 0.7].forEach(function (at, m) { [-0.85, 0.85].forEach(function (off) { parts.push(ext(bar(cx * at, cy * at, A + off, m ? 0.2 : 0.32, 0.12), Y2)); }); });
        }
        var hx = []; for (var h = 0; h < 6; h++) { var ha = h * Math.PI / 3; hx.push([Math.cos(ha) * 0.26, Math.sin(ha) * 0.26]); }
        parts.push(ext(poly(hx), Y2));
      } else if (k === 5) {
        // 1차 젤리 발바닥: a big round pad and four toe beans, thick and soft-edged like jelly
        var JX = { depth: 0.3, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.1, bevelSegments: 5, curveSegments: 20 };
        var pad = new T.Shape(); pad.moveTo(0, -0.95);
        pad.bezierCurveTo(0.52, -0.95, 0.74, -0.62, 0.7, -0.3); pad.bezierCurveTo(0.66, 0.0, 0.34, 0.08, 0, 0.0);
        pad.bezierCurveTo(-0.34, 0.08, -0.66, 0.0, -0.7, -0.3); pad.bezierCurveTo(-0.74, -0.62, -0.52, -0.95, 0, -0.95);
        parts.push(ext(pad, JX));
        [[-0.7, 0.28, 0.2, 0.24], [-0.26, 0.62, 0.21, 0.26], [0.26, 0.62, 0.21, 0.26], [0.7, 0.28, 0.2, 0.24]].forEach(function (b) {
          var s = new T.Shape(); s.absellipse(b[0], b[1], b[2], b[3], 0, Math.PI * 2, false, 0); parts.push(ext(s, JX));
        });
      } else if (k === 6) {
        // 1차 마법 발톱: one cat claw — a thick rounded root at the bottom, hooking up and over to one sharp tip (top right)
        var cl = new T.Shape(); cl.moveTo(-0.2, -0.9);
        cl.bezierCurveTo(-0.38, -0.05, -0.1, 0.7, 0.62, 1.0);      // the back of the hook up to the tip
        cl.bezierCurveTo(0.18, 0.6, 0.12, -0.2, 0.2, -0.9);        // the inside of the hook back down
        cl.bezierCurveTo(0.14, -1.06, -0.14, -1.06, -0.2, -0.9);   // the round root
        parts.push(ext(cl, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 3, curveSegments: 14 }));
      } else {
        // a swirl: a band coiling out from the middle, thin at its heart and widening
        var out = [], inn = [], TH = 1.7 * 6.2832;
        for (var q = 0; q <= 64; q++) { var t = q / 64, th = t * TH, rr = 0.1 + 0.135 * th, w = 0.06 + 0.22 * t; out.push([Math.cos(th) * (rr + w), Math.sin(th) * (rr + w)]); inn.push([Math.cos(th) * Math.max(0.02, rr - w), Math.sin(th) * Math.max(0.02, rr - w)]); }
        parts.push(ext(poly(out.concat(inn.reverse()))));
      }
      var g = parts.length > 1 ? mergeGeos(parts) : parts[0];
      g.computeBoundingBox(); var b = g.boundingBox;
      g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -(b.min.z + b.max.z) / 2);
      var sz = Math.max(b.max.x - b.min.x, b.max.y - b.min.y) / 2; g.scale(1 / sz, 1 / sz, 1 / sz);
      EMB_GEO[k] = g; return g;
    }
    // ---------- an element emblem: the solid shape, its outline, a glow of its colour behind it. It faces the camera and
    // rocks from side to side so its thickness shows. set(pos, size, dt, roll) ----------
    var CAMQ = new T.Quaternion(), EQ = new T.Quaternion(), EE = new T.Euler();
    function emblem(kind, o) {
      o = o || {}; var g = embGeo(kind);
      var body = add(new T.Mesh(g, mat(FS.gem, { uCol: { value: C(o.col) }, uDeep: { value: C(o.deep) }, uHi: { value: C(o.hi || 0xffffff) }, uSeed: { value: Math.random() * 9 } }, { solid: true })), { order: o.order === undefined ? 7.2 : o.order });
      var line = add(new T.Mesh(g, lineMat(o.line === undefined ? 0x1a1030 : o.line)), { order: (o.order === undefined ? 7.2 : o.order) - 0.05 });
      var glow = o.glow === false ? null : orb({ col: o.col, deep: o.deep, alpha: o.glowA === undefined ? 0.4 : o.glowA, order: 6 });
      var spin = Math.random() * 6, rock = o.rock === undefined ? 0.7 : o.rock, spinK = o.spin === undefined ? 2.5 : o.spin;
      body.mesh.name = 'core3d emblem';
      return {
        set: function (pos, size, dt, roll, sy) {
          spin += (dt || 0) * spinK; sy = sy || 1; CAMQ.copy(sc.camera.quaternion);
          EE.set(0.25 * Math.sin(spin * 0.7), Math.sin(spin) * rock, roll || 0); CAMQ.multiply(EQ.setFromEuler(EE));
          var s = Math.max(0.001, size);
          body.mesh.position.copy(pos); body.mesh.quaternion.copy(CAMQ); body.mesh.scale.set(s, s * sy, s);
          line.mesh.position.copy(pos); line.mesh.quaternion.copy(CAMQ); line.mesh.scale.set(s * 1.1, s * sy * 1.08, s * 1.3);
          if (glow) glow.set(pos, s * 1.9);
        },
        kill: function () { drop(body); drop(line); if (glow) glow.kill(); }
      };
    }
    // ---------- a glass ball holding an element emblem, a crown of its element round it (o.kind 0..4) ----------
    function glassOrb(o) {
      var kind = o.kind || 0;
      var inner = orb({ col: o.col, deep: o.deep, alpha: 0.28, order: 6.9 });
      var gem = emblem(kind, { col: o.col, deep: o.deep, line: o.line, glow: false, rock: 0.45, spin: 1.6, order: 7.25 });
      var glass = add(new T.Mesh(GEO.ball, mat(FS.glass, { uCol: { value: C(o.col) }, uDeep: { value: C(o.deep) }, uAlpha: { value: 1 } }, { normal: true })), { order: 7.3 });
      var aura = add(new T.Mesh(GEO.ball, mat(FS.aura, { uCol: { value: C(o.col) }, uDeep: { value: C(o.deep) }, uAlpha: { value: 1 }, uKind: { value: kind }, uSeed: { value: Math.random() * 9 } })), { order: 6.5 });
      var halo = orb({ col: o.col, deep: o.deep, alpha: o.haloA === undefined ? 0.3 : o.haloA, order: 6 });
      glass.mesh.name = 'core3d glass';
      return {
        set: function (pos, r, dt, a) {
          r = Math.max(0.001, r); inner.set(pos, r * 0.8); gem.set(pos, r * 0.56, dt);
          glass.mesh.position.copy(pos); glass.mesh.scale.setScalar(r); aura.mesh.position.copy(pos); aura.mesh.scale.setScalar(r * 1.7); halo.set(pos, r * 2.1);
          if (a !== undefined) { U(glass).uAlpha.value = a; U(aura).uAlpha.value = a; }
        },
        kill: function () { inner.kill(); gem.kill(); drop(glass); drop(aura); halo.kill(); }
      };
    }
    // ---------- the wheel's ring of light; at(u, out): the world point at angle u on it ----------
    var RING_GEO = null;
    function elemRing(o) {
      if (!RING_GEO) RING_GEO = new T.TorusGeometry(1, 0.045, 10, 220);
      var p = add(new T.Mesh(RING_GEO, mat(FS.ering, { uC: { value: o.cols.map(C) }, uPhase: { value: 0 }, uAlpha: { value: 0 }, uTrail: { value: o.trail || 6 } })), { order: 6.6 });
      p.mesh.name = 'core3d ring';
      return {
        set: function (pos, R, tilt, phase, alpha) { p.mesh.position.copy(pos); p.mesh.rotation.set(tilt, 0, 0); p.mesh.scale.setScalar(Math.max(0.001, R)); U(p).uPhase.value = phase; U(p).uAlpha.value = alpha; p.mesh.updateMatrixWorld(); },
        at: function (u, out) { return out.set(Math.cos(u * 6.2832), Math.sin(u * 6.2832), 0).applyMatrix4(p.mesh.matrixWorld); },
        kill: function () { drop(p); }
      };
    }
    // ---------- flying crystals: one draw for all of them. crystal(o): o.pos, o.dir (where its point goes), o.len, o.col,
    // o.line (its outline colour). Steered by hand (h.set(pos, dir, len)) or, given o.vel, thrown: falling (o.grav),
    // slowing (o.drag), stopping on the ground; o.life: it shrinks away over its last quarter second ----------
    var XCAP = 240, xs = [], XQ = new T.Quaternion(), XQ2 = new T.Quaternion();
    var xBody = new T.InstancedMesh(GEO.crystal, mat(FS.cryst, {}, { solid: true }), XCAP);
    var xLine = new T.InstancedMesh(GEO.crystal, mat(FS.xline, {}, { solid: true, side: T.BackSide }), XCAP);
    [xBody, xLine].forEach(function (m, i) { m.renderOrder = i ? 6.95 : 7; m.frustumCulled = false; m.count = 0; m.visible = false; m.name = 'crystal3d layer'; m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(XCAP * 3), 3); group.add(m); });
    function crystal(o) {
      var len = o.len || 0.3, e = { p: (o.pos || new T.Vector3()).clone(), d: (o.dir || Y).clone().normalize(), len: len, w: len * (o.thin || 0.3), thin: o.thin || 0.3, col: C(o.col || 0xffffff), lc: C(o.line === undefined ? 0x1a1030 : o.line),
        vel: o.vel ? o.vel.clone() : null, grav: o.grav || 0, drag: o.drag || 0, life: o.life || 1e9, t: 0, spinA: Math.random() * 6, spin: o.spin === undefined ? 6 : o.spin, grow: o.grow || 0, dead: false };
      if (xs.length >= XCAP) xs.shift().dead = true;
      xs.push(e);
      return { set: function (pos, dir, l) { e.p.copy(pos); if (dir && dir.lengthSq() > 1e-8) e.d.copy(dir).normalize(); if (l) { e.len = l; e.w = l * e.thin; } }, kill: function () { e.dead = true; }, e: e };
    }
    function drawCrystals(dt) {
      for (var i = xs.length - 1; i >= 0; i--) { var e = xs[i]; if (!e.dead) { e.t += dt; if (e.t >= e.life) e.dead = true; } if (e.dead) xs.splice(i, 1); }
      for (var j = 0; j < xs.length; j++) {
        var x = xs[j];
        if (x.vel) {
          x.vel.y -= x.grav * dt; if (x.drag) x.vel.multiplyScalar(Math.max(0, 1 - x.drag * dt)); x.p.addScaledVector(x.vel, dt);
          if (x.vel.lengthSq() > 0.04) x.d.copy(x.vel).normalize();
          if (x.p.y < x.len * 0.3) { x.p.y = x.len * 0.3; x.vel.set(0, 0, 0); }
        }
        x.spinA += x.spin * dt;
        var k = x.life < 1e8 ? Math.min(1, (x.life - x.t) / Math.min(0.25, x.life * 0.4)) : 1, s = Math.max(0.001, k * (x.grow ? Math.min(1, x.t / x.grow) : 1));
        XQ.setFromUnitVectors(Y, x.d).multiply(XQ2.setFromAxisAngle(Y, x.spinA));
        xBody.setMatrixAt(j, IM.compose(x.p, XQ, IS.set(x.w * s, x.len * s, x.w * s))); xBody.setColorAt(j, x.col);
        xLine.setMatrixAt(j, IM.compose(x.p, XQ, IS.set(x.w * s * 1.28, x.len * s * 1.07, x.w * s * 1.28))); xLine.setColorAt(j, x.lc);
      }
      xBody.count = xLine.count = xs.length; xBody.visible = xLine.visible = xs.length > 0;
      xBody.instanceMatrix.needsUpdate = xLine.instanceMatrix.needsUpdate = xBody.instanceColor.needsUpdate = xLine.instanceColor.needsUpdate = true;
    }

    // =================== 1차: cat things in 3D (2026-11-15) ===================
    // A ball of fur: soft and lit from above, its edge frayed into fine hairs (see-through there), a light sheen on top.
    FS.fluff = 'uniform vec3 uCol,uDeep;uniform float uAlpha,uSeed;void main(){vec3 N=normalize(vWN);' + F +
      'float d=max(dot(N,normalize(vec3(-0.3,0.85,0.45))),0.0);' +
      'float hair=fb(vP*vec3(14.0,14.0,14.0)+vec3(uSeed)),tuft=fb(vP*3.2+vec3(uSeed*2.0,uTime*0.4,0.0));' +
      'vec3 c=mix(uDeep,uCol,0.25+0.75*d)*(0.82+0.3*hair)+vec3(1.0)*pow(d,6.0)*0.25*(1.0-uBright);' +
      'float al=smoothstep(0.05,0.45,f+hair*0.35+tuft*0.2-0.2)*uAlpha;gl_FragColor=vec4(c,clamp(al,0.0,1.0));}';
    // A ball of yarn: strands wound round it in three directions, a darker groove between strands, lit from above.
    FS.yarn = 'uniform vec3 uCol,uDeep;uniform float uSeed;void main(){vec3 N=normalize(vWN),p=normalize(vP);' + F +
      'float d=max(dot(N,normalize(vec3(-0.3,0.85,0.45))),0.0);' +
      'vec3 a1=normalize(vec3(0.9,0.3,0.2)),a2=normalize(vec3(-0.2,0.95,0.3)),a3=normalize(vec3(0.3,-0.25,0.92));' +
      'float w1=abs(dot(p,a1)),w2=abs(dot(p,a2)),w3=abs(dot(p,a3));' +
      'float s1=abs(sin(dot(p,cross(a1,vec3(0.0,0.0,1.0)))*26.0)),s2=abs(sin(dot(p,cross(a2,vec3(1.0,0.0,0.0)))*26.0)),s3=abs(sin(dot(p,cross(a3,vec3(0.0,1.0,0.0)))*26.0));' +
      'float m=fb(p*2.2+vec3(uSeed));float s=w1<w2&&w1<w3?s1:(w2<w3?s2:s3);s=mix(s,s1,smoothstep(0.55,0.75,m)*0.6);' +
      'float groove=smoothstep(0.0,0.35,s);vec3 c=mix(uDeep*0.7,uCol,groove*(0.35+0.75*d));c+=vec3(1.0)*pow(d,8.0)*0.18*groove;' +
      'gl_FragColor=vec4(c,1.0);}';
    function fluffBall(o) {
      var p = add(new T.Mesh(GEO.puff, mat(FS.fluff, { uCol: { value: C(o.col || 0xfff1dc) }, uDeep: { value: C(o.deep || 0xc89a74) }, uAlpha: { value: 1 }, uSeed: { value: Math.random() * 9 } }, { normal: true })), { order: o.order === undefined ? 6.8 : o.order });
      p.mesh.name = 'core3d fluff';
      return {
        set: function (pos, r, sy, roll, alpha) { p.mesh.position.copy(pos); r = Math.max(0.001, r); p.mesh.scale.set(r, r * (sy || 1), r); p.mesh.rotation.set(0.2, roll || 0, 0); if (alpha !== undefined) U(p).uAlpha.value = alpha; },
        kill: function () { drop(p); }
      };
    }
    function yarnBall(o) {
      var body = add(new T.Mesh(GEO.ball, mat(FS.yarn, { uCol: { value: C(o.col || 0x7fd8a0) }, uDeep: { value: C(o.deep || 0x2a7a50) }, uSeed: { value: Math.random() * 9 } }, { solid: true })), { order: 6.8 });
      var line = add(new T.Mesh(GEO.ball, lineMat(o.line === undefined ? 0x16402a : o.line)), { order: 6.75 });
      body.mesh.name = 'core3d yarn';
      return {
        set: function (pos, r, q) { r = Math.max(0.001, r); body.mesh.position.copy(pos); body.mesh.scale.setScalar(r); line.mesh.position.copy(pos); line.mesh.scale.setScalar(r * 1.08); if (q) body.mesh.quaternion.copy(q); },
        kill: function () { drop(body); drop(line); }
      };
    }

    function update(dt) {
      time += dt;
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        if (p.dead) { parts.splice(i, 1); continue; }
        p.t += dt; var u = p.mesh.material && p.mesh.material.uniforms; if (u && u.uTime) u.uTime.value = time;
        if ((p.upd && p.upd(dt, p.t) === true) || p.t >= p.life) { drop(p); parts.splice(i, 1); }
      }
      drawChips(dt); drawSpikes(dt); drawCrystals(dt);
    }
    function clear() { parts.forEach(drop); parts.length = 0; spikes.length = 0; chips.forEach(function (l) { l.length = 0; }); xs.length = 0; drawSpikes(0); drawChips(0); drawCrystals(0); if (sc.lens) sc.lens(null); }
    // Build every program before it is needed. A compiled program also depends on the scene (whether it has fog, and of
    // which kind), so this is done again whenever that changes (fx.setRegion calls it); the same scene state is skipped.
    // Only the parts made here are dropped again, and their materials go into the pool, so the programs stay.
    var warmed = {};
    function warm() {
      var f = sc.scene.fog, sig = f ? (f.isFogExp2 ? 'exp2' : 'linear') : 'none';
      if (warmed[sig] || !sc.renderer || !sc.renderer.compile) return;
      warmed[sig] = true;
      var far = new T.Vector3(0, -40, 0), vel = new T.Vector3(1, -3, 0), start = parts.length, spikeStart = spikes.length, chipStart = chips.map(function (l) { return l.length; });
      beam({ col: 0xffffff, deep: 0x8866ff, r: 0.1 }).set(far, far.clone().add(vel), 1); orb({ col: 0xffffff }).set(far, 1, 1); moon({}).set(far, 1, 0);
      rock({ size: 0.3 }).set(far, vel, 0.05); fireball({ size: 0.3 }).set(far, vel, 0.05); column({}).set(far, 1, 1, 0); ringWall({}).set(far, 1, 1, 0); fireWave({}).set(far.x, far.z, 1, 1, 0, 1, 2, 0); picWave({}).set(far, 1, 0, 1, 0, 1); var ws = waveShards({}); ws.put(0, far, 0, 0, 1, 1, 1, 0); ws.commit(); var sq = seqWave(); sq.put(0, 0, 0, far, 0, 0, 1, 1, 1, 0); sq.commit(); iceSpear({ size: 1 }).set(far, vel, 0.05); iceSpikes(far, { n: 2 }); mark({}).set(far, 0.5, 1); impact(far, { size: 1, chips: 3 }); blast(far, { size: 1, flash: true });
      var h = hole({ pos: far }); h.set(1, 1, 0); h.lens.dead = true; puff(far, {}); chip(far, 1, 0xff7a1a, false);
      fluffBall({}).set(far, 0.5); yarnBall({}).set(far, 0.5);
      for (var ek = 0; ek < 7; ek++) emblem(ek, { col: 0xff8a3a, deep: 0x8a2a10 }).set(far, 0.5, 0); glassOrb({ kind: 0, col: 0xff8a3a, deep: 0x8a2a10 }).set(far, 0.5, 0, 1); elemRing({ cols: [0xff0000, 0xffff00, 0xff00ff, 0x00ffff, 0x00ff00] }).set(far, 1, 0, 0, 1); var xst = xs.length; crystal({ pos: far });
      drawSpikes(0); layoutSmoke(sc.camera, true); drawChips(0); drawCrystals(0);   // the layers must be drawing copies when compiled, so their (instanced) programs are built too
      sc.renderer.compile(sc.scene, sc.camera);
      for (var i = parts.length - 1; i >= start; i--) drop(parts[i]);
      parts.length = start; spikes.length = spikeStart; chips.forEach(function (l, i) { l.length = chipStart[i]; }); xs.length = xst; drawSpikes(0); drawChips(0); drawCrystals(0);
      if (sc.warmLens) sc.warmLens();
    }
    return { beam: beam, orb: orb, moon: moon, rock: rock, fireball: fireball, column: column, ringWall: ringWall, fireWave: fireWave, picWave: picWave, waveShards: waveShards, seqWave: seqWave, iceSpear: iceSpear, iceSpikes: iceSpikes, iceSpike: iceSpike, mark: mark, impact: impact, puff: puff, blast: blast, chip: chip, hole: hole, emblem: emblem, glassOrb: glassOrb, elemRing: elemRing, crystal: crystal, fluffBall: fluffBall, yarnBall: yarnBall, update: update, clear: clear, warm: warm, setBright: function (v) { bright = !!v; }, setBatchSmoke: function (v) { batchSmoke = !!v; }, setBatchChips: function (v) { batchChips = !!v; },
      count: function () { return parts.length + xs.length + spikes.length + chips[0].length + chips[1].length + chips[2].length; }, spikeTops: spikeTops,
      // for checks: the puffs in the last picture and the draws they took
      smoke: function () { return { puffs: smokeNow.puffs, draws: smokeNow.draws }; } };
  };
})(this);
