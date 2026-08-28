"use strict";

const SAVE_KEY="monsterHuntLastStandSave_v46";
const PREVIOUS_SAVE_KEYS=["monsterHuntLastStandSave_v45","monsterHuntLastStandSave_v44","monsterHuntLastStandSave_v43","monsterHuntLastStandSave_v42","monsterHuntLastStandSave_v41","monsterHuntLastStandSave_v40","monsterHuntLastStandSave_v39","monsterHuntLastStandSave_v38","monsterHuntLastStandSave_v37","monsterHuntLastStandSave_v36","monsterHuntLastStandSave_v35","monsterHuntLastStandSave_v34","monsterHuntLastStandSave_v33","monsterHuntLastStandSave_v32","monsterHuntLastStandSave_v31","monsterHuntLastStandSave_v30","monsterHuntLastStandSave_v29","monsterHuntLastStandSave_v28","monsterHuntLastStandSave_v27","monsterHuntLastStandSave_v26","monsterHuntLastStandSave_v25","monsterHuntLastStandSave_v24","monsterHuntLastStandSave_v23","monsterHuntLastStandSave_v22","monsterHuntLastStandSave_v21","monsterHuntLastStandSave_v20","monsterHuntLastStandSave_v19","monsterHuntLastStandSave_v18","monsterHuntLastStandSave_v17","monsterHuntLastStandSave_v16","monsterHuntLastStandSave_v15","monsterHuntLastStandSave_v14","monsterHuntLastStandSave_v13","monsterHuntLastStandSave_v12","monsterHuntLastStandSave_v11","monsterHuntLastStandSave_v10","monsterHuntLastStandSave_v9","monsterHuntLastStandSave_v8"];
const GAME_DURATION=30;
const W=1280,H=720,TAU=Math.PI*2;
const PLAYFIELD={left:34,right:W-34,top:128,bottom:H-38};
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const norm=(x,y)=>{const l=Math.hypot(x,y)||1;return{x:x/l,y:y/l}};
const dist2=(a,b)=>{const dx=a.x-b.x,dy=a.y-b.y;return dx*dx+dy*dy};
const lerp=(a,b,t)=>a+(b-a)*t;
const easeOut=t=>1-Math.pow(1-t,3);
const easeInOut=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));

const CHARACTERS={
  striker:{name:"VANGUARD",ko:"선봉대",role:"연사형",maxHp:5,speed:390,bulletSpeed:940,damage:7,radius:5,fireInterval:.10,magazine:30,reloadTime:1.00,skill:"DRAGON BURST",cooldown:7,duration:4,color:"#ef6658",weapon:"rifle"},
  phantom:{name:"RANGER",ko:"레인저",role:"밸런스형",maxHp:5,speed:420,bulletSpeed:895,damage:9,radius:6,fireInterval:.14,magazine:24,reloadTime:1.00,skill:"SHADOW STEP",cooldown:6,dash:235,invuln:1.0,color:"#59ca91",weapon:"crossbow"},
  arcanist:{name:"ARCANIST",ko:"비전술사",role:"스킬형",maxHp:5,speed:395,bulletSpeed:900,damage:10,radius:6,fireInterval:.16,magazine:20,reloadTime:1.00,skill:"ARCANE NOVA",cooldown:7,duration:.72,color:"#a181ec",weapon:"staff"},
  berserker:{name:"BERSERKER",ko:"광전사",role:"중화기형",maxHp:5,speed:385,bulletSpeed:920,damage:14,radius:7,fireInterval:.23,magazine:14,reloadTime:1.00,skill:"BLOOD RUSH",cooldown:8,duration:2.6,color:"#ef8158",weapon:"cannon"}
};

const PLAYER_MOTION={
  striker:{bob:3.2,sway:1.3,lean:.018,recoil:6.2,float:0,size:87,yOffset:13,hitboxY:23,cycleSpeed:.58},
  phantom:{bob:3.2,sway:1.3,lean:.018,recoil:4.4,float:0,size:87,yOffset:13,hitboxY:23,cycleSpeed:.58},
  arcanist:{bob:3.2,sway:1.3,lean:.018,recoil:4.2,float:0,size:87,yOffset:13,hitboxY:23,cycleSpeed:.58},
  berserker:{bob:3.2,sway:1.3,lean:.018,recoil:6.6,float:0,size:87,yOffset:13,hitboxY:23,cycleSpeed:.58}
};

const DIFFICULTIES={
  easy:{name:"EASY",bossHp:620,bulletSpeed:170,attackInterval:.98,bossMoveSpeed:94,bulletBonus:-1,overlapWaves:0,damage:1},
  normal:{name:"NORMAL",bossHp:760,bulletSpeed:215,attackInterval:.76,bossMoveSpeed:102,bulletBonus:1,overlapWaves:1,damage:1},
  hard:{name:"HARD",bossHp:930,bulletSpeed:285,attackInterval:.54,bossMoveSpeed:111,bulletBonus:5,overlapWaves:2,damage:1},
  endless:{name:"ENDLESS",bossHp:Infinity,bulletSpeed:170,attackInterval:.98,bossMoveSpeed:94,bulletBonus:-1,overlapWaves:0,damage:1}
};
// 과제 난이도 비교 시 이 값 하나만 변경한다.
const NORMAL_BULLET_SPEED_TEST=215;
DIFFICULTIES.normal.bulletSpeed=NORMAL_BULLET_SPEED_TEST;

// 전체 보스의 체감 난이도를 아주 조금 올리는 공통 압박값.
// A/B 테스트용 NORMAL_BULLET_SPEED_TEST와는 독립적으로 고정된다.
const BOSS_PRESSURE={hpScale:1.00,bulletSpeedScale:1.04,attackIntervalScale:.94,bossMoveSpeedScale:1.02,bulletBonus:2};
// v45: v44 대비 플레이어 캐릭터 표시 크기와 실제 히트박스를 약 10% 추가 축소.
// Homing is explicitly gated to the aimassist trait only.
const BOSS_SPREAD_SCALE=1.26;
const BOSS_AIM_STEP_SCALE=1.18;
const PLAYER_HITBOX_SCALE=.55;
function pressuredTuning(base){return{
  ...base,
  bulletSpeed:base.bulletSpeed*BOSS_PRESSURE.bulletSpeedScale,
  attackInterval:base.attackInterval*BOSS_PRESSURE.attackIntervalScale,
  bossMoveSpeed:base.bossMoveSpeed*BOSS_PRESSURE.bossMoveSpeedScale,
  bulletBonus:base.bulletBonus+BOSS_PRESSURE.bulletBonus
}}

const BOSSES={
  wyrm:{name:"ABYSS WYRM",ko:"심연의 와이번",special:"INFERNO FAN",color:"#ff6548",radius:92,drawW:268,drawH:268},
  golem:{name:"IRON GOLEM",ko:"철갑 골렘",special:"EARTHSHATTER",color:"#69c8ff",radius:88,drawW:238,drawH:238},
  eye:{name:"CURSED EYE",ko:"저주의 마안",special:"DEATH RAY",color:"#ce65ef",radius:74,drawW:196,drawH:196}
};

const ASSISTS={
  none:{name:"무옵션",short:"무옵션"},
  hpplus:{name:"HP 증가",short:"HP 증가",hpBonus:2},
  bigshot:{name:"아군 탄환 확대",short:"아군 탄환 확대",playerBulletScale:1.35},
  smallenemy:{name:"적 탄환 축소",short:"적 탄환 축소",enemyBulletScale:.78},
  quickskill:{name:"스킬 쿨타임 감소",short:"쿨타임 감소",cooldownScale:.75},
  aimassist:{name:"유도탄",short:"유도탄",homing:true}
};

const canvas=$("gameCanvas"),ctx=canvas.getContext("2d");
const screens=["menuScreen","setupScreen","gameScreen","resultScreen","recordsScreen","settingsScreen"].map($);
const keys=new Set();
const pointer={x:W/2,y:H*.58,inside:false};
let selectedCharacter="striker",selectedBoss="wyrm",selectedDifficulty="normal",selectedAssist="none";
let game=null,raf=0,lastFrame=performance.now(),leftHeld=false,firing=false,artReady=false;
let rankBoss="wyrm",rankDifficulty="normal",rankCharacter="all",rankAssist="all",rankMetric="damage";
const art={};
const bossLayer=document.createElement("canvas");
bossLayer.width=620;bossLayer.height=620;
const bossCtx=bossLayer.getContext("2d");
const ART_SOURCES={
  battleBg:"assets/battle-bg.svg",
  "battle-bg-wyrm":"assets/battle-bg-wyrm-v37.png",
  "battle-bg-golem":"assets/battle-bg-golem-v37.png",
  "battle-bg-eye":"assets/battle-bg-eye-v37.png",
  "sprite-striker":"assets/sprite-striker.png",
  "sprite-phantom":"assets/sprite-phantom.png",
  "sprite-arcanist":"assets/sprite-arcanist.png",
  "sprite-striker-v38":"assets/sprite-striker-v38.png",
  "sprite-phantom-v38":"assets/sprite-phantom-v38.png",
  "sprite-arcanist-v38":"assets/sprite-arcanist-v38.png",
  "sprite-striker-v39":"assets/sprite-striker-v39.png",
  "sprite-phantom-v39":"assets/sprite-phantom-v39.png",
  "sprite-arcanist-v39":"assets/sprite-arcanist-v39.png",
  "sprite-berserker-v39":"assets/sprite-berserker-v39.png",
  "sprite-berserker":"assets/sprite-berserker.png",
  "sprite-berserker-v20":"assets/sprite-berserker-v20.png",
  "berserker-head":"assets/berserker-head.png",
  "wyrm-idle-static":"assets/boss-idle-wyrm-static.png",
  "wyrm-idle-body":"assets/boss-rig-wyrm-idle-base.png",
  "wyrm-idle-wingL":"assets/boss-rig-wyrm-idle-wingL.png",
  "wyrm-idle-wingR":"assets/boss-rig-wyrm-idle-wingR.png",
  "wyrm-idle-head":"assets/boss-rig-wyrm-idle-head.png",
  "wyrm-idle-wingLRoot":"assets/boss-rig-wyrm-idle-wingLRoot.png",
  "wyrm-idle-wingRRoot":"assets/boss-rig-wyrm-idle-wingRRoot.png",
  "wyrm-idle-cover":"assets/boss-rig-wyrm-idle-cover.png",
  "wyrm-attack-body":"assets/boss-rig-wyrm-attack-base.png",
  "wyrm-attack-wingL":"assets/boss-rig-wyrm-attack-wingL.png",
  "wyrm-attack-wingR":"assets/boss-rig-wyrm-attack-wingR.png",
  "wyrm-attack-head":"assets/boss-rig-wyrm-attack-head.png",
  "wyrm-attack-wingLRoot":"assets/boss-rig-wyrm-attack-wingLRoot.png",
  "wyrm-attack-wingRRoot":"assets/boss-rig-wyrm-attack-wingRRoot.png",
  "wyrm-attack-cover":"assets/boss-rig-wyrm-attack-cover.png",
  "golem-idle-body":"assets/boss-rig-golem-idle-base.png",
  "golem-idle-armL":"assets/boss-rig-golem-idle-armL.png",
  "golem-idle-armR":"assets/boss-rig-golem-idle-armR.png",
  "golem-idle-head":"assets/boss-rig-golem-idle-head.png",
  "golem-idle-armLRoot":"assets/boss-rig-golem-idle-armLRoot.png",
  "golem-idle-armRRoot":"assets/boss-rig-golem-idle-armRRoot.png",
  "golem-idle-cover":"assets/boss-rig-golem-idle-cover.png",
  "golem-attack-body":"assets/boss-rig-golem-attack-base.png",
  "golem-attack-armL":"assets/boss-rig-golem-attack-armL.png",
  "golem-attack-armR":"assets/boss-rig-golem-attack-armR.png",
  "golem-attack-head":"assets/boss-rig-golem-attack-head.png",
  "golem-attack-armLRoot":"assets/boss-rig-golem-attack-armLRoot.png",
  "golem-attack-armRRoot":"assets/boss-rig-golem-attack-armRRoot.png",
  "golem-attack-cover":"assets/boss-rig-golem-attack-cover.png",
  "eye-idle-core":"assets/boss-rig-eye-idle-base.png",
  "eye-idle-tentacleTop":"assets/boss-rig-eye-idle-tentacleTop.png",
  "eye-idle-tentacleBottom":"assets/boss-rig-eye-idle-tentacleBottom.png",
  "eye-idle-iris":"assets/boss-rig-eye-idle-iris.png",
  "eye-idle-tentacleTopRoot":"assets/boss-rig-eye-idle-tentacleTopRoot.png",
  "eye-idle-tentacleBottomRoot":"assets/boss-rig-eye-idle-tentacleBottomRoot.png",
  "eye-idle-cover":"assets/boss-rig-eye-idle-cover.png",
  "eye-attack-core":"assets/boss-rig-eye-attack-base.png",
  "eye-attack-tentacleTop":"assets/boss-rig-eye-attack-tentacleTop.png",
  "eye-attack-tentacleBottom":"assets/boss-rig-eye-attack-tentacleBottom.png",
  "eye-attack-iris":"assets/boss-rig-eye-attack-iris.png",
  "eye-attack-tentacleTopRoot":"assets/boss-rig-eye-attack-tentacleTopRoot.png",
  "eye-attack-tentacleBottomRoot":"assets/boss-rig-eye-attack-tentacleBottomRoot.png",
  "eye-attack-cover":"assets/boss-rig-eye-attack-cover.png"
};
function preloadArt(){
  const failures=[];
  return Promise.all(Object.entries(ART_SOURCES).map(([key,src])=>new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{art[key]=img;resolve(true)};
    img.onerror=()=>{failures.push(src);console.warn(`asset load failed: ${src}`);resolve(false)};
    img.src=src+(src.includes("?")?"&":"?")+"v=41";
  }))).then(()=>failures);
}

/* ---------- storage ---------- */
function defaultSave(){return{version:46,settings:{reducedMotion:false,screenShake:true,hitFlash:true,crosshair:true,specialTelegraph:true,playerHitbox:false},lastSelection:{character:"striker",boss:"wyrm",difficulty:"normal",assist:"none"},rankings:[]}}
function normalizeRanking(r){
  if(!r||typeof r!=="object"||typeof r.nickname!=="string"||!BOSSES[r.boss]||!CHARACTERS[r.character])return null;
  const difficulty=DIFFICULTIES[r.difficulty]?r.difficulty:"normal";
  const assist=ASSISTS[r.assist]?r.assist:"none";
  const time=Number(r.time);
  const damage=Number(r.damage||0);
  if(!Number.isFinite(time)||time<=0)return null;
  if(difficulty!=="endless"&&time>GAME_DURATION+.2)return null;
  return{nickname:r.nickname.slice(0,12),boss:r.boss,character:r.character,difficulty,assist,time,damage:Number.isFinite(damage)?Math.max(0,damage):0,date:typeof r.date==="string"?r.date:new Date().toISOString()};
}
function normalizeSave(s){
  if(!s||typeof s!=="object")return null;
  const st=s.settings||{};
  const rankings=Array.isArray(s.rankings)?s.rankings.map(normalizeRanking).filter(Boolean):[];
  const last=s.lastSelection&&typeof s.lastSelection==="object"?s.lastSelection:{};
  return{version:46,settings:{
    reducedMotion:typeof st.reducedMotion==="boolean"?st.reducedMotion:false,
    screenShake:typeof st.screenShake==="boolean"?st.screenShake:true,
    hitFlash:typeof st.hitFlash==="boolean"?st.hitFlash:true,
    crosshair:typeof st.crosshair==="boolean"?st.crosshair:true,
    specialTelegraph:typeof st.specialTelegraph==="boolean"?st.specialTelegraph:true,
    playerHitbox:typeof st.playerHitbox==="boolean"?st.playerHitbox:false
  },lastSelection:{
    character:CHARACTERS[last.character]?last.character:"striker",
    boss:BOSSES[last.boss]?last.boss:"wyrm",
    difficulty:DIFFICULTIES[last.difficulty]?last.difficulty:"normal",
    assist:ASSISTS[last.assist]?last.assist:"none"
  },rankings};
}
function loadSave(){
  try{
    let raw=localStorage.getItem(SAVE_KEY);
    if(!raw){for(const key of PREVIOUS_SAVE_KEYS){raw=localStorage.getItem(key);if(raw)break}}
    if(!raw)return defaultSave();
    const s=normalizeSave(JSON.parse(raw));if(!s)throw new Error("invalid save");
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(s))}catch(_){ }
    return s;
  }catch(_){const fresh=defaultSave();try{localStorage.setItem(SAVE_KEY,JSON.stringify(fresh))}catch(__){ }return fresh}
}
let saveData=loadSave();
selectedCharacter=saveData.lastSelection.character;selectedBoss=saveData.lastSelection.boss;selectedDifficulty=saveData.lastSelection.difficulty;selectedAssist=saveData.lastSelection.assist;
function persistSelections(){saveData.lastSelection={character:selectedCharacter,boss:selectedBoss,difficulty:selectedDifficulty,assist:selectedAssist};persist()}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(saveData))}catch(err){console.warn("localStorage save failed",err)}}

