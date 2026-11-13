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
    moon: 'uniform vec3 uLit,uDark,uRim,uL;uniform float uAlpha;void main(){vec3 N=normalize(vN);' + F +
      'float lit=smoothstep(-0.08,0.38,dot(N,normalize(uL)));' +
      'float sea=smoothstep(0.02,0.24,fbm(vP*2.6)),dots=smoothstep(0.5,0.72,n3(vP*7.5)*0.5+0.5);' +
      'vec3 surf=mix(uLit,uLit*0.7,sea*0.75+dots*0.35);surf*=1.0-0.2*uBright;vec3 c=mix(uDark,surf,lit);' +
      'c+=uRim*pow(1.0-f,3.0)*(0.35+0.9*lit)*(1.0-uBright);' +
      // on snow or sand the white face sinks into the ground and the see-through dark side reads as a faint disk:
      // there it is a little greyer, solid, and edged dark
      'c=mix(c,uDark*0.55,uBright*smoothstep(0.55,0.95,1.0-f));gl_FragColor=vec4(c,uAlpha*mix(0.5+0.5*lit,1.0,uBright));}',
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
      var key = (vs ? 'tube' : 'std') + '|' + side + '|' + (o.solid ? 1 : 0) + '|' + fs, list = pool[key], m = list && list.pop();
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
    var LINE_MATS = {};
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

    // ---------- smoke and rock chips are drawn the same way ----------
    // Meteor rain alone had about 490 puffs of smoke and 250 rock chips alive at once, one draw each (2026-11-14). Each puff
    // keeps its own colours and progress in per-copy attributes; the chips (three shapes) glow by a per-copy colour.
    var PUFF_CAP = 512, CHIP_CAP = 192, puffs = [], chips = [[], [], []], IQ = new T.Quaternion(), IE = new T.Euler();
    var VS_PUFF = VS.replace('void main(){', 'attribute vec3 iDark,iLight,iKSA;varying vec3 vDark,vLight,vKSA;void main(){vDark=iDark;vLight=iLight;vKSA=iKSA;');
    var FS_PUFF = 'varying vec3 vDark,vLight,vKSA;\n#define uDark vDark\n#define uLight vLight\n#define uK vKSA.x\n#define uSeed vKSA.y\n#define uAlpha vKSA.z\n' + FS.smoke.replace('uniform vec3 uDark,uLight;uniform float uK,uSeed,uAlpha;', '');
    var puffMat = mat(FS_PUFF, {}, { normal: true }, VS_PUFF);
    // one smoke layer per draw order the puffs ask for (4: chip trails and ice mist, 5: the rest), as single puffs were;
    // inside a layer the copies are written far to near each frame, the order three draws single see-through puffs in
    function makePuffLayer(order) {
      var geo = GEO.puff.clone(), at = function () { return new T.InstancedBufferAttribute(new Float32Array(PUFF_CAP * 3), 3); }, L = { dark: at(), light: at(), ksa: at(), n: 0 };
      geo.setAttribute('iDark', L.dark); geo.setAttribute('iLight', L.light); geo.setAttribute('iKSA', L.ksa);
      L.mesh = new T.InstancedMesh(geo, puffMat, PUFF_CAP); L.mesh.renderOrder = order; return L;
    }
    var puffLayers = { 4: makePuffLayer(4), 5: makePuffLayer(5) }, camAt = new T.Vector3(), farFirst = [];
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
    [puffLayers[4].mesh, puffLayers[5].mesh].concat(chipLayers).forEach(function (m) { m.frustumCulled = false; m.count = 0; m.visible = false; group.add(m); });
    function drawPuffs(dt) {
      for (var i = puffs.length - 1; i >= 0; i--) {
        var q = puffs[i]; q.t += dt; if (q.t >= q.life) { puffs.splice(i, 1); continue; }
        q.p.addScaledVector(q.v, dt); q.v.multiplyScalar(Math.max(0, 1 - dt * q.drag));
      }
      if (sc.camera) camAt.setFromMatrixPosition(sc.camera.matrixWorld);
      farFirst.length = 0; for (var f = 0; f < puffs.length; f++) { puffs[f].d = puffs[f].p.distanceToSquared(camAt); farFirst.push(puffs[f]); }
      farFirst.sort(function (a, b) { return b.d - a.d; });
      puffLayers[4].n = puffLayers[5].n = 0;
      for (var j = 0; j < farFirst.length; j++) {
        var u = farFirst[j], L = puffLayers[u.order], n = L.n++, k = u.t / u.life, s = u.s0 + (u.s1 - u.s0) * ease(k);
        L.mesh.setMatrixAt(n, IM.compose(u.p, u.q, IS.set(s, s, s)));
        L.dark.setXYZ(n, u.dark.r, u.dark.g, u.dark.b); L.light.setXYZ(n, u.light.r, u.light.g, u.light.b); L.ksa.setXYZ(n, k, u.seed, u.alpha);
      }
      [puffLayers[4], puffLayers[5]].forEach(function (L) {
        L.mesh.count = L.n; L.mesh.visible = L.n > 0;
        L.mesh.instanceMatrix.needsUpdate = L.dark.needsUpdate = L.light.needsUpdate = L.ksa.needsUpdate = true;
      });
      puffMat.uniforms.uTime.value = time;
    }
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
      var body = add(new T.Mesh(GEO.ball, mat(FS.moon, { uLit: { value: C(o.lit || 0xf4f0ff) }, uDark: { value: C(o.dark || 0x372a72) }, uRim: { value: C(o.rim || 0xb8a8ff) }, uL: { value: new T.Vector3(-0.75, 0.42, 0.5) }, uAlpha: { value: 1 } }, { normal: true, depthTest: false })), { order: 7 });
      var glow = orb({ col: o.rim || 0xb8a8ff, deep: o.deep || 0x6a4cff, alpha: 0.5, order: 6 }), spin = 0;
      body.mesh.name = 'core3d moon';
      return {
        set: function (pos, radius, dt) {
          spin += (dt || 0) * 0.6; body.mesh.position.copy(pos); body.mesh.scale.setScalar(Math.max(0.001, radius)); body.mesh.rotation.set(0.3, spin, 0.2);
          glow.set(pos, radius * 1.55);
        },
        kill: function () { drop(body); glow.kill(); }
      };
    }
    // run fn after t seconds of effect time (cleared with everything else)
    function later(t, fn) { add(new T.Object3D(), { life: 1e9, upd: function (dt, tt) { if (tt >= t) { fn(); return true; } } }); }
    // ---------- smoke: a grey puff that swells, drifts and frays away ----------
    // Each puff is its own mesh, as before batch 3 (2026-11-14): the user found the meteor rain weaker when the smoke was
    // drawn as copies in one layer. batchSmoke switches the (sorted) smoke layers on, for checks that compare the looks.
    // Rock chips are solid (drawn with the depth buffer, in any order), so drawing them as copies does not change how they
    // look: batchChips stays on (a quarter of the meteor rain's draws).
    var batchSmoke = false, batchChips = true;
    function puffMesh(pos, o) {
      var life = o.life || 0.9, s0 = o.s0 || 0.2, s1 = o.s1 || 0.6, v = o.vel ? o.vel.clone() : new T.Vector3(0, 0.6, 0), drag = o.drag === undefined ? 1.5 : o.drag;
      var m = new T.Mesh(GEO.puff, mat(FS.smoke, { uDark: { value: C(o.dark || 0x2c2624) }, uLight: { value: C(o.light || 0x9a908a) }, uK: { value: 0 }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: o.alpha === undefined ? 0.85 : o.alpha } }, { normal: true }));
      m.position.copy(pos); m.scale.setScalar(s0); m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
      var p = add(m, { order: o.order === undefined ? 5 : o.order, life: life, upd: function (dt, t) {
        var k = t / life; m.position.addScaledVector(v, dt); v.multiplyScalar(Math.max(0, 1 - dt * drag)); m.scale.setScalar(s0 + (s1 - s0) * ease(k)); U(p).uK.value = k;
      } });
      return p;
    }
    // (with batchSmoke: a copy in the smoke layer; when it is full the oldest, most faded puff goes)
    function puff(pos, o) {
      o = o || {}; if (!batchSmoke) return puffMesh(pos, o);
      if (puffs.length >= PUFF_CAP) puffs.shift();
      puffs.push({ p: pos.clone(), v: o.vel ? o.vel.clone() : new T.Vector3(0, 0.6, 0), drag: o.drag === undefined ? 1.5 : o.drag, s0: o.s0 || 0.2, s1: o.s1 || 0.6, life: o.life || 0.9, t: 0,
        q: new T.Quaternion().setFromEuler(IE.set(Math.random() * 6, Math.random() * 6, 0)), dark: C(o.dark || 0x2c2624), light: C(o.light || 0x9a908a), seed: Math.random() * 9, alpha: o.alpha === undefined ? 0.85 : o.alpha, order: o.order === 4 ? 4 : 5 });
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
      var glow = orb({ col: col, deep: 0xff4a10, alpha: 0.18, order: 6 });
      var ball = add(new T.Mesh(GEO.ball, mat(FS.fire, { uCol: { value: C(col) }, uDeep: { value: C(0x8a1a08) }, uSeed: { value: Math.random() * 9 }, uAlpha: { value: 1 } })), { order: 7 });
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
          if (puffT <= 0) { puffT = 0.05; at.copy(pos).addScaledVector(back, size * (1.6 + Math.random())); puff(at, { s0: size * 0.25, s1: size * 0.65, life: 0.55, vel: back.clone().multiplyScalar(0.5).add(new T.Vector3(0, 0.3, 0)), alpha: 0.35, order: 4 }); }
        },
        kill: function () { glow.kill(); drop(ball); heart.kill(); drop(flames); drop(tail); }
      };
    }
    // ---------- an ice spear: a long clear crystal with a dark blue outline, a cold glow round it and frost mist left
    // along its way. set(pos, vel, dt, grow): its middle at pos, its point along vel, grow 0..1 while it forms.
    // o.line: another outline colour; o.mist false: no frost mist (a spear of light, not of ice) ----------
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
          var L = len * g, r = len * 0.13 * g;
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
    // batchSmoke a copy in the chip layer of its shape, when full the oldest goes)
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

    function update(dt) {
      time += dt;
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        if (p.dead) { parts.splice(i, 1); continue; }
        p.t += dt; var u = p.mesh.material && p.mesh.material.uniforms; if (u && u.uTime) u.uTime.value = time;
        if ((p.upd && p.upd(dt, p.t) === true) || p.t >= p.life) { drop(p); parts.splice(i, 1); }
      }
      drawChips(dt); drawPuffs(dt); drawSpikes(dt);
    }
    function clear() { parts.forEach(drop); parts.length = 0; spikes.length = 0; puffs.length = 0; chips.forEach(function (l) { l.length = 0; }); drawSpikes(0); drawPuffs(0); drawChips(0); if (sc.lens) sc.lens(null); }
    // Build every program before it is needed. A compiled program also depends on the scene (whether it has fog, and of
    // which kind), so this is done again whenever that changes (fx.setRegion calls it); the same scene state is skipped.
    // Only the parts made here are dropped again, and their materials go into the pool, so the programs stay.
    var warmed = {};
    function warm() {
      var f = sc.scene.fog, sig = f ? (f.isFogExp2 ? 'exp2' : 'linear') : 'none';
      if (warmed[sig] || !sc.renderer || !sc.renderer.compile) return;
      warmed[sig] = true;
      var far = new T.Vector3(0, -40, 0), vel = new T.Vector3(1, -3, 0), start = parts.length, spikeStart = spikes.length, puffStart = puffs.length, chipStart = chips.map(function (l) { return l.length; });
      beam({ col: 0xffffff, deep: 0x8866ff, r: 0.1 }).set(far, far.clone().add(vel), 1); orb({ col: 0xffffff }).set(far, 1, 1); moon({}).set(far, 1, 0);
      rock({ size: 0.3 }).set(far, vel, 0.05); fireball({ size: 0.3 }).set(far, vel, 0.05); iceSpear({ size: 1 }).set(far, vel, 0.05); iceSpikes(far, { n: 2 }); mark({}).set(far, 0.5, 1); impact(far, { size: 1, chips: 3 }); blast(far, { size: 1, flash: true });
      var h = hole({ pos: far }); h.set(1, 1, 0); h.lens.dead = true; puff(far, {}); chip(far, 1, 0xff7a1a, false);
      drawSpikes(0); drawPuffs(0); drawChips(0);   // the layers must be drawing copies when compiled, so their (instanced) programs are built too
      sc.renderer.compile(sc.scene, sc.camera);
      for (var i = parts.length - 1; i >= start; i--) drop(parts[i]);
      parts.length = start; spikes.length = spikeStart; puffs.length = puffStart; chips.forEach(function (l, i) { l.length = chipStart[i]; }); drawSpikes(0); drawPuffs(0); drawChips(0);
      if (sc.warmLens) sc.warmLens();
    }
    return { beam: beam, orb: orb, moon: moon, rock: rock, fireball: fireball, iceSpear: iceSpear, iceSpikes: iceSpikes, iceSpike: iceSpike, mark: mark, impact: impact, puff: puff, blast: blast, chip: chip, hole: hole, update: update, clear: clear, warm: warm, setBright: function (v) { bright = !!v; }, setBatchSmoke: function (v) { batchSmoke = !!v; }, setBatchChips: function (v) { batchChips = !!v; },
      count: function () { return parts.length + spikes.length + puffs.length + chips[0].length + chips[1].length + chips[2].length; }, spikeTops: spikeTops };
  };
})(this);
