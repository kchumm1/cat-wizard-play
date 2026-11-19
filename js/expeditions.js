// Persistent discoveries for the four resource dungeons. A sweep settles the same result as combat.
(function(root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./data.js').DATA, require('./dungeon.js'), require('./runes.js'));
  else root.CW.expeditions = factory(root.CW.DATA, root.CW, root.CW);
})(this, function(DATA, dungeon, runes) {
  'use strict';
  const places = {
    gold: {theme:'호박빛 갱도', goal:'도둑의 비밀 금고', story:'금화를 흘리고 달아난 도둑쥐. 수레바퀴 자국을 따라 은신처를 찾아요.', reward:'골드', steps:['금화 자국 발견','수레 추격','금고 자물쇠 발견','비밀 금고 개방'], look:2, sky:0x553619},
    mana: {theme:'남빛 첨탑', goal:'수호자의 마력핵', story:'잠든 골렘이 탑을 지켜요. 어깨 장갑을 깨고 가슴속 푸른 핵을 드러내요.', reward:'마력석', steps:['장갑에 첫 균열','어깨 장갑 파괴','마력핵 노출','수호자 돌파'], look:3, sky:0x292d56},
    gem: {theme:'청록 수정맥', goal:'수정 속 묻힌 보물', story:'수정 벽 너머로 작은 그림자가 보여요. 전투의 충격으로 광맥을 갈라 보물을 꺼내요.', reward:'다이아', steps:['광맥 탐색','수정벽 균열','보물 윤곽 발견','수정 보물 발굴'], look:4, sky:0x185052},
    rune: {theme:'보랏빛 성소', goal:'봉인된 룬 석판', story:'수호 정령이 잠든 신전이에요. 정령을 모아 원하는 룬의 빈 획을 채워요.', reward:'룬석 · 룬', steps:['빈 석판 발견','첫 문양 각인','마지막 획 추적','룬 문양 완성'], look:6, sky:0x3e2854}
  };
  const inhabitants={
    gold:[['exmob-mouse','금화를 훔친 도둑쥐','skitter'],['exmob-mole','금고 경비 두더지','stomp']],
    mana:[['exmob-golem','탑의 장갑 골렘','stomp'],['exmob-core','마력핵 수호자','float']],
    gem:[['exmob-gecko','수정등 도마뱀','skitter'],['exmob-bat','보석 날개 박쥐','float']],
    rune:[['exmob-tablet','봉인 석판 정령','hop'],['exmob-fox','문양 꼬리 여우','walk']]
  };
  const ids = Object.keys(places);
  function journal(state) {
    if (!state.dungeon) state.dungeon = {day:'',used:{},best:{},bonus:{}};
    return state.dungeon.explore || (state.dungeon.explore = {progress:{}, cleared:{}, maps:0, wearing:false, target:''});
  }
  function choices(state) { return DATA.runes.filter(r => !r.awaken && runes.runeKindOpen(state,r.id)); }
  function target(state) {
    const options=choices(state);
    return options.find(r => r.id===journal(state).target) || options[0];
  }
  function selectRune(state,id) {
    if (!dungeon.kindOpen(state,'rune') || !choices(state).some(r=>r.id===id)) return false;
    journal(state).target=id;return true;
  }
  function distance(state,id,res) {
    if (!res) return 0;
    const measured=id==='mana' ? (res.dmg||0)/Math.max(1,dungeon.golemHp(state,0)) : (res.kills||0);
    if (!(measured>0)) return 0;
    const scale={gold:4,mana:40,gem:3,rune:3};
    return Math.min(100,Math.max(1,Math.floor(measured*scale[id]))+Math.min(25,(res.finds||0)*5));
  }
  function track(state,id,res) {
    const j=journal(state),points=Math.min(100,(j.progress[id]||0)+distance(state,id,res));
    const step=points===100?3:points>=68?2:points>=32?1:0;
    return {points,step,label:places[id].steps[step],round:(j.cleared[id]||0)+1};
  }
  function pieces(state) {
    const j=journal(state);
    return ids.filter(id=>(j.cleared[id]||0)>j.maps);
  }
  function finish(state,id,res,reward) {
    const j=journal(state), t=track(state,id,res);
    j.progress[id]=t.points%100;
    let note=t.label+' · '+t.points+'%';
    if(t.points===100) {
      j.cleared[id]=t.round;
      if(id==='rune') { const r=target(state);runes.runeAdd(state,r.id,0,true);note=r.name+' 획득'; }
      else note=t.label;
      if(id==='gold'||id==='mana') {const add=Math.ceil((reward[id]||0)*.25);reward[id]=(reward[id]||0)+add;}
      if(t.round===j.maps+1)note+=' · 지도 조각 발견';
    }
    reward.discovery=note;
    return reward;
  }
  const lootKinds=['gold','mana','rune'];
  function treasure(state,kind) {
    const j=journal(state);
    if(pieces(state).length!==4 || (j.maps>0 && !lootKinds.includes(kind)))return null;
    if(j.maps===0){j.maps++;return '유적 탐험가 냥이 코스튬 획득';}
    const best=state.dungeon.best[kind];if(!best)return null;
    const quote=dungeon.dungeonReward(state,kind,best),field=kind==='rune'?'runeStone':kind;
    const amount=Math.max(1,Math.ceil((quote[field]||0)*.5));
    state[field]=(state[field]||0)+amount;j.maps++;
    return ({gold:'골드',mana:'마력석',rune:'룬석'})[kind]+' +'+amount.toLocaleString('ko-KR');
  }
  return {places,inhabitants,ids,journal,track,finish,pieces,target,choices,selectRune,treasure};
});