/* ---------- UI helpers ---------- */
function showScreen(id){
  screens.forEach(s=>s.classList.toggle("hidden",s.id!==id));
  if(id!=="gameScreen"){pointer.inside=false;leftHeld=false;firing=false;keys.clear()}
}
function selectChoice(container,attr,value){
  document.querySelectorAll(`#${container} [data-${attr}]`).forEach(el=>el.classList.toggle("selected",el.dataset[attr]===value));
}
const hunterCardMotion={selectedSince:performance.now()/1000,raf:0};
function hunterPreviewFramePosition(el,frame){
  if(!el)return;
  const safe=clamp(frame,0,6),ch=el.dataset.characterPreview||"striker";
  el.style.setProperty("--hunter-frame-image",`url("assets/selection-preview/${ch}-${safe}.png")`);
}
function resetHunterCardShowcase(){
  hunterCardMotion.selectedSince=performance.now()/1000;
  document.querySelectorAll("[data-character-preview]").forEach(el=>hunterPreviewFramePosition(el,0));
}
function renderHunterCardShowcase(now){
  if(!$('setupScreen').classList.contains('hidden')){
    const elapsed=now/1000-hunterCardMotion.selectedSince,showcaseFrames=[1,2,3,4,3,2];
    let showcaseFrame=0;
    if(elapsed>=0&&elapsed<1.08)showcaseFrame=showcaseFrames[Math.min(5,Math.floor(elapsed/.18))];
    else if(elapsed>=1.08){const cycle=(elapsed-1.08)%5.2;if(cycle>=4.05){const u=(cycle-4.05)/1.15;showcaseFrame=showcaseFrames[Math.min(5,Math.floor(u*6))]}}
    document.querySelectorAll('#characterChoices [data-character]').forEach(card=>{
      hunterPreviewFramePosition(card.querySelector('[data-character-preview]'),card.dataset.character===selectedCharacter?showcaseFrame:0);
    });
  }
  hunterCardMotion.raf=requestAnimationFrame(renderHunterCardShowcase);
}
function initHunterCardShowcase(){cancelAnimationFrame(hunterCardMotion.raf);resetHunterCardShowcase();hunterCardMotion.raf=requestAnimationFrame(renderHunterCardShowcase)}
function effectiveCooldown(charKey,assistKey=selectedAssist){
  const c=CHARACTERS[charKey],a=ASSISTS[assistKey];return c.cooldown*(a.cooldownScale||1);
}
function updateSummary(){
  const c=CHARACTERS[selectedCharacter],b=BOSSES[selectedBoss],d=DIFFICULTIES[selectedDifficulty],a=ASSISTS[selectedAssist];
  const eff=pressuredTuning(d);
  const line=selectedDifficulty==="endless"
    ?`시간 제한 없음 · 시간이 흐를수록 EASY → NORMAL → HARD로 강화`
    :`보스 HP ${Math.round(d.bossHp*BOSS_PRESSURE.hpScale)} · 탄속 ${Math.round(eff.bulletSpeed)}px/s · 이동속도 ${Math.round(eff.bossMoveSpeed)}`;
  $("loadoutSummary").innerHTML=`<b>${c.ko} ${c.name}</b> · ${c.role} · DMG ${c.damage} · 탄창 ${c.magazine} · 재장전 ${c.reloadTime.toFixed(1)}초<br><b>vs ${b.ko} ${b.name}</b> · ${d.name}<br>${line}<br><span>특성: ${a.name}</span>`;
}

/* ---------- endless tuning ---------- */
function endlessThreat(elapsed){
  if(elapsed<30)return{label:"EASY",phase:1,bulletSpeed:DIFFICULTIES.easy.bulletSpeed,attackInterval:DIFFICULTIES.easy.attackInterval,bossMoveSpeed:DIFFICULTIES.easy.bossMoveSpeed,bulletBonus:DIFFICULTIES.easy.bulletBonus,damage:1};
  if(elapsed<60)return{label:"NORMAL",phase:2,bulletSpeed:DIFFICULTIES.normal.bulletSpeed,attackInterval:DIFFICULTIES.normal.attackInterval,bossMoveSpeed:DIFFICULTIES.normal.bossMoveSpeed,bulletBonus:DIFFICULTIES.normal.bulletBonus,damage:1};
  const hard=DIFFICULTIES.hard;
  // 60~180초 동안 완만하게 상승, 이후 상한 고정: 탄속 +15%, 이동 +10%, 공격 간격 -12%, 탄 수 +2.
  const t=clamp((elapsed-60)/120,0,1);
  return{
    label:"HARD",phase:3,
    bulletSpeed:hard.bulletSpeed*(1+.15*t),
    attackInterval:hard.attackInterval*(1-.12*t),
    bossMoveSpeed:hard.bossMoveSpeed*(1+.10*t),
    bulletBonus:hard.bulletBonus+Math.round(2*t),damage:1
  };
}
function currentBossTuning(){return pressuredTuning(game.difficulty==="endless"?endlessThreat(game.elapsed):DIFFICULTIES[game.difficulty])}

/* ---------- game ---------- */
function createGame(){
  const c=CHARACTERS[selectedCharacter],a=ASSISTS[selectedAssist],d=DIFFICULTIES[selectedDifficulty],boss=BOSSES[selectedBoss];
  const maxHp=c.maxHp+(a.hpBonus||0);
  return{
    state:"playing",paused:false,character:selectedCharacter,bossType:selectedBoss,difficulty:selectedDifficulty,assist:selectedAssist,elapsed:0,
    player:{x:W/2,y:H-88,r:18,hp:maxHp,maxHp,invuln:0,skillCd:0,skillActive:0,fireCd:0,ammo:c.magazine,reloading:false,reloadTimer:0,reloadDuration:c.reloadTime,moveClock:0,moving:false,moveAngle:-Math.PI/2,aimAngle:-Math.PI/2,recoil:0,skillReadyPulse:0,hitFx:0},
    boss:{x:W/2,y:200,r:boss.radius,hp:selectedDifficulty==="endless"?1e12:Math.round(d.bossHp*BOSS_PRESSURE.hpScale),maxHp:selectedDifficulty==="endless"?1e12:Math.round(d.bossHp*BOSS_PRESSURE.hpScale),phase:1,moveDir:1,attackTimer:.92,specialTimer:5.7,action:null,enrageTimer:0,hitFlash:0,specialsUsed:{2:false,3:false},forcedSpecialPending:false,lastThreat:"EASY",movePhase:0,moveBlend:0,moveDirVisual:1,moveVelocity:0,castTimer:0,castDuration:0,castType:null},
    playerBullets:[],bossBullets:[],hazards:[],particles:[],events:[],ripples:[],
    shots:0,shotsHit:0,hits:0,totalDamage:0,flash:0,shake:0,announcementTimer:0,skillFx:0,skillNoticeTimer:0,skillNoticeDuration:.9,skillNoticeName:"",
    settings:{...saveData.settings}
  };
}
function startGame(){
  if(!artReady)return;
  persistSelections();
  game=createGame();leftHeld=false;firing=false;keys.clear();pointer.inside=false;
  $("pauseOverlay").classList.add("hidden");$("bossAnnouncement").classList.add("hidden");
  showScreen("gameScreen");updateHud();lastFrame=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
}
function loop(now){
  const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;
  if(!game||game.state!=="playing")return;
  if(!game.paused)update(dt);render();raf=requestAnimationFrame(loop);
}
function playerMovementBounds(){
  const p=game?.player,prof=PLAYER_MOTION[game?.character]||PLAYER_MOTION.striker;
  const r=(p?.r||18)*PLAYER_HITBOX_SCALE,hitboxY=prof.hitboxY||29;
  return{left:PLAYFIELD.left+r,right:PLAYFIELD.right-r,top:PLAYFIELD.top+r+hitboxY,bottom:PLAYFIELD.bottom-r+hitboxY};
}
function clampPlayerPosition(x,y){
  const b=playerMovementBounds();return{x:clamp(x,b.left,b.right),y:clamp(y,b.top,b.bottom)};
}
function update(dt){
  const p=game.player,c=CHARACTERS[game.character];
  game.elapsed+=dt;
  p.invuln=Math.max(0,p.invuln-dt);
  const prevCd=p.skillCd;p.skillCd=Math.max(0,p.skillCd-dt);if(prevCd>0&&p.skillCd===0)p.skillReadyPulse=.62;
  p.skillReadyPulse=Math.max(0,p.skillReadyPulse-dt);p.hitFx=Math.max(0,p.hitFx-dt);p.skillActive=Math.max(0,p.skillActive-dt);p.fireCd=Math.max(0,p.fireCd-dt);p.recoil=Math.max(0,p.recoil-dt*8);
  if(p.reloading){p.reloadTimer=Math.max(0,p.reloadTimer-dt);if(p.reloadTimer<=0){p.reloading=false;p.ammo=c.magazine;}}
  game.skillNoticeTimer=Math.max(0,game.skillNoticeTimer-dt);
  game.boss.hitFlash=Math.max(0,game.boss.hitFlash-dt);game.flash=Math.max(0,game.flash-dt);game.shake=Math.max(0,game.shake-dt);game.skillFx=Math.max(0,game.skillFx-dt);
  if(game.announcementTimer>0){game.announcementTimer-=dt;if(game.announcementTimer<=0)$("bossAnnouncement").classList.add("hidden")}

  p.aimAngle=Math.atan2(pointer.y-p.y,pointer.x-p.x);
  firing=leftHeld&&!game.paused&&game.state==="playing";
  if(firing&&p.fireCd<=0)attemptPlayerFire();

  let dx=0,dy=0;
  if(keys.has("KeyA")||keys.has("ArrowLeft"))dx--;if(keys.has("KeyD")||keys.has("ArrowRight"))dx++;
  if(keys.has("KeyW")||keys.has("ArrowUp"))dy--;if(keys.has("KeyS")||keys.has("ArrowDown"))dy++;
  p.moving=!!(dx||dy);
  if(p.moving){const n=norm(dx,dy);p.moveClock+=dt*10;p.moveAngle=Math.atan2(n.y,n.x);const pos=clampPlayerPosition(p.x+n.x*c.speed*dt,p.y+n.y*c.speed*dt);p.x=pos.x;p.y=pos.y}

  const prevBossX=game.boss.x;updateBoss(dt);updateBossMotion(dt,prevBossX);updateEvents(dt);updateBullets(dt);updateHazards(dt);updateParticles(dt);updateRipples(dt);collisions(currentBossTuning());updateHud();
  if(game.difficulty!=="endless"&&game.elapsed>=GAME_DURATION&&game.state==="playing")endGame(false,"30초 제한시간을 초과했습니다.");
}

/* ---------- boss state ---------- */
function enterPhase(n){
  const b=game.boss;b.phase=n;b.enrageTimer=1.05;b.action=null;b.castTimer=0;b.castDuration=0;b.castType=null;b.attackTimer=.78;b.specialTimer=n===3?5:6.4;
  if(n>=2&&!b.specialsUsed[n])b.forcedSpecialPending=true;
  announce(`PHASE ${n} · ENRAGED`,1);burst(b.x,b.y,BOSSES[game.bossType].color,game.settings.reducedMotion?12:36);
  if(game.bossType!=="wyrm")game.ripples.push({x:b.x,y:b.y+30,r:42,life:.8,max:.8,color:BOSSES[game.bossType].color});
}
function updateBoss(dt){
  const b=game.boss,tune=currentBossTuning();
  if(b.castTimer>0)b.castTimer=Math.max(0,b.castTimer-dt);
  if(game.difficulty==="endless"){
    const threat=endlessThreat(game.elapsed);
    if(threat.phase!==b.phase){enterPhase(threat.phase);b.lastThreat=threat.label;announce(`THREAT LEVEL · ${threat.label}`,1.1);return}
  }else{
    if(b.phase===1&&b.hp<=b.maxHp*.6){enterPhase(2);return}
    if(b.phase===2&&b.specialsUsed[2]&&b.hp<=b.maxHp*.3){enterPhase(3);return}
  }
  if(b.enrageTimer>0){b.enrageTimer-=dt;return}
  if(b.action){
    b.action.timer-=dt;
    if(b.action.timer<=0){
      const action=b.action,t=action.type;
      b.action=null;
      b.castType=t;
      b.castDuration=t==="special"?.42:.28;
      b.castTimer=b.castDuration;
      t==="regular"?bossRegularAttack(action):bossSpecialAttack(action);
    }
    return;
  }
  if(b.phase>=2&&b.forcedSpecialPending){b.forcedSpecialPending=false;const aim=Math.atan2(game.player.y-b.y,game.player.x-b.x);b.action={type:"special",timer:.92,duration:.92,aim};announce(BOSSES[game.bossType].special,.8);return}
  b.x+=b.moveDir*tune.bossMoveSpeed*dt;
  if(b.x<210||b.x>W-210){b.moveDir*=-1;b.x=clamp(b.x,210,W-210)}
  b.attackTimer-=dt;b.specialTimer-=dt;
  if(b.phase>=2&&b.specialTimer<=0){b.specialTimer=game.bossType==="golem"?(b.phase===3?4.4:5.6):(b.phase===3?5:6.4);const aim=Math.atan2(game.player.y-b.y,game.player.x-b.x);b.action={type:"special",timer:.94,duration:.94,aim};announce(BOSSES[game.bossType].special,.8);return}
  if(b.attackTimer<=0){b.attackTimer=tune.attackInterval*(b.phase===3?.84:b.phase===2?.93:1);const spec=makeRegularBossAction();b.action={type:"regular",timer:.62,duration:.62,...spec}}
}
function updateBossMotion(dt,prevX){
  const b=game.boss,dx=b.x-prevX,vx=dx/Math.max(dt,.001),moving=Math.abs(dx)>.01;
  const target=moving?1:0;
  b.moveBlend=lerp(b.moveBlend||0,target,clamp(dt*(moving?10:6),0,1));
  if(moving){
    b.moveDirVisual=Math.sign(vx)||b.moveDirVisual||1;
    b.moveVelocity=lerp(b.moveVelocity||0,clamp(Math.abs(vx)/115,0,1.2),clamp(dt*8,0,1));
    b.movePhase=(b.movePhase||0)+dt*(4.7+Math.abs(vx)/80*1.4);
  }else{
    b.moveVelocity=lerp(b.moveVelocity||0,0,clamp(dt*6,0,1));
  }
}
function schedule(delay,fn){game.events.push({t:delay,fn})}
function updateEvents(dt){for(const e of game.events)e.t-=dt;const ready=game.events.filter(e=>e.t<=0);game.events=game.events.filter(e=>e.t>0);for(const e of ready)e.fn()}
function announce(text,time=.8){
  const isPhase=text.startsWith("PHASE "),isThreat=text.startsWith("THREAT LEVEL");
  if(!isPhase&&!isThreat&&game&&!game.settings.specialTelegraph){$("bossAnnouncement").classList.add("hidden");return}
  game.announcementTimer=time;
  const el=$("bossAnnouncement");
  let badge="WARNING",title=text,sub="Boss pattern incoming";
  if(text.startsWith("PHASE ")){
    const parts=text.split("·").map(v=>v.trim());
    badge="PHASE SHIFT"; title=parts[0]||text; sub=parts[1]||"Boss enraged";
  }else if(text.startsWith("THREAT LEVEL")){
    const parts=text.split("·").map(v=>v.trim());
    badge="THREAT"; title=parts[0]||"THREAT LEVEL"; sub=parts[1]||"Danger rising";
  }else{
    badge="BOSS SKILL"; title=text; sub="특수 패턴 준비";
  }
  el.innerHTML=`<span class="warn-badge">${badge}</span><strong class="warn-title">${title}</strong><small class="warn-sub">${sub}</small>`;
  el.classList.remove("hidden");
}

