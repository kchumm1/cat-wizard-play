// 살아 있는 펫 (2026-11-23, 형: 펫이 움직이는 게 하나도 없어 → 알아서 움직이고 생동감 있게, 그림 느낌 없게 → 애니메이션처럼
// 진짜 생동감 넘치게). One picture per pet (the user's GPT art, art/pet-*.webp) bends like a puppet: each pet has its eyes, ears,
// tail, wings, fins, legs and the little things that hang or stick up (bells, a clover, a flame, earrings) marked on its
// picture, and a pose clock (createPetPose) moves them — breathing, blinking and the happy ^^ squint, ear flicks, a wagging
// tail, flapping wings, springy accessories that lag behind the body, bouncy steps with squash and stretch, jumps with a
// crouch first, a roar for the legends. The same shader runs in the battle scene (js/pet-sprite.js, three.js) and on the
// 내 펫 page (js/pet-live.js, a small WebGL canvas), so the pet is the same creature in both.
// Picture coordinates: x right, y down, 0..1 of the square picture (measured on the pictures, 2026-11-23; the closed and
// squinting eyes were rendered for all 15 pets with eyes and checked before this was written).
(function (root, f) { var m = f(root); if (typeof module !== 'undefined' && module.exports) module.exports = m; else { root.CW = root.CW || {}; Object.assign(root.CW, m); } })(this, function () {
  // face: the way the picture looks (-1 left), move: walk · fly · swim, top/foot: the picture's top and the line its feet stand
  // on, cx: the body's middle, belly: where it breathes. parts: [kind, ellipse cx, cy, rx, ry, pivot x, y, sign/size]
  var RIG = {
    "quokka": {"face":-1,"move":"walk","top":0.02,"foot":0.97,"cx":0.48,"belly":0.72,"eyes":[[0.245,0.452,0.034,0.048],[0.475,0.475,0.046,0.053]],"parts":[["top",0.5,0.11,0.13,0.11,0.5,0.23,1],["earL",0.23,0.27,0.08,0.09,0.27,0.34,1],["earR",0.63,0.29,0.08,0.09,0.6,0.36,1],["tail",0.75,0.66,0.08,0.09,0.68,0.7,1],["dangle",0.37,0.8,0.06,0.06,0.37,0.73,1],["foot",0.37,0.92,0.07,0.05,0.38,0.84,1],["foot",0.63,0.9,0.07,0.05,0.6,0.82,-1],["head",0.42,0.4,0.34,0.3,0.45,0.68,1]],"gait":"hop"},
    "redpanda": {"face":-1,"move":"walk","top":0.05,"foot":0.95,"cx":0.42,"belly":0.72,"eyes":[[0.174,0.47,0.04,0.06],[0.38,0.488,0.044,0.053]],"parts":[["top",0.36,0.1,0.1,0.07,0.35,0.19,1],["earL",0.12,0.24,0.08,0.1,0.18,0.31,1],["earR",0.62,0.21,0.08,0.1,0.57,0.29,1],["tail",0.83,0.47,0.15,0.17,0.66,0.64,1],["dangle",0.3,0.72,0.05,0.05,0.3,0.66,1],["foot",0.37,0.9,0.07,0.06,0.38,0.8,1],["foot",0.57,0.91,0.07,0.06,0.56,0.8,-1],["head",0.37,0.4,0.34,0.3,0.38,0.68,1]]},
    "sloth": {"face":-1,"move":"walk","slow":1,"top":0.02,"foot":0.97,"cx":0.45,"belly":0.7,"eyes":[[0.19,0.335,0.054,0.034],[0.415,0.375,0.05,0.035]],"parts":[["top",0.5,0.14,0.18,0.12,0.42,0.25,1],["dangle",0.12,0.8,0.07,0.08,0.12,0.7,1],["dangle",0.84,0.78,0.07,0.08,0.8,0.68,1],["arm",0.08,0.6,0.08,0.1,0.17,0.62,1],["dangle",0.32,0.7,0.05,0.05,0.32,0.64,1],["foot",0.36,0.93,0.07,0.06,0.37,0.84,1],["foot",0.6,0.92,0.07,0.06,0.58,0.83,-1],["head",0.33,0.36,0.33,0.28,0.38,0.64,1]]},
    "behemoth": {"face":-1,"move":"walk","heavy":1,"top":0.0,"foot":0.99,"cx":0.5,"belly":0.6,"parts":[["top",0.62,0.08,0.25,0.1,0.55,0.18,0.6],["tail",0.88,0.52,0.1,0.16,0.82,0.62,1],["leg",0.15,0.86,0.1,0.13,0.17,0.72,1],["leg",0.38,0.86,0.09,0.13,0.38,0.72,-1],["leg",0.62,0.86,0.1,0.13,0.62,0.72,-1],["leg",0.83,0.86,0.08,0.13,0.8,0.72,1],["head",0.28,0.24,0.22,0.2,0.36,0.4,1]]},
    "dolphin": {"face":-1,"move":"swim","top":0.05,"foot":0.9,"cx":0.45,"belly":0.65,"eyes":[[0.226,0.41,0.028,0.038],[0.424,0.449,0.045,0.06]],"parts":[["top",0.42,0.13,0.1,0.09,0.42,0.22,1],["tail",0.8,0.54,0.12,0.13,0.66,0.66,1],["fin",0.67,0.3,0.06,0.06,0.62,0.35,1],["fin",0.2,0.73,0.08,0.06,0.28,0.67,-1],["dangle",0.33,0.73,0.05,0.05,0.33,0.66,1],["head",0.35,0.42,0.3,0.26,0.42,0.62,1]]},
    "flamingo": {"face":-1,"move":"walk","top":0.0,"foot":0.97,"cx":0.45,"belly":0.6,"eyes":[[0.293,0.293,0.032,0.05],[0.478,0.309,0.058,0.06]],"parts":[["top",0.48,0.04,0.06,0.06,0.47,0.09,1],["wingL",0.17,0.5,0.17,0.12,0.33,0.52,1],["wingR",0.73,0.5,0.2,0.13,0.55,0.53,1],["tail",0.72,0.7,0.1,0.08,0.6,0.68,1],["dangle",0.37,0.6,0.04,0.05,0.37,0.54,1],["head",0.42,0.28,0.24,0.22,0.43,0.47,1]],"gait":"hop"},
    "narwhal": {"face":-1,"move":"swim","top":0.04,"foot":0.98,"cx":0.45,"belly":0.75,"eyes":[[0.097,0.493,0.031,0.05],[0.312,0.531,0.055,0.059]],"parts":[["top",0.12,0.15,0.08,0.13,0.17,0.28,0.5],["tail",0.76,0.3,0.2,0.14,0.62,0.48,1],["fin",0.07,0.83,0.07,0.07,0.13,0.78,1],["fin",0.46,0.8,0.08,0.07,0.4,0.75,-1],["dangle",0.2,0.86,0.05,0.06,0.2,0.78,1],["head",0.25,0.48,0.27,0.26,0.35,0.66,1]]},
    "leviathan": {"face":-1,"move":"swim","heavy":1,"serpent":1,"top":0.0,"foot":0.97,"cx":0.5,"belly":0.6,"parts":[["jaw",0.22,0.3,0.16,0.08,0.38,0.27,1],["fin",0.75,0.2,0.18,0.15,0.62,0.28,1],["fin",0.86,0.52,0.12,0.12,0.75,0.55,-1],["fin",0.12,0.6,0.1,0.12,0.2,0.6,1],["head",0.25,0.2,0.24,0.18,0.42,0.32,1]]},
    "capybara": {"face":-1,"move":"walk","slow":1,"top":0.02,"foot":0.95,"cx":0.45,"belly":0.65,"eyes":[[0.232,0.414,0.032,0.028],[0.527,0.455,0.07,0.045]],"parts":[["flame",0.48,0.1,0.08,0.1,0.47,0.2,1],["earL",0.2,0.24,0.06,0.06,0.23,0.29,1],["earR",0.66,0.27,0.06,0.06,0.63,0.31,1],["tail",0.8,0.58,0.05,0.06,0.76,0.6,1],["dangle",0.36,0.8,0.06,0.06,0.36,0.72,1],["foot",0.42,0.9,0.07,0.06,0.42,0.8,1],["foot",0.66,0.88,0.07,0.06,0.64,0.78,-1],["head",0.36,0.43,0.32,0.28,0.45,0.66,1]]},
    "meerkat": {"face":-1,"move":"walk","top":0.04,"foot":0.9,"cx":0.4,"belly":0.62,"eyes":[[0.264,0.318,0.042,0.06],[0.466,0.345,0.052,0.064]],"parts":[["top",0.38,0.06,0.1,0.05,0.36,0.1,1],["earL",0.12,0.3,0.07,0.09,0.17,0.33,1],["earR",0.65,0.28,0.07,0.09,0.6,0.32,1],["tail",0.72,0.62,0.13,0.14,0.6,0.74,1],["dangle",0.33,0.57,0.04,0.04,0.33,0.52,1],["foot",0.35,0.85,0.05,0.05,0.36,0.77,1],["foot",0.47,0.87,0.06,0.05,0.46,0.78,-1],["head",0.34,0.31,0.31,0.27,0.35,0.53,1]]},
    "bonghwang": {"face":-1,"move":"fly","top":0.0,"foot":0.99,"body":0.66,"cx":0.35,"belly":0.5,"eyes":[[0.228,0.335,0.024,0.038],[0.359,0.346,0.039,0.048]],"parts":[["top",0.42,0.08,0.12,0.09,0.35,0.17,1],["wingL",0.08,0.45,0.1,0.13,0.18,0.47,1],["wingR",0.62,0.35,0.22,0.2,0.42,0.45,1],["tail",0.68,0.82,0.26,0.18,0.47,0.68,1],["head",0.3,0.32,0.21,0.2,0.31,0.5,1]]},
    "blackdragon": {"face":-1,"move":"walk","heavy":1,"wings":1,"top":0.0,"foot":0.99,"cx":0.5,"belly":0.55,"parts":[["jaw",0.33,0.25,0.08,0.06,0.39,0.23,1],["wingL",0.12,0.38,0.14,0.3,0.28,0.25,1],["wingR",0.8,0.35,0.2,0.3,0.62,0.28,1],["tail",0.85,0.72,0.13,0.2,0.72,0.72,1],["leg",0.32,0.88,0.1,0.1,0.35,0.78,1],["leg",0.58,0.88,0.1,0.1,0.57,0.78,-1],["head",0.35,0.18,0.18,0.15,0.43,0.33,1]]},
    "lamb": {"face":-1,"move":"walk","top":0.05,"foot":0.92,"cx":0.47,"belly":0.62,"eyes":[[0.241,0.456,0.034,0.048],[0.434,0.479,0.057,0.065]],"parts":[["earL",0.1,0.45,0.06,0.06,0.15,0.42,1],["earR",0.59,0.5,0.06,0.07,0.55,0.45,1],["tail",0.86,0.53,0.07,0.08,0.8,0.55,1],["dangle",0.37,0.7,0.05,0.05,0.37,0.63,1],["foot",0.27,0.84,0.05,0.05,0.28,0.77,1],["foot",0.6,0.85,0.05,0.05,0.6,0.78,-1],["head",0.32,0.4,0.28,0.26,0.38,0.6,1]]},
    "hummingbird": {"face":-1,"move":"fly","fast":1,"top":0.01,"foot":0.95,"body":0.64,"cx":0.4,"belly":0.55,"eyes":[[0.241,0.28,0.026,0.036],[0.394,0.33,0.046,0.057]],"parts":[["top",0.5,0.08,0.12,0.07,0.45,0.15,1],["wingL",0.12,0.35,0.11,0.13,0.24,0.4,1],["wingR",0.73,0.3,0.19,0.18,0.52,0.4,1],["tail",0.62,0.8,0.21,0.18,0.47,0.62,1],["head",0.35,0.29,0.21,0.19,0.38,0.46,1]]},
    "giraffe": {"face":-1,"move":"walk","top":0.0,"foot":0.97,"cx":0.4,"belly":0.75,"eyes":[[0.21,0.4,0.033,0.055],[0.402,0.437,0.065,0.068]],"parts":[["top",0.28,0.08,0.22,0.08,0.32,0.17,0.7],["earL",0.08,0.26,0.08,0.06,0.15,0.3,1],["earR",0.6,0.25,0.08,0.07,0.53,0.3,1],["dangle",0.07,0.43,0.04,0.07,0.07,0.36,1],["tail",0.85,0.5,0.12,0.1,0.68,0.62,1],["foot",0.37,0.91,0.06,0.06,0.37,0.82,1],["foot",0.52,0.9,0.06,0.06,0.52,0.81,-1],["head",0.33,0.33,0.31,0.3,0.35,0.62,1]]},
    "thunderbird": {"face":-1,"move":"fly","heavy":1,"top":0.0,"foot":0.99,"cx":0.5,"belly":0.55,"parts":[["wingL",0.13,0.42,0.15,0.32,0.3,0.3,1],["wingR",0.85,0.42,0.15,0.32,0.7,0.3,1],["leg",0.27,0.86,0.11,0.12,0.32,0.72,1],["leg",0.67,0.86,0.11,0.12,0.65,0.72,-1],["head",0.42,0.18,0.14,0.13,0.47,0.31,1]]},
    "guinea": {"face":-1,"move":"walk","fast":1,"top":0.04,"foot":0.93,"cx":0.45,"belly":0.6,"eyes":[[0.178,0.477,0.036,0.053],[0.414,0.495,0.06,0.065]],"parts":[["earL",0.1,0.36,0.06,0.06,0.14,0.4,1],["earR",0.53,0.32,0.08,0.06,0.47,0.35,1],["top",0.6,0.27,0.17,0.13,0.55,0.35,0.8],["dangle",0.3,0.76,0.05,0.05,0.3,0.69,1],["foot",0.46,0.84,0.05,0.04,0.46,0.78,1],["foot",0.6,0.84,0.05,0.04,0.6,0.78,-1],["head",0.3,0.44,0.27,0.24,0.4,0.64,1]]},
    "koala": {"face":-1,"move":"walk","top":0.02,"foot":0.95,"cx":0.45,"belly":0.7,"eyes":[[0.269,0.418,0.035,0.053],[0.489,0.475,0.06,0.06]],"parts":[["earL",0.12,0.3,0.1,0.12,0.22,0.34,1],["earR",0.78,0.38,0.1,0.12,0.68,0.4,1],["dangle",0.82,0.15,0.08,0.08,0.72,0.13,1],["dangle",0.76,0.7,0.12,0.08,0.62,0.66,1],["arm",0.17,0.65,0.08,0.08,0.22,0.62,1],["foot",0.26,0.84,0.06,0.06,0.28,0.76,1],["foot",0.37,0.85,0.06,0.06,0.37,0.77,-1],["head",0.4,0.38,0.34,0.3,0.42,0.64,1]]},
    "haetae": {"face":-1,"move":"walk","top":0.02,"foot":0.96,"cx":0.45,"belly":0.7,"eyes":[[0.179,0.383,0.035,0.041],[0.367,0.413,0.06,0.055]],"parts":[["top",0.32,0.1,0.06,0.1,0.32,0.2,0.7],["earL",0.08,0.3,0.06,0.07,0.12,0.34,1],["earR",0.52,0.28,0.08,0.08,0.46,0.33,1],["tail",0.86,0.48,0.13,0.15,0.72,0.58,1],["dangle",0.17,0.66,0.05,0.05,0.17,0.6,1],["foot",0.47,0.9,0.07,0.06,0.46,0.8,1],["foot",0.12,0.75,0.07,0.06,0.17,0.7,-1],["head",0.3,0.36,0.31,0.28,0.38,0.62,1]]},
    "nebulahaetae": {"face":-1,"move":"walk","heavy":1,"top":0.0,"foot":0.99,"cx":0.5,"belly":0.55,"parts":[["top",0.6,0.15,0.25,0.12,0.5,0.22,0.6],["tail",0.87,0.35,0.13,0.2,0.77,0.48,1],["leg",0.12,0.86,0.09,0.12,0.14,0.72,1],["leg",0.35,0.87,0.09,0.12,0.35,0.73,-1],["leg",0.62,0.86,0.09,0.12,0.62,0.72,-1],["leg",0.84,0.84,0.08,0.12,0.82,0.7,1],["head",0.3,0.28,0.21,0.2,0.38,0.44,1]]}
  };

  var MAXP = 8;
  // a pet the game does not know yet gets a plain body (breathing, bouncing) and no parts
  var PLAIN = { face: -1, move: 'walk', top: 0.05, foot: 0.95, cx: 0.5, belly: 0.65, parts: [] };
  function petRigOf(id) { return RIG[id] || PLAIN; }

  // ---- the shader (GLSL ES 1.0 — three.js adds its own attribute and matrix lines; js/pet-live.js adds them itself) ----
  var VS_HEAD = 'uniform vec4 uE[8]; uniform vec4 uP[8]; uniform vec4 uBody; uniform vec4 uSq; uniform vec4 uWave; uniform float uFlip;\n' +
    'varying vec2 vUv; varying float vH;\n' +
    // every part turns its soft ellipse of the picture around its pivot (weights from the picture at rest), then the whole
    // body breathes, squashes or stretches about its feet and leans like jelly
    'vec2 petDeform(vec2 uv) {\n' +
    '  vec2 a = vec2(uv.x, 1.0 - uv.y), d = vec2(0.0);\n' +
    '  for (int i = 0; i < 8; i++) {\n' +
    '    vec4 e = uE[i]; vec4 p = uP[i];\n' +
    '    vec2 q = (a - e.xy) / max(e.zw, vec2(0.0001));\n' +
    '    float w = 1.0 - smoothstep(0.45, 1.0, length(q));\n' +
    '    if (w <= 0.0) continue;\n' +
    '    vec2 r = a - p.xy; float c = cos(p.z), s = sin(p.z);\n' +
    '    d += w * (vec2(r.x * c - r.y * s, r.x * s + r.y * c) - r + vec2(0.0, p.w));\n' +
    '  }\n' +
    '  a += d;\n' +
    '  a.y += uWave.x * sin(a.x * uWave.y - uWave.z);\n' +
    '  float H = max(0.05, uBody.y - uBody.z), h = clamp((uBody.y - a.y) / H, 0.0, 1.2), b = (a.y - uBody.w) / (0.45 * H);\n' +
    '  a.x += (a.x - uBody.x) * uSq.w * exp(-b * b);\n' +
    '  a.y -= uSq.w * 0.6 * h * H;\n' +
    '  a.x = uBody.x + (a.x - uBody.x) * uSq.x;\n' +
    '  a.y = uBody.y - (uBody.y - a.y) * uSq.y;\n' +
    '  a.x += uSq.z * h * h;\n' +
    '  vH = h;\n' +
    '  return a;\n' +
    '}\n';
  // the eyes: a lid filled from the fur around the eye (eight blurred samples, nearest counting most) closes from above to a
  // ‿ line, or the eye squints happily to a ∩ line (uLid.x how closed, .y how happy)
  var FS_HEAD = 'uniform sampler2D map; uniform float uGlow; uniform vec4 uEye[2]; uniform vec4 uLid;\n' +
    'varying vec2 vUv; varying float vH;\n' +
    'vec3 petEye(vec3 col, vec2 a, vec4 e) {\n' +
    '  vec2 q = (a - e.xy) / e.zw; q.y = -q.y; float d = length(q);\n' +
    '  float close = max(uLid.x, uLid.y);\n' +
    '  if (d > 1.3 || close < 0.01 || e.z <= 0.0) return col;\n' +
    '  vec3 num = vec3(0.0); float den = 0.0;\n' +
    '  for (int k = 0; k < 8; k++) {\n' +
    '    float an = float(k) * 0.7853982; vec2 s = vec2(cos(an), sin(an)) * 1.45;\n' +
    '    vec2 su = e.xy + vec2(s.x * e.z, -s.y * e.w);\n' +
    '    vec3 c = texture2D(map, vec2(su.x, 1.0 - su.y), 2.0).rgb;\n' +
    '    vec2 dq = q - s; float w = dot(dq, dq) + 0.05; w = 1.0 / (w * w);\n' +
    '    num += c * w; den += w;\n' +
    '  }\n' +
    '  float L = mix(-0.25 + 0.45 * q.x * q.x, 0.05 - 0.6 * q.x * q.x, uLid.y / max(close, 0.001));\n' +
    '  float top = mix(1.3, L, close), bot = mix(-1.3, L, close);\n' +
    '  float cov = smoothstep(top - 0.05, top + 0.05, q.y) + 1.0 - smoothstep(bot - 0.05, bot + 0.05, q.y);\n' +
    '  col = mix(col, num / den, (1.0 - smoothstep(1.1, 1.28, d)) * min(1.0, cov));\n' +
    '  float t = 0.0085 / e.w;\n' +
    '  float line = (1.0 - smoothstep(t * 0.55, t, abs(q.y - top))) * smoothstep(0.25, 0.6, close) * (1.0 - smoothstep(0.92, 1.06, d));\n' +
    '  return mix(col, vec3(0.24, 0.14, 0.11), line);\n' +
    '}\n' +
    'vec4 petColor() {\n' +
    '  vec4 t = texture2D(map, vUv);\n' +
    '  if (t.a < 0.06) discard;\n' +
    '  vec2 a = vec2(vUv.x, 1.0 - vUv.y);\n' +
    '  vec3 col = petEye(petEye(t.rgb, a, uEye[0]), a, uEye[1]);\n' +
    // a little shade where the feet meet the ground (walkers only: uLid.w), so it stands instead of floating on the floor
    '  col *= 1.0 - uLid.w * (1.0 - smoothstep(0.0, 0.16, vH));\n' +
    '  return vec4(col * (1.0 + uGlow), t.a);\n' +
    '}\n';
  // three.js ShaderMaterial bodies (it declares position, uv and the matrices)
  var VS_THREE = VS_HEAD + 'void main() { vUv = uv; vec2 a = petDeform(uv); gl_Position = projectionMatrix * modelViewMatrix * vec4((a.x - 0.5) * uFlip, 1.0 - a.y, 0.0, 1.0); }';
  var FS_THREE = FS_HEAD + 'void main() { gl_FragColor = petColor(); }';

  // ---- the pose clock (2026-11-23 다듬기, 형: 정말 자연스럽게, 어색한 모션 없이) ----
  // Walkers really walk now: their two feet lift and swing forward in turn while the body bobs a little at each step and rolls
  // side to side (a 쿼카 or a 홍학 hops instead, feet tucked in the air); nothing spins the picture round. Standing still they
  // shift their weight, their tail swishes on an uneven beat, they look about, sniff the ground, doze with half-shut eyes.
  function spring(k, c) { return { x: 0, v: 0, to: 0, k: k, c: c }; }
  function stepS(s, dt) { s.v += (s.k * (s.to - s.x) - s.c * s.v) * dt; s.x += s.v * dt; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  // a slow wander that never repeats (three sines that never line up), about -1..1
  function wob(t, s) { return Math.sin(t * 0.71 + s) * 0.5 + Math.sin(t * 1.37 + s * 2.1) * 0.3 + Math.sin(t * 2.23 + s * 3.7) * 0.2; }

  // createPetPose(id): u (the uniform values, filled every update), update(dt, input), and what the brain asks for:
  // jump(height, secs), cheer(secs), roar(secs), look(angle, secs, nod), doze(on), flutter(secs), shake(), busy().
  // input: { walk (0 standing, 1 walking, 2 running), vx (picture widths a second, + = the picture's right), ax (a second²) }.
  // update returns { lift (pet heights over its spot), roll (radians, flyers and swimmers bank) }.
  function createPetPose(id) {
    var R = petRigOf(id), heavy = !!R.heavy, slow = !!R.slow, fast = !!R.fast, kind = R.move, hopper = R.gait === 'hop';
    var fwd = -(R.face || -1);   // the turn that swings a hanging foot toward the way the picture looks
    var u = { E: new Float32Array(MAXP * 4), P: new Float32Array(MAXP * 4), body: [R.cx, R.foot, R.top, R.belly], sq: [1, 1, 0, 0],
      wave: [0, 0, 0, 0], eye: new Float32Array(8), lid: [0, 0, R.eyes ? R.eyes.length : 0, kind === 'walk' ? (heavy ? 0.1 : 0.14) : 0] };
    var parts = (R.parts || []).slice(0, MAXP).map(function (p, i) {
      u.E.set([p[1], p[2], p[3], p[4]], i * 4); u.P.set([p[5], p[6], 0, 0], i * 4);
      return { kind: p[0], s: p[7] || 1, i: i, sp: spring(60 + Math.random() * 25, 6 + Math.random() * 2), tw: rnd(1, 6), twT: 0, ph: Math.random() * 6, side: Math.random() < 0.5 ? -1 : 1 };
    });
    for (var i = parts.length; i < MAXP; i++) u.E.set([-9, -9, 0.0001, 0.0001], i * 4);
    (R.eyes || []).slice(0, 2).forEach(function (e, j) { u.eye.set(e, j * 4); });
    var seed = Math.random() * 20, t = Math.random() * 10, ph = 0, walk = 0, lastS = 0;
    var head = spring(50, 9.5), headTo = 0, headT = rnd(1, 3), look = null, bend = spring(55, 7), sq = spring(240, 14), shake = spring(160, 6);
    var blinkT = rnd(1, 3), blinkK = -1, dbl = false, happy = 0, happyT = 0, roar = 0, roarT = 0, wave = 0, waveT = rnd(7, 13);
    var doze = 0, dozeTo = 0, flutT = 0, jump = null, lastVy = 0, swim = 0, airK = 0;
    function jumpNow(h, dur) { if (jump && jump.k < 0.75) return; jump = { k: -0.1, h: h, dur: dur || 0.5 }; }
    function update(dt, inp) {
      dt = Math.min(dt, 0.05); inp = inp || {}; t += dt;
      walk += ((inp.walk || 0) - walk) * Math.min(1, dt * 6);
      var w = Math.min(walk, 1.3), still = 1 - Math.min(1, walk * 1.5);
      var vx = inp.vx || 0, ax = inp.ax || 0, lift = 0, roll = 0, sx = 1, sy = 1, sway = 0, vy = 0;
      airK = 0;
      if (kind === 'walk' && !heavy && !hopper) {
        // a walk: one stride is two steps; the feet take turns (kind 'foot' below), the body bobs at each step and rolls
        var hz = (slow ? 1.0 : fast ? 2.0 : 1.45) * (0.65 + 0.35 * Math.min(walk, 2.2));
        if (walk > 0.03) ph += dt * Math.PI * 2 * hz;
        var bob = Math.abs(Math.sin(ph)); lift += bob * 0.038 * w; vy = Math.cos(ph) * (Math.sin(ph) >= 0 ? 1 : -1) * 0.026 * w * hz * 6;
        var cont = Math.pow(1 - bob, 4) * w; sy -= 0.03 * cont; sx += 0.02 * cont;
        sway = Math.sin(ph) * 0.022 * w;
        var sS = Math.sin(ph) >= 0 ? 1 : -1; if (walk > 0.1 && sS !== lastS) kick(0.35 * w); lastS = sS;
      } else if (kind === 'walk' && hopper) {
        // a hopper: little hops, the feet tucked up in the air
        if (walk > 0.03) ph += dt * Math.PI * 2.1 * (0.7 + 0.3 * Math.min(walk, 2.2));
        var hp = Math.abs(Math.sin(ph)); lift += hp * 0.055 * w; vy = Math.cos(ph) * 0.055 * w * 6;
        var c2 = Math.pow(1 - hp, 6) * w; sy += 0.025 * hp * w - 0.045 * c2; sx += 0.035 * c2 - 0.012 * hp * w;
        airK = hp * w;
        var sH = hp > 0.2 ? 1 : -1; if (walk > 0.1 && sH !== lastS && sH < 0) kick(0.5 * w); lastS = sH;
      } else if (kind === 'walk') {
        // a legend's heavy walk: slow strides, legs in turn, the body sways
        if (walk > 0.03) ph += dt * 1.1 * Math.PI * 2 * (0.7 + 0.3 * Math.min(walk, 2));
        lift += (1 - Math.abs(Math.cos(ph))) * 0.011 * w; var c3 = Math.pow(Math.abs(Math.cos(ph)), 8) * w;
        sy -= 0.016 * c3; sx += 0.012 * c3; sway = Math.sin(ph) * 0.008 * w;
      } else if (kind === 'fly') {
        flutT -= dt;
        var fhz = (fast ? 6 : heavy ? 1.5 : 3.2) * (flutT > 0 ? 1.4 : 1), th = t * fhz * Math.PI * 2;
        lift += wob(t * 0.9, seed) * 0.035 + Math.cos(th) * (heavy ? 0.018 : 0.01);
        roll = clamp(-vx * 0.22, -0.2, 0.2) + wob(t * 0.6, seed + 3) * 0.025;
      } else {
        swim = t * (2.0 + walk * 2.2);
        lift += wob(t * 0.8, seed) * 0.04;
        roll = clamp(-vx * 0.18, -0.18, 0.18) + Math.sin(t * 1.1) * 0.035;
      }
      // a jump: a short crouch, up a little stretched, down, a soft wobbly landing
      if (jump) {
        jump.k += dt / jump.dur;
        if (jump.k < 0) { var c0 = 1 + jump.k / 0.1; sy -= 0.07 * c0; sx += 0.045 * c0; }
        else if (jump.k < 1) { var k = jump.k; lift += 4 * jump.h * k * (1 - k); sy += 0.09 * (1 - k) * (1 - k) - 0.03 * k * k; sx -= 0.05 * (1 - k) * (1 - k); vy = jump.h * 4 * (1 - 2 * k) / jump.dur; airK = Math.max(airK, Math.sin(Math.PI * k)); }
        else { sq.v -= 1.3 * Math.min(1, jump.h * 2.5 + 0.35); kick(1); jump = null; }
      }
      happyT -= dt; happy += ((happyT > 0 ? 1 : 0) - happy) * Math.min(1, dt * 7);
      if (happyT > 0 && !jump && kind === 'walk' && !heavy && walk < 0.3) lift += Math.pow(Math.abs(Math.sin(t * 7.5)), 1.5) * 0.022 * happy;
      roarT -= dt; roar += ((roarT > 0 ? 1 : 0) - roar) * Math.min(1, dt * (roarT > 0 ? 8 : 3));
      // dozing: the eyes half shut, the body sinks a little and breathes slower
      doze += (dozeTo - doze) * Math.min(1, dt * 1.8);
      stepS(sq, dt); sy += sq.x - doze * 0.03; sx -= sq.x * 0.7 - doze * 0.015;
      var bp = heavy ? 4.2 : 3.2 + doze * 1.6;
      var breath = Math.sin(t * Math.PI * 2 / bp) * (heavy ? 0.013 : 0.011) * (1 + happy * 0.5 + doze * 0.4) + roar * 0.03;
      // the jelly lean into the way it moves (and a little past it when it stops), the weight shifting while it stands
      bend.to = clamp(vx * 0.022 - ax * 0.0025, -0.045, 0.045); stepS(bend, dt); stepS(shake, dt);
      sway += wob(t * 0.45, seed + 7) * 0.005 * still + shake.x;
      // secondary motion: what sticks up or hangs swings behind the body's moves
      var dvy = (vy - lastVy) / Math.max(dt, 0.001); lastVy = vy;
      var drive = clamp(ax * 0.01, -0.5, 0.5), driveY = clamp(dvy * 0.0012, -0.4, 0.4);
      // head: looks about now and then (a slow turn, not a twitch), nods with the steps, sniffs, lifts for a roar
      headT -= dt;
      if (headT <= 0) { headT = rnd(1.8, 4.5); headTo = Math.random() < 0.4 ? 0 : rnd(-0.1, 0.1); }
      var lk = 0;
      if (look) { look.t -= dt; lk = look.a + (look.nod ? Math.sin(t * 9) * 0.03 * look.nod : 0); if (look.t <= 0) look = null; }
      head.to = (look ? lk : headTo * still) + Math.sin(ph * 2) * 0.022 * w - R.face * roar * 0.14 + happy * Math.sin(t * 6) * 0.05 + doze * R.face * 0.06;
      stepS(head, dt);
      // blinking (now and then twice), slower when sleepy, not while squinting
      blinkT -= dt;
      if (blinkK < 0 && blinkT <= 0) { blinkK = 0; dbl = Math.random() < 0.18; blinkT = rnd(2.2, 5.5) * (1 - doze * 0.5); }
      var close = 0;
      if (blinkK >= 0) {
        blinkK += dt / (0.17 + doze * 0.15);
        close = blinkK < 0.35 ? blinkK / 0.35 : blinkK < 0.55 ? 1 : Math.max(0, 1 - (blinkK - 0.55) / 0.45);
        if (blinkK >= 1) { blinkK = dbl ? -0.4 : -1; dbl = false; }
      } else if (blinkK > -1) { blinkK += dt / 0.17; if (blinkK >= 0) blinkK = 0; }
      close = Math.max(close, doze * 0.62);
      waveT -= dt; if (waveT <= 0) { waveT = rnd(8, 15); wave = 1.3; } wave = Math.max(0, wave - dt);
      parts.forEach(function (p) {
        var a = 0, dy = 0, o = p.i * 4;
        if (p.kind === 'head') a = head.x;
        else if (p.kind === 'tail') {
          if (kind === 'swim') a = Math.sin(swim + p.ph) * 0.22 * p.s;
          else a = p.s * ((0.09 * wob(t * 1.5, p.ph) + 0.04 * Math.sin(t * 2.7 + p.ph)) * (1 - doze * 0.6) + Math.sin(ph + 0.6) * 0.1 * w + happy * Math.sin(t * 12) * 0.22);
        } else if (p.kind === 'earL' || p.kind === 'earR') {
          var side = p.kind === 'earL' ? -1 : 1;
          p.tw -= dt; if (p.tw <= 0) { p.tw = rnd(2.5, 8); p.twT = 0.32; }
          if (p.twT > 0) p.twT -= dt;
          a = side * (Math.sin(Math.max(0, p.twT) / 0.32 * Math.PI * 2) * 0.16 * (1 - doze) + driveY * 0.5 + happy * 0.06 - doze * 0.06);
        } else if (p.kind === 'wingL' || p.kind === 'wingR') {
          var wf, wa;
          if (kind === 'fly') { var th2 = t * (fast ? 6 : heavy ? 1.5 : 3.2) * (flutT > 0 ? 1.4 : 1) * Math.PI * 2; wf = Math.sin(th2 + 0.35 * Math.sin(th2)); wa = (heavy ? 0.26 : fast ? 0.26 : 0.32) + walk * 0.08 + roar * 0.12; }
          else { wf = heavy ? Math.sin(t * 1.8) : Math.sin(t * 10) + 0.3; wa = (heavy ? 0.035 : 0.03) + walk * (heavy ? 0.1 : 0.16) + happy * 0.16 + roar * 0.3 + airK * 0.2; }
          a = (p.kind === 'wingL' ? 1 : -1) * (wf * wa + roar * (heavy ? 0.28 : 0.08));
        } else if (p.kind === 'fin') a = Math.sin(t * (2.4 + walk * 2.5) + p.ph) * 0.2 * p.s;
        else if (p.kind === 'foot') {
          // this foot's turn in the stride: back on the ground, then up and forward, then down in front
          if (hopper) { a = fwd * airK * 0.16; dy = -airK * 0.022; }
          else {
            var fp = ph + (p.s > 0 ? 0 : Math.PI);
            a = fwd * -Math.cos(fp) * 0.34 * w; dy = -Math.max(0, Math.sin(fp)) * 0.07 * w - airK * 0.015;
          }
        }
        else if (p.kind === 'leg') { a = p.s * Math.sin(ph) * 0.18 * w; dy = -Math.max(0, p.s * Math.cos(ph)) * 0.02 * w; }
        else if (p.kind === 'arm') a = (wave > 0 ? Math.sin(wave * 12) * 0.22 * Math.min(1, wave * 3) : 0) + Math.sin(t * 1.7 + p.ph) * 0.03 - Math.sin(ph) * 0.06 * w + happy * Math.sin(t * 11) * 0.1;
        else if (p.kind === 'jaw') a = R.face * (roar * 0.36 + (Math.sin(t * 1.3) + 1) * 0.018);
        else if (p.kind === 'flame') { a = Math.sin(t * 8 + p.ph) * 0.08 + Math.sin(t * 12.7) * 0.045 - drive * 0.5; dy = Math.sin(t * 10) * 0.005; }
        else {
          // top / dangle: a spring pulled by the body's moves (a top leans back, a dangle swings back) plus a tiny drift
          var dir = p.kind === 'dangle' ? 1 : -1;
          p.sp.to = dir * drive + wob(t * 0.9, p.ph) * 0.035;
          p.sp.v += driveY * p.side * 6 * dt;
          stepS(p.sp, dt); a = clamp(p.sp.x, -0.4, 0.4) * p.s;
        }
        u.P[o + 2] = a; u.P[o + 3] = dy;
      });
      u.sq[0] = sx * (1 + roar * 0.035); u.sq[1] = sy * (1 + roar * 0.045); u.sq[2] = bend.x + sway; u.sq[3] = breath;
      u.wave[0] = R.serpent ? 0.012 + walk * 0.008 : 0; u.wave[1] = 9; u.wave[2] = t * 2.4;
      u.lid[0] = close * (1 - happy); u.lid[1] = happy;
      return { lift: lift, roll: roll };
    }
    // a step, a landing: the hanging things get a push
    function kick(k) { parts.forEach(function (p) { if (p.kind === 'dangle' || p.kind === 'top') p.sp.v += (p.kind === 'dangle' ? 1 : -1) * p.side * k * 1.4; }); }
    return {
      rig: R, u: u, update: update,
      jump: function (h, dur) { dozeTo = 0; jumpNow(h === undefined ? 0.3 : h, dur); },
      cheer: function (s) { dozeTo = 0; happyT = Math.max(happyT, s || 1.2); },
      roar: function (s) { dozeTo = 0; roarT = s || 0.9; },
      look: function (a, s, nod) { look = { a: a, t: s || 1.2, nod: nod || 0 }; },
      doze: function (on) { dozeTo = on ? 1 : 0; },
      flutter: function (s) { flutT = s || 1.5; },
      shake: function () { shake.v += (Math.random() < 0.5 ? -1 : 1) * 0.55; kick(0.8); },
      blink: function () { if (blinkK < 0) { blinkK = 0; blinkT = rnd(2, 5); } },
      busy: function () { return !!jump; },
      dozing: function () { return dozeTo > 0; }
    };
  }
  return { PET_RIG: RIG, PET_RIG_MAXP: MAXP, petRigOf: petRigOf, createPetPose: createPetPose,
    PET_GLSL: { VS_HEAD: VS_HEAD, FS_HEAD: FS_HEAD, VS_THREE: VS_THREE, FS_THREE: FS_THREE } };
});
