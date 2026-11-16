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
    // two octaves only: for edges where the fine detail is not seen (the toon fire's torn rim and burn-out line, 2026-11-16:
    // five layers of toon fire over one another at 12 noise lookups a pixel slowed an iPhone during 폭염탄's burst)
    'float fbm2(vec3 p){return 0.5*n3(p)+0.25*n3(p*2.03+vec3(1.7,9.2,3.1));}',
    'float fb2(vec3 p){return clamp(fbm2(p)*1.6+0.5,0.0,1.0);}',
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
  var VS_SHARD = VARY + 'attribute vec4 iRect;attribute vec3 iAD;varying vec4 vRect;varying vec3 vAD;\n' +
    'void main(){vUv=uv;vRect=iRect;vAD=iAD;vec3 p=position;vP=p;vIC=vec3(1.0);\n' +
    '#ifdef USE_INSTANCING\nvec4 mv=modelViewMatrix*instanceMatrix*vec4(p,1.0);\n#else\nvec4 mv=modelViewMatrix*vec4(p,1.0);\n#endif\n' +
    'vN=vec3(0.0,0.0,1.0);vV=normalize(-mv.xyz);vWN=vec3(0.0,0.0,1.0);gl_Position=projectionMatrix*mv;}';
  // a fire tornado (2026-11-15): an open tube standing on the ground (uv.y 0 at its foot → 1 at its top), narrow at
  // the ground (uR0) and opening into a funnel at the top (uR1); its middle line sways and swings round more the higher
  // it is (uBend), its surface swells in rings that run up it, so the whole thing writhes like a real whirlwind
  // (2026-11-15, the user's drawing of its parts: the skeleton is a funnel that comes to a needle point at the ground and
  // opens up wide, its top rim wavy. The body and the ribbons wound round it share this shape, so the ribbons lie on it.)
  var FUNNEL = 'uniform float uH,uR0,uR1,uBend,uPh;\n' +
    'float twR(float y,float a){return mix(uR0,uR1,pow(y,1.45))*(1.0+0.08*sin(y*9.0-uTime*8.0+uPh))*(1.0+0.16*sin(a*5.0+uPh+uTime*1.5)*smoothstep(0.72,1.0,y));}\n' +
    'vec2 twC(float y){return vec2(sin(y*2.3-uTime*2.7+uPh),0.6*cos(y*1.8-uTime*2.2+uPh))*uBend*y*y;}\n';
  var VS_TWIST = VARY + FUNNEL +
    'void main(){vUv=uv;float y=uv.y,a=uv.x*6.2832;float r=twR(y,a);vec2 c=twC(y);' +
    'vec3 p=vec3(sin(a)*r+c.x,y*uH,cos(a)*r+c.y);vec3 nrm=vec3(sin(a),0.0,cos(a));' +
    'vP=p;vec4 mv=modelViewMatrix*vec4(p,1.0);vN=normalize(normalMatrix*nrm);vV=normalize(-mv.xyz);vWN=normalize(mat3(modelMatrix)*nrm);gl_Position=projectionMatrix*mv;}';
  // a ribbon of fire wound up the funnel (uv.x along it 0 → 1, uv.y across it): its middle climbs from height uY0 to uY1
  // (fractions of uH) going uTurns times round, starting at angle uOff and turning with the whirl (uSpin); it is a band
  // uW high lying just outside the body (uOut), so it shows as a spiral stripe standing off the funnel
  var VS_RIBBON = VARY + FUNNEL + 'uniform float uY0,uY1,uTurns,uOff,uSpin,uW,uOut;\n' +
    'void main(){vUv=uv;float t=uv.x,ym=mix(uY0,uY1,t),y=clamp(ym+(uv.y-0.5)*uW*(0.5+0.5*ym),0.0,1.0);' +
    'float a=t*uTurns*6.2832+uOff-uTime*uSpin;float r=twR(y,a)*uOut+0.04*uH*(uv.y-0.5);vec2 c=twC(y);' +
    'vec3 p=vec3(sin(a)*r+c.x,y*uH,cos(a)*r+c.y);vec3 nrm=vec3(sin(a),0.0,cos(a));' +
    'vP=p;vec4 mv=modelViewMatrix*vec4(p,1.0);vN=normalize(normalMatrix*nrm);vV=normalize(-mv.xyz);vWN=normalize(mat3(modelMatrix)*nrm);gl_Position=projectionMatrix*mv;}';
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
    // toon fire on a real 3D shape made in Blender (art/fx-mesh, tools/blender/export_fire_meshes.py): the same recipe the
    // Blender render used — flame streaks (noise turning against the shape), spiral bands from the uv, the top rim torn into
    // tongues, flat colour steps, and below the first step nothing at all (discarded, so it draws as a solid thing). uK 0 → 1
    // burns it away from the top down; uFrom > 0 keeps only what is above that height (the smoke taking over from the top)
    // uTw: the flame streaks wound round as they rise (radians over the shape's height: a tornado's streaks spiral up it
    // rather than standing straight like a torch's). uOut 1: a dark toon outline (uRim) along the cut edges and the
    // shape's silhouette, for bright ground where the fire's own colours wash out. uRise: the flame streaks race up it
    // (shape heights per second: a pillar's fire shoots upward)
    toon: 'uniform vec3 uC0,uC1,uC2,uC3,uC4,uRim;uniform vec4 uStep;uniform float uCut,uLift,uSpin,uK,uFrom,uDis,uSeed,uTw,uOut,uRise,uFoot,uBand,uTop;void main(){' +
      'float u=vUv.x,v=vUv.y,an=uSpin+v*uTw,cs=cos(an),sn=sin(an);vec3 q=vec3(cs*vP.x-sn*vP.z,vP.y-uTime*uRise,sn*vP.x+cs*vP.z);' +
      'float nz=fb(vec3(q.x*1.6,q.y*0.6,q.z*1.6)*2.4+uSeed);' +
      'float pp=mod(v*3.0+u,1.0/3.0),band=(1.0/6.0-abs(pp-1.0/6.0))*2.1*uBand;' +
      'vec2 ring=normalize(vP.xz+vec2(1e-4))*2.4;float tn=fb2(vec3(ring,v)+uSeed*0.37);' +
      'float tm=clamp((v-uTop-0.75*tn+0.3-0.98)/(0.8-0.98),0.0,1.0),bm=max(uFoot,clamp(v/0.08,0.0,1.0));' +
      'float f=(nz+band-uLift)*tm*bm;' +
      'float n2=fbm2(vec3(q*2.0)+uSeed)*0.25;' +
      'if(uK>0.0&&v+n2>1.12-uK*1.3)discard;if(uFrom>0.0&&v+n2<uFrom)discard;' +
      'f-=uDis*(0.45+n2*1.2);if(f<uCut)discard;' +
      'vec3 c=f<uStep.x?uC0:f<uStep.y?uC1:f<uStep.z?uC2:f<uStep.w?uC3:uC4;' +
      'float sil=1.0-abs(dot(normalize(vN),normalize(vV)));' +
      'if(uOut>0.0&&(f<uCut+0.035||sil>0.88))c=uRim;' +
      'gl_FragColor=vec4(c,1.0);}',
    // the hot glow round a toon fire in the dark: a slightly larger copy of the shape, added as light, strongest where its
    // surface turns away from us (its outline) and fading up it; it goes out from the top with the fire (uK)
    toonGlow: 'uniform vec3 uCol;uniform float uK,uA;void main(){float v=vUv.y;if(uK>0.0&&v>1.12-uK*1.3)discard;' +
      'float sil=clamp(1.0-abs(dot(normalize(vN),normalize(vV))),0.0,1.0);float a=pow(sil,1.6)*uA*smoothstep(0.0,0.12,v)*(1.0-smoothstep(0.75,1.0,v));' +
      'gl_FragColor=vec4(uCol,a);}',
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
    shard: 'uniform sampler2D uMap;varying vec4 vRect;varying vec3 vAD;void main(){' +
      'vec2 uv=mix(vRect.xy,vRect.zw,vUv);vec4 tx=texture2D(uMap,uv);' +
      'float e=min(min(vUv.x,1.0-vUv.x),min(vUv.y,1.0-vUv.y)),soft=smoothstep(0.0,0.24,e);' +
      'float n=fbm(vec3(uv*7.0,uTime*1.6+vRect.x*9.0))*0.5+0.5;' +
      'float keep=smoothstep(vAD.y,vAD.y+0.1,n),edge=smoothstep(0.1,0.0,abs(n-vAD.y))*step(0.001,vAD.y);' +
      // vAD.z: how lit this layer is (the back layers of a stacked wave are darker, so it has depth)
      'vec3 c=tx.rgb*(1.1+0.12*sin(uTime*14.0+vRect.x*20.0+vRect.y*13.0))*vAD.z+vec3(1.0,0.55,0.15)*edge*0.7;' +
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
    // the fire of a tornado (VS_TWIST): flames wound round it in spirals (s turns with height by uTw and races round
    // by uSpin), torn into tongues towards its top; uK 0 → 1 burns it away; uLo → uCol → white as in flame
    twist: 'uniform vec3 uCol,uLo;uniform float uSeed,uAlpha,uK,uHeat,uSpin,uTw;void main(){' + F +
      'float y=vUv.y,a=vUv.x*6.2832,s=a+y*uTw-uTime*uSpin;vec2 o=vec2(cos(s),sin(s));' +
      'float n=fb(vec3(o*1.4,y*3.0-uTime*3.6+uSeed)),n2=fb(vec3(o*3.1,y*7.5-uTime*6.5+uSeed*1.7));' +
      'float streak=smoothstep(0.2,0.9,0.5+0.5*sin(s*3.0+y*5.0+uSeed));float fl=n*0.45+n2*0.22+streak*0.38;' +
      'float cut=0.4+0.22*smoothstep(0.7,1.0,y)+uK*0.62;' +
      'float al=smoothstep(cut,cut+0.17,fl)*(0.3+0.7*f)*smoothstep(0.0,0.07,y)*(1.0-0.55*smoothstep(0.88,1.0,y))*(1.0+uBright*0.35)*uAlpha;' +
      'gl_FragColor=vec4(ramp3(0.04+fl*0.42+uHeat*0.16+(1.0-y)*0.08-uK*0.25+uBright*0.1,uLo,uCol),clamp(al,0.0,1.0));}',
    // the smoke and dust wound round the outside of a tornado: dark spiral bands (drawn over the picture, not added as
    // light), so the fire inside stands out and the whirl reads as a solid turning body
    // (2026-11-15, "회오리 뼈대가 없다": now the body itself — a solid funnel of fire, not a few loose ribbons. It is
    // shaded round like a solid thing (dark red at its outline, glowing orange-yellow where it faces us), grooved by
    // dark spiral seams that wind up it as it turns, so the twist reads as one turning body; only its top frays away)
    // (2026-11-15, the user's drawing: the inside of the funnel is bright fire — yellow-white where it faces us, orange to
    // red at its outline, flickering up it in streaks. uK 0 → 1: it goes out from the top down, where the smoke takes over)
    // ("불 느낌이 없다": not a smooth shaded surface but fire — streaks of flame racing up it, white-yellow where they
    // are hottest, deep red in between, and its outline and top torn into licking tongues; it flickers all the time)
    // (2026-11-15 notes: the bright streaks of flame are pulled up it from the foot to the top as it turns; colour by
    // depth — bright yellow at its middle, orange around that, red only at its edges; its tips torn to different lengths
    // that flicker at different speeds)
    tbody: 'uniform vec3 uDark,uLight;uniform float uSeed,uAlpha,uK,uSpin,uTw;void main(){' + F +
      'float y=vUv.y,a=vUv.x*6.2832,s=a+y*uTw-uTime*uSpin;vec2 o=vec2(cos(s),sin(s));' +
      'float n=fb(vec3(o*1.8,y*5.0-uTime*6.5+uSeed)),n2=fb(vec3(o*4.2,y*12.0-uTime*12.0+uSeed*1.3)),fl=n*0.6+n2*0.4;' +
      'float sn=fb(vec3(o*2.6,y*2.2-uTime*9.0+uSeed*2.0)),st=smoothstep(0.52,0.82,sn);' +
      'float dep=pow(f,1.2);vec3 red=mix(uDark,uLight,clamp(fl*1.2,0.0,1.0));' +
      'vec3 c=mix(red,vec3(1.0,0.42,0.06),smoothstep(0.12,0.5,dep+fl*0.25));c=mix(c,vec3(1.0,0.84,0.32),smoothstep(0.55,0.95,dep*0.65+st*0.55)*(1.0-uBright*0.45));' +
      'float tn=fb(vec3(o*3.0,uTime*2.3+uSeed))*0.6+fb(vec3(o*7.0,uTime*4.9+uSeed*1.7))*0.4,tip=0.6+0.4*tn;' +
      'float cut=0.12+0.4*smoothstep(0.4,1.0,y);float body=smoothstep(cut,cut+0.12,fl+0.1+st*0.15)*smoothstep(0.04,0.3,f+fl*0.35)*(1.0-smoothstep(tip-0.1,tip,y));' +
      'float gone=smoothstep(1.0-uK*1.15,1.15-uK*1.15,y+(fl-0.5)*0.3);' +
      'float al=smoothstep(0.0,0.05,y)*body*(1.0-gone)*uAlpha;' +
      'gl_FragColor=vec4(c,clamp(al,0.0,1.0));}',
    // a ribbon of fire wound round the funnel (VS_RIBBON: vUv.x along it, vUv.y across it): a solid band, orange on its
    // outer face, gold on its inner face, brightest along its middle; its upper edge torn into tongues of flame that lick
    // upward and race along it, its ends tapering into flame. uK 0 → 1: it goes out from the top down like the body
    ribbon: 'uniform vec3 uCol,uIn;uniform float uSeed,uAlpha,uK;void main(){' + F +
      'float t=vUv.x,v=vUv.y;float n=fb(vec3(t*16.0-uTime*6.0,v*2.0,uSeed)),n2=fb(vec3(t*34.0-uTime*10.0,v*4.0,uSeed*2.0)),fl=n*0.62+n2*0.38;' +
      // both edges torn into ragged flame, and small gaps that open and close in its middle (so it is fire, not a solid strip)
      'float n3=fb(vec3(t*9.0-uTime*3.0,v*3.0,uSeed*3.0+uTime*1.4));' +
      'float keep=smoothstep(0.0,0.08,(0.6+0.55*fl)-v)*smoothstep(0.0,0.08,v-(0.04+0.32*n2))*smoothstep(0.3,0.42,n3+0.15*abs(v-0.45));' +
      'float ends=smoothstep(0.0,0.07,t)*(1.0-smoothstep(0.8,1.0,t+(fl-0.5)*0.25));' +
      'float gone=smoothstep(1.0-uK*1.15,1.15-uK*1.15,t+(fl-0.5)*0.3);' +
      'float band=1.0-clamp(abs(v-0.4)*2.4,0.0,1.0);' +
      'vec3 dc=uCol*vec3(0.62,0.32,0.25);vec3 c=gl_FrontFacing?mix(dc,mix(uCol,vec3(1.0,0.45,0.1),band*0.5),0.45+0.55*f):mix(uIn*0.7,vec3(1.0,0.55,0.15),band*0.35);' +
      'c=mix(c,vec3(1.0,0.55,0.15),smoothstep(0.6,0.95,fl)*0.3*(1.0-uBright));float rim=1.0-smoothstep(0.0,0.35,min(keep,smoothstep(0.0,0.2,v)));c*=1.0-0.55*rim;' +
      'gl_FragColor=vec4(c,clamp(keep*ends*(1.0-gone)*uAlpha,0.0,1.0));}',
    // grey smoke wound round the funnel (VS_TWIST), for the end: uTop 0 → 1 how far down from the top it has taken over,
    // uK 0 → 1 it thins and frays away into wisps
    tgrey: 'uniform vec3 uDark,uLight;uniform float uSeed,uAlpha,uK,uSpin,uTw,uTop;void main(){' + F +
      'float y=vUv.y,a=vUv.x*6.2832,s=a+y*uTw-uTime*uSpin;vec2 o=vec2(cos(s),sin(s));' +
      'float n=fb(vec3(o*1.2,y*2.2-uTime*1.6+uSeed)),n2=fb(vec3(o*2.6,y*5.0-uTime*2.6+uSeed)),band=0.5+0.5*sin(s*2.0+y*3.0+n*2.0);' +
      'float wisp=n*0.6+n2*0.25+band*0.3;float cover=smoothstep(1.0-uTop-0.12,1.0-uTop+0.12,y);' +
      'float al=smoothstep(0.3+uK*0.5,0.6+uK*0.45,wisp)*cover*smoothstep(0.0,0.08,y)*(1.0-smoothstep(0.86,1.0,y+n*0.1))*(0.4+0.6*f)*uAlpha;' +
      'gl_FragColor=vec4(mix(uDark,uLight,clamp(n2*0.7+uK*0.4+0.15*(1.0-f),0.0,1.0)),clamp(al,0.0,1.0));}',
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

  // ---------- the meshes made in Blender (tools/blender/skills6_meshes.py → js/mesh-skills6.js, 2026-11-16) ----------
  // Each kind is drawn as many copies at once (one draw, plus one for its outline). Per copy: instanceColor (its colour)
  // and iX = (alpha, k: how much it glows / opens, seed, outline width in world units).
  var VS_BM = VS.replace('void main(){', 'attribute vec4 iX;varying vec4 vX;void main(){vX=iX;');
  // the outline: the copy pushed out along its normals by iX.w (world units, so a thin blade keeps an even line)
  var VS_BML = VARY + 'attribute vec4 iX;varying vec4 vX;uniform float uW;void main(){vUv=uv;vX=iX;vIC=vec3(1.0);vec4 lp=vec4(position,1.0);vec3 ln=normal;\n' +
    '#ifdef USE_INSTANCING\nlp=instanceMatrix*lp;ln=mat3(instanceMatrix)*normal;\n#endif\n' +
    'vec4 wp=modelMatrix*lp;vec3 wn=normalize(mat3(modelMatrix)*ln);wp.xyz+=wn*iX.w;vP=wp.xyz;vN=wn;vWN=wn;vV=vec3(0.0,0.0,1.0);gl_Position=projectionMatrix*viewMatrix*wp;}';
  var LIT = 'vec3 N=normalize(vWN);float lam=max(dot(N,normalize(vec3(0.45,0.85,0.3))),0.0);' +
    'float glint=pow(max(dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(0.25,0.55,0.8))),0.0),18.0);';
  // wood grows: bark (uv.x 0) is there up to k, leaves (uv.x 1) and thorns (uv.x 3) from their foot up to k - 1, earth
  // (uv.x 2) always
  var WOOD_CUT = 'float k=vX.y,y=vUv.y,kind=vUv.x;if(kind<0.5){if(y>k)discard;}else if(kind<1.5||kind>2.5){if(y>k-1.0)discard;}';
  var FS_BM = {
    line: 'varying vec4 vX;uniform vec3 uLine;void main(){gl_FragColor=vec4(uLine,vX.x);}',
    // the crescent blade: moon steel, darker toward its thick back, its thin edge burning white-violet; a gleam runs
    // along it (uv.x tip to tip, uv.y back 0 → edge 1); k makes the edge burn brighter
    blade: 'varying vec4 vX;void main(){' + F + LIT +
      'float edge=smoothstep(0.5,1.0,vUv.y),back=1.0-smoothstep(0.0,0.35,vUv.y);' +
      'float run=pow(0.5+0.5*sin(vUv.x*10.0-uTime*16.0+vX.z),8.0);' +
      'vec3 deep=vIC*0.5+vec3(0.12,0.06,0.3);' +
      'vec3 c=mix(deep,vIC*1.08,0.45+0.55*lam);c*=1.0-0.2*back;' +
      'c=mix(c,vec3(1.0),clamp(edge*(0.45+0.5*vX.y)+run*edge*0.5+glint*0.8+pow(1.0-f,3.0)*0.25,0.0,1.0));' +
      'gl_FragColor=vec4(c,vX.x);}',
    // the arrow of light: a gold faceted head, a shaft of white-gold light pulsing toward the head, vanes of orange light
    // the sun spear (태양의 창, 2026-11-16): sunlight made solid — a gold-white body flickering like the sun, bright bands
    // racing up it to its point, an orange glow at its edges, a hard glint
    sunspear: 'varying vec4 vX;void main(){' + F + LIT +
      'float fl=0.82+0.18*sin(uTime*47.0+vUv.y*7.0)*sin(uTime*29.0+vX.z);' +
      'float band=pow(0.5+0.5*sin(vUv.y*26.0-uTime*36.0),5.0);' +
      'vec3 gold=vec3(1.0,0.74,0.2),hot=vec3(1.0,0.97,0.85);' +
      'vec3 c=mix(gold,hot,clamp(0.3+0.45*lam+0.5*band,0.0,1.0))*fl+vec3(1.0,0.45,0.08)*pow(1.0-f,2.2)*0.7+vec3(glint);' +
      'gl_FragColor=vec4(c*vIC,vX.x);}',
    arrow: 'varying vec4 vX;void main(){' + F + LIT + 'vec3 g=vIC,c;float a=vX.x;' +
      'if(vUv.x>0.6){c=mix(g*0.42,g,0.3+0.7*lam)+vec3(glint);c=mix(c,vec3(1.0),pow(1.0-f,3.0)*0.4);}' +
      'else if(vUv.x>0.4){c=mix(g,vec3(1.0,0.55,0.18),0.55)*(0.85+0.4*lam);a*=0.8;}' +
      'else{c=mix(g,vec3(1.0),0.5+0.35*pow(0.5+0.5*sin(vUv.y*24.0-uTime*40.0),3.0));}' +
      'gl_FragColor=vec4(c,a);}',
    // the rift: deep space inside (dark violet, a slow nebula, stars that drift deeper the further in), a burning lip,
    // a hot rim just inside it; k (0 → 1) is how far along it is cut open (uv.x past it is not there yet, a bright tip
    // where it is being torn)
    rift: 'varying vec4 vX;void main(){float cut=vX.y;if(vUv.x>cut+0.002)discard;' +
      'float tip=smoothstep(0.06,0.0,cut-vUv.x)*step(cut,0.999);vec3 c;float a=vX.x;' +
      'if(vUv.y<-0.01){c=mix(vIC,vec3(1.0),0.55+0.3*sin(uTime*20.0+vUv.x*30.0));}' +
      'else{float d=vUv.y;' +
      'vec2 g=vP.xy*vec2(9.0,9.0)/(0.35+d)+vec2(uTime*0.15,0.0);vec2 id=floor(g),fr=fract(g)-0.5;' +
      'float h=fract(sin(dot(id,vec2(12.9898,78.233)))*43758.5453);' +
      'float st=step(0.82,h)*smoothstep(0.22,0.0,length(fr))*(0.55+0.45*sin(uTime*7.0+h*40.0));' +
      'float neb=fb(vec3(vP.xy*2.2,uTime*0.35+vX.z));' +
      'c=vec3(0.02,0.0,0.06)+vec3(0.22,0.05,0.38)*neb*(0.4+0.6*d)+vec3(st)*(0.4+0.6*d);' +
      'c=mix(c,vIC*1.3,smoothstep(0.22,0.0,d));c=mix(c,vec3(1.0,0.85,1.0),smoothstep(0.06,0.0,d)*0.7);}' +
      'c=mix(c,vec3(1.0),tip);gl_FragColor=vec4(c,a);}',
    // a broken-off piece of the rift's edge: dark glass, its edges lit in the spell's colour
    glass: 'varying vec4 vX;void main(){' + F + LIT +
      'vec3 c=mix(vec3(0.05,0.01,0.1),vIC*0.55,0.25+0.6*lam)+vIC*pow(1.0-f,2.0)*1.2+vec3(glint);gl_FragColor=vec4(c,vX.x);}',
    // the caved-in ground: earth of the place (the copy's colour) lit from above, darker down in the bowl, the cracks
    // glowing violet (k), fading into the flat ground at its edge
    crater: 'varying vec4 vX;void main(){vec3 N=normalize(vWN);float lam=max(dot(N,normalize(vec3(0.4,0.85,0.35))),0.0);' +
      'float grain=fb(vP*5.0+vec3(vX.z)),bowl=smoothstep(0.74,0.12,vUv.y),rim=smoothstep(0.55,0.7,vUv.y)*(1.0-smoothstep(0.76,0.92,vUv.y));' +
      'vec3 c=vIC*(0.4+0.9*lam)*(0.75+0.5*grain);c=mix(c,vIC*0.16,bowl*0.85);c+=vIC*rim*0.45*lam;' +
      'vec3 hot=vec3(0.78,0.45,1.0);c+=hot*(smoothstep(0.35,1.0,vUv.x)*1.4+bowl*0.22)*vX.y;' +
      'float a=vX.x*(1.0-smoothstep(0.72,0.92,vUv.y));gl_FragColor=vec4(c,a);}',
    // the gravity orb: a heavy faceted ball of dark violet crystal, a slow glow turning inside, a violet rim
    gorb: 'varying vec4 vX;void main(){' + F + LIT +
      'float inner=fb(vP*2.4+vec3(0.0,uTime*1.5,vX.z));' +
      'vec3 c=mix(vec3(0.05,0.01,0.12),vIC*0.5,0.2+0.7*lam)+vIC*inner*0.35*(0.5+vX.y)+vIC*pow(1.0-f,2.5)*1.3+vec3(glint*0.7);' +
      'gl_FragColor=vec4(c,vX.x);}',
    // the gravity orb's ring: a band of violet light with bright beads running round it
    gring: 'varying vec4 vX;void main(){float b=pow(0.5+0.5*sin(vUv.x*6.2832*9.0-uTime*12.0),6.0);' +
      'vec3 c=mix(vIC,vec3(1.0),0.3+0.5*b);gl_FragColor=vec4(c,vX.x*(0.75+0.25*b));}',
    // the falling ice: clear ice you can partly see through, pale blue where it is thick, white along its edges, its
    // frosted point and its broken end, thin white cracks inside, a cold glint (2026-11-16, the user: the first one, a
    // solid blue crystal with a dark outline, did not read as ice)
    ice: 'varying vec4 vX;void main(){' + F + LIT +
      'float rim=pow(1.0-f,1.6),facet=0.5+0.5*dot(N,normalize(vec3(-0.3,0.6,0.75)));' +
      'float cr=smoothstep(0.035,0.0,abs(fbm(vP*vec3(4.0,1.4,4.0)+vec3(vX.z))));' +
      'float frost=smoothstep(0.8,1.0,vUv.y)*0.45+smoothstep(0.12,0.0,vUv.y)*0.5;' +
      'vec3 c=mix(vec3(0.34,0.64,0.92),vec3(0.86,0.96,1.0),clamp(facet*0.6+rim*0.5,0.0,1.0));' +
      'c=mix(c,vec3(1.0),clamp(glint*1.2+cr*0.6+frost,0.0,1.0))*vIC;' +
      'float a=vX.x*clamp(0.36+0.25*facet+rim*0.55+cr*0.4+glint+frost*0.5+uBright*0.15,0.0,1.0);gl_FragColor=vec4(c,a);}',
    // the 10th-tier wood (js/mesh-wood.js, tools/blender/wood_meshes.py, 2026-11-16): toon bark in three steps of light
    // with its grain running along it (the copy's colour is the bark's), new pale wood at the front as it grows and a
    // lime-gold point; uv.x 1 = small leaves (sprouting once k passes 1), 2 = heaved earth (the copy's colour is the
    // place's ground). k (0 → 1): how far it has grown — the part past it is not there yet (uv.y: foot 0 → tip 1)
    wood: 'varying vec4 vX;void main(){' + WOOD_CUT + F +
      'vec3 N=normalize(vWN);float lam=max(dot(N,normalize(vec3(0.45,0.85,0.3))),0.0);' +
      'float band=lam>0.6?1.0:lam>0.25?0.8:0.62;vec3 c;' +
      'if(kind<0.5){float g=fbm(vP*vec3(10.0,2.4,10.0)+vec3(vX.z));' +
      'float groove=smoothstep(0.4,0.5,g)*(1.0-smoothstep(0.5,0.6,g));' +
      'c=vIC*(0.82+0.36*g)*(1.0-0.35*groove)*band;' +
      // a warm rim so the wood stands out on dark ground (the galaxy, the castle)
      'c+=vec3(0.5,0.36,0.18)*smoothstep(0.55,0.95,1.0-f)*(1.0-0.6*uBright);' +
      'c=mix(c,vec3(0.88,0.72,0.44)*band,smoothstep(0.1,0.0,k-y)*step(k,0.999)*0.85);' +
      'c=mix(c,vec3(0.66,0.86,0.3)*band,smoothstep(0.8,1.0,y)*0.6);}' +
      'else if(kind<1.5){c=mix(vec3(0.09,0.3,0.07),vec3(0.36,0.68,0.16),band);c=mix(c,vec3(0.8,0.88,0.32),smoothstep(0.65,1.0,y)*0.4);}' +
      'else if(kind<2.5){float g=fbm(vP*6.0+vec3(vX.z));c=vIC*band*(0.8+0.32*g);}' +
      // a thorn: the vine's colour at its foot, hard pale bone toward its point
      'else if(kind<3.5){c=mix(vIC*0.6,vec3(0.94,0.86,0.6),smoothstep(0.25,0.9,y))*band;}' +
      // a blade leaf (uv.x 4 + 0.4 × out from the midrib): deep green in the copy's shade, its edge and point gilded
      // like a whetted blade, a gleam running along it as it turns
      'else if(kind<4.5){float e=clamp((kind-4.0)*2.5,0.0,1.0);c=mix(vIC*0.42,vIC*1.05,band);' +
      'c=mix(c,vec3(1.0,0.86,0.36),smoothstep(0.55,1.0,e)*0.85+smoothstep(0.88,1.0,y)*0.5);' +
      'c+=vec3(1.0,0.92,0.55)*pow(1.0-f,3.0)*0.45*(1.0-0.5*uBright);}' +
      // The flytrap, drawn rather than rendered (2026-11-16 3rd, the user: "too 3D, no bones"): two flat tones of light, no
      // gloss, and dark lines for its frame — a midrib and two ribs either side running from the hinge to the lip.
      // flesh (uv.x 5 + 0.4 × out from the middle: the mouth; 5.45 the petals, no ribs): the copy's colour
      'else if(kind<5.5){float e=clamp((kind-5.0)*2.5,0.0,1.0),v=sqrt(e);' +
      'float rib=max(smoothstep(0.06,0.0,v),max(smoothstep(0.035,0.0,abs(v-0.36)),smoothstep(0.035,0.0,abs(v-0.7))))*step(e,0.98);' +
      'c=vIC*(lam>0.42?1.0:0.64)*(1.0-0.5*rib);}' +
      // the skin (uv.x 6 + 0.4 × out toward its lip): green with red speckles, a yellow band and a red lip (6.4), ribs
      'else{float e=clamp((kind-6.0)*2.5,0.0,1.0),v=sqrt(e),sh=lam>0.42?1.0:0.64;' +
      'float rib=max(smoothstep(0.07,0.0,v),max(smoothstep(0.04,0.0,abs(v-0.36)),smoothstep(0.04,0.0,abs(v-0.7))))*step(e,0.8);' +
      'float spot=step(0.7,fbm(vP*24.0+vec3(3.1,vX.z,1.7)))*step(e,0.6);' +
      'c=mix(vec3(0.3,0.58,0.13),vec3(0.62,0.08,0.1),spot)*sh;' +
      'c=e>0.92?vec3(0.85,0.1,0.12)*sh:(e>0.7?vec3(0.95,0.7,0.15)*sh:c);c*=1.0-0.62*rib;}' +
      'gl_FragColor=vec4(c,vX.x);}',
    // its outline follows the same growth
    woodLine: 'varying vec4 vX;uniform vec3 uLine;void main(){' + WOOD_CUT + 'gl_FragColor=vec4(uLine,vX.x);}'
  };
  // The flytrap wearing painted skins (2026-11-16, the user's 나 방식: "pictures over the 3D frame", like the phoenix's
  // painting): the wood shader, but where the shape has picture coordinates (vT, from js/mesh-wood.js t) the colour is
  // taken from the 3 × 2 sheet of paintings (uMap; cell = floor(vT.x), 0 the top-left; across = the rest of vT.x, along
  // = vT.y, repeating past 1) and only shaded in two steps, so the painting shows. Until the sheet has loaded (uPaint
  // 0) or where there is no picture (vT.x -1: teeth, thorns) it is drawn as before.
  FS_BM.woodPaint = FS_BM.wood.replace('varying vec4 vX;void main(){', 'varying vec4 vX;varying vec2 vT;uniform sampler2D uMap;uniform float uPaint,uAnim;void main(){')
    .replace(/gl_FragColor=vec4\(c,vX\.x\);\}$/, 'if(uPaint>0.5&&vT.x>-0.5){float cell=floor(vT.x),lu=clamp((vT.x-cell-0.01)/0.98,0.0,1.0),lv=vT.y<=1.0?vT.y:fract(vT.y);' +
      'vec2 at=vec2((mod(cell,3.0)+0.015+0.97*lu)/3.0,(1.0-floor(cell/3.0)+0.015+0.97*lv)*0.5);' +
      'c=texture2D(uMap,at).rgb*(lam>0.42?1.0:0.72);' +
      // the world tree's pictures alive (uAnim 1, 2026-11-17, the user: 세계수 나무를 이렇게 — 3D wearing pictures that move):
      // 0 bark: a warm light rising up the dark grooves; 1 leaf mass: light rippling over it; 2 fruit: a heartbeat glow
      // (faster as the tree grows old, vX.w = k); 3 leaf: light running up the veins
      'if(uAnim>0.5){vec3 pc=texture2D(uMap,at).rgb;float pl=max(dot(pc,vec3(0.3,0.59,0.11)),0.02),q=pl<0.22?0.16:pl<0.5?0.42:0.74;' +
      // cel look (2026-11-17, the user: 더 또렷하게): the picture's light flattened into three tones, and the light on the
      // shape cut hard into two
      'c=mix(pc,pc*(q/pl),0.75)*(lam>0.32?1.08:0.58);float lum=dot(c,vec3(0.3,0.59,0.11)),ph=vX.z*3.0;' +
      // the flytrap (uAnim 2, 2026-11-17, the user: 덩굴 대신 넣었던 스킬도 똑같이): 0 the mouth's flesh throbbing, a wet shine
      // sliding over it; 1 the jaw's skin, its veins glowing red in time; 2 the neck, a swallow of light running up it;
      // 3 petals shimmering; 4 leaf: light up the veins
      'if(uAnim>1.5){' +
      'if(cell<0.5){float th=pow(0.5+0.5*sin(uTime*5.0+ph),3.0),wet=smoothstep(0.9,1.0,0.5+0.5*sin(lu*5.0+lv*3.0-uTime*2.2+ph));c=c*(1.0+0.3*th)+vec3(1.0,0.75,0.8)*wet*0.35;}' +
      'else if(cell<1.5){float vn=smoothstep(0.3,0.12,lum),th=pow(0.5+0.5*sin(uTime*5.0+ph),3.0);c+=vec3(1.0,0.2,0.15)*vn*th*0.8;}' +
      'else if(cell<2.5){float sw=pow(0.5+0.5*sin(lv*6.0-uTime*4.0+ph),6.0);c+=vec3(0.85,1.0,0.4)*sw*0.55;}' +
      'else if(cell<3.5){float sh=smoothstep(0.85,1.0,0.5+0.5*sin(lv*8.0+lu*3.0-uTime*3.0+ph));c+=vec3(1.0,0.8,0.9)*sh*0.45;}' +
      'else{float vein=max(smoothstep(0.035,0.0,abs(lu-0.5)),smoothstep(0.62,0.82,lum)),run=pow(0.5+0.5*sin(lv*11.0-uTime*4.5+ph),4.0);c+=vec3(1.0,0.95,0.55)*vein*run*0.9;}}' +
      'else if(cell<0.5){float gr=smoothstep(0.22,0.08,lum),up=pow(0.5+0.5*sin(lv*9.0-uTime*3.2+ph),3.0);c+=vec3(1.0,0.72,0.28)*gr*up*1.3;}' +
      'else if(cell<1.5){float rip=smoothstep(0.82,1.0,0.5+0.5*sin(lv*7.0+lu*4.0-uTime*2.6+ph));c+=vec3(0.75,1.0,0.45)*rip*smoothstep(0.2,0.55,lum)*0.8;}' +
      'else if(cell<2.5){float beat=pow(0.5+0.5*sin(uTime*(6.0+8.0*clamp(vX.y,0.0,1.0))+ph),6.0);c=c*(1.0+0.45*beat)+vec3(1.0,0.7,0.25)*beat*0.22;}' +
      'else{float vein=max(smoothstep(0.035,0.0,abs(lu-0.5)),smoothstep(0.62,0.82,lum)),run=pow(0.5+0.5*sin(lv*11.0-uTime*4.5+ph),4.0);c+=vec3(1.0,0.95,0.55)*vein*run*1.15;}}' +
      '}gl_FragColor=vec4(c,vX.x);}');
  var VS_BMT = VS.replace('void main(){', 'attribute vec4 iX;attribute vec2 uvT;varying vec4 vX;varying vec2 vT;void main(){vX=iX;vT=uvT;');

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
      var key = (vs === VS_WAVE ? 'wave' : vs === VS_PIC ? 'pic' : vs === VS_SHARD ? 'shard' : vs === VS_BM ? 'bm' : vs === VS_BML ? 'bml' : vs === VS_TWIST ? 'twist' : vs === VS_RIBBON ? 'ribbon' : vs ? 'tube' : 'std') + '|' + side + '|' + (o.solid ? 1 : 0) + '|' + fs, list = pool[key], m = list && list.pop();
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
          if (c.smoky && c.t < 0.5 && (c.trail -= dt) <= 0) { c.trail = 0.1; puff(c.p, { s0: c.s * 1.1, s1: c.s * 3.0, life: 0.55, vel: new T.Vector3(0, 0.3, 0), alpha: 0.6, order: 4 }); }
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
            // (every 0.09 s, each puff a third bigger: at every 0.038 s a meteor rain kept about 500 puffs alive and an iPhone fell
            // to 20-25 frames a second, 2026-11-15)
            puffT = 0.09; at.copy(pos).addScaledVector(back, size * (1.4 + Math.random() * 1.2)).add(new T.Vector3((Math.random() - 0.5) * size * 0.4, (Math.random() - 0.5) * size * 0.4, 0));
            puff(at, { s0: size * 0.36, s1: size * (0.95 + Math.random() * 0.4), life: 0.7 + Math.random() * 0.3, vel: back.clone().multiplyScalar(0.6).add(new T.Vector3(0, 0.25, 0)), dark: o.smokeDark || 0x302826, light: o.smokeLight || 0x7e746e, alpha: 0.42, order: 4 });
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
    // ---------- a fire tornado, built the way the user drew it (2026-11-15, docs/superpowers/specs/2026-11-15-fire-tornado.md):
    // the skeleton is a funnel from a needle point at the ground to a wide wavy rim (VS_TWIST); inside it a solid body of
    // bright fire (only its near side drawn, so it reads as one solid thing); two broad ribbons of fire wound up round it
    // (orange outside, gold inside, their upper edges licking up in flame), a glow of flame tongues round it, and at the
    // end grey smoke that takes it over from the top down and thins away.
    // set(pos on the ground, height, radius at the foot, radius at the top, sway, k, smoke, thin):
    // k 0 → 1 the fire goes out from the top down; smoke 0 → 1 how far down the smoke has taken over; thin 0 → 1 the
    // smoke frays away ----------
    var RIB_GEO = new T.PlaneGeometry(1, 1, 180, 4);
    var TWL = [
      { fs: 'tbody', r: 0.94, h: 0.97, spin: 2.6, tw: 4.5, a: 1.0, order: 5.8, normal: true },
      { fs: 'twist', col: 0xff3a0c, r: 1.05, h: 1.0, spin: 3.6, tw: 5.5, a: 0.85, heat: 0.25, order: 6.05 }
    ];
    var RIBS = [{ off: 0, turns: 2.6, w: 0.12, out: 1.06, spin: 2.6 }, { off: 3.1416, turns: 2.6, w: 0.09, out: 1.09, spin: 2.6 }];
    function funnelUni(ph) { return { uH: { value: 1 }, uR0: { value: 0.3 }, uR1: { value: 1 }, uBend: { value: 0 }, uPh: { value: ph } }; }
    function twister(o) {
      o = o || {}; var ph = Math.random() * 6;
      var layers = TWL.map(function (L) {
        var uni = funnelUni(ph); uni.uSeed = { value: Math.random() * 9 }; uni.uAlpha = { value: L.a }; uni.uK = { value: 0 }; uni.uSpin = { value: L.spin }; uni.uTw = { value: L.tw };
        if (L.fs === 'tbody') { uni.uDark = { value: C(0x9a0a06) }; uni.uLight = { value: C(0xff3410) }; }
        else { uni.uCol = { value: C(L.col) }; uni.uLo = { value: C(FIRE_LO) }; uni.uHeat = { value: L.heat }; }
        var p = add(new T.Mesh(GEO.tube, mat(FS[L.fs], uni, { side: L.normal ? T.DoubleSide : T.FrontSide, normal: !!L.normal }, VS_TWIST)), { order: L.order });
        p.L = L; return p;
      });
      var ribs = RIBS.map(function (R) {
        var uni = funnelUni(ph); uni.uY0 = { value: 0.02 }; uni.uY1 = { value: 0.97 }; uni.uTurns = { value: R.turns }; uni.uOff = { value: R.off }; uni.uSpin = { value: R.spin }; uni.uW = { value: R.w }; uni.uOut = { value: R.out };
        uni.uCol = { value: C(0xe0180a) }; uni.uIn = { value: C(0xff4a12) }; uni.uSeed = { value: Math.random() * 9 }; uni.uAlpha = { value: 1 }; uni.uK = { value: 0 };
        var p = add(new T.Mesh(RIB_GEO, mat(FS.ribbon, uni, { side: T.DoubleSide, normal: true }, VS_RIBBON)), { order: 6 });
        p.R = R; return p;
      });
      var guni = funnelUni(ph); guni.uSeed = { value: Math.random() * 9 }; guni.uAlpha = { value: 0.85 }; guni.uK = { value: 0 }; guni.uSpin = { value: 1.0 }; guni.uTw = { value: 3.5 }; guni.uTop = { value: 0 };
      guni.uDark = { value: C(0x2e2826) }; guni.uLight = { value: C(0x8e8682) };
      var grey = add(new T.Mesh(GEO.tube, mat(FS.tgrey, guni, { side: T.DoubleSide, normal: true }, VS_TWIST)), { order: 6.1 });
      layers[0].mesh.name = 'core3d twister';
      var foot = orb({ col: 0xff7a2b, deep: FIRE_LO, alpha: 0.35, order: 6 });
      function shape(p, h, r0, r1, bend) { var u = U(p); p.mesh.position.copy(footAt); u.uH.value = Math.max(0.001, h); u.uR0.value = Math.max(0.001, r0); u.uR1.value = Math.max(0.001, r1); u.uBend.value = bend || 0; }
      return {
        set: function (pos, h, r0, r1, bend, k, smoke, thin) {
          k = k || 0; smoke = smoke || 0; thin = thin || 0; footAt.copy(pos);
          layers.forEach(function (p) { var L = p.L; shape(p, h * L.h, r0 * L.r, r1 * L.r, bend); U(p).uK.value = Math.min(1, k * (L.fs === 'tbody' ? 1 : 1.25)); p.mesh.visible = k < 1; });
          ribs.forEach(function (p) { shape(p, h, r0, r1, bend); U(p).uK.value = Math.min(1, k * 1.1); p.mesh.visible = k < 1; });
          // the smoke is a little wider than the fire, and grows thinner and taller as it frays
          shape(grey, h * (1 + 0.35 * thin), r0 * 1.1, r1 * (1.05 + 0.3 * thin), bend * (1 + 2.2 * thin)); grey.mesh.position.y += h * 0.3 * thin; U(grey).uTw.value = 3.5 * (1 - 0.75 * thin);
          U(grey).uTop.value = smoke; U(grey).uK.value = thin; grey.mesh.visible = smoke > 0.001 && thin < 1;
          foot.set(footAt.set(pos.x, pos.y + Math.max(0.05, r0) * 0.5, pos.z), r0 * 2.0 + 0.32, 0.35 * (1 - 0.6 * Math.min(1, k)) * (1 - thin));
        },
        kill: function () { layers.forEach(drop); ribs.forEach(drop); drop(grey); foot.kill(); }
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
    // ---------- real 3D toon fire on shapes made in Blender (js/mesh-fire.js, CW.MESHFIRE). toonFire(shape, { core, smoke })
    // set(pos of its foot, height, spin (radians, turns it and its pattern), k fire out from the top 0 → 1, from (keep only
    // what is above this height 0 → 1, for smoke taking over from the top), dis 0 → 1 breaking up into nothing) ----------
    var meshGeo = {};
    function meshGeometry(name) {
      if (meshGeo[name]) return meshGeo[name]; var m = CW.MESHFIRE && CW.MESHFIRE[name]; if (!m) return null;
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(b64(m.p, Float32Array), 3)); g.setAttribute('uv', new T.BufferAttribute(b64(m.u, Float32Array), 2)); g.setIndex(new T.BufferAttribute(b64(m.i, Uint16Array), 1)); g.computeVertexNormals();
      g.userData.h = m.h; meshGeo[name] = g; return g;
    }
    var TY = new T.Vector3(0, 1, 0), TQ = new T.Quaternion(), TS = new T.Quaternion();
    function turn(mesh, spin, axis) {
      if (!axis) { mesh.rotation.set(0, spin || 0, 0); return; }
      TQ.setFromUnitVectors(TY, axis); TS.setFromAxisAngle(TY, spin || 0); mesh.quaternion.copy(TQ).multiply(TS);
    }
    function hexv(h) { return new T.Vector3((h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255); }
    // the colour steps the Blender render used (from cut up: rim colour, then hotter), per kind
    var TOON = {
      fire: { cut: 0.38, lift: 0.12, steps: [0.46, 0.6, 0.74, 0.88], cols: [0xd42a0c, 0xff6b00, 0xff9a1a, 0xffd21f, 0xfff7c8] },
      fireCore: { cut: 0.38, lift: 0.0, steps: [0.52, 0.7, 0.88, 9], cols: [0xff7a10, 0xffad1a, 0xffd83a, 0xfff4a0, 0xfff4a0] },
      smoke: { cut: 0.42, lift: 0.18, steps: [0.55, 0.72, 9, 9], cols: [0x4a4558, 0x7a7590, 0xaaa5bd, 0xaaa5bd, 0xaaa5bd] },
      smokeCore: { cut: 0.42, lift: 0.0, steps: [0.6, 0.8, 9, 9], cols: [0x6e6880, 0x9a95ad, 0xc4c0d2, 0xc4c0d2, 0xc4c0d2] },
      // the sun's fire (태양의 창): gold to white
      sun: { cut: 0.38, lift: 0.1, steps: [0.46, 0.6, 0.74, 0.88], cols: [0xe8780c, 0xffa61a, 0xffd23a, 0xfff08a, 0xffffff] },
      sunCore: { cut: 0.38, lift: 0.0, steps: [0.52, 0.7, 0.88, 9], cols: [0xffc23a, 0xffe070, 0xfff6c0, 0xffffff, 0xffffff] }
    };
    function toonFire(shape, o) {
      o = o || {};
      // o.tw: how far the flame streaks wind round as they rise (0 = straight up, a torch); o.rise: how fast they race up;
      // o.lift: more gaps between the flames (default per kind)
      var P = TOON[(o.smoke ? 'smoke' : (o.kind || 'fire')) + (o.core ? 'Core' : '')], p = null, glow = null, seed = Math.random() * 7;
      // the glow shell: only round the outer fire (not the core inside it, not smoke)
      var wantGlow = !o.smoke && !o.core && !o.noGlow, glowA = o.glow === undefined ? 1.3 : o.glow;
      function make() {
        var g = meshGeometry(shape); if (!g) return null;
        var uni = { uC0: { value: hexv(P.cols[0]) }, uC1: { value: hexv(P.cols[1]) }, uC2: { value: hexv(P.cols[2]) }, uC3: { value: hexv(P.cols[3]) }, uC4: { value: hexv(P.cols[4]) },
          uRim: { value: hexv(o.smoke ? 0x24202e : o.kind === 'sun' ? 0x8a4a06 : 0x6e1004) }, uOut: { value: 0 }, uTw: { value: o.tw || 0 }, uRise: { value: o.rise || 0 },
          uStep: { value: new T.Vector4(P.steps[0], P.steps[1], P.steps[2], P.steps[3]) }, uCut: { value: P.cut }, uLift: { value: o.lift === undefined ? P.lift : o.lift }, uSpin: { value: 0 }, uK: { value: 0 }, uFrom: { value: 0 }, uDis: { value: 0 }, uSeed: { value: seed }, uFoot: { value: o.foot ? 1 : 0 }, uBand: { value: o.band === undefined ? 1 : o.band }, uTop: { value: o.top || 0 } };
        var q = add(new T.Mesh(g, mat(FS.toon, uni, { solid: true, side: T.DoubleSide })), { order: 6 }); q.mesh.name = 'core3d toon ' + shape;
        if (wantGlow) { glow = add(new T.Mesh(g, mat(FS.toonGlow, { uCol: { value: hexv(o.kind === 'sun' ? 0xffb030 : 0xff5a12) }, uK: { value: 0 }, uA: { value: glowA } }, { side: T.DoubleSide, keepAdd: true })), { order: 6.1 }); glow.mesh.name = 'core3d toonglow ' + shape; }
        return q;
      }
      return {
        // w: its width as a scale of the shape (default: in step with its height, the shape as made)
        // axis (optional, a unit vector): the way the shape's foot-to-top points (a fireball's tail streams back along its
        // flight), turned by spin round it; without it the shape stands up
        set: function (pos, h, spin, k, from, dis, w, axis) {
          if (!p) { p = make(); if (!p) return; }
          var u = U(p), s = Math.max(0.001, h) / (p.mesh.geometry.userData.h || 1), sw = w || s, shown = (k || 0) < 1 && (dis || 0) < 1;
          p.mesh.position.copy(pos); p.mesh.scale.set(sw, s, sw); turn(p.mesh, spin, axis);
          u.uSpin.value = -(spin || 0) * 2; u.uK.value = k || 0; u.uFrom.value = from || 0; u.uDis.value = dis || 0;
          // bright ground: the dark outline instead of the glow (light added on snow is lost and only washes it out)
          u.uOut.value = bright ? 1 : 0;
          p.mesh.visible = shown;
          if (glow) {
            glow.mesh.position.copy(pos); glow.mesh.scale.set(sw * 1.16, s * 1.02, sw * 1.16); turn(glow.mesh, spin, axis);
            U(glow).uK.value = k || 0; U(glow).uA.value = glowA * (1 - (dis || 0)); glow.mesh.visible = shown && !bright;
          }
        },
        ready: function () { return !!(CW.MESHFIRE && CW.MESHFIRE[shape]); },
        kill: function () { if (p) drop(p); if (glow) drop(glow); p = glow = null; }
      };
    }
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
      var g = new T.InstancedBufferGeometry().copy(new T.PlaneGeometry(1, 1)), n = SHARD_CELLS.length, rect = new Float32Array(n * 4), ad = new Float32Array(n * 3).fill(1);
      SHARD_CELLS.forEach(function (cr, i) { var o = 0.25; rect.set([(cr[0] - o) / SHARD_C, (cr[1] - o) / SHARD_R, (cr[0] + 1 + o) / SHARD_C, (cr[1] + 1 + o) / SHARD_R], i * 4); });
      g.setAttribute('iRect', new T.InstancedBufferAttribute(rect, 4)); g.setAttribute('iAD', new T.InstancedBufferAttribute(ad, 3).setUsage(T.DynamicDrawUsage));
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
          m.setMatrixAt(i, M.compose(pos, q, sc3)); ad.setXYZ(i, alpha, dis || 0, 1);
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
      // two layers (back, front) of the two scenes, so the wave has thickness
      var L = 2, g = new T.InstancedBufferGeometry().copy(new T.PlaneGeometry(1, 1)), rect = new Float32Array(SEQ_N * 2 * L * 4), ad = new Float32Array(SEQ_N * 2 * L * 3).fill(1), sceneOf = new Int8Array(SEQ_N * 2 * L).fill(-1);
      g.setAttribute('iRect', new T.InstancedBufferAttribute(rect, 4).setUsage(T.DynamicDrawUsage)); g.setAttribute('iAD', new T.InstancedBufferAttribute(ad, 3).setUsage(T.DynamicDrawUsage));
      var m = new T.InstancedMesh(g, mat(FS.shard, { uMap: { value: seqTex } }, { normal: true, side: T.DoubleSide }, VS_SHARD), SEQ_N * 2 * L);
      m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.name = 'core3d seqwave';
      var p = add(m, { order: 6 }), q = new T.Quaternion(), e = new T.Euler(0, 0, 0, 'XYZ'), sc3 = new T.Vector3(), M = new T.Matrix4();
      p.seqSheet = true;
      // the picture rect of one piece of one scene (a quarter piece wider on every side so neighbours overlap; kept
      // inside its own scene of the sheet)
      function pieceRect(scene, k) {
        var c = scene % 4, r = (scene / 4) | 0, u0 = c / 4, v0 = 1 - (r + 1) / 2, du = 0.25 / SEQ_GC, dv = 0.5 / SEQ_GR, pc = k % SEQ_GC, pr = (k / SEQ_GC) | 0, o = 0.18;
        return [Math.max(u0, u0 + (pc - o) * du), Math.max(v0, v0 + (pr - o) * dv), Math.min(u0 + 0.25, u0 + (pc + 1 + o) * du), Math.min(v0 + 0.5, v0 + (pr + 1 + o) * dv)];
      }
      return {
        GC: SEQ_GC, GR: SEQ_GR, N: SEQ_N, L: L, ASPECT: 384 / 304,
        // the piece k sits at (u, v) of its scene: u 0..1 left to right, v 0..1 bottom to top
        uv: function (k) { return { u: ((k % SEQ_GC) + 0.5) / SEQ_GC, v: (((k / SEQ_GC) | 0) + 0.5) / SEQ_GR }; },
        put: function (slot, scene, k, pos, rx, rz, sx, sy, alpha, dis, layer, shade) {
          var i = ((layer || 0) * 2 + slot) * SEQ_N + k;
          if (sceneOf[i] !== scene) { sceneOf[i] = scene; rect.set(pieceRect(scene, k), i * 4); }
          e.set(rx, 0, rz); q.setFromEuler(e); sc3.set(Math.abs(sx) < 0.001 ? 0.001 : sx, Math.max(0.001, sy), 1);
          m.setMatrixAt(i, M.compose(pos, q, sc3)); ad[i * 3] = alpha; ad[i * 3 + 1] = dis || 0; ad[i * 3 + 2] = shade === undefined ? 1 : shade;
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
    // o.paint (2026-11-16, the world tree's fruit bombs): drawn the way a bright place draws it (painted colours, no added
    // light) wherever it lands, so many landing together do not wash the screen white
    function impactP(pos, o) { if (!(o && o.paint) || bright) return impact(pos, o); bright = true; try { return impact(pos, o); } finally { bright = false; } }
    function impact(pos, o) {
      if (CW.fxOff && CW.fxOff.ground) return;
      var OFF = CW.fxOff || {};   // (impFlash, impDome, impCurtain, impMarks, impSmoke: parts of it, for measuring on a phone)
      // o.lite: one of several landing together (a meteor rain): a shorter fire dome and the hollow only — no flash, earth
      // crown, ground ring, cracks, half the dust (turning the whole landing off brought the iPhone back to 60) (a meteor rain kept about 600 3D parts alive and an iPhone fell to 25 frames, 2026-11-15)
      o = o || {}; var lite = !!o.lite; var R = o.size || 1, x = pos.x, z = pos.z, col = o.col || 0xff9a2a, dirt = o.dirt || 0x6a5546, calm = o.calm === undefined ? 1 : o.calm;
      if (!OFF.impFlash && !lite) {
      var fl = orb({ col: bright ? 0xffd040 : 0xfff6d0, deep: bright ? 0xff6a10 : col, alpha: 1, order: 7 }), fT = 0.2;
      fl.set(new T.Vector3(x, R * 0.35, z), R * 0.4, calm);
      add(new T.Object3D(), { life: fT, upd: function (dt, t) { var k = t / fT; fl.set(new T.Vector3(x, R * 0.35, z), R * (0.4 + 0.8 * ease(k / 0.4)), Math.max(0, 1 - k * k) * calm); if (k >= 1) { fl.kill(); return true; } } });
      }
      // (o.dome false / o.smoke false: without the ball of fire / the dust and smoke — the world tree's 4th and later fruit
      // bombs: thirteen landing together, these two were what an iPhone could not keep up with, 46 → 60 frames without
      // the landings, 2026-11-17)
      if (!OFF.impDome && o.dome !== false) {
      var fbL = lite ? 0.5 : 0.7, fb = add(new T.Mesh(GEO.ball, mat(FS.dome, { uCol: { value: C(col) }, uLow: { value: C(0x8a1a08) }, uHot: { value: 0.42 }, uK: { value: 0 }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: 0.4 + 0.6 * calm } })), {
        order: 6, life: fbL, upd: function (dt, t) { var k = t / fbL; fb.mesh.scale.setScalar(R * (0.28 + 0.62 * ease(k / 0.28))); fb.mesh.position.y = R * (0.3 + 0.9 * ease(k)); U(fb).uK.value = Math.min(1, Math.max(0, (k - 0.1) / 0.9)); }
      });
      fb.mesh.position.set(x, R * 0.2, z); fb.mesh.scale.setScalar(R * 0.22);
      }
      if (!OFF.impCurtain && !lite) {
      var cuL = 0.5, cu = add(new T.Mesh(GEO.curtain, mat(FS.ejecta, { uDirt: { value: C(dirt) }, uHot: { value: C(o.hot || 0xff7a1a) }, uK: { value: 0 }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: 0.8 } }, { side: T.DoubleSide, normal: true })), {
        order: 6, life: cuL, upd: function (dt, t) { var k = t / cuL, e = ease(k / 0.7); cu.mesh.scale.set(R * (0.35 + 0.9 * e), R * (0.3 + 0.85 * e) * (1 - 0.3 * k), R * (0.35 + 0.9 * e)); U(cu).uK.value = k; }
      });
      cu.mesh.position.set(x, 0.02, z); cu.mesh.scale.setScalar(R * 0.35);
      }
      if (!OFF.impMarks) {
      if (!lite) {
      var rgL = 0.5, rg = add(new T.Mesh(GEO.flat, mat(FS.shock, { uCol: { value: C(o.ringCol || 0xff8a2a) }, uK: { value: 0 }, uW: { value: 0.09 }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: 0.9 * calm } })), {
        order: 4, life: rgL, upd: function (dt, t) { U(rg).uK.value = ease(t / rgL); }
      });
      rg.mesh.position.set(x, 0.045, z); rg.mesh.scale.setScalar(R * (o.ring || 2.8));
      }
      // (o.hollow false: no hollow of its own — the world tree's many fruit bombs, each a mesh drawn on its own that stays
      // 1.8 s, leave a batched scorch instead, 2026-11-16)
      if (o.hollow !== false) {
        var scL = 1.8, sc2 = add(new T.Mesh(GEO.flat, mat(FS.scorch, { uK: { value: 0 }, uSeed: { value: Math.random() * 9 } }, { normal: true })), { order: 3, life: scL, upd: function (dt, t) { U(sc2).uK.value = t / scL; } });
        sc2.mesh.position.set(x, 0.032, z); sc2.mesh.scale.setScalar(R * 0.95);
      }
      if (!lite) {
      var ckL = 1.3, ck = add(new T.Mesh(GEO.flat, mat(FS.cracks, { uCol: { value: C(col) }, uK: { value: 0 }, uSeed: { value: Math.random() * 9 } })), { order: 4, life: ckL, upd: function (dt, t) { U(ck).uK.value = t / ckL; } });
      ck.mesh.position.set(x, 0.04, z); ck.mesh.scale.setScalar(R * 1.4);
      }
      }
      // dust rolling out along the ground, then smoke climbing out of the hollow
      if (!OFF.impSmoke && o.smoke !== false) {
      // (four puffs of dust a little bigger instead of six, one smoke instead of two when others land close by: see above)
      for (var i = 0, nd = lite ? 2 : 4; i < nd; i++) { var a = i / nd * 6.283 + Math.random() * 0.5; puff(new T.Vector3(x + Math.cos(a) * R * 0.4, R * 0.18, z + Math.sin(a) * R * 0.3), { s0: R * 0.2, s1: R * 0.46, life: 0.6, vel: new T.Vector3(Math.cos(a) * R * 4.0, 0.25, Math.sin(a) * R * 3.0), drag: 3.4, dark: 0x4a3e34, light: dirt, alpha: 0.42 }); }
      later(0.07, function () { for (var j = 0; j < (calm < 1 ? 1 : 2); j++) puff(new T.Vector3(x + (Math.random() - 0.5) * R * 0.4, R * (0.3 + j * 0.18), z + (Math.random() - 0.5) * R * 0.3), { s0: R * 0.22, s1: R * (0.5 + Math.random() * 0.25), life: 1.0 + Math.random() * 0.4, vel: new T.Vector3((Math.random() - 0.5) * 0.4, 1.0 + j * 0.25, 0), drag: 1.2, dark: 0x3a3230, light: 0x8a807a, alpha: 0.38 }); });
      }
      // (one smoking rock instead of two when others land close by; a smoking rock trails a puff every 0.1 s, not 0.045:
      // these trails were most of the 500 puffs of a meteor rain, 2026-11-15)
      for (var c = 0; c < Math.round((o.chips === undefined ? 9 : o.chips) * (0.4 + 0.6 * calm)); c++) chip(pos, R, o.hot || 0xff7a1a, c < (calm < 1 ? 1 : 2));
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
          if (smoky && t < 0.5 && (trail -= dt) <= 0) { trail = 0.1; puff(m.position, { s0: s * 1.1, s1: s * 3.0, life: 0.55, vel: new T.Vector3(0, 0.3, 0), alpha: 0.6, order: 4 }); }
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

    // ---------- the Blender meshes (CW.MESH6), drawn many copies at a time ----------
    // bm(kind, o) → { set(pos, quaternion, scale (Vector3 or number), alpha, k), kill }. o.col its colour, o.line an
    // outline colour (or false), o.lineW the outline width in world units. A kind's layer is made the first time it is
    // used; a full layer drops its oldest copy.
    var BM_KIND = {
      crescent: { fs: 'blade', cap: 16, line: 0x241048, lineW: 0.035, order: 6.6 },
      arrow: { fs: 'arrow', cap: 96, line: 0x5a2a04, lineW: 0.012, order: 6.6 },
      rift: { fs: 'rift', cap: 3, line: null, order: 6.2, side: T.DoubleSide },
      riftShard: { fs: 'glass', cap: 96, line: 0x12041f, lineW: 0.02, order: 6.6 },
      // the crater is drawn over the ground without the depth test (its bowl is below the ground, which would hide it) and
      // before the monsters (order 3), so they still stand in front of it
      crater: { fs: 'crater', cap: 64, line: null, order: 1.5 },
      gravOrb: { fs: 'gorb', cap: 64, line: 0x12041f, lineW: 0.03, order: 6.7 },
      gravRing: { fs: 'gring', cap: 24, line: null, order: 6.65, side: T.DoubleSide },
      iceShard: { fs: 'ice', cap: 128, line: 0x3d8cc8, lineW: 0.011, order: 6.6 },
      // the 4th-tier ice (js/mesh-ice.js, tools/blender/ice_meshes.py, 2026-11-16): slender sharp crystals
      iceNeedle: { fs: 'ice', cap: 200, line: 0x3d8cc8, lineW: 0.012, order: 6.6 },
      iceCluster: { fs: 'ice', cap: 64, line: 0x3d8cc8, lineW: 0.012, order: 6.6 },
      iceLance: { fs: 'ice', cap: 8, line: 0x3d8cc8, lineW: 0.014, order: 6.62 },
      iceChip: { fs: 'ice', cap: 200, line: 0x3d8cc8, lineW: 0.009, order: 6.6 },
      iceSpike2: { fs: 'ice', cap: 720, line: 0x3d8cc8, lineW: 0.012, order: 6.6 },
      iceShard2: { fs: 'ice', cap: 220, line: 0x3d8cc8, lineW: 0.011, order: 6.6 },
      // 태양의 창: its own sharp spear (js/mesh-ice.js sunSpear), as sunlight
      sunLance: { fs: 'sunspear', mesh: 'sunSpear', cap: 4, line: 0x9a4a06, lineW: 0.012, order: 6.64 },
      // the 10th-tier wood (js/mesh-wood.js): grown by k, so their outline is cut by k too (lineFs)
      woodRoot: { fs: 'wood', lineFs: 'woodLine', cap: 160, line: 0x2a160a, lineW: 0.014, order: 6.6 },
      woodRoots: { fs: 'wood', lineFs: 'woodLine', cap: 64, line: 0x2a160a, lineW: 0.016, order: 6.6 },
      woodChip: { fs: 'wood', lineFs: 'woodLine', cap: 160, line: 0x2a160a, lineW: 0.008, order: 6.6 },
      woodMound: { fs: 'wood', lineFs: 'woodLine', cap: 240, line: 0x2a1a0e, lineW: 0.01, order: 6.55 },
      trapStem: { fs: 'woodPaint', map: 'trap-skin', lineFs: 'woodLine', cap: 16, line: 0x0a1006, lineW: 0.045, order: 6.6 },
      trapJaw: { fs: 'woodPaint', map: 'trap-skin', lineFs: 'woodLine', cap: 32, line: 0x120304, lineW: 0.042, order: 6.64 },
      trapPetal: { fs: 'woodPaint', map: 'trap-skin', lineFs: 'woodLine', cap: 96, line: 0x20040c, lineW: 0.03, order: 6.6 },
      // the world tree (세계수 열매 폭탄), painted (art/tree-skin.webp)
      treeTrunk: { fs: 'woodPaint', map: 'tree-skin', lineFs: 'woodLine', cap: 4, line: 0x120804, lineW: 0.055, order: 6.58 },
      treeClump: { fs: 'woodPaint', map: 'tree-skin', lineFs: 'woodLine', cap: 96, line: 0x061404, lineW: 0.02, order: 6.6 },   // (a spray of leaves: a fine line)
      treeFruit: { fs: 'woodPaint', map: 'tree-skin', lineFs: 'woodLine', cap: 48, line: 0x2a1002, lineW: 0.035, order: 6.64 },
      woodLeaf: { fs: 'wood', lineFs: 'woodLine', cap: 320, line: 0x10240a, lineW: 0.006, order: 6.6 },
      leafBlade: { fs: 'wood', lineFs: 'woodLine', cap: 700, line: 0x0c2208, lineW: 0.005, order: 6.62 }
    };
    var bmLayers = {}, BMV = new T.Vector3(), BMS = new T.Vector3(), BMM = new T.Matrix4(), BMQ = new T.Quaternion();
    function b64(s, Type) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Type(u.buffer); }
    function bmGeo(kind) {
      var mk = (BM_KIND[kind] && BM_KIND[kind].mesh) || kind, d = (CW.MESH6 && CW.MESH6[mk]) || (CW.MESHICE && CW.MESHICE[mk]) || (CW.MESHWOOD && CW.MESHWOOD[mk]); if (!d) return null;
      var g = new T.BufferGeometry(), n8 = b64(d.n, Int8Array), n = new Float32Array(n8.length);
      for (var i = 0; i < n8.length; i++) n[i] = n8[i] / 127;
      g.setAttribute('position', new T.BufferAttribute(b64(d.p, Float32Array), 3));
      g.setAttribute('normal', new T.BufferAttribute(n, 3));
      g.setAttribute('uv', new T.BufferAttribute(b64(d.u, Float32Array), 2));
      g.setIndex(new T.BufferAttribute(b64(d.i, Uint16Array), 1));
      if (d.t) g.setAttribute('uvT', new T.BufferAttribute(b64(d.t, Float32Array), 2));   // a painted skin's picture coordinates
      return g;
    }

    // (2026-11-17 later: the sheet is now the anime explosion the user had ChatGPT draw — flash, ball of fire, tearing
    // flames, smoke — shown one moment after another without blending, like animation)
    // ---------- the world tree's fruit bomb as pictures (art/fx-fruitboom.webp, 2026-11-17, the user: keep the impact,
    // keep the phone cool): its ball of fire and its dust and smoke, baked from the real 3D landing by
    // tools/bake-fruitboom.js into 16 moments on a 4 x 4 sheet, played on one batched layer of pictures that always face
    // the camera. boom(pos): one more landing at pos (on the ground). BOOM must match the bake (BAKE there).
    var BOOM = { grid: 4, frames: 16, span: 0.9, world: 2.6, centerY: 0.62, push: 1.2, cap: 40 }, boomL = null, boomTex = null;
    var VS_BOOM = [
      'attribute vec2 iF; varying vec2 vUv0; varying vec2 vUv1; varying float vMix; varying float vA;',
      'void main(){',
      '  vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float s = length(instanceMatrix[0].xyz);',
      '  mv.xy += position.xy * s; gl_Position = projectionMatrix * mv;',
      '  float f0 = floor(iF.x), f1 = min(f0 + 1.0, ' + (BOOM.frames - 1) + '.0); vMix = 0.0; vA = iF.y; vec2 uv = position.xy + 0.5;',
      '  vUv0 = (vec2(mod(f0, 4.0), 3.0 - floor(f0 / 4.0)) + uv) / 4.0; vUv1 = (vec2(mod(f1, 4.0), 3.0 - floor(f1 / 4.0)) + uv) / 4.0; }'].join('\n');
    var FS_BOOM = [
      'uniform sampler2D uMap; varying vec2 vUv0; varying vec2 vUv1; varying float vMix; varying float vA;',
      'void main(){ vec4 c = mix(texture2D(uMap, vUv0), texture2D(uMap, vUv1), vMix); c.a *= vA; if (c.a < 0.01) discard; gl_FragColor = c; }'].join('\n');
    function boomLayer() {
      if (boomL) return boomL;
      if (!boomTex) {
        boomTex = new T.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1); boomTex.needsUpdate = true;
        if (T.TextureLoader) new T.TextureLoader().load((root.CW && root.CW.ART_BASE || 'art/') + 'fx-fruitboom.webp', function (t) {
          t.generateMipmaps = false; t.minFilter = T.LinearFilter; boomTex = t; if (boomL) boomL.mat.uniforms.uMap.value = t;
          try { if (sc.renderer && sc.renderer.initTexture) sc.renderer.initTexture(t); } catch (e) { }   // (not on the first landing: see skin())
        }, undefined, function () { });
      }
      var g = new T.InstancedBufferGeometry().copy(new T.PlaneGeometry(1, 1)), fa = new Float32Array(BOOM.cap * 2);
      g.setAttribute('iF', new T.InstancedBufferAttribute(fa, 2).setUsage(T.DynamicDrawUsage));
      var m = new T.ShaderMaterial({ uniforms: { uMap: { value: boomTex } }, vertexShader: VS_BOOM, fragmentShader: FS_BOOM, transparent: true, depthWrite: false, depthTest: true });
      var mesh = new T.InstancedMesh(g, m, BOOM.cap); mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.frustumCulled = false; mesh.count = 0; mesh.visible = false; mesh.renderOrder = 6; mesh.name = 'core3d fruitboom';
      group.add(mesh);
      boomL = { mesh: mesh, mat: m, fa: fa, g: g, list: [] };
      return boomL;
    }
    function boom(pos, size) {   // size: times the fruit's (the great fruit: 2.2)
      var L = boomLayer(); if (L.list.length >= BOOM.cap) L.list.shift();
      L.list.push({ x: pos.x, z: pos.z, t: 0, s: size || 1 });
    }
    var BOOM_M = new T.Matrix4(), BOOM_P = new T.Vector3(), BOOM_D = new T.Vector3(), BOOM_S = new T.Vector3(), BOOM_Q = new T.Quaternion();
    function drawBoom(dt) {
      var L = boomL; if (!L) return;
      var cam = sc.camera, n = 0;
      for (var i = L.list.length - 1; i >= 0; i--) { L.list[i].t += dt; if (L.list[i].t >= BOOM.span) L.list.splice(i, 1); }
      for (var j = 0; j < L.list.length; j++) {
        var b = L.list[j], f = Math.min(BOOM.frames - 1.001, b.t / BOOM.span * BOOM.frames);
        // a little toward the camera so the ground does not cut its lower half off, and as much smaller, so it looks the
        // same size where it is
        BOOM_P.set(b.x, BOOM.centerY * b.s, b.z); BOOM_D.copy(cam.position).sub(BOOM_P); var D = BOOM_D.length(), k = Math.max(0.2, (D - BOOM.push) / D);
        BOOM_P.addScaledVector(BOOM_D, BOOM.push / D); BOOM_S.setScalar(BOOM.world * b.s * k);
        L.mesh.setMatrixAt(n, BOOM_M.compose(BOOM_P, BOOM_Q, BOOM_S)); L.fa[n * 2] = f; L.fa[n * 2 + 1] = 1; n++;
      }
      L.mesh.count = n; L.mesh.visible = n > 0; L.mesh.instanceMatrix.needsUpdate = true; L.g.attributes.iF.needsUpdate = true;
    }
    // the painted skins' sheet (BM_KIND map): loaded once; the layers wearing it switch to it when it has come
    var skins = {};
    function skin(name) {
      var S = skins[name]; if (S) return S;
      S = skins[name] = { tex: new T.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1), ready: false, users: [] };
      S.tex.needsUpdate = true;
      if (T.TextureLoader) new T.TextureLoader().load((root.CW && root.CW.ART_BASE || 'art/') + name + '.webp', function (t) {
        t.anisotropy = 4; t.generateMipmaps = false; t.minFilter = T.LinearFilter; S.tex = t; S.ready = true;
        // sent to the graphics card now, while it arrives (warm() asks for every skin), not on the first frame that draws
        // it: a 1536×1024 sheet uploading mid-fight was the stall on the flytrap's and the world tree's first cast
        // (about 150 ms on a 4×-slowed phone emulation, 2026-11-16)
        // (형꺼만: the trial has no tier-10 skills, the user: 친구꺼는 빼)
        try { if (!CW.FRIEND && sc.renderer && sc.renderer.initTexture) sc.renderer.initTexture(t); } catch (e) { }
        S.users.forEach(function (u) { u.uMap.value = t; u.uPaint.value = 1; });
      }, undefined, function () { });
      return S;
    }
    function bmLayer(kind) {
      var L = bmLayers[kind]; if (L) return L;
      var K = BM_KIND[kind], g = bmGeo(kind); if (!K || !g) return null;
      var cap = K.cap, ix = new T.InstancedBufferAttribute(new Float32Array(cap * 4), 4); ix.setUsage(T.DynamicDrawUsage); g.setAttribute('iX', ix);
      var uni = { uCol: { value: C(0xffffff) }, uDeep: { value: C(0x2a6cff) } }, SK = K.map ? skin(K.map) : null;
      if (SK) { uni.uMap = { value: SK.tex }; uni.uPaint = { value: SK.ready ? 1 : 0 }; uni.uAnim = { value: K.map === 'tree-skin' ? 1 : K.map === 'trap-skin' ? 2 : 0 }; }
      var body = new T.InstancedMesh(g, mat(FS_BM[K.fs], uni, { normal: true, depthWrite: kind !== 'rift' && kind !== 'gravRing' && kind !== 'crater', depthTest: kind !== 'crater', side: K.side }, SK ? VS_BMT : VS_BM), cap);
      if (SK) SK.users.push(body.material.uniforms);
      body.instanceColor = new T.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
      var line = K.line === null ? null : new T.InstancedMesh(g, mat(FS_BM[K.lineFs || 'line'], { uLine: { value: C(K.line) } }, { normal: true, side: T.BackSide }, VS_BML), cap);
      [body, line].forEach(function (m, i) { if (!m) return; m.renderOrder = K.order - (i ? 0.02 : 0); m.frustumCulled = false; m.count = 0; m.visible = false; m.name = 'bm3d ' + kind; group.add(m); });
      L = bmLayers[kind] = { kind: kind, body: body, line: line, ix: ix, list: [], cap: cap, K: K };
      return L;
    }
    function bm(kind, o) {
      o = o || {}; var L = bmLayer(kind);
      if (!L) return { set: function () {}, kill: function () {}, live: function () { return false; } };
      if (L.list.length >= L.cap) L.list.shift().dead = true;
      var h = { p: new T.Vector3(0, -40, 0), q: new T.Quaternion(), s: new T.Vector3(1, 1, 1), c: C(o.col === undefined ? 0xffffff : o.col), a: 1, k: 0, seed: Math.random() * 9, w: o.line === false ? 0 : (o.lineW === undefined ? L.K.lineW || 0 : o.lineW), dead: false };
      L.list.push(h);
      return {
        set: function (pos, q, s, a, k) {
          if (pos) h.p.copy(pos); if (q) h.q.copy(q);
          if (s !== undefined && s !== null) { if (typeof s === 'number') h.s.setScalar(Math.max(1e-4, s)); else h.s.copy(s); }
          if (a !== undefined) h.a = a; if (k !== undefined) h.k = k;
        },
        tint: function (hex) { h.c.setHex(hex); },
        kill: function () { h.dead = true; },
        live: function () { return !h.dead; }
      };
    }
    function drawBM() {
      for (var kind in bmLayers) {
        var L = bmLayers[kind], list = L.list;
        for (var i = list.length - 1; i >= 0; i--) if (list[i].dead || list[i].a <= 0.002) { if (list[i].a <= 0.002 && !list[i].dead) continue; list.splice(i, 1); }
        var n = 0;
        for (var j = 0; j < list.length; j++) {
          var h = list[j]; if (h.a <= 0.002) continue;
          BMS.copy(h.s); BMM.compose(h.p, h.q, BMS);
          L.body.setMatrixAt(n, BMM); L.body.setColorAt(n, h.c); if (L.line) L.line.setMatrixAt(n, BMM);
          L.ix.setXYZW(n, h.a, h.k, h.seed, h.w); n++;
        }
        L.body.count = n; L.body.visible = n > 0; L.body.instanceMatrix.needsUpdate = true; L.body.instanceColor.needsUpdate = true; L.ix.needsUpdate = true;
        L.body.material.uniforms.uTime.value = time; L.body.material.uniforms.uBright.value = bright ? 1 : 0;
        if (L.line) { L.line.count = n; L.line.visible = n > 0; L.line.instanceMatrix.needsUpdate = true; }
      }
    }
    function bmCount() { var n = 0; for (var k in bmLayers) n += bmLayers[k].list.length; return n; }

    function update(dt) {
      time += dt;
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        if (p.dead) { parts.splice(i, 1); continue; }
        p.t += dt; var u = p.mesh.material && p.mesh.material.uniforms; if (u && u.uTime) u.uTime.value = time;
        if ((p.upd && p.upd(dt, p.t) === true) || p.t >= p.life) { drop(p); parts.splice(i, 1); }
      }
      drawChips(dt); drawSpikes(dt); drawCrystals(dt); drawBM(); drawBoom(dt);
    }
    function clear() { if (boomL) { boomL.list.length = 0; drawBoom(0); } for (var bk in bmLayers) bmLayers[bk].list.forEach(function (h) { h.dead = true; }); drawBM(); parts.forEach(drop); parts.length = 0; spikes.length = 0; chips.forEach(function (l) { l.length = 0; }); xs.length = 0; drawSpikes(0); drawChips(0); drawCrystals(0); if (sc.lens) sc.lens(null); }
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
      rock({ size: 0.3 }).set(far, vel, 0.05); fireball({ size: 0.3 }).set(far, vel, 0.05); column({}).set(far, 1, 1, 0); twister({}).set(far, 2, 0.3, 1, 0.3, 0, 0.5, 0); ringWall({}).set(far, 1, 1, 0); fireWave({}).set(far.x, far.z, 1, 1, 0, 1, 2, 0); picWave({}).set(far, 1, 0, 1, 0, 1); var ws = waveShards({}); ws.put(0, far, 0, 0, 1, 1, 1, 0); ws.commit(); var sq = seqWave(); sq.put(0, 0, 0, far, 0, 0, 1, 1, 1, 0); sq.commit(); iceSpear({ size: 1 }).set(far, vel, 0.05); iceSpikes(far, { n: 2 }); mark({}).set(far, 0.5, 1); impact(far, { size: 1, chips: 3 }); blast(far, { size: 1, flash: true });
      var h = hole({ pos: far }); h.set(1, 1, 0); h.lens.dead = true; puff(far, {}); chip(far, 1, 0xff7a1a, false);
      fluffBall({}).set(far, 0.5); yarnBall({}).set(far, 0.5);
      var bmWarm = Object.keys(BM_KIND).map(function (k) { var h = bm(k, {}); h.set(far, null, 0.5, 1, 0.5); return h; }); drawBM();
      if (!CW.FRIEND) { boomLayer().list.push({ x: 0, z: -40, t: 0, s: 1 }); drawBoom(0); }   // (the world tree's fruit bombs: 형꺼 only, the trial has no tier 10)
      for (var ek = 0; ek < 7; ek++) emblem(ek, { col: 0xff8a3a, deep: 0x8a2a10 }).set(far, 0.5, 0); glassOrb({ kind: 0, col: 0xff8a3a, deep: 0x8a2a10 }).set(far, 0.5, 0, 1); elemRing({ cols: [0xff0000, 0xffff00, 0xff00ff, 0x00ffff, 0x00ff00] }).set(far, 1, 0, 0, 1); var xst = xs.length; crystal({ pos: far });
      drawSpikes(0); layoutSmoke(sc.camera, true); drawChips(0); drawCrystals(0);   // the layers must be drawing copies when compiled, so their (instanced) programs are built too
      sc.renderer.compile(sc.scene, sc.camera);
      for (var i = parts.length - 1; i >= start; i--) drop(parts[i]);
      parts.length = start; spikes.length = spikeStart; chips.forEach(function (l, i) { l.length = chipStart[i]; }); xs.length = xst; drawSpikes(0); drawChips(0); drawCrystals(0);
      bmWarm.forEach(function (h) { h.kill(); }); drawBM(); if (boomL) { boomL.list.length = 0; drawBoom(0); }
      if (sc.warmLens) sc.warmLens();
    }
    return { boom: boom, beam: beam, orb: orb, moon: moon, rock: rock, fireball: fireball, column: column, twister: twister, toonFire: toonFire, ringWall: ringWall, fireWave: fireWave, picWave: picWave, waveShards: waveShards, seqWave: seqWave, iceSpear: iceSpear, iceSpikes: iceSpikes, iceSpike: iceSpike, mark: mark, impact: impactP, puff: puff, blast: blast, chip: chip, hole: hole, emblem: emblem, glassOrb: glassOrb, elemRing: elemRing, crystal: crystal, fluffBall: fluffBall, yarnBall: yarnBall, bm: bm, update: update,
      // for checks: the live copies of a Blender mesh kind ({ p, q, s, a })
      bmList: function (kind) { var L = bmLayers[kind]; return L ? L.list.filter(function (h) { return !h.dead && h.a > 0.002; }) : []; }, clear: clear, warm: warm, setBright: function (v) { bright = !!v; }, setBatchSmoke: function (v) { batchSmoke = !!v; }, setBatchChips: function (v) { batchChips = !!v; },
      count: function () { return bmCount() + parts.length + xs.length + spikes.length + chips[0].length + chips[1].length + chips[2].length; }, spikeTops: spikeTops,
      // for checks: the puffs in the last picture and the draws they took
      smoke: function () { return { puffs: smokeNow.puffs, draws: smokeNow.draws }; } };
  };
})(this);