/* ---------- player combat ---------- */
function weaponTip(x,y,a,type){const len=type==="cannon"?62:type==="staff"?66:type==="crossbow"?61:69;return{x:x+Math.cos(a)*len,y:y-54+Math.sin(a)*len}}
function adjustedAimAngle(){
  return game.player.aimAngle;
}
function spawnPlayerBullet(angle,bonus=0,opts={}){
  const c=CHARACTERS[game.character],p=game.player,scale=ASSISTS[game.assist].playerBulletScale||1,muzzle=weaponTip(p.x,p.y,p.aimAngle,c.weapon);
  // Homing exists only for the dedicated trait unless a skill explicitly disables it.
  const homing=opts.homing===false?false:game.assist==="aimassist";
  const radiusScale=opts.radiusScale||1,speedScale=opts.speedScale||1;
  game.playerBullets.push({
    x:muzzle.x,y:muzzle.y,r:c.radius*scale*radiusScale,
    vx:Math.cos(angle)*c.bulletSpeed*speedScale,vy:Math.sin(angle)*c.bulletSpeed*speedScale,
    damage:c.damage+bonus,life:opts.life||2,trail:[],
    homing,homingAge:0,turnRate:homing?3.35:0,skillKind:opts.skillKind||""
  });
  game.shots++;p.recoil=Math.max(p.recoil,opts.recoil||1);
}
function startReload(){
  if(!game||game.paused||game.state!=="playing")return false;
  const p=game.player,c=CHARACTERS[game.character];
  if(p.reloading||p.ammo>=c.magazine)return false;
  p.reloading=true;p.reloadTimer=c.reloadTime;p.reloadDuration=c.reloadTime;p.fireCd=Math.max(p.fireCd,.08);
  return true;
}
function attemptPlayerFire(){
  if(!game||game.paused||game.state!=="playing")return false;
  const p=game.player,c=CHARACTERS[game.character];
  if(p.reloading)return false;
  if(p.ammo<=0){startReload();return false}
  fireAtPointer();p.ammo=Math.max(0,p.ammo-1);p.fireCd=c.fireInterval;
  if(p.ammo<=0)startReload();
  return true;
}
function fireAtPointer(){
  if(!game||game.paused||game.state!=="playing")return;
  const p=game.player,a=adjustedAimAngle();
  if(game.character==="striker"&&p.skillActive>0){
    [-.28,-.14,0,.14,.28].forEach((off,i)=>spawnPlayerBullet(a+off,i===2?2:(i===1||i===3?1:0),{skillKind:"dragonBurst"}));
  }
  else if(game.character==="berserker"&&p.skillActive>0){
    spawnPlayerBullet(a,14,{radiusScale:1.75,skillKind:"bloodRush",recoil:1.35});
  }
  else spawnPlayerBullet(a);
}
function arcaneNovaWave(wave=0){
  if(!game||game.paused||game.state!=="playing"||game.character!=="arcanist")return;
  const p=game.player,c=CHARACTERS.arcanist,count=20,offset=(wave%2?TAU/(count*2):0)+wave*.035;
  for(let i=0;i<count;i++){
    spawnPlayerBullet(offset+i*TAU/count,4,{
      radiusScale:1.32,
      speedScale:.88+wave*.12,
      life:1.55,
      skillKind:"arcaneNova",
      homing:false,
      recoil:.35
    });
  }
  burst(p.x,p.y-26,c.color,game.settings.reducedMotion?8:22);
  game.ripples.push({x:p.x,y:p.y-28,r:22+wave*7,life:.48,max:.48,color:c.color});
}
function useSkill(){
  if(!game||game.paused||game.state!=="playing")return;
  const p=game.player,c=CHARACTERS[game.character];if(p.skillCd>0)return;
  p.skillCd=effectiveCooldown(game.character,game.assist);p.skillReadyPulse=0;game.skillFx=1;game.skillNoticeTimer=game.skillNoticeDuration;game.skillNoticeName=c.skill;
  burst(p.x,p.y,c.color,game.settings.reducedMotion?12:38);
  game.ripples.push({x:p.x,y:p.y-30,r:24,life:.62,max:.62,color:c.color});
  if(!game.settings.reducedMotion)schedule(.09,()=>game&&game.state==="playing"&&game.ripples.push({x:game.player.x,y:game.player.y-30,r:18,life:.52,max:.52,color:c.color}));
  if(game.character==="striker")p.skillActive=c.duration;
  else if(game.character==="phantom"){
    const n=norm(pointer.x-p.x,pointer.y-p.y),ox=p.x,oy=p.y,pos=clampPlayerPosition(p.x+n.x*c.dash,p.y+n.y*c.dash);
    p.x=pos.x;p.y=pos.y;p.invuln=c.invuln;trailBurst(ox,oy,p.x,p.y,c.color);
  }
  else if(game.character==="arcanist"){
    p.skillActive=c.duration;
    arcaneNovaWave(0);
    schedule(.18,()=>arcaneNovaWave(1));
    schedule(.36,()=>arcaneNovaWave(2));
    schedule(.54,()=>arcaneNovaWave(3));
  }
  else p.skillActive=c.duration;
}

/* ---------- boss combat ---------- */
function bulletCount(base,mult=1){const t=currentBossTuning();return Math.max(2,Math.round(base+t.bulletBonus*mult))}
function addBossBullet(angle,speed,r=7,kind="normal",x=game.boss.x,y=game.boss.y+40){
  const scale=ASSISTS[game.assist].enemyBulletScale||1;
  game.bossBullets.push({x,y,r:r*scale,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:8,kind,rot:Math.random()*TAU,trail:[]});
}
function spreadAt(base,n,arc,speed,kind="normal"){arc*=BOSS_SPREAD_SCALE;const start=base-arc/2;for(let i=0;i<n;i++)addBossBullet(start+(n===1?0:arc*i/(n-1)),speed,kind==="flame"?9:7,kind)}
function spread(n,arc,speed,kind="normal"){const b=game.boss,p=game.player;spreadAt(Math.atan2(p.y-b.y,p.x-b.x),n,arc,speed,kind)}
function radial(n,speed,kind="normal",offset=game.elapsed*.8){for(let i=0;i<n;i++)addBossBullet(offset+i*TAU/n,speed,kind==="rock"?9:7,kind)}
function aimedAt(a,n,speed,step=.11,kind="normal"){step*=BOSS_AIM_STEP_SCALE;for(let i=0;i<n;i++)addBossBullet(a+(i-(n-1)/2)*step,speed,7,kind)}
function aimed(n,speed,step=.11,kind="normal"){const b=game.boss,p=game.player;aimedAt(Math.atan2(p.y-b.y,p.x-b.x),n,speed,step,kind)}
function spiral(n,speed,offset=game.elapsed*1.7){for(let i=0;i<n;i++)addBossBullet(offset+i*.34,speed,7,"curse")}
function bossSource(type,a){
  const b=game.boss;
  if(type==="wyrm")return{x:b.x+Math.cos(a)*54,y:b.y+42+Math.sin(a)*16};
  if(type==="eye")return{x:b.x+Math.cos(a)*16,y:b.y+20+Math.sin(a)*8};
  if(type==="golem")return{x:b.x+Math.cos(a)*18,y:b.y+74};
  return{x:b.x,y:b.y+40};
}
function spawnWyrmBreath(a,length=300,width=58,active=.32){
  const s=bossSource("wyrm",a);
  game.hazards.push({type:"breath",x:s.x,y:s.y,angle:a,telegraph:0,active,length,width,hit:false});
}
function spawnEyeSnapRay(a,width=11,active=.18){
  const s=bossSource("eye",a);
  game.hazards.push({type:"laser",x:s.x,y:s.y,angle:a,telegraph:0,active,width,hit:false});
}
function spawnGolemRockRain(cx,count=3,spacing=64,speed=250){
  const start=cx-spacing*(count-1)/2;
  for(let i=0;i<count;i++){
    const x=clamp(start+i*spacing,74,W-74);
    addBossBullet(Math.PI/2,speed,10,"rock",x,230);
  }
}
function spawnBossSpread(type,a,n,arc,speed,kind,r=7){
  arc*=BOSS_SPREAD_SCALE;
  const s=bossSource(type,a),start=a-arc/2;
  for(let i=0;i<n;i++)addBossBullet(start+(n===1?0:arc*i/(n-1)),speed,r,kind,s.x,s.y);
}
function makeRegularBossAction(){
  const b=game.boss,p=game.player,ph=b.phase,type=game.bossType,aim=Math.atan2(p.y-b.y,p.x-b.x);
  if(type==="wyrm"){
    if(ph===1)return{pattern:"emberBurst",aim};
    if(ph===2)return Math.random()<.5?{pattern:"sweepBreath",aim}:{pattern:"emberBurst",aim};
    return{pattern:"breathBurst",aim};
  }
  if(type==="golem"){
    if(ph===1)return{pattern:"rockRain",aim,targetX:p.x};
    if(ph===2)return Math.random()<.52?{pattern:"stomp",aim}:{pattern:"rockRain",aim,targetX:p.x};
    return{pattern:"rainStomp",aim,targetX:p.x};
  }
  if(ph===1)return{pattern:"gazeVolley",aim};
  if(ph===2)return Math.random()<.5?{pattern:"crossVolley",aim}:{pattern:"spiralVolley",aim};
  return Math.random()<.5?{pattern:"curseStorm",aim}:{pattern:"crossSpiral",aim};
}
function addDifficultyPressure(type,a,t){
  const waves=t.overlapWaves||0;if(waves<=0)return;
  for(let w=0;w<waves;w++)schedule(.26+w*.18,()=>{
    if(!game||game.state!=="playing")return;
    if(type==="wyrm")spawnBossSpread("wyrm",Math.atan2(game.player.y-game.boss.y,game.player.x-game.boss.x),bulletCount(3+w*2,.75),.34+w*.18,t.bulletSpeed*(.78+w*.04),"flame",8);
    else if(type==="golem")radial(bulletCount(7+w*3,.72),t.bulletSpeed*(.67+w*.05),"rock",a+.22+w*.19);
    else{const s=bossSource("eye",a),aim=Math.atan2(game.player.y-s.y,game.player.x-s.x),n=bulletCount(4+w*2,.72);for(let i=0;i<n;i++)addBossBullet(aim+(i-(n-1)/2)*(.10+w*.015),t.bulletSpeed*(.76+w*.05),7,"curse",s.x,s.y)}
  });
}
function bossRegularAttack(action={}){
  const t=currentBossTuning(),b=game.boss,type=game.bossType,a=Number.isFinite(action.aim)?action.aim:Math.atan2(game.player.y-b.y,game.player.x-b.x),pattern=action.pattern;
  if(type==="wyrm"){
    if(pattern==="sweepBreath"){
      spawnWyrmBreath(a,320,62,.34);
      schedule(.10,()=>spawnBossSpread("wyrm",a,bulletCount(5),.42,t.bulletSpeed*.92,"flame",9));
    }else if(pattern==="breathBurst"){
      spawnWyrmBreath(a,350,72,.38);
      schedule(.10,()=>spawnBossSpread("wyrm",a,bulletCount(7),.62,t.bulletSpeed*.98,"flame",9));
      schedule(.22,()=>spawnBossSpread("wyrm",a,bulletCount(6),1.08,t.bulletSpeed*.88,"flame",9));
    }else{
      spawnBossSpread("wyrm",a,bulletCount(6),.48,t.bulletSpeed*.96,"flame",9);
      schedule(.10,()=>spawnBossSpread("wyrm",a,bulletCount(5),.92,t.bulletSpeed*.88,"flame",9));
    }
  }else if(type==="golem"){
    const tx=Number.isFinite(action.targetX)?action.targetX:game.player.x;
    if(pattern==="stomp"){
      radial(bulletCount(14,1.65),t.bulletSpeed*.78,"rock",a+.1);
      schedule(.16,()=>radial(bulletCount(10,1.25),t.bulletSpeed*.84,"rock",a+.28));
      game.ripples.push({x:b.x,y:b.y+108,r:34,life:.58,max:.58,color:"#8bcfff"});
    }else if(pattern==="rainStomp"){
      spawnGolemRockRain(tx,Math.min(8,bulletCount(8)),52,t.bulletSpeed*.82);
      schedule(.18,()=>{radial(bulletCount(16,1.75),t.bulletSpeed*.82,"rock",a);game.ripples.push({x:b.x,y:b.y+108,r:42,life:.62,max:.62,color:"#8bcfff"})});
      schedule(.34,()=>spawnGolemRockRain(clamp(tx+(Math.random()<.5?-70:70),74,W-74),Math.min(5,bulletCount(5)),56,t.bulletSpeed*.86));
    }else{
      spawnGolemRockRain(tx,Math.min(7,bulletCount(7)),56,t.bulletSpeed*.78);
      schedule(.14,()=>spawnGolemRockRain(clamp(tx+(Math.random()<.5?-56:56),74,W-74),Math.min(4,bulletCount(4)),58,t.bulletSpeed*.82));
      game.ripples.push({x:b.x,y:b.y+104,r:24,life:.42,max:.42,color:"#8bcfff"});
    }
  }else{
    // Regular Cursed Eye attacks are curse volleys, not DEATH RAY.
    // This keeps the large laser visually unique: if special warnings are enabled,
    // every true laser is the special attack and always has the warning telegraph.
    const s=bossSource("eye",a);
    const eyeVolley=(count,arc,speedMul=.98,r=7)=>{
      const n=bulletCount(count,1.15),start=a-arc/2;
      for(let i=0;i<n;i++)addBossBullet(start+(n===1?0:arc*i/(n-1)),t.bulletSpeed*speedMul,r,"curse",s.x,s.y);
    };
    if(pattern==="crossVolley"){
      eyeVolley(9,.72,1.02,7);
      schedule(.11,()=>eyeVolley(7,1.18,.92,7));
    }else if(pattern==="spiralVolley"){
      eyeVolley(7,.46,1.05,7);
      schedule(.08,()=>spiral(bulletCount(14,1.55),t.bulletSpeed*.90,a-.34));
    }else if(pattern==="curseStorm"){
      eyeVolley(11,.92,1.06,7);
      schedule(.10,()=>spiral(bulletCount(18,1.65),t.bulletSpeed*.92,a-.28));
      schedule(.22,()=>eyeVolley(8,1.42,.88,7));
    }else if(pattern==="crossSpiral"){
      eyeVolley(9,.58,1.08,7);
      schedule(.08,()=>spiral(bulletCount(16,1.6),t.bulletSpeed*.94,a-.38));
      schedule(.20,()=>eyeVolley(7,1.32,.92,7));
    }else{
      eyeVolley(7,.54,1.02,7);
      schedule(.12,()=>eyeVolley(5,.88,.92,7));
    }
  }
  addDifficultyPressure(type,a,t);
}
function bossSpecialAttack(action={}){
  const t=currentBossTuning(),b=game.boss,type=game.bossType,aLocked=Number.isFinite(action.aim)?action.aim:Math.atan2(game.player.y-b.y,game.player.x-b.x);
  if(b.phase>=2){b.specialsUsed[b.phase]=true;b.specialTimer=b.phase===3?5:6.4}
  if(type==="wyrm"){
    const a=aLocked;
    game.hazards.push({type:"breath",x:b.x,y:b.y+42,angle:a,telegraph:.06,active:.68,length:560,width:108,hit:false});
    for(let wave=0;wave<2;wave++)schedule(.20+wave*.18,()=>{for(let i=-bulletCount(3);i<=bulletCount(3);i++)addBossBullet(a+i*.13,t.bulletSpeed*(.86+wave*.09),9,"flame")});
    game.shake=.24;
  }else if(type==="golem"){
    for(let wave=0;wave<4;wave++)schedule(wave*.18,()=>{radial(bulletCount(18,2.15),t.bulletSpeed*(.72+wave*.08),"rock",wave*.14);game.ripples.push({x:b.x,y:b.y+112,r:45+wave*14,life:.7,max:.7,color:"#69ccff"})});
    schedule(.22,()=>spawnGolemRockRain(game.player.x,Math.min(6,bulletCount(6)),50,t.bulletSpeed*.90));
    game.shake=.34;
  }else{
    const a=aLocked;
    game.hazards.push({type:"laser",x:b.x,y:b.y+20,angle:a,telegraph:.06,active:.55,width:25,hit:false});
    for(let i=0;i<bulletCount(16,2);i++)addBossBullet(game.elapsed+i*TAU/bulletCount(16,2),t.bulletSpeed*.80,8,"curse");
  }
}

/* ---------- simulation ---------- */
function updateBullets(dt){
  for(const q of game.playerBullets){
    if(!game.settings.reducedMotion){q.trail.push({x:q.x,y:q.y});const max=q.homing?10:5;if(q.trail.length>max)q.trail.shift()}
    if(q.homing===true){
      q.homingAge=(q.homingAge||0)+dt;
      if(q.homingAge>.045){
        const speed=Math.hypot(q.vx,q.vy)||1,current=Math.atan2(q.vy,q.vx),target=Math.atan2(game.boss.y-q.y,game.boss.x-q.x),delta=angleDelta(current,target),maxTurn=(q.turnRate||3.35)*dt,turn=clamp(delta,-maxTurn,maxTurn),next=current+turn;
        q.vx=Math.cos(next)*speed;q.vy=Math.sin(next)*speed;
      }
    }
    q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;q.rot=(q.rot||0)+dt*2.4;
  }
  for(const q of game.bossBullets){
    if(!game.settings.reducedMotion){q.trail.push({x:q.x,y:q.y});if(q.trail.length>5)q.trail.shift()}
    q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;q.rot=(q.rot||0)+dt*2.4;
  }
  const alive=q=>q.life>0&&q.x>-90&&q.x<W+90&&q.y>-90&&q.y<H+90;
  game.playerBullets=game.playerBullets.filter(alive);game.bossBullets=game.bossBullets.filter(alive);
}
function updateHazards(dt){
  const p=game.player;
  for(const h of game.hazards){
    if(h.telegraph>0){h.telegraph-=dt;continue}h.active-=dt;if(h.active<=0||h.hit||p.invuln>0)continue;
    const hc=playerHitCenter();
    if(h.type==="laser"&&distanceToRay(hc.x,hc.y,h.x,h.y,h.angle)<h.width){h.hit=true;damagePlayer(1)}
    if(h.type==="breath"&&insideCone(hc.x,hc.y,h)){h.hit=true;damagePlayer(1)}
  }
  game.hazards=game.hazards.filter(h=>h.telegraph>0||h.active>0);
}
function distanceToRay(px,py,x,y,a){const dx=Math.cos(a),dy=Math.sin(a),vx=px-x,vy=py-y,t=Math.max(0,vx*dx+vy*dy);return Math.hypot(px-(x+dx*t),py-(y+dy*t))}
function insideCone(px,py,h){const vx=px-h.x,vy=py-h.y,d=Math.hypot(vx,vy);if(d>h.length)return false;let da=Math.atan2(vy,vx)-h.angle;while(da>Math.PI)da-=TAU;while(da<-Math.PI)da+=TAU;const half=Math.atan2(h.width,d+80);return Math.abs(da)<half}
function collisions(tune){
  const b=game.boss,p=game.player;
  for(const q of game.playerBullets){
    if(q.dead||dist2(q,b)>Math.pow(q.r+b.r*.72,2))continue;
    q.dead=true;let dmg=q.damage;game.shotsHit++;game.totalDamage+=dmg;b.hitFlash=.08;
    if(game.difficulty!=="endless"){
      let next=Math.max(0,b.hp-dmg);
      if(b.phase===1&&!b.specialsUsed[2])next=Math.max(next,b.maxHp*.6);
      if(b.phase===2&&!b.specialsUsed[2])next=Math.max(next,b.maxHp*.301);
      if(b.phase===3&&!b.specialsUsed[3])next=Math.max(next,1);
      b.hp=next;
    }
    burst(q.x,q.y,CHARACTERS[game.character].color,3);
  }
  game.playerBullets=game.playerBullets.filter(q=>!q.dead);
  if(game.difficulty!=="endless"&&b.hp<=0&&game.state==="playing"){endGame(true,`${BOSSES[game.bossType].ko} 토벌에 성공했습니다.`);return}
  if(p.invuln<=0){
    const hurtR=playerHitRadius(),hc=playerHitCenter();
    for(const q of game.bossBullets){
      if(!q.dead&&dist2(q,hc)<=Math.pow(q.r+hurtR,2)){q.dead=true;damagePlayer(tune.damage);break}
    }
  }
  game.bossBullets=game.bossBullets.filter(q=>!q.dead);
}
function damagePlayer(amount){
  const p=game.player;if(p.invuln>0)return;p.hp=Math.max(0,p.hp-amount);p.invuln=.68;p.hitFx=.18;game.hits++;game.flash=.12;if(!game.settings.reducedMotion)game.shake=.2;
  burst(p.x,p.y,"#ff526a",game.settings.reducedMotion?4:13);
  if(p.hp<=0){if(game.difficulty==="endless")endGame(false,"끝없는 사냥이 종료되었습니다.");else endGame(false,"헌터가 전투 불능 상태가 되었습니다.")}
}
function burst(x,y,color,n=12){for(let i=0;i<n;i++){const a=Math.random()*TAU,s=35+Math.random()*220;game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.3+Math.random()*.4,max:.7,r:1.2+Math.random()*3,color})}}
function trailBurst(x1,y1,x2,y2,color){for(let i=0;i<14;i++){const t=i/13;game.particles.push({x:x1+(x2-x1)*t,y:y1+(y2-y1)*t,vx:(Math.random()-.5)*25,vy:(Math.random()-.5)*25,life:.36,max:.36,r:3+Math.random()*4,color})}}
function updateParticles(dt){for(const p of game.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.975;p.vy*=.975;p.life-=dt}game.particles=game.particles.filter(p=>p.life>0)}
function updateRipples(dt){for(const r of game.ripples){r.life-=dt;r.r+=dt*190}game.ripples=game.ripples.filter(r=>r.life>0)}

/* ---------- rendering ---------- */
function render(){
  if(!game)return;
  let sx=0,sy=0;if(game.shake>0&&game.settings.screenShake&&!game.settings.reducedMotion){sx=(Math.random()-.5)*6;sy=(Math.random()-.5)*6;game.shake=Math.max(0,game.shake-.02)}
  ctx.save();ctx.clearRect(0,0,W,H);ctx.translate(sx,sy);
  drawArena();drawPlayfieldBoundary();drawRipples();drawBossRangeTelegraph();drawHazards();drawBoss();drawBullets();drawPlayer();drawPlayerAmmoBadge();drawSkillActivationFx();drawPlayerHitbox();drawParticles();if(game.settings.crosshair)drawCrosshair();drawVignette();
  if(game.flash>0&&game.settings.hitFlash){ctx.fillStyle=`rgba(255,55,88,${game.flash*1.15})`;ctx.fillRect(0,0,W,H)}
  ctx.restore();
}
function drawArena(){
  const key=`battle-bg-${game.bossType}`,bg=art[key]||art.battleBg;
  ctx.save();
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality="high";
  if(bg)ctx.drawImage(bg,0,0,W,H);else{ctx.fillStyle="#080a13";ctx.fillRect(0,0,W,H)}
  const top=ctx.createLinearGradient(0,0,0,H);
  if(game.bossType==="wyrm"){top.addColorStop(0,"rgba(42,8,7,.08)");top.addColorStop(.64,"rgba(0,0,0,0)");top.addColorStop(1,"rgba(22,4,3,.10)")}
  else if(game.bossType==="golem"){top.addColorStop(0,"rgba(3,18,34,.08)");top.addColorStop(.64,"rgba(0,0,0,0)");top.addColorStop(1,"rgba(3,12,22,.10)")}
  else{top.addColorStop(0,"rgba(28,5,40,.08)");top.addColorStop(.64,"rgba(0,0,0,0)");top.addColorStop(1,"rgba(20,3,30,.10)")}
  ctx.fillStyle=top;ctx.fillRect(0,0,W,H);
  ctx.restore();
}
function drawPlayfieldBoundary(){
  const f=PLAYFIELD;ctx.save();
  // This visible line is the legal OUTER edge of the player hitbox, not the player sprite anchor.
  ctx.fillStyle="rgba(3,5,10,.20)";ctx.fillRect(0,0,W,f.top);ctx.fillRect(0,f.bottom,W,H-f.bottom);ctx.fillRect(0,f.top,f.left,f.bottom-f.top);ctx.fillRect(f.right,f.top,W-f.right,f.bottom-f.top);
  const g=ctx.createLinearGradient(0,f.top,0,f.top+24);g.addColorStop(0,"rgba(211,225,255,.12)");g.addColorStop(1,"rgba(211,225,255,0)");ctx.fillStyle=g;ctx.fillRect(f.left,f.top,f.right-f.left,24);
  ctx.strokeStyle="rgba(210,222,244,.28)";ctx.lineWidth=1;ctx.setLineDash([12,14]);ctx.strokeRect(f.left+.5,f.top+.5,f.right-f.left-1,f.bottom-f.top-1);ctx.setLineDash([]);
  ctx.strokeStyle="rgba(255,242,213,.52)";ctx.lineWidth=2;const l=22;
  [[f.left,f.top,1,1],[f.right,f.top,-1,1],[f.left,f.bottom,1,-1],[f.right,f.bottom,-1,-1]].forEach(([x,y,sx,sy])=>{ctx.beginPath();ctx.moveTo(x,y+sy*l);ctx.lineTo(x,y);ctx.lineTo(x+sx*l,y);ctx.stroke()});
  ctx.restore();
}
function drawRipples(){
  ctx.save();
  for(const r of game.ripples){
    const a=Math.max(0,r.life/r.max),rx=r.r,ry=r.r*.35;
    ctx.globalAlpha=a*.12;ctx.fillStyle=r.color;ctx.beginPath();ctx.ellipse(r.x,r.y,rx*.92,ry*.92,0,0,TAU);ctx.fill();
    ctx.globalAlpha=a*.42;ctx.strokeStyle=r.color;ctx.lineWidth=2.2;ctx.beginPath();ctx.ellipse(r.x,r.y,rx,ry,0,0,TAU);ctx.stroke();
    ctx.globalAlpha=a*.18;ctx.strokeStyle="#fff4da";ctx.lineWidth=1.1;ctx.beginPath();ctx.ellipse(r.x,r.y,rx*.72,ry*.72,0,0,TAU);ctx.stroke();
  }
  ctx.restore();
}
function bossActionProgress(){const a=game.boss.action;if(!a)return 0;return clamp(1-a.timer/a.duration,0,1)}
function bossMotionState(){
  const b=game.boss;
  if(b.action){
    const progress=bossActionProgress();
    return{progress,special:b.action.type==="special",tele:easeInOut(progress),attack:0,recover:0,active:true,stage:"telegraph"};
  }
  if(b.castTimer>0&&b.castDuration>0){
    const progress=1-b.castTimer/b.castDuration;
    const attack=progress<.58?easeOut(progress/.58):1;
    const recover=progress>.58?easeInOut((progress-.58)/.42):0;
    return{progress,special:b.castType==="special",tele:0,attack,recover,active:true,stage:"cast"};
  }
  return{progress:0,special:false,tele:0,attack:0,recover:0,active:false,stage:"idle"};
}
const BOSS_RIG={
  wyrm:{
    order:["wingR","body","head","wingL"],
    pivot:{wingR:[855,355],wingRRoot:[855,355],body:[627,627],head:[545,555],wingL:[400,355],wingLRoot:[400,355],cover:[627,627]}
  },
  golem:{
    order:["armR","body","head","armL"],
    pivot:{armR:[875,430],armRRoot:[875,430],body:[627,627],head:[625,430],armL:[385,430],armLRoot:[385,430],cover:[627,627]}
  },
  eye:{
    order:["tentacleTop","core","iris","tentacleBottom"],
    pivot:{tentacleTop:[627,565],tentacleTopRoot:[627,565],core:[627,565],iris:[627,565],tentacleBottom:[627,590],tentacleBottomRoot:[627,590],cover:[627,565]}
  }
};
function bossPartImage(boss,state,part){return art[`${boss}-${state}-${part}`]}
function drawRigPart(c,boss,state,part,tr={}){
  const img=bossPartImage(boss,state,part);if(!img)return;
  const scale=(BOSSES[boss].drawW/img.width)*(tr.scale||1);
  const pv=BOSS_RIG[boss].pivot[part];
  c.save();
  c.translate((pv[0]-img.width/2)*(BOSSES[boss].drawW/img.width)+(tr.x||0),
              (pv[1]-img.height/2)*(BOSSES[boss].drawW/img.width)+(tr.y||0));
  c.rotate(tr.rot||0);
  c.globalAlpha=tr.alpha===undefined?1:tr.alpha;
  c.drawImage(img,-pv[0]*scale,-pv[1]*scale,img.width*scale,img.height*scale);
  c.restore();
}
function drawRigPose(c,boss,part,idleTr,attackTr,motionMix,sourceMix){
  const tr={
    x:lerp(idleTr.x||0,attackTr.x||0,motionMix),
    y:lerp(idleTr.y||0,attackTr.y||0,motionMix),
    rot:lerp(idleTr.rot||0,attackTr.rot||0,motionMix),
    scale:lerp(idleTr.scale||1,attackTr.scale||1,motionMix)
  };
  drawRigPart(c,boss,sourceMix>=.5?"attack":"idle",part,tr);
}
function bossPoseMix(m){
  if(!m.active)return{motion:0,source:0};
  if(m.stage==="telegraph")return{motion:m.tele*.62,source:0};
  const source=1-clamp((m.recover-.25)/.50,0,1);
  return{motion:1-.24*m.recover,source};
}
function renderWyrmRig(c,m){
  const bss=game.boss,t=game.elapsed,reduced=game.settings.reducedMotion?.45:1,{motion,source}=bossPoseMix(m);
  const mv=bss.moveBlend||0,dir=bss.moveDirVisual||1,step=bss.movePhase||0;
  const travelFlap=Math.sin(step*1.75)*.045*mv*reduced;
  const idleFlap=Math.sin(t*4.1)*.032*reduced;
  const flap=idleFlap+travelFlap;
  const travelLean=dir*.018*mv,neck=Math.sin(t*2.05)*.012*reduced-dir*.010*mv;
  const rearWingIdle={x:-dir*.8*mv,y:-1.4-Math.abs(Math.sin(step))*2.2*mv,rot:-.025-flap-travelLean*.4};
  const rearWingAtk={x:3.5,y:-6.5,rot:-.082-flap*.9};
  const bodyIdle={x:0,y:Math.sin(t*2)*1.1-Math.abs(Math.sin(step))*1.8*mv,rot:travelLean};
  const bodyAtk={x:4,y:6,rot:.008+travelLean*.35};
  const headIdle={x:dir*1.1*mv,y:-.6,rot:neck+travelLean*.2};
  const headAtk={x:8,y:3,rot:.052+travelLean*.18};
  const frontWingIdle={x:dir*.9*mv,y:-Math.abs(Math.sin(step+.8))*2.1*mv,rot:.028+flap+travelLean*.4};
  const frontWingAtk={x:-4.5,y:-6.5,rot:.082+flap*.9};
  const attackOnly=(part,idleTr,attackTr,mix)=>drawRigPart(c,"wyrm","attack",part,{
    x:lerp(idleTr.x||0,attackTr.x||0,mix),
    y:lerp(idleTr.y||0,attackTr.y||0,mix),
    rot:lerp(idleTr.rot||0,attackTr.rot||0,mix),
    scale:lerp(idleTr.scale||1,attackTr.scale||1,mix)
  });

  const idleImg=art["wyrm-idle-static"],showAttack=source>=.5;
  if(idleImg&&!showAttack){
    const scale=(BOSSES.wyrm.drawW*.92)/idleImg.width;
    c.save();
    c.translate(dir*.8*mv,Math.sin(t*2)*1.1-Math.abs(Math.sin(step))*1.8*mv);
    c.rotate(travelLean*.55);
    c.drawImage(idleImg,-idleImg.width*scale/2,-idleImg.height*scale/2,idleImg.width*scale,idleImg.height*scale);
    c.restore();
  }

  if(showAttack){
    attackOnly("wingR",rearWingIdle,rearWingAtk,motion);
    attackOnly("wingRRoot",
      {x:rearWingIdle.x*.20,y:rearWingIdle.y*.18,rot:rearWingIdle.rot*.15},
      {x:rearWingAtk.x*.20,y:rearWingAtk.y*.16,rot:rearWingAtk.rot*.15},motion);
    attackOnly("body",bodyIdle,bodyAtk,motion*.72);
    attackOnly("head",headIdle,headAtk,motion);
    attackOnly("wingL",frontWingIdle,frontWingAtk,motion);
    attackOnly("wingLRoot",
      {x:frontWingIdle.x*.20,y:frontWingIdle.y*.18,rot:frontWingIdle.rot*.15},
      {x:frontWingAtk.x*.20,y:frontWingAtk.y*.16,rot:frontWingAtk.rot*.15},motion);
    attackOnly("cover",bodyIdle,bodyAtk,motion*.72);
  }
}
function renderGolemRig(c,m){
  const bss=game.boss,t=game.elapsed,reduced=game.settings.reducedMotion?.45:1,{motion,source}=bossPoseMix(m);
  const mv=bss.moveBlend||0,dir=bss.moveDirVisual||1,step=bss.movePhase||0,tele=m.tele||0,atk=m.attack||0,rec=m.recover||0;
  const stride=Math.sin(step),foot=Math.abs(Math.sin(step));
  const sway=Math.sin(t*1.75)*.009*reduced+stride*.022*mv;
  const bodyLean=dir*.012*mv;
  const backArmIdle={x:-dir*.9*mv,y:-foot*1.5*mv,rot:.012+sway};
  const backArmAtk={x:6+tele*7,y:-10-tele*18+rec*8,rot:.10+tele*.28-atk*.08};
  const bodyIdle={x:0,y:-foot*2.8*mv+Math.sin(t*1.8)*.8,rot:bodyLean};
  const bodyAtk={x:0,y:6+tele*2-atk*5+rec*3,rot:.006+bodyLean*.28-atk*.015};
  const headIdle={x:dir*.8*mv,y:-foot*1.5*mv,rot:-bodyLean*.20};
  const headAtk={x:2,y:-3-tele*6+rec*2,rot:-.018-tele*.04+atk*.05};
  const frontArmIdle={x:dir*.9*mv,y:-foot*1.4*mv,rot:-.012-sway};
  const frontArmAtk={x:-8-tele*7,y:11+tele*18-rec*8,rot:-.14-tele*.28+atk*.08};

  drawRigPose(c,"golem","armR",backArmIdle,backArmAtk,motion,source);
  drawRigPose(c,"golem","armRRoot",
    {x:backArmIdle.x*.18,y:backArmIdle.y*.18,rot:backArmIdle.rot*.12},
    {x:backArmAtk.x*.18,y:backArmAtk.y*.16,rot:backArmAtk.rot*.12},motion,source);
  drawRigPose(c,"golem","body",bodyIdle,bodyAtk,motion*.72,source);
  drawRigPose(c,"golem","head",headIdle,headAtk,motion*.8,source);
  drawRigPose(c,"golem","armL",frontArmIdle,frontArmAtk,motion,source);
  drawRigPose(c,"golem","armLRoot",
    {x:frontArmIdle.x*.18,y:frontArmIdle.y*.18,rot:frontArmIdle.rot*.12},
    {x:frontArmAtk.x*.18,y:frontArmAtk.y*.16,rot:frontArmAtk.rot*.12},motion,source);
  drawRigPose(c,"golem","cover",bodyIdle,bodyAtk,motion*.72,source);
}
function renderEyeRig(c,m){
  const bss=game.boss,t=game.elapsed,reduced=game.settings.reducedMotion?.45:1,{motion,source}=bossPoseMix(m);
  const mv=bss.moveBlend||0,dir=bss.moveDirVisual||1,step=bss.movePhase||0,tele=m.tele||0,atk=m.attack||0,rec=m.recover||0;
  const drag=Math.sin(step-.75)*.03*mv*reduced,wave=Math.sin(t*2.35)*.016*reduced;
  const bodyLean=dir*.015*mv;
  const topTentIdle={x:-dir*1.8*mv,y:-1.2,rot:-wave-drag};
  const topTentAtk={x:0,y:-5-tele*5+rec*2,rot:-.045-tele*.10+atk*.03};
  const coreIdle={x:0,y:Math.sin(step*1.2)*1.1*mv,rot:bodyLean};
  const coreAtk={x:-2,y:1-tele*2+rec,rot:.026+bodyLean*.24+atk*.02};
  const bottomTentIdle={x:-dir*2.2*mv,y:.8,rot:wave+drag};
  const bottomTentAtk={x:0,y:5+tele*5-rec*2,rot:.045+tele*.10-atk*.03};
  const irisIdle={x:dir*2.2*mv,y:0,rot:bodyLean*.3,scale:1+Math.sin(t*3.4)*.008};
  const irisAtk={x:-8-tele*4,y:4,rot:.05,scale:1.06+tele*.10-atk*.03};

  drawRigPose(c,"eye","tentacleTop",topTentIdle,topTentAtk,motion,source);
  drawRigPose(c,"eye","tentacleTopRoot",
    {x:topTentIdle.x*.18,y:topTentIdle.y*.15,rot:topTentIdle.rot*.16},
    {x:topTentAtk.x*.18,y:topTentAtk.y*.16,rot:topTentAtk.rot*.16},motion,source);
  drawRigPose(c,"eye","core",coreIdle,coreAtk,motion*.72,source);
  drawRigPose(c,"eye","tentacleBottom",bottomTentIdle,bottomTentAtk,motion,source);
  drawRigPose(c,"eye","tentacleBottomRoot",
    {x:bottomTentIdle.x*.18,y:bottomTentIdle.y*.15,rot:bottomTentIdle.rot*.16},
    {x:bottomTentAtk.x*.18,y:bottomTentAtk.y*.16,rot:bottomTentAtk.rot*.16},motion,source);
  drawRigPose(c,"eye","cover",coreIdle,coreAtk,motion*.72,source);
  drawRigPose(c,"eye","iris",irisIdle,irisAtk,motion,source);
}
function renderBossToLayer(){
  bossCtx.clearRect(0,0,bossLayer.width,bossLayer.height);
  bossCtx.save();bossCtx.translate(bossLayer.width/2,bossLayer.height/2);
  const m=bossMotionState();
  if(game.bossType==="wyrm")renderWyrmRig(bossCtx,m);
  else if(game.bossType==="golem")renderGolemRig(bossCtx,m);
  else renderEyeRig(bossCtx,m);
  // Special glow is drawn once after the body is fully composed, never per part.
  if(m.special){
    const col=BOSSES[game.bossType].color;
    bossCtx.save();bossCtx.globalCompositeOperation="screen";bossCtx.globalAlpha=.10+.05*Math.sin(game.elapsed*9);
    const g=bossCtx.createRadialGradient(0,0,20,0,0,170);g.addColorStop(0,col);g.addColorStop(1,"rgba(0,0,0,0)");
    bossCtx.fillStyle=g;bossCtx.beginPath();bossCtx.arc(0,0,170,0,TAU);bossCtx.fill();bossCtx.restore();
  }
  bossCtx.restore();
}
function drawTelegraphChevron(x,y,angle,color,alpha,scale=1){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8*scale,-7*scale);ctx.lineTo(0,0);ctx.lineTo(-8*scale,7*scale);ctx.stroke();ctx.restore();
}
function drawSegmentedEllipse(x,y,rx,ry,color,alpha,segments=18,rotation=0){
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.globalAlpha=alpha;
  for(let i=0;i<segments;i++){const a0=i*TAU/segments+.03,a1=(i+.60)*TAU/segments;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,a0,a1);ctx.stroke()}
  ctx.restore();
}
function drawFanTelegraph(x,y,angle,length,halfWidth,color,progress,strong=false){
  const pulse=.65+.35*Math.sin(game.elapsed*(game.settings.reducedMotion?4:12));
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  const g=ctx.createLinearGradient(0,0,length,0);g.addColorStop(0,color+"30");g.addColorStop(.45,color+"16");g.addColorStop(1,color+"00");
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(length,-halfWidth);ctx.lineTo(length,halfWidth);ctx.closePath();ctx.fill();
  ctx.strokeStyle=color;ctx.globalAlpha=.28+.24*pulse;ctx.lineWidth=strong?3:2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(length,-halfWidth);ctx.moveTo(0,0);ctx.lineTo(length,halfWidth);ctx.stroke();
  ctx.globalAlpha=.18+.18*pulse;ctx.strokeStyle="#fff4e6";ctx.lineWidth=1.2;
  for(const f of [.34,.58,.82]){const px=length*f,py=halfWidth*f;ctx.beginPath();ctx.moveTo(px,-py);ctx.quadraticCurveTo(px+20,0,px,py);ctx.stroke()}
  if(!game.settings.reducedMotion){for(let i=0;i<3;i++){const f=((game.elapsed*.55+i/3)%1),px=length*(.18+.72*f);drawTelegraphChevron(px,0,0,"#fff2dc",.18+.22*pulse,strong?1.1:.8)}}
  ctx.restore();
}
function drawLaneTelegraph(x,y,angle,length,width,color,progress,strong=false){
  const pulse=.62+.38*Math.sin(game.elapsed*(game.settings.reducedMotion?4:14));
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  const g=ctx.createLinearGradient(0,0,length,0);g.addColorStop(0,color+"32");g.addColorStop(.55,color+"14");g.addColorStop(1,color+"02");ctx.fillStyle=g;ctx.fillRect(0,-width,length,width*2);
  ctx.strokeStyle=color;ctx.globalAlpha=.34+.22*pulse;ctx.lineWidth=strong?3:2;ctx.beginPath();ctx.moveTo(0,-width);ctx.lineTo(length,-width);ctx.moveTo(0,width);ctx.lineTo(length,width);ctx.stroke();
  ctx.setLineDash([16,11]);ctx.strokeStyle="#fff2fb";ctx.globalAlpha=.25+.16*pulse;ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(length,0);ctx.stroke();ctx.setLineDash([]);
  if(!game.settings.reducedMotion){for(let i=0;i<4;i++){const px=length*((game.elapsed*.48+i*.25)%1);ctx.globalAlpha=.12+.12*pulse;ctx.fillStyle="#ffffff";ctx.fillRect(px,-width,2,width*2)}}
  ctx.globalAlpha=.38+.22*pulse;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(length,0,width*.72,0,TAU);ctx.stroke();
  ctx.restore();
}
function drawRadialTelegraph(x,y,radius,color,progress,strong=false,spokes=12){
  const pulse=.62+.38*Math.sin(game.elapsed*(game.settings.reducedMotion?4:12));
  ctx.save();ctx.translate(x,y+86);ctx.scale(1,.35);
  const r=radius*(.82+.18*progress);const g=ctx.createRadialGradient(0,0,r*.15,0,0,r);g.addColorStop(0,color+"10");g.addColorStop(.72,color+"16");g.addColorStop(1,color+"02");ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
  drawSegmentedEllipse(0,0,r,r,color,.34+.22*pulse,strong?24:18,game.elapsed*.08);
  drawSegmentedEllipse(0,0,r*.66,r*.66,"#fff7e8",.11+.10*pulse,strong?18:12,-game.elapsed*.06);
  ctx.globalAlpha=.12+.12*pulse;ctx.strokeStyle=color;ctx.lineWidth=1.5;
  for(let i=0;i<spokes;i++){const a=i*TAU/spokes+game.elapsed*.02;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.28,Math.sin(a)*r*.28);ctx.lineTo(Math.cos(a)*r*.88,Math.sin(a)*r*.88);ctx.stroke()}
  ctx.restore();
}
function drawSpiralTelegraph(x,y,color,progress,strong=false){
  const pulse=.6+.4*Math.sin(game.elapsed*(game.settings.reducedMotion?4:13));
  ctx.save();ctx.translate(x,y+44);ctx.scale(1,.55);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.globalAlpha=.28+.20*pulse;
  for(let arm=0;arm<3;arm++){ctx.beginPath();for(let i=0;i<50;i++){const t=i/49,a=arm*TAU/3+t*TAU*1.35+game.elapsed*.22,r=18+t*(strong?150:118);const px=Math.cos(a)*r,py=Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke()}
  drawSegmentedEllipse(0,0,strong?158:126,strong?158:126,"#f6d6ff",.12+.10*pulse,16,-game.elapsed*.08);
  ctx.restore();
}
function drawEarthshatterTelegraph(x,y,progress){
  const pulse=.58+.42*Math.sin(game.elapsed*(game.settings.reducedMotion?4:12));
  const radii=[70,116,162];
  ctx.save();ctx.translate(x,y+104);ctx.scale(1,.34);
  for(let i=0;i<radii.length;i++){
    const r=radii[i]*(.86+.14*progress);
    const g=ctx.createRadialGradient(0,0,r*.18,0,0,r);
    g.addColorStop(0,"rgba(116,208,255,.04)");g.addColorStop(.76,"rgba(116,208,255,.10)");g.addColorStop(1,"rgba(116,208,255,0)");
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
    ctx.strokeStyle=i===0?"#d8f5ff":"#78d4ff";ctx.globalAlpha=.24+.16*pulse;ctx.lineWidth=i===0?2.5:1.8;
    ctx.setLineDash([18,10]);ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();ctx.setLineDash([]);
  }
  ctx.globalAlpha=.16+.12*pulse;ctx.strokeStyle="#b7ecff";ctx.lineWidth=1.5;
  for(let i=0;i<10;i++){const a=i*TAU/10;ctx.beginPath();ctx.moveTo(Math.cos(a)*38,Math.sin(a)*38);ctx.lineTo(Math.cos(a)*170,Math.sin(a)*170);ctx.stroke()}
  ctx.restore();
} 
function drawBossRangeTelegraph(){
  const b=game.boss,a=b.action;
  if(!a||b.enrageTimer>0||a.type!=="special"||!game.settings.specialTelegraph)return;
  const progress=clamp(1-a.timer/a.duration,0,1),aim=Number.isFinite(a.aim)?a.aim:Math.atan2(game.player.y-b.y,game.player.x-b.x);
  ctx.save();ctx.globalCompositeOperation="screen";
  if(game.bossType==="wyrm"){
    drawFanTelegraph(b.x,b.y+42,aim,565,112,"#ff805a",progress,true);
    drawFanTelegraph(b.x,b.y+42,aim,430,76,"#ffd3a8",progress,false);
  }else if(game.bossType==="golem"){
    drawEarthshatterTelegraph(b.x,b.y,progress);
  }else{
    drawLaneTelegraph(b.x,b.y+20,aim,760,28,"#e16af1",progress,true);
    ctx.save();ctx.translate(b.x,b.y+20);ctx.rotate(aim);ctx.globalAlpha=.22+.18*Math.sin(game.elapsed*12);ctx.strokeStyle="#f6d2ff";ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,34,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(0,0,18,0,TAU);ctx.stroke();ctx.restore();
  }
  ctx.restore();
}
function drawBossActionFx(m){
  if(!m.active)return;
  const b=game.boss,pulse=.55+.45*Math.sin(game.elapsed*(game.settings.reducedMotion?4:10));
  ctx.save();ctx.globalCompositeOperation="screen";
  if(game.bossType==="wyrm"){
    const charge=.16+.22*m.tele+.12*m.recover,blast=.18+.40*m.attack;
    if(charge>0){
      const g=ctx.createRadialGradient(b.x+58,b.y+6,4,b.x+58,b.y+6,42);
      g.addColorStop(0,`rgba(255,244,210,${.35+charge*.45})`);g.addColorStop(.55,`rgba(255,150,74,${.16+charge*.24})`);g.addColorStop(1,"rgba(255,110,55,0)");
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x+58,b.y+6,42,0,TAU);ctx.fill();
    }
    if(blast>0){
      const a=Math.atan2(game.player.y-b.y,game.player.x-b.x);
      ctx.save();ctx.translate(b.x+50,b.y+10);ctx.rotate(a);ctx.globalAlpha=.20+.28*blast+.08*pulse;
      const g=ctx.createLinearGradient(0,0,150,0);g.addColorStop(0,"rgba(255,245,228,.78)");g.addColorStop(.35,"rgba(255,149,74,.48)");g.addColorStop(1,"rgba(255,96,56,0)");
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(126,-20);ctx.lineTo(150,0);ctx.lineTo(126,20);ctx.closePath();ctx.fill();
      ctx.restore();
    }
  }else if(game.bossType==="golem"){
    const charge=.10+.26*m.tele,slam=.12+.32*m.attack;
    if(charge>0||slam>0){
      const g=ctx.createRadialGradient(b.x,b.y+28,8,b.x,b.y+28,68);
      g.addColorStop(0,`rgba(220,247,255,${.24+charge*.34+slam*.22})`);g.addColorStop(.55,`rgba(109,212,255,${.14+charge*.18+slam*.20})`);g.addColorStop(1,"rgba(95,196,255,0)");
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,b.y+28,68,0,TAU);ctx.fill();
      ctx.globalAlpha=.18+.18*pulse+.16*slam;ctx.strokeStyle="#bfefff";ctx.lineWidth=2;
      for(let i=0;i<6;i++){const ang=-Math.PI*.75+i*Math.PI/5;ctx.beginPath();ctx.moveTo(b.x+Math.cos(ang)*18,b.y+95+Math.sin(ang)*8);ctx.lineTo(b.x+Math.cos(ang)*54,b.y+95+Math.sin(ang)*18);ctx.stroke()}
    }
  }else{
    const charge=.16+.22*m.tele,beam=.18+.32*m.attack;
    if(charge>0||beam>0){
      ctx.save();ctx.translate(b.x,b.y+16);ctx.globalAlpha=.18+.18*pulse+.18*charge;ctx.strokeStyle="#f0c8ff";ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(0,0,22+charge*10,0,TAU);ctx.stroke();ctx.beginPath();ctx.arc(0,0,36+charge*14,0,TAU);ctx.stroke();
      ctx.restore();
      if(beam>0){
        const a=Math.atan2(game.player.y-b.y,game.player.x-b.x);
        ctx.save();ctx.translate(b.x,b.y+16);ctx.rotate(a);ctx.globalAlpha=.16+.24*beam;
        const g=ctx.createLinearGradient(0,0,120,0);g.addColorStop(0,"rgba(255,240,255,.65)");g.addColorStop(.5,"rgba(223,130,255,.40)");g.addColorStop(1,"rgba(223,130,255,0)");
        ctx.fillStyle=g;ctx.fillRect(0,-8,120,16);ctx.restore();
      }
    }
  }
  ctx.restore();
}
function drawBoss(){
  const b=game.boss,boss=BOSSES[game.bossType],m=bossMotionState();renderBossToLayer();
  let shiftX=0,shiftY=0,rotation=0;
  if(m.tele>0){const away=Math.atan2(b.y-game.player.y,b.x-game.player.x);shiftX+=Math.cos(away)*7*m.tele;shiftY+=Math.sin(away)*5*m.tele}
  if(m.attack>0){const toward=Math.atan2(game.player.y-b.y,game.player.x-b.x);shiftX+=Math.cos(toward)*13*m.attack;shiftY+=Math.sin(toward)*9*m.attack;rotation+=(game.bossType==="golem"?.018:.026)*Math.sin(m.attack*Math.PI)}
  const mv=b.moveBlend||0,dir=b.moveDirVisual||1,step=b.movePhase||0;
  const moveBob=game.bossType==="golem"?-Math.abs(Math.sin(step))*2.2*mv:game.bossType==="eye"?Math.sin(step*1.1)*1.8*mv:-Math.abs(Math.sin(step*1.6))*1.5*mv;
  rotation+=dir*mv*(game.bossType==="golem"?.012:game.bossType==="eye"?.018:.014);
  const bob=m.active?0:Math.sin(game.elapsed*2.1)*2.0+moveBob;
  const dx=b.x-bossLayer.width/2+shiftX,dy=b.y-bossLayer.height/2+bob+shiftY;
  drawBossActionFx(m);
  ctx.save();ctx.translate(dx+bossLayer.width/2,dy+bossLayer.height/2);ctx.rotate(rotation);ctx.translate(-bossLayer.width/2,-bossLayer.height/2);
  // One silhouette glow for the fully composited boss.
  if(b.enrageTimer>0){ctx.shadowBlur=28;ctx.shadowColor=boss.color}
  ctx.drawImage(bossLayer,0,0);
  ctx.shadowBlur=0;
  // Hit flash is applied to the final composite only. No per-part white outlines.
  if(b.hitFlash>0){
    ctx.save();ctx.globalAlpha=clamp(b.hitFlash/.08,0,1)*.55;ctx.filter="brightness(2.5) saturate(0)";
    ctx.drawImage(bossLayer,0,0);ctx.restore();
  }
  ctx.restore();
}
function aimDirectionIndex(a){
  let n=Math.round(a/(Math.PI/4))%8;if(n<0)n+=8;return n;
}
function drawHunterV39(){
  const p=game.player,c=CHARACTERS[game.character],prof=PLAYER_MOTION[game.character],img=art[`sprite-${game.character}-v39`];if(!img)return;
  const dir=aimDirectionIndex(p.aimAngle),size=prof.size||108;
  const phase=(p.moveClock*(prof.cycleSpeed||.58))%6;
  const frame=p.moving?1+Math.floor(phase)%6:0;
  const bob=p.moving?-Math.abs(Math.sin(phase/6*TAU))*3.0:Math.sin(game.elapsed*2.05)*.68;
  const hitA=Math.atan2(p.y-game.boss.y,p.x-game.boss.x),hitKick=p.hitFx>0?easeOut(p.hitFx/.18)*6.5:0;
  const recoil=p.recoil*(prof.recoil||5.5);
  const x=p.x+Math.cos(hitA)*hitKick-Math.cos(p.aimAngle)*recoil*.34;
  const y=p.y-size+(prof.yOffset||16)+bob+Math.sin(hitA)*hitKick-Math.sin(p.aimAngle)*recoil*.09;
  const nearest=dir*(Math.PI/4),residual=angleDelta(nearest,p.aimAngle);
  const lean=clamp(residual*.18,-.07,.07)+(p.moving?Math.sin(phase/6*TAU)*.016:0)-Math.cos(p.aimAngle)*p.recoil*.017;

  ctx.save();
  if(p.invuln>0&&Math.floor(game.elapsed*18)%2===0)ctx.globalAlpha=.42;
  ctx.fillStyle="rgba(0,0,0,.40)";ctx.beginPath();ctx.ellipse(p.x,p.y+7,24,6.1,0,0,TAU);ctx.fill();
  ctx.translate(x,y+size/2);ctx.rotate(lean);
  ctx.drawImage(img,dir*256,frame*256,256,256,-size/2,-size/2,size,size);
  ctx.restore();

  // Every hunter now uses Berserker-style runtime combat feedback instead of swapping to unrelated baked poses.
  if(p.recoil>.54&&!game.settings.reducedMotion){
    const tip=weaponTip(p.x,p.y,p.aimAngle,c.weapon),a=p.aimAngle;
    ctx.save();ctx.translate(tip.x,tip.y);ctx.rotate(a);ctx.globalCompositeOperation="screen";
    const g=ctx.createLinearGradient(0,0,30,0);g.addColorStop(0,"#fff7cf");g.addColorStop(.42,c.color);g.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(30,0);ctx.lineTo(0,4);ctx.closePath();ctx.fill();ctx.restore();
  }
  if(p.hitFx>0&&!game.settings.reducedMotion){
    const k=clamp(p.hitFx/.18,0,1);ctx.save();ctx.globalCompositeOperation="screen";ctx.globalAlpha=.28*k;ctx.strokeStyle="#fff0dc";ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(p.x,p.y-31,21+(1-k)*9,0,TAU);ctx.stroke();ctx.restore();
  }
  if(p.moving&&!game.settings.reducedMotion){ctx.save();ctx.globalAlpha=.07;ctx.strokeStyle=c.color;ctx.lineWidth=2;const foot=(Math.floor(phase)%2?1:-1)*6;ctx.beginPath();ctx.ellipse(p.x+foot,p.y+9,11,3.2,0,0,TAU);ctx.stroke();ctx.restore()}
  if(p.skillActive>0&&!game.settings.reducedMotion){
    ctx.save();ctx.globalCompositeOperation="screen";ctx.strokeStyle=c.color;ctx.fillStyle=c.color;ctx.globalAlpha=.11+.05*Math.sin(game.elapsed*15);ctx.lineWidth=2;
    if(game.character==="phantom"){
      ctx.beginPath();ctx.ellipse(p.x,p.y-30,38+Math.sin(game.elapsed*9)*4,16,0,0,TAU);ctx.stroke();
      ctx.beginPath();ctx.moveTo(p.x-48,p.y-24);ctx.lineTo(p.x+25,p.y-44);ctx.stroke();
    }else if(game.character==="arcanist"){
      ctx.beginPath();ctx.arc(p.x,p.y-36,44+Math.sin(game.elapsed*8)*3,0,TAU);ctx.stroke();
      for(let i=0;i<6;i++){const a=i*TAU/6+game.elapsed*.7;ctx.beginPath();ctx.arc(p.x+Math.cos(a)*34,p.y-36+Math.sin(a)*18,3,0,TAU);ctx.fill()}
    }else{
      ctx.beginPath();ctx.arc(p.x,p.y-35,37+Math.sin(game.elapsed*8)*3,0,TAU);ctx.stroke();
    }
    ctx.restore();
  }

  const cd=effectiveCooldown(game.character,game.assist),pct=p.skillCd<=0?1:1-p.skillCd/cd;
  ctx.save();ctx.fillStyle="#060811dc";ctx.fillRect(p.x-30,p.y+13,60,7);ctx.fillStyle=c.color;ctx.shadowBlur=8;ctx.shadowColor=c.color;ctx.fillRect(p.x-29,p.y+14,58*pct,5);ctx.shadowBlur=0;
  if(p.skillCd<=0){ctx.strokeStyle="#fff0bd";ctx.strokeRect(p.x-30,p.y+13,60,7)}
  if(p.skillReadyPulse>0){const t=p.skillReadyPulse/.62;ctx.globalAlpha=.45*t;ctx.strokeStyle=c.color;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y-35,38+(1-t)*20,19+(1-t)*8,0,0,TAU);ctx.stroke()}
  ctx.restore();
}
function drawPlayer(){drawHunterV39()}
function drawPlayerAmmoBadge(){
  if(!game)return;const p=game.player,c=CHARACTERS[game.character];
  const rightSide=p.x<W-145,x=rightSide?p.x+38:p.x-116,y=p.y-70,w=78,h=27;
  const reloadPct=p.reloading?clamp(1-p.reloadTimer/Math.max(.001,p.reloadDuration),0,1):p.ammo/c.magazine;
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle="rgba(5,8,15,.88)";ctx.strokeStyle=p.reloading?"rgba(115,194,255,.78)":"rgba(235,219,187,.48)";ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(0,0,w,h,6);ctx.fill();ctx.stroke();
  ctx.fillStyle=p.reloading?"#9ad8ff":"#f4e5c6";ctx.font="800 9px Segoe UI, sans-serif";ctx.textAlign="left";ctx.fillText(p.reloading?"RELOAD":"AMMO",7,11);
  ctx.textAlign="right";ctx.font="900 10px Consolas, monospace";ctx.fillText(p.reloading?`${(Math.ceil(p.reloadTimer*10)/10).toFixed(1)}s`:`${p.ammo}/${c.magazine}`,w-7,11);
  ctx.fillStyle="rgba(255,255,255,.10)";ctx.fillRect(7,17,w-14,4);ctx.fillStyle=p.reloading?"#79c9ff":c.color;ctx.fillRect(7,17,(w-14)*reloadPct,4);ctx.restore();
}
function drawSkillActivationFx(){
  if(!game||game.skillNoticeTimer<=0)return;
  const p=game.player,c=CHARACTERS[game.character],life=clamp(game.skillNoticeTimer/game.skillNoticeDuration,0,1),grow=1-life,pulse=.7+.3*Math.sin(game.elapsed*18);
  ctx.save();ctx.globalCompositeOperation="screen";
  ctx.globalAlpha=.18*life;const aura=ctx.createRadialGradient(p.x,p.y-30,8,p.x,p.y-30,96+grow*32);aura.addColorStop(0,c.color);aura.addColorStop(.45,c.color+"55");aura.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=aura;ctx.beginPath();ctx.arc(p.x,p.y-30,96+grow*32,0,TAU);ctx.fill();
  ctx.globalAlpha=(.72*life);ctx.strokeStyle=c.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y-30,38+grow*58,0,TAU);ctx.stroke();
  ctx.globalAlpha=.42*life*pulse;ctx.strokeStyle="#fff2d2";ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(p.x,p.y-30,30+grow*42,0,TAU);ctx.stroke();
  ctx.globalCompositeOperation="source-over";ctx.globalAlpha=Math.min(1,life*1.7);ctx.textAlign="center";ctx.font="900 17px Segoe UI, sans-serif";ctx.shadowBlur=12;ctx.shadowColor=c.color;ctx.fillStyle="#fff7ea";ctx.fillText(game.skillNoticeName,p.x,p.y-104-grow*8);ctx.shadowBlur=0;ctx.font="800 9px Segoe UI, sans-serif";ctx.fillStyle=c.color;ctx.fillText("SKILL ACTIVATED",p.x,p.y-88-grow*8);ctx.restore();
}
function drawBullets(){
  const pc=CHARACTERS[game.character].color;
  for(const q of game.playerBullets){
    ctx.save();
    const heavy=q.skillKind==="bloodRush",nova=q.skillKind==="arcaneNova";
    const bulletColor=heavy?"#ffb347":nova?"#c7a5ff":q.homing?"#6fdcff":pc;
    for(let i=0;i<q.trail.length;i++){
      const t=(i+1)/q.trail.length;ctx.globalAlpha=t*(heavy?.25:q.homing?.20:.15);ctx.fillStyle=bulletColor;
      ctx.beginPath();ctx.arc(q.trail[i].x,q.trail[i].y,q.r*t,0,TAU);ctx.fill();
    }
    ctx.globalAlpha=1;ctx.translate(q.x,q.y);ctx.rotate(Math.atan2(q.vy,q.vx));
    const g=ctx.createLinearGradient(-30,0,18,0);
    g.addColorStop(0,"rgba(255,255,255,0)");g.addColorStop(.42,bulletColor);g.addColorStop(1,"#fff9da");
    ctx.fillStyle=g;ctx.shadowBlur=heavy?28:nova?22:q.homing?19:14;ctx.shadowColor=bulletColor;
    ctx.beginPath();ctx.ellipse(0,0,q.r*(heavy?3.0:q.homing?2.7:2.45),q.r*(heavy?.88:.74),0,0,TAU);ctx.fill();
    if(heavy){ctx.globalAlpha=.78;ctx.strokeStyle="#ffe7ae";ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(0,0,q.r*2.25,q.r*.64,0,0,TAU);ctx.stroke()}
    if(q.homing){ctx.strokeStyle="rgba(210,248,255,.75)";ctx.lineWidth=1;ctx.beginPath();ctx.arc(-3,0,q.r*1.1,-.8,.8);ctx.stroke()}
    ctx.restore();
  }
  for(const q of game.bossBullets){ctx.save();for(let i=0;i<q.trail.length;i++){const t=(i+1)/q.trail.length;ctx.globalAlpha=t*.09;ctx.fillStyle=q.kind==="flame"?"#ff6038":q.kind==="rock"?"#b99a72":"#ca65db";ctx.beginPath();ctx.arc(q.trail[i].x,q.trail[i].y,q.r*t,0,TAU);ctx.fill()}ctx.globalAlpha=1;ctx.translate(q.x,q.y);ctx.rotate(q.rot);if(q.kind==="rock"){ctx.fillStyle="#54463d";ctx.strokeStyle="#d3aa72";ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<7;i++){const a=i*TAU/7,r=q.r*(i%2?1:.72),x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.fill();ctx.stroke()}else{const col=q.kind==="flame"?"#ff6038":"#d267db",g=ctx.createRadialGradient(-2,-2,1,0,0,q.r*1.65);g.addColorStop(0,"#fff7cf");g.addColorStop(.3,col);g.addColorStop(1,"rgba(45,8,42,0)");ctx.fillStyle=g;ctx.shadowBlur=15;ctx.shadowColor=col;ctx.beginPath();ctx.arc(0,0,q.r*1.55,0,TAU);ctx.fill();if(q.kind==="curse"){ctx.strokeStyle="#f7bdf5";ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,0,q.r*.85,.2,5);ctx.stroke()}}ctx.restore()}
}
function drawHazards(){
  for(const h of game.hazards){
    ctx.save();ctx.translate(h.x,h.y);ctx.rotate(h.angle);
    if(h.type==="laser"){
      if(h.telegraph>0){
        const pulse=.55+.45*Math.sin(game.elapsed*14),len=1450,w=h.width*1.1;
        const g=ctx.createLinearGradient(0,0,len,0);
        g.addColorStop(0,"rgba(255,116,217,.20)");g.addColorStop(.55,"rgba(255,84,203,.08)");g.addColorStop(1,"rgba(255,84,203,0)");
        ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,-w);ctx.lineTo(len,-w*.72);ctx.lineTo(len,w*.72);ctx.lineTo(0,w);ctx.closePath();ctx.fill();
        ctx.strokeStyle=`rgba(255,155,235,${.34+.18*pulse})`;ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(0,-w);ctx.lineTo(len,-w*.72);ctx.moveTo(0,w);ctx.lineTo(len,w*.72);ctx.stroke();
        ctx.setLineDash([18,12]);ctx.strokeStyle=`rgba(255,222,246,${.35+.18*pulse})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(len,0);ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle=`rgba(255,112,212,${.18+.10*pulse})`;ctx.beginPath();ctx.arc(0,0,w*1.35,0,TAU);ctx.fill();
        ctx.fillStyle=`rgba(255,211,243,${.70+.15*pulse})`;ctx.beginPath();ctx.arc(0,0,w*.34,0,TAU);ctx.fill();
        ctx.strokeStyle=`rgba(255,173,231,${.42+.20*pulse})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(len-28,-w*.58);ctx.lineTo(len,0);ctx.lineTo(len-28,w*.58);ctx.stroke();
      }else{
        ctx.shadowBlur=18;ctx.shadowColor="#ff4bc3";ctx.strokeStyle="rgba(255,62,192,.24)";ctx.lineWidth=h.width*1.55;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(1450,0);ctx.stroke();ctx.strokeStyle="rgba(255,239,250,.54)";ctx.lineWidth=4;ctx.stroke();ctx.shadowBlur=0;
      }
    }else if(h.type==="breath"){
      if(h.telegraph>0){
        const pulse=.5+.5*Math.sin(game.elapsed*12),len=h.length,w=h.width;
        const g=ctx.createLinearGradient(0,0,len,0);
        g.addColorStop(0,"rgba(255,171,96,.16)");g.addColorStop(.55,"rgba(255,121,56,.08)");g.addColorStop(1,"rgba(255,121,56,0)");
        ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(len,-w);ctx.lineTo(len,w);ctx.closePath();ctx.fill();
        ctx.strokeStyle=`rgba(255,198,131,${.35+.18*pulse})`;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(len,-w);ctx.moveTo(0,0);ctx.lineTo(len,w);ctx.stroke();
        ctx.setLineDash([14,10]);ctx.strokeStyle=`rgba(255,231,179,${.30+.16*pulse})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(len*.14,-w*.72);ctx.lineTo(len*.96,-w*.96);ctx.moveTo(len*.14,w*.72);ctx.lineTo(len*.96,w*.96);ctx.stroke();ctx.setLineDash([]);
        ctx.globalAlpha=.16+.08*pulse;ctx.fillStyle="#ffb46a";ctx.beginPath();ctx.arc(0,0,18,0,TAU);ctx.fill();ctx.globalAlpha=1;
      }else{
        const g=ctx.createLinearGradient(0,0,h.length,0);g.addColorStop(0,"rgba(255,238,164,.30)");g.addColorStop(.18,"rgba(255,130,55,.24)");g.addColorStop(.72,"rgba(225,48,32,.12)");g.addColorStop(1,"rgba(110,15,22,0)");ctx.fillStyle=g;ctx.shadowBlur=16;ctx.shadowColor="#ff5b38";ctx.beginPath();ctx.moveTo(0,-8);ctx.bezierCurveTo(h.length*.25,-h.width*.7,h.length*.65,-h.width,h.length,0);ctx.bezierCurveTo(h.length*.65,h.width,h.length*.25,h.width*.7,0,8);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
      }
    }
    ctx.restore();
  }
}
function drawParticles(){ctx.save();for(const p of game.particles){ctx.globalAlpha=Math.max(0,p.life/p.max)*.75;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.fill()}ctx.restore()}
function playerHitRadius(){return game?.player?game.player.r*PLAYER_HITBOX_SCALE:0}
function playerHitCenter(){const p=game?.player;if(!p)return{x:0,y:0};const prof=PLAYER_MOTION[game.character]||{};return{x:p.x,y:p.y-(prof.hitboxY||38)}}
function drawPlayerHitbox(){
  if(!game||!game.settings.playerHitbox)return;
  const p=playerHitCenter(),r=playerHitRadius();
  ctx.save();ctx.translate(p.x,p.y);
  ctx.fillStyle="rgba(255,255,255,.055)";ctx.strokeStyle="rgba(255,245,220,.92)";ctx.lineWidth=1.6;ctx.setLineDash([4,3]);
  ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle="rgba(255,92,82,.95)";ctx.beginPath();ctx.arc(0,0,2.2,0,TAU);ctx.fill();
  ctx.globalAlpha=.55;ctx.strokeStyle="rgba(255,92,82,.85)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-r-5,0);ctx.lineTo(-r+1,0);ctx.moveTo(r-1,0);ctx.lineTo(r+5,0);ctx.moveTo(0,-r-5);ctx.lineTo(0,-r+1);ctx.moveTo(0,r-1);ctx.lineTo(0,r+5);ctx.stroke();
  ctx.restore();
}
function drawCrosshair(){if(!pointer.inside)return;ctx.save();ctx.translate(pointer.x,pointer.y);ctx.strokeStyle="#f5f7ff";ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(0,0,9,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(-18,0);ctx.lineTo(-7,0);ctx.moveTo(7,0);ctx.lineTo(18,0);ctx.moveTo(0,-18);ctx.lineTo(0,-7);ctx.moveTo(0,7);ctx.lineTo(0,18);ctx.stroke();ctx.fillStyle="#ef5e50";ctx.beginPath();ctx.arc(0,0,2.3,0,TAU);ctx.fill();ctx.restore()}
function drawVignette(){const g=ctx.createRadialGradient(W/2,H*.56,220,W/2,H*.56,760);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,"rgba(0,0,0,.29)");ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}

/* ---------- settings live preview ---------- */
const SETTINGS_PREVIEW_META={
  reducedMotion:{title:"움직임 줄이기",desc:"OFF는 안개/파티클 움직임이 많고, ON은 불필요한 움직임을 줄입니다."},
  screenShake:{title:"화면 흔들림",desc:"ON에서는 강한 피격 순간 전투 화면이 짧게 흔들립니다."},
  hitFlash:{title:"피격 화면 효과",desc:"ON에서는 피격 순간 화면 가장자리에 붉은 플래시가 표시됩니다."},
  crosshair:{title:"조준점 표시",desc:"ON에서는 실제 전투와 같은 조준점을 마우스 위치에 표시합니다."},
  specialTelegraph:{title:"특수 공격 알림 표시",desc:"ON에서는 DEATH RAY 같은 특수기 전에 실제 위험 방향과 알림이 표시됩니다."},
  playerHitbox:{title:"캐릭터 히트박스 표시",desc:"ON에서는 실제 피격 판정 중심과 반경을 캐릭터 몸통 위에 표시합니다."}
};
const settingsPreviewState={key:"playerHitbox",time:0,last:performance.now(),raf:0};
function previewDrawSprite(pc,x,y,size,row=0,dir=0){
  const char=selectedCharacter||"striker",img=art[`sprite-${char}-v39`];if(!img)return;
  const safeRow=clamp(row,0,6);
  pc.save();pc.fillStyle="rgba(0,0,0,.35)";pc.beginPath();pc.ellipse(x,y+3,size*.23,size*.055,0,0,TAU);pc.fill();
  pc.drawImage(img,dir*256,safeRow*256,256,256,x-size/2,y-size+16,size,size);pc.restore();
}
function previewCrosshair(pc,x,y){pc.save();pc.translate(x,y);pc.strokeStyle="#f5f7ff";pc.lineWidth=1.6;pc.beginPath();pc.arc(0,0,8,0,TAU);pc.stroke();pc.beginPath();pc.moveTo(-16,0);pc.lineTo(-6,0);pc.moveTo(6,0);pc.lineTo(16,0);pc.moveTo(0,-16);pc.lineTo(0,-6);pc.moveTo(0,6);pc.lineTo(0,16);pc.stroke();pc.fillStyle="#ef5e50";pc.beginPath();pc.arc(0,0,2.1,0,TAU);pc.fill();pc.restore()}
function previewTelegraph(pc,x,y,len=280,w=16){
  const pulse=.65+.35*Math.sin(settingsPreviewState.time*11);pc.save();pc.translate(x,y);
  const g=pc.createLinearGradient(0,0,len,0);g.addColorStop(0,"rgba(230,105,246,.25)");g.addColorStop(.55,"rgba(210,70,235,.12)");g.addColorStop(1,"rgba(210,70,235,0)");pc.fillStyle=g;pc.fillRect(0,-w,len,w*2);
  pc.strokeStyle=`rgba(247,181,255,${.35+.25*pulse})`;pc.lineWidth=2;pc.beginPath();pc.moveTo(0,-w);pc.lineTo(len,-w);pc.moveTo(0,w);pc.lineTo(len,w);pc.stroke();pc.setLineDash([12,8]);pc.strokeStyle="rgba(255,235,255,.55)";pc.beginPath();pc.moveTo(0,0);pc.lineTo(len,0);pc.stroke();pc.setLineDash([]);pc.restore();
}
function previewBackground(pc,boss="eye",shakeX=0,shakeY=0){
  const bg=art[`battle-bg-${boss}`]||art.battleBg;pc.save();pc.translate(shakeX,shakeY);pc.imageSmoothingEnabled=true;pc.imageSmoothingQuality="high";if(bg)pc.drawImage(bg,0,0,460,270);else{pc.fillStyle="#080a13";pc.fillRect(0,0,460,270)}pc.fillStyle="rgba(3,4,10,.18)";pc.fillRect(0,0,460,270);pc.restore();
}
function drawSettingPreviewCanvas(canvas,key,on,t){
  if(!canvas)return;const pc=canvas.getContext("2d"),w=canvas.width,h=canvas.height;pc.clearRect(0,0,w,h);
  const shake=key==="screenShake"&&on?Math.sin(t*28)*5:0;
  previewBackground(pc,key==="specialTelegraph"?"eye":"golem",shake,shake*.35);
  pc.save();pc.translate(shake,shake*.35);
  const hitboxPreview=key==="playerHitbox";
  const px=hitboxPreview?185:145,py=hitboxPreview?252:232,ps=hitboxPreview?156:112;
  const moveRow=key==="reducedMotion"&&!on?1+Math.floor(t*6)%6:0;
  previewDrawSprite(pc,px,py,ps,moveRow,0);
  if(key==="playerHitbox"&&on){const prof=PLAYER_MOTION[selectedCharacter]||PLAYER_MOTION.striker,baseSize=(prof.size||108),r=18*PLAYER_HITBOX_SCALE*(ps/baseSize),cy=py-(prof.hitboxY||32)*(ps/baseSize);pc.fillStyle="rgba(255,255,255,.06)";pc.strokeStyle="rgba(255,245,220,.98)";pc.lineWidth=1.8;pc.setLineDash([5,3]);pc.beginPath();pc.arc(px,cy,r,0,TAU);pc.fill();pc.stroke();pc.setLineDash([]);pc.fillStyle="#ff6258";pc.beginPath();pc.arc(px,cy,2.6,0,TAU);pc.fill()}
  if(key==="crosshair"&&on)previewCrosshair(pc,315,146);
  if(key==="specialTelegraph"){
    const eye=art["eye-idle-core"];
    if(eye){pc.save();pc.shadowBlur=14;pc.shadowColor="#d452ef";pc.drawImage(eye,305,50,100,100);pc.restore()}
    else{pc.save();pc.translate(355,100);pc.fillStyle="#d94df0";pc.beginPath();pc.arc(0,0,19,0,TAU);pc.fill();pc.restore()}
    if(on){const a=Math.atan2(py-38-100,px-355);pc.save();pc.translate(355,100);pc.rotate(a);previewTelegraph(pc,0,0,280,15);pc.restore();pc.fillStyle="rgba(12,9,18,.93)";pc.strokeStyle="rgba(232,112,250,.55)";pc.lineWidth=1;pc.fillRect(275,26,153,42);pc.strokeRect(275,26,153,42);pc.fillStyle="#f4c9ff";pc.font="700 12px Segoe UI";pc.fillText("BOSS SKILL",288,42);pc.fillStyle="#fff";pc.font="800 15px Segoe UI";pc.fillText("DEATH RAY",288,60)}
  }
  if(key==="hitFlash"&&on){const a=.12+.08*(.5+.5*Math.sin(t*10));pc.fillStyle=`rgba(255,49,76,${a})`;pc.fillRect(0,0,w,h)}
  if(key==="reducedMotion"&&!on){for(let i=0;i<18;i++){const fx=(i*67+t*(22+i%3*7))%w,fy=85+(i*31%150)+Math.sin(t*2+i)*8;pc.globalAlpha=.14+(i%4)*.03;pc.fillStyle="#9bd5ff";pc.beginPath();pc.ellipse(fx,fy,28+(i%3)*15,4,0,0,TAU);pc.fill()}pc.globalAlpha=1}
  if(key==="screenShake"&&on){pc.fillStyle="rgba(255,255,255,.05)";pc.fillRect(0,0,w,h)}
  pc.restore();
}
function renderSettingsPreview(){
  const meta=SETTINGS_PREVIEW_META[settingsPreviewState.key]||SETTINGS_PREVIEW_META.playerHitbox;
  const title=$("settingsPreviewTitle"),desc=$("settingsPreviewDesc");if(title)title.textContent=meta.title;if(desc)desc.textContent=meta.desc;
  drawSettingPreviewCanvas($("settingsPreviewOff"),settingsPreviewState.key,false,settingsPreviewState.time);
  drawSettingPreviewCanvas($("settingsPreviewOn"),settingsPreviewState.key,true,settingsPreviewState.time);
}
function settingsPreviewLoop(now){const dt=Math.min((now-settingsPreviewState.last)/1000,.05);settingsPreviewState.last=now;settingsPreviewState.time+=dt;if(!$("settingsScreen").classList.contains("hidden"))renderSettingsPreview();settingsPreviewState.raf=requestAnimationFrame(settingsPreviewLoop)}
function initSettingsPreview(){document.querySelectorAll('#settingsList label[data-preview]').forEach(label=>{label.addEventListener('mouseenter',()=>{settingsPreviewState.key=label.dataset.preview;renderSettingsPreview()});label.addEventListener('focusin',()=>{settingsPreviewState.key=label.dataset.preview;renderSettingsPreview()})});renderSettingsPreview();settingsPreviewState.last=performance.now();cancelAnimationFrame(settingsPreviewState.raf);settingsPreviewState.raf=requestAnimationFrame(settingsPreviewLoop)}

const RESULT_CHARACTER_ART={
  striker:"assets/portrait-striker-ingame-v41.png",phantom:"assets/portrait-phantom-ingame-v41.png",arcanist:"assets/portrait-arcanist-ingame-v41.png",berserker:"assets/portrait-berserker-ingame-v41.png"
};
const RESULT_BOSS_ART={wyrm:"assets/boss-card-wyrm.png",golem:"assets/boss-card-golem.png",eye:"assets/boss-card-eye.png"};
function renderResultLoadout(r){
  const c=CHARACTERS[r.character],b=BOSSES[r.boss],d=DIFFICULTIES[r.difficulty],a=ASSISTS[r.assist];
  const ci=$("resultCharacterImg"),bi=$("resultBossImg"),ct=$("resultCharacterName"),bt=$("resultBossName"),dt=$("resultDifficultyTag"),at=$("resultAssistTag");
  if(ci){ci.src=RESULT_CHARACTER_ART[r.character];ci.alt=`${c.ko} ${c.name}`}
  if(bi){bi.src=RESULT_BOSS_ART[r.boss];bi.alt=`${b.ko} ${b.name}`}
  if(ct)ct.textContent=`${c.ko} · ${c.name}`;
  if(bt)bt.textContent=`${b.ko} · ${b.name}`;
  if(dt){dt.textContent=d.name;dt.className=`result-option-pill difficulty ${r.difficulty}`}
  if(at){at.textContent=a.name;at.className="result-option-pill option"}
}

/* ---------- HUD / result ---------- */
function formatTime(sec){const m=Math.floor(sec/60),s=sec-m*60;return m>0?`${String(m).padStart(2,"0")}:${s.toFixed(2).padStart(5,"0")}`:`${s.toFixed(2)}s`}
function updateHud(){
  if(!game)return;const p=game.player,b=game.boss,c=CHARACTERS[game.character],boss=BOSSES[game.bossType],tune=currentBossTuning(),cd=effectiveCooldown(game.character,game.assist);
  $("bossName").textContent=`${boss.ko} · ${boss.name}`;
  if(game.difficulty==="endless"){
    $("phaseText").textContent=`ENDLESS · ${endlessThreat(game.elapsed).label}`;$("bossHpBar").style.width="100%";$("bossHpText").textContent=`누적 피해 ${Math.floor(game.totalDamage).toLocaleString("ko-KR")}`;
    $("timerText").textContent=formatTime(game.elapsed);$("modeHintText").textContent="시간 제한 없음 · 시간이 갈수록 강화";
  }else{
    $("phaseText").textContent=`PHASE ${b.phase}`;$("bossHpBar").style.width=`${b.hp/b.maxHp*100}%`;$("bossHpText").textContent=`${Math.ceil(b.hp)} / ${b.maxHp}`;
    $("timerText").textContent=Math.max(0,GAME_DURATION-game.elapsed).toFixed(1);$("modeHintText").textContent="30초 제한 · 보스 처치";
  }
  $("pilotText").textContent=`${c.ko} · ${c.name}`;$("playerHpBar").style.width=`${p.hp/p.maxHp*100}%`;$("hpText").textContent=`HP ${p.hp}/${p.maxHp}`;$("difficultyText").textContent=game.difficulty==="endless"?`ENDLESS / ${endlessThreat(game.elapsed).label}`:DIFFICULTIES[game.difficulty].name;
  $("ammoText").textContent=p.reloading?`0 / ${c.magazine}`:`${p.ammo} / ${c.magazine}`;$("reloadText").textContent=p.reloading?"RELOADING":"AMMO";const reloadPct=p.reloading?(1-p.reloadTimer/Math.max(.001,p.reloadDuration))*100:(p.ammo/c.magazine)*100;$("reloadBar").style.width=`${clamp(reloadPct,0,100)}%`;$("reloadBar").classList.toggle("reloading",p.reloading);
  $("skillName").textContent=`${c.skill} · ${cd%1?cd.toFixed(1):cd}초`;$("skillText").textContent=p.skillCd<=0?"READY":`${p.skillCd.toFixed(1)}s`;
  const pct=p.skillCd<=0?100:(1-p.skillCd/cd)*100;$("skillCooldownBar").style.width=`${pct}%`;$("skillCooldownRing").style.background=`conic-gradient(${c.color}aa ${pct}%,transparent ${pct}% 100%)`;$("assistText").textContent=`특성: ${ASSISTS[game.assist].name}`;
}
function pauseGame(reason="P / ESC로 재개할 수 있습니다."){if(!game||game.paused||game.state!=="playing")return;game.paused=true;leftHeld=false;firing=false;keys.clear();$("pauseReason").textContent=reason;$("pauseOverlay").classList.remove("hidden")}
function resumeGame(){if(!game||!game.paused)return;game.paused=false;keys.clear();lastFrame=performance.now();$("pauseOverlay").classList.add("hidden")}
function togglePause(){game?.paused?resumeGame():pauseGame()}
function endGame(victory,reason){
  if(!game||game.state!=="playing")return;game.state="ended";cancelAnimationFrame(raf);leftHeld=false;firing=false;keys.clear();
  const endless=game.difficulty==="endless",time=game.elapsed;
  game.result={victory,time:+time.toFixed(3),damage:Math.floor(game.totalDamage),boss:game.bossType,character:game.character,difficulty:game.difficulty,assist:game.assist};
  renderResultLoadout(game.result);
  $("resultKicker").textContent=endless?"ENDLESS RESULT":victory?"HUNT COMPLETE":"HUNT FAILED";
  $("resultTitle").textContent=endless?"HUNT ENDED":victory?"VICTORY":"DEFEAT";$("resultReason").textContent=reason;
  if(endless){
    $("statLabel1").textContent="TOTAL DAMAGE";$("resultStat1").textContent=Math.floor(game.totalDamage).toLocaleString("ko-KR");$("statLabel2").textContent="SURVIVAL";$("resultStat2").textContent=formatTime(time);$("statLabel3").textContent="HITS";$("resultStat3").textContent=game.hits;$("statLabel4").textContent="ACC";$("resultStat4").textContent=`${game.shots?Math.round(game.shotsHit/game.shots*100):0}%`;
  }else{
    $("statLabel1").textContent="TIME";$("resultStat1").textContent=`${Math.min(time,GAME_DURATION).toFixed(2)}s`;$("statLabel2").textContent="HITS";$("resultStat2").textContent=game.hits;$("statLabel3").textContent="SHOTS";$("resultStat3").textContent=game.shots;$("statLabel4").textContent="ACC";$("resultStat4").textContent=`${game.shots?Math.round(game.shotsHit/game.shots*100):0}%`;
  }
  $("recordNotice").textContent="위 설정과 전투 결과를 기준으로 기록됩니다.";
  const rankable=endless||victory;$("rankingEntry").classList.toggle("hidden",!rankable);$("resultActions").classList.toggle("hidden",rankable);$("nicknameInput").value="";$("rankMessage").textContent="";showScreen("resultScreen");
}

/* ---------- ranking ---------- */
function saveRanking(){
  if(!game?.result)return;const r=game.result;if(r.difficulty!=="endless"&&!r.victory)return;
  const nickname=$("nicknameInput").value.trim();if(!nickname){$("rankMessage").textContent="닉네임을 입력하세요.";return}
  saveData.rankings.push({nickname:nickname.slice(0,12),boss:r.boss,character:r.character,difficulty:r.difficulty,assist:r.assist,time:r.time,damage:r.damage,date:new Date().toISOString()});
  saveData.rankings=saveData.rankings.slice(-500);persist();$("rankMessage").textContent="랭킹에 저장했습니다.";$("rankingEntry").classList.add("hidden");$("resultActions").classList.remove("hidden");
}
function skipRanking(){$("rankingEntry").classList.add("hidden");$("resultActions").classList.remove("hidden")}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderRecords(){
  const endless=rankDifficulty==="endless";$("rankMetricBlock").classList.toggle("hidden",!endless);
  let rows=saveData.rankings.filter(r=>r.boss===rankBoss&&r.difficulty===rankDifficulty&&(rankCharacter==="all"||r.character===rankCharacter)&&(rankAssist==="all"||r.assist===rankAssist));
  if(endless)rows.sort((a,b)=>rankMetric==="damage"?b.damage-a.damage:b.time-a.time);else rows.sort((a,b)=>a.time-b.time);
  $("recordsHeading").textContent=`${DIFFICULTIES[rankDifficulty].name} · ${BOSSES[rankBoss].ko} ${BOSSES[rankBoss].name}`;
  $("recordsSubHeading").textContent=`${rankCharacter==="all"?"캐릭터 전체":CHARACTERS[rankCharacter].ko} / ${rankAssist==="all"?"특성 전체":ASSISTS[rankAssist].name}${endless?` / ${rankMetric==="damage"?"누적 피해":"생존 시간"} 기준`:""}`;
  const head=endless?`<th>#</th><th>NICKNAME</th><th>HUNTER</th><th>특성</th><th>${rankMetric==="damage"?"DAMAGE":"SURVIVAL"}</th><th>${rankMetric==="damage"?"SURVIVAL":"DAMAGE"}</th><th>DATE</th>`:`<th>#</th><th>NICKNAME</th><th>HUNTER</th><th>특성</th><th>TIME</th><th>DATE</th>`;
  let h=`<table><thead><tr>${head}</tr></thead><tbody>`;
  if(!rows.length)h+=`<tr><td colspan="${endless?7:6}">선택 조건의 기록이 없습니다.</td></tr>`;
  rows.forEach((r,i)=>{
    if(endless)h+=`<tr><td>${i+1}</td><td>${esc(r.nickname)}</td><td>${CHARACTERS[r.character].ko}<small>${CHARACTERS[r.character].name}</small></td><td>${ASSISTS[r.assist].name}</td><td>${rankMetric==="damage"?r.damage.toLocaleString("ko-KR"):formatTime(r.time)}</td><td>${rankMetric==="damage"?formatTime(r.time):r.damage.toLocaleString("ko-KR")}</td><td>${new Date(r.date).toLocaleDateString("ko-KR")}</td></tr>`;
    else h+=`<tr><td>${i+1}</td><td>${esc(r.nickname)}</td><td>${CHARACTERS[r.character].ko}<small>${CHARACTERS[r.character].name}</small></td><td>${ASSISTS[r.assist].name}</td><td>${r.time.toFixed(2)}s</td><td>${new Date(r.date).toLocaleDateString("ko-KR")}</td></tr>`;
  });
  $("recordsTableWrap").innerHTML=h+"</tbody></table>";
}
function setRankFilter(group,value){
  if(group==="boss")rankBoss=value;else if(group==="difficulty")rankDifficulty=value;else if(group==="character")rankCharacter=value;else if(group==="assist")rankAssist=value;else if(group==="metric")rankMetric=value;
  document.querySelectorAll(`[data-filter-group="${group}"]`).forEach(b=>b.classList.toggle("selected",b.dataset.value===value));renderRecords();
}

/* ---------- input ---------- */
function canvasPointer(e){if($("gameScreen").classList.contains("hidden")){pointer.inside=false;return}const r=canvas.getBoundingClientRect();pointer.x=clamp((e.clientX-r.left)/r.width*W,0,W);pointer.y=clamp((e.clientY-r.top)/r.height*H,0,H);pointer.inside=true}
window.addEventListener("keydown",e=>{
  const move=["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"];
  if(move.includes(e.code)){keys.add(e.code);if(!$("gameScreen").classList.contains("hidden"))e.preventDefault()}
  if((e.code==="KeyP"||e.code==="Escape")&&!e.repeat){if(game&&game.state==="playing"&&!$("gameScreen").classList.contains("hidden")){e.preventDefault();togglePause();return}if(e.code==="Escape"&&(!$("setupScreen").classList.contains("hidden")||!$("recordsScreen").classList.contains("hidden")||!$("settingsScreen").classList.contains("hidden"))){e.preventDefault();showScreen("menuScreen")}}
});
window.addEventListener("keyup",e=>keys.delete(e.code));
window.addEventListener("blur",()=>{leftHeld=false;firing=false;keys.clear();if(game&&game.state==="playing"&&!game.paused)pauseGame("창 포커스가 벗어났습니다. 준비되면 계속하기를 누르세요.")});
document.addEventListener("visibilitychange",()=>{if(document.hidden){leftHeld=false;firing=false;if(game&&game.state==="playing"&&!game.paused)pauseGame("창 포커스가 벗어났습니다. 준비되면 계속하기를 누르세요.")}});
canvas.addEventListener("pointermove",canvasPointer);canvas.addEventListener("pointerenter",canvasPointer);canvas.addEventListener("pointerleave",()=>{pointer.inside=false});
canvas.addEventListener("pointerdown",e=>{canvasPointer(e);if(e.button===0){e.preventDefault();leftHeld=true;firing=true;attemptPlayerFire()}else if(e.button===2){e.preventDefault();useSkill()}});
window.addEventListener("pointerup",e=>{if(e.button===0){leftHeld=false;firing=false}});
canvas.addEventListener("contextmenu",e=>{e.preventDefault();if(game&&game.state==="playing"&&!game.paused&&game.player.skillCd<=0)useSkill()});

/* ---------- UI events ---------- */
$("startSetupBtn").addEventListener("click",()=>{updateSummary();showScreen("setupScreen");resetHunterCardShowcase()});$("setupBackBtn").addEventListener("click",()=>showScreen("menuScreen"));
$("recordsBtn").addEventListener("click",()=>{renderRecords();showScreen("recordsScreen")});$("recordsBackBtn").addEventListener("click",()=>showScreen("menuScreen"));
$("settingsBtn").addEventListener("click",()=>showScreen("settingsScreen"));$("settingsBackBtn").addEventListener("click",()=>showScreen("menuScreen"));
$("launchBtn").addEventListener("click",startGame);$("retryBtn").addEventListener("click",startGame);$("resultMenuBtn").addEventListener("click",()=>showScreen("menuScreen"));
$("pauseBtn").addEventListener("click",togglePause);$("resumeBtn").addEventListener("click",resumeGame);$("pauseRetryBtn").addEventListener("click",startGame);$("pauseMenuBtn").addEventListener("click",()=>{if(game)game.state="ended";cancelAnimationFrame(raf);$("pauseOverlay").classList.add("hidden");showScreen("menuScreen")});
$("saveRankBtn").addEventListener("click",saveRanking);$("skipRankBtn").addEventListener("click",skipRanking);$("nicknameInput").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();saveRanking()}});
$("characterChoices").addEventListener("click",e=>{const b=e.target.closest("[data-character]");if(!b)return;selectedCharacter=b.dataset.character;selectChoice("characterChoices","character",selectedCharacter);resetHunterCardShowcase();persistSelections();updateSummary()});
$("bossChoices").addEventListener("click",e=>{const b=e.target.closest("[data-boss]");if(!b)return;selectedBoss=b.dataset.boss;selectChoice("bossChoices","boss",selectedBoss);persistSelections();updateSummary()});
$("difficultyChoices").addEventListener("click",e=>{const b=e.target.closest("[data-difficulty]");if(!b)return;selectedDifficulty=b.dataset.difficulty;selectChoice("difficultyChoices","difficulty",selectedDifficulty);persistSelections();updateSummary()});
$("assistChoices").addEventListener("click",e=>{const b=e.target.closest("[data-assist]");if(!b)return;selectedAssist=b.dataset.assist;selectChoice("assistChoices","assist",selectedAssist);persistSelections();updateSummary()});
["rankBossChoices","rankDifficultyChoices","rankCharacterChoices","rankAssistChoices","rankMetricChoices"].forEach(id=>$(id).addEventListener("click",e=>{const b=e.target.closest("[data-filter-group]");if(!b)return;setRankFilter(b.dataset.filterGroup,b.dataset.value)}));
function bindSetting(id,key){const el=$(id);el.checked=saveData.settings[key];el.addEventListener("change",()=>{saveData.settings[key]=el.checked;persist();if(game)game.settings[key]=el.checked;$("saveStatus").textContent="설정을 저장했습니다.";setTimeout(()=>$("saveStatus").textContent="",1600)})}
bindSetting("reduceMotionToggle","reducedMotion");bindSetting("screenShakeToggle","screenShake");bindSetting("hitFlashToggle","hitFlash");bindSetting("crosshairToggle","crosshair");bindSetting("specialTelegraphToggle","specialTelegraph");bindSetting("playerHitboxToggle","playerHitbox");
$("resetRecordsBtn").addEventListener("click",()=>{if(confirm("저장된 로컬 랭킹을 모두 삭제할까요?")){saveData.rankings=[];persist();renderRecords()}});
const shell=$("gameShell");shell.addEventListener("selectstart",e=>{if(!e.target.closest("input,textarea"))e.preventDefault()});shell.addEventListener("dragstart",e=>{if(!e.target.closest("input,textarea"))e.preventDefault()});

$("launchBtn").disabled=true;$("launchBtn").textContent="ART LOADING...";
preloadArt().then(failures=>{artReady=true;initSettingsPreview();initHunterCardShowcase();$("launchBtn").disabled=false;$("launchBtn").textContent="HUNT START";if(failures.length)console.warn("some assets failed",failures)});
selectChoice("characterChoices","character",selectedCharacter);selectChoice("bossChoices","boss",selectedBoss);selectChoice("difficultyChoices","difficulty",selectedDifficulty);selectChoice("assistChoices","assist",selectedAssist);
showScreen("menuScreen");updateSummary();renderRecords();
window.__monsterHunt={
  getState:()=>game,
  getSelections:()=>({selectedCharacter,selectedBoss,selectedDifficulty,selectedAssist}),
  renderResultLoadout:()=>game?.result&&renderResultLoadout(game.result),
  start:(boss="wyrm",character="striker",difficulty="normal",assist="none")=>{selectedBoss=boss;selectedCharacter=character;selectedDifficulty=difficulty;selectedAssist=assist;startGame();return game}
};
