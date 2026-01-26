
/* LOOPS — Theme Tiles + 10-level-per-theme (Jan 2026)
   Move 2:
   - Themes are the former topic list (10 themes)
   - Each theme has 10 levels (1★ per level, max 10★)
   - All themes start unlocked at Level 1
   - AI marks + coach feedback; ALWAYS show a suggested improved answer
   - Back to Home allowed (failed level stays locked)
*/

(function(){
  "use strict";

  const PROMPTS_PER_ROUND = 10;
  const PENALTY_SEC = 30;
// ---- Safe storage (prevents crashes in private mode / blocked storage) ----
const storage = (function(){
  const mem = Object.create(null);
  function get(k){
    try{ return localStorage.getItem(k); }catch(_){ return Object.prototype.hasOwnProperty.call(mem,k) ? mem[k] : null; }
  }
  function set(k,v){
    try{ localStorage.setItem(k, String(v)); }catch(_){ mem[k] = String(v); }
  }
  function remove(k){
    try{ localStorage.removeItem(k); }catch(_){ delete mem[k]; }
  }
  return {get,set,remove};
})();


// --- Player + Coach ---
const LS_NAME = "loops_playerName_v1";
const LS_REWARDS = "loops_rewards_v1"; // {coins:number, loot:{[id]:true}, last:{...}}
const COACH = {
  // A loose, football‑manager caricature: stern, funny, obsessed with standards.
  name: "Coach El Mister",
  avatar: "🧥⚽",
  praise: [
    "Bien. That’s a proper performance.",
    "Good. You did the work — now keep it.",
    "Solid. No nonsense.",
    "That’s control. I like control.",
    "You’re improving. Don’t get comfortable."
  ],
  push: [
    "Standards. We raise them every round.",
    "Details win matches. You want wins, yes?",
    "Same energy — cleaner language.",
    "One weakness. We fix it. Then we move.",
    "You’re close. But close is not the score."
  ],
  jail: [
    "Gym. Not punishment — preparation.",
    "We train what cost you points. Now.",
    "No drama. Just reps. Earn the exit.",
    "You want freedom? Show me control.",
    "Back in the tunnel. Quick session, then out."
  ],
  release: [
    "Good. You earned your exit.",
    "That’s the standard. Keep it.",
    "Unlocked. Now play like that again.",
    "Better. Now don’t lose it.",
    "Exit open. Next round — same discipline."
  ],
  // Short “matchday” warnings per level (used in coach messages).
  levelWarnings: [
    "Level 1: keep it simple — one clean sentence + one detail.",
    "Level 2: watch the verb you need (ser/estar) — don’t dodge it.",
    "Level 3: add a connector, but only if it’s correct.",
    "Level 4: connectors matter now — because/but/and, choose the right one.",
    "Level 5: agreements — gender/number. No lazy endings.",
    "Level 6: opinions need reasons — don’t just say 'good'.",
    "Level 7: comparisons — more/less/as…as. Keep it tidy.",
    "Level 8: plans — future forms. No guessing.",
    "Level 9: sequence — first/then/after. Make it flow.",
    "Boss: variety — detail + structure + accuracy."
  ]
};


function getPlayerName(){
  return (storage.get(LS_NAME) || "").trim();
}
function setPlayerName(v){
  const name = String(v||"").trim().slice(0,18);
  storage.set(LS_NAME, name);
  return name;
}

function loadRewards(){
  try{
    const raw = storage.get(LS_REWARDS);
    if(!raw) return {coins:0, loot:{}, last:null};
    const obj = JSON.parse(raw);
    obj.coins = Number(obj.coins)||0;
    obj.loot = obj.loot || {};
    return obj;
  }catch(_){ return {coins:0, loot:{}, last:null}; }
}
function saveRewards(r){ storage.set(LS_REWARDS, JSON.stringify(r)); }

const LOOT_POOL = [
  {id:"neon_cog", name:"Neon Cog Sticker"},
  {id:"circuit_badge", name:"Circuit Badge"},
  {id:"gold_star", name:"Gold Star Decal"},
  {id:"pixel_flame", name:"Pixel Flame"},
  {id:"turbo_bolt", name:"Turbo Bolt"},
  {id:"coach_whistle", name:"Coach Whistle"},
  {id:"arcade_ticket", name:"Arcade Ticket"},
  {id:"synge_shield", name:"Synge Shield"},
  {id:"speed_wings", name:"Speed Wings"},
  {id:"focus_chip", name:"Focus Chip"},
];

function awardForPass(scoreSec, wrong, targetSec){
  const r = loadRewards();
  let coins = 20;
  if(wrong===0) coins += 10;
  if(scoreSec <= targetSec) coins += 10;
  if(scoreSec <= targetSec-10) coins += 5;
  r.coins += coins;

  // Loot drop: 35% chance, prefer something not yet owned
  let loot = null;
  if(Math.random() < 0.35){
    const notOwned = LOOT_POOL.filter(x=>!r.loot[x.id]);
    const pickFrom = notOwned.length ? notOwned : LOOT_POOL;
    loot = pickFrom[Math.floor(Math.random()*pickFrom.length)];
    r.loot[loot.id] = true;
  }

  r.last = {coins, loot, at: Date.now()};
  saveRewards(r);
  return r.last;
}

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function showCoachModal(opts){
  if(!el.coachModal) return;
  if(el.coachAvatar) el.coachAvatar.textContent = opts.avatar || COACH.avatar;
  if(el.coachTitle) el.coachTitle.textContent = opts.title || COACH.name;
  if(el.coachSub) el.coachSub.textContent = opts.sub || "";
  if(el.coachBody) el.coachBody.innerHTML = opts.html || "";
  if(el.coachPrimary){
    el.coachPrimary.textContent = opts.primaryText || "Continue";
    el.coachPrimary.onclick = ()=>{ hideCoachModal(); opts.onPrimary && opts.onPrimary(); };
  }
  if(el.coachSecondary){
    if(opts.secondaryText){
      el.coachSecondary.classList.remove("hidden");
      el.coachSecondary.textContent = opts.secondaryText;
      el.coachSecondary.onclick = ()=>{ hideCoachModal(); opts.onSecondary && opts.onSecondary(); };
    }else{
      el.coachSecondary.classList.add("hidden");
      el.coachSecondary.onclick = null;
    }
  }
  el.coachModal.classList.remove("hidden");
}
function hideCoachModal(){
  if(el.coachModal) el.coachModal.classList.add("hidden");
}

function showRewardPop(last){
  if(!el.rewardPop || !last) return;
  const r = loadRewards();
  if(el.rewardTitle) el.rewardTitle.textContent = "Reward unlocked!";
  const lootLine = last.loot ? `\n<b>Loot:</b> ${escapeHtml(last.loot.name)}` : "";
  if(el.rewardBody) el.rewardBody.innerHTML =
    `<b>+${last.coins} ⚡</b> (Total: ${r.coins} ⚡)${lootLine}`;
  el.rewardPop.classList.remove("hidden");
  if(el.rewardOk){
    el.rewardOk.onclick = ()=> el.rewardPop.classList.add("hidden");
  }
}

// --- Coach analysis (one focus, not spam) ---
const COACH_COACH_ES_FIX = {
  "habitacion":"habitación",
  "habitaciones":"habitaciones",
  "pequeno":"pequeño",
  "pequena":"pequeña",
  "espanol":"español",
  "facil":"fácil",
  "tambien":"también",
  "cappital":"capital",
  "irlanda":"Irlanda",
  "dublin":"Dublín",
  "paresed":"paredes",
  "pareseds":"paredes",
};

function wordFixesES(s){
  const out = [];
  if(!s) return {fixed:"", changes:out};
  let fixed = String(s);

  // Quick special: "oy al" -> "voy al"
  fixed = fixed.replace(/\boy\s+al\b/gi, (m)=>{ out.push("oy → voy"); return m[0]==="O" ? "Voy al" : "voy al"; });

  // Word-by-word fixes
  fixed = fixed.replace(/\b([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)\b/g, (w)=>{
    const key = w.toLowerCase();
    if(COACH_COACH_ES_FIX[key]){
      out.push(`${w} → ${COACH_COACH_ES_FIX[key]}`);
      // preserve initial cap
      const rep = COACH_COACH_ES_FIX[key];
      return (w[0]===w[0].toUpperCase()) ? (rep[0].toUpperCase()+rep.slice(1)) : rep;
    }
    return w;
  });

  // If "paredes son blancos" -> "paredes son blancas"
  fixed = fixed.replace(/\bparedes\s+son\s+blancos\b/gi, (m)=>{ out.push("blancos → blancas"); return "paredes son blancas"; });

  // Sentence caps + punctuation
  fixed = fixed.trim();
  if(fixed && fixed[0]===fixed[0].toLowerCase()){
    fixed = fixed[0].toUpperCase()+fixed.slice(1);
  }
  // Ensure at least one period at end (unless ends with ?!)
  if(fixed && !/[.!?¿¡]$/.test(fixed)) fixed += ".";
  return {fixed, changes:out};
}

function countWords(s){
  return String(s||"").trim().split(/\s+/).filter(Boolean).length;
}

function detectTags(prompt, answer, lang, rubric){
  const tags = [];
  const examples = [];

  const wc = countWords(answer);
  if(wc < (rubric?.minWords||6)) tags.push("too_short");

  // Helper: quick Spanish-ish normaliser for tiny regex checks
  const low = String(answer||"").toLowerCase();

  if(lang==="es"){
    const fx = wordFixesES(answer);
    if(fx.changes.length){
      tags.push("spelling");
      examples.push(...fx.changes.slice(0,3));
    }

    // --- Verb form / word order (high value for learners) ---
    if(/\byo\s+es\b/.test(low)){ tags.push("verb_form"); examples.push("yo es → yo soy"); }
    if(/\byo\s+tiene\b/.test(low)){ tags.push("verb_form"); examples.push("yo tiene → yo tengo"); }
    if(/\byo\s+gusta\b/.test(low)){ tags.push("word_order"); tags.push("verb_form"); examples.push("yo gusta → me gusta"); }
    if(/\bme\s+gusto\b/.test(low)){ tags.push("verb_form"); examples.push("me gusto → me gusta"); }

    // Infinitive after pronoun (missing conjugation): "yo comer" → "yo como"
    const infAfterPron = low.match(/\b(yo|tú|tu|el|él|ella|nosotros|vosotros|ellos|ellas)\s+(ser|estar|tener|hacer|ir|jugar|comer|hablar|vivir|leer|escribir|ver|salir|venir|poner|decir)\b/);
    if(infAfterPron){
      tags.push("verb_ending");
      examples.push(`${infAfterPron[1]} ${infAfterPron[2]} → ${infAfterPron[1]} ${infAfterPron[2]}(conjugado)`);
    }

    // Very simple adjective agreement nudges
    if(/\b(mi|tu|su)\s+(madre|hermana|amiga|profesora)\s+es\s+alto\b/.test(low)){
      tags.push("agreement");
      examples.push("alto → alta");
    }
    if(/\b(mi|tu|su)\s+(padre|hermano|amigo|profesor)\s+es\s+alta\b/.test(low)){
      tags.push("agreement");
      examples.push("alta → alto");
    }

    // Subject + wrong 'to be' (very common early error)
    if(/\bmi\s+(madre|padre|amigo|amiga|profesor|profesora)\s+soy\b/.test(low)){
      tags.push("verb_form");
      examples.push("X soy → X es");
    }

    // --- Articles / gender (simple, targeted) ---
    const femNouns = /(casa|habitaci[oó]n|clase|escuela|familia|madre|hermana|ciudad|m[uú]sica|comida)/;
    const mascNouns = /(colegio|instituto|padre|hermano|amigo|pueblo|deporte|f[uú]tbol)/;

    const badElFem = new RegExp(`\\b(el|un)\\s+${femNouns.source}\\b`, "i");
    const badLaMasc = new RegExp(`\\b(la|una)\\s+${mascNouns.source}\\b`, "i");
    const m1 = low.match(badElFem);
    const m2 = low.match(badLaMasc);
    if(m1){
      tags.push("articles_gender");
      examples.push(`${m1[1]} ${m1[2]} → ${m1[1].toLowerCase()==="el" ? "la" : "una"} ${m1[2]}`);
    }
    if(m2){
      tags.push("articles_gender");
      examples.push(`${m2[1]} ${m2[2]} → ${m2[1].toLowerCase()==="la" ? "el" : "un"} ${m2[2]}`);
    }

    // --- Missing 'to be' (keep, but only if it’s truly missing) ---
    const hasAdj = /(grande|pequeñ[oa]|bonit[oa]|interesante|divertid[oa]|alto|bajo|simpátic[oa]|trabajador[oa]|difícil|fácil)/.test(low);
    const hasBe = /\b(es|está|estoy|eres|son|somos|están|era|eran|fue|fui)\b/.test(low);
    if(hasAdj && !hasBe) tags.push("missing_be");

    // --- Connector (ONLY when the rubric/level expects it) ---
    const needsConn = !!(rubric && rubric.requireConnector);
    const promptNeedsConn = /because|why|reasons|first|then|after|opinion|plans|story|sequence/i.test(String(prompt||""));
    const hasConn = /\b(y|pero|porque|además|entonces|también|ya\s+que|sin\s+embargo)\b/.test(low);
    if((needsConn || promptNeedsConn) && wc >= Math.max(8, (rubric?.minWords||6)) && !hasConn){
      tags.push("no_connector");
    }

    // Mild article prompt: "hay X" usually wants "hay un/una X" at JC level
    if((rubric && Number(rubric.minWords||0) >= 5) && /\bhay\s+\w+\b/.test(low) && !/\bhay\s+(un|una)\b/.test(low)){
      // only nudge if they’re clearly describing a room/place
      if(/\b(habitaci[oó]n|casa|clase|escuela)\b/.test(low)){
        tags.push("articles");
        examples.push("hay X → hay un/una X");
      }
    }
  }

  if(tags.length===0) tags.push("detail");
  return {tags, examples};
}


function focusLabel(tag, lang){
  const L = lang || "es";
  if(tag==="spelling") return (L==="es") ? "Spelling & accents" : "Spelling";
  if(tag==="verb_form") return "Verb forms";
  if(tag==="articles_gender") return "Articles & gender";
  if(tag==="word_order") return "Word order";
  if(tag==="verb_ending") return "Verb endings";
  if(tag==="agreement") return "Agreement";
  if(tag==="articles") return "Articles";
  if(tag==="missing_be") return "Missing ‘to be’";
  if(tag==="no_connector") return "Connectors";
  if(tag==="too_short") return "More detail";
  if(tag==="detail") return "More detail";
  return "One key fix";


function tipForTags(tags, lang){
  const t = Array.isArray(tags)?tags:[];
  const has = (x)=> t.includes(x);
  if(lang==="es"){
    if(has("verb_form")) return "Fix the verb: soy/tengo/me gusta (this is where marks disappear).";
    if(has("verb_ending")) return "Conjugate the verb (yo como / él come) — don’t leave it as an infinitive.";
    if(has("word_order")) return "Word order: me gusta + infinitivo (not *yo gusta*).";
    if(has("articles_gender")) return "Article + gender: el/la, un/una — match the noun.";
    if(has("agreement")) return "Agreement: adjective ending must match (alto/alta).";
    if(has("missing_be")) return "Add ‘to be’: es/está/soy… so the description works.";
    if(has("no_connector")) return "Link ideas with one connector: y / pero / porque / además.";
    if(has("spelling")) return "Fix spelling/accents — quick easy points.";
    if(has("too_short")) return "Add one extra detail (place, activity, opinion, reason).";
  }else{
    if(has("too_short")) return "Add one extra detail (what/where/why).";
  }
  return "";
}

}

function pickRoundFocus(items, lang, rubric){
  // Count tags across items
  const counts = {};
  const examples = {};
  items.forEach(it=>{
    (it.tags||[]).forEach(t=>{
      counts[t] = (counts[t]||0)+1;
      if(!examples[t]) examples[t]=[];
      if(it.examples && it.examples.length) examples[t].push(...it.examples);
    });
  });

  // High-value “skill cogs” should surface even if they occur once.
  const high = ["spelling","verb_form","verb_ending","agreement","articles_gender","word_order","missing_be","articles"];
  const low  = ["too_short","no_connector","detail"];

  // Pick highest-count high-value tag (>=1)
  let best = null;
  let bestCount = 0;
  high.forEach(t=>{
    const c = counts[t]||0;
    if(c>bestCount){ best=t; bestCount=c; }
  });

  // If no high-value tag, fall back to low-value (prefer the most frequent)
  if(!best){
    low.forEach(t=>{
      const c = counts[t]||0;
      if(c>bestCount){ best=t; bestCount=c; }
    });
  }

  if(!best){ best="detail"; bestCount=0; }

  const labelMap = {
    spelling: "Spelling / accents",
    verb_form: "Verb form (soy/tengo/me gusta…)",
    verb_ending: "Verb endings (conjugation)",
    agreement: "Agreement (alto/alta…)",
    articles_gender: "Articles & gender (el/la/un/una)",
    word_order: "Word order (me gusta…)",
    missing_be: "Missing ‘to be’",
    articles: "Articles",
    too_short: "More detail",
    no_connector: "Connect ideas",
    detail: "More detail"
  };

  const label = labelMap[best] || "More detail";
  const ex = (examples[best]||[]).slice(0,4);

  // Top tags list for UI (show variety)
  const top = Object.entries(counts)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,5)
    .map(([t,c])=>({t,c,label:labelMap[t]||t}));

  return { tag: best, count: bestCount, label, examples: ex, counts, top };
}


function buildSuggestionForItem(prompt, answer, lang, rubric, focusTag){
  const aRaw = String(answer||"").trim();
  const pRaw = String(prompt||"").trim();

  function modelFromPromptES(p, level){
    const s = String(p||"").toLowerCase();
    if(/town|pueblo|ciudad|barrio/.test(s)) return "Vivo en un pueblo pequeño y hay un parque donde quedo con mis amigos.";
    if(/school|colegio|instituto|escuela/.test(s)) return "Mi colegio es grande y tiene un patio donde jugamos al fútbol.";
    if(/classroom|clase/.test(s)) return "Mi clase es luminosa y hay pósters en las paredes.";
    if(/friend|amig[oa]/.test(s)) return "Mi mejor amigo es simpático y le gusta el fútbol porque es muy activo.";
    if(/family|familia/.test(s)) return "En mi familia somos cuatro y nos llevamos muy bien.";
    if(/bedroom|habitaci/.test(s)) return "Mi habitación es pequeña pero cómoda y tengo un escritorio para estudiar.";
    if(/person.*admire|admire|admiro/.test(s)) return "Admiro a mi madre porque es trabajadora y siempre me ayuda.";
    if(/house|home|casa/.test(s)) return "Mi casa es bastante moderna y tiene una cocina grande.";
    return "Es un lugar interesante y me gusta bastante.";
  }

  function pickDetailAddonES(p){
    const s = String(p||"").toLowerCase();
    const pick = (arr)=> arr[Math.floor(Math.random()*arr.length)];
    if(/town|pueblo|ciudad|barrio/.test(s)) return pick([
      "hay un cine y un centro comercial",
      "se puede ir de compras",
      "hay un polideportivo para hacer deporte",
      "hay parques y cafeterías",
      "los fines de semana salgo con mis amigos"
    ]);
    if(/school|colegio|instituto|escuela|classroom|clase/.test(s)) return pick([
      "hay un patio grande",
      "tengo profesores simpáticos",
      "las clases son interesantes",
      "hay una biblioteca con muchos libros",
      "hay muchas actividades después de clase"
    ]);
    if(/bedroom|habitaci/.test(s)) return pick([
      "tengo un armario grande",
      "hay una ventana con vistas",
      "tengo pósters en la pared",
      "hay una cama cómoda",
      "tengo un escritorio para estudiar"
    ]);
    if(/friend|amig[oa]|family|familia|person.*admire|admire|admiro/.test(s)) return pick([
      "es muy simpático",
      "es trabajador y responsable",
      "tiene el pelo corto y los ojos marrones",
      "me ayuda cuando lo necesito",
      "siempre dice la verdad"
    ]);
    if(/house|home|casa/.test(s)) return pick([
      "hay un jardín pequeño",
      "tiene dos baños",
      "la sala de estar es muy luminosa",
      "hay una cocina grande",
      "vivo cerca del centro"
    ]);
    return pick(["es bastante moderno", "me gusta mucho", "es muy cómodo", "es interesante para mí"]);
  }

  // If blank or unusable, generate a model from the prompt so the learner sees what “good” looks like.
  if(!aRaw || isBadGymSeed(aRaw)) {
    return (lang==="es") ? modelFromPromptES(pRaw, Number(state.level)||1) : "—";
  }

  const a = aRaw;

  if(lang==="es"){
    const fx = wordFixesES(a);

    // If the focus is spelling and there are changes, return corrected version (no fluff)
    if(focusTag==="spelling" && fx.changes.length){
      return fx.fixed;
    }

    // Verb/to-be missing focus: nudge into a complete, correct structure
    if(focusTag==="missing_be"){
      const low = a.toLowerCase();
      if(!/\b(es|está|son|soy|eres|somos|estoy|estás|están)\b/.test(low)){
        const fixed = low.startsWith("mi ") ? (a[0].toUpperCase()+a.slice(1)) : ("Es " + a);
        return wordFixesES(fixed).fixed;
      }
    }

    // Detail focus: add ONE extra detail, contextual to prompt
    if(focusTag==="too_short" || focusTag==="detail"){
      const starters = ["También", "Además", "Y", "Porque"];
      const st = starters[Math.floor(Math.random()*starters.length)];
      const ad = pickDetailAddonES(pRaw);

      const base = wordFixesES(a).fixed.replace(/[.!?]+$/,".");
      // If base is very short, use a prompt-based model as the base.
      const baseWc = countWords(base);
      const seed = (baseWc < Math.max(4, (rubric?.minWords||6)-2)) ? modelFromPromptES(pRaw, Number(state.level)||1).replace(/[.!?]+$/,".") : base;

      return `${seed} ${st} ${ad[0].toLowerCase()+ad.slice(1)}.`;
    }

    // Connector focus: add a connector appropriately
    if(focusTag==="no_connector"){
      const base = wordFixesES(a).fixed.replace(/[.!?]+$/,".");
      const conns = ["porque","pero","y","además","entonces"];
      const c = conns[Math.floor(Math.random()*conns.length)];
      const tail = (c==="porque") ? "me gusta." : "es interesante.";
      return `${base} ${c} ${tail}`;
    }

    // Default: corrected text
    return fx.fixed;
  }

  return a;
}


  const $ = (id)=> document.getElementById(id);

  const screens = {
    home: $("screenHome"),
    theme: $("screenTheme"),
    game: $("screenGame"),
    results: $("screenResults"),
    gym: $("screenWorkshop"),
  };

  const el = {
    // pills
    pillLevel: $("pillLevel"),
    pillMode: $("pillMode"),
    pillLang: $("pillLang"),
    pillPenalty: $("pillPenalty"),
    subtitle: $("subtitle"),

    // home
    modeSelect: $("modeSelect"),
    modeHintHome: $("modeHintHome"),
    langSelect: $("langSelect"),
    langHint: $("langHint"),
    pbOut: $("pbOut"),
    roundsOut: $("roundsOut"),
    globalText: $("globalText"),
    globalFill: $("globalFill"),
    themeGrid: $("themeGrid"),

    // theme screen
    themeTitle: $("themeTitle"),
    themeSub: $("themeSub"),
    themeStars: $("themeStars"),
    themeFill: $("themeFill"),
    themeBest: $("themeBest"),
    themeLevels: $("themeLevels"),
    themeBackBtn: $("themeBackBtn"),

    // game
    gameTitle: $("gameTitle"),
    tagCap: $("tagCap"),
    tagTips: $("tagTips"),
    quitBtn: $("quitBtn"),
    progressFill: $("progressFill"),
    progressText: $("progressText"),
    promptArea: $("promptArea"),
    prevBtn: $("prevBtn"),
    nextBtn: $("nextBtn"),
    modeHint: $("modeHint"),

    // results
    aiStatusText: $("aiStatusText"),
    timeOut: $("timeOut"),
    wrongOut: $("wrongOut"),
    scoreOut: $("scoreOut"),
    targetOut: $("targetOut"),
    coachFocus: $("coachFocus"),
    coachVerdict: $("coachVerdict"),
    toggleFeedbackBtn: $("toggleFeedbackBtn"),
    feedbackList: $("feedbackList"),
    playAgainBtn: $("playAgainBtn"),
    workshopBtn: $("workshopBtn"),
    homeBtn: $("homeBtn"),
    resultsHint: $("resultsHint"),

    // gym/workshop existing ids
    wsSubtitle: $("wsSubtitle"),
    wsCogs: $("wsCogs"),
    wsGateType: $("wsGateType"),
    wsGateTarget: $("wsGateTarget"),
    wsMeterFill: $("wsMeterFill"),
    wsMeterText: $("wsMeterText"),
    wsPrompt: $("wsPrompt"),
    wsChoices: $("wsChoices"),
    wsInputRow: $("wsInputRow"),
    wsInput: $("wsInput"),
    wsSubmit: $("wsSubmit"),
    wsHelp: $("wsHelp"),
    wsFeedback: $("wsFeedback"),
    wsBackResults: $("wsBackResults"),
    wsExit: $("wsExit"),
    wsHome: $("wsHome"),
    wsTeacher: $("wsTeacher"),
    wsOverride: $("wsOverride"),

    // player
    playerName: $("playerName"),
    nameHint: $("nameHint"),

    // coach modal
    coachModal: $("coachModal"),
    coachAvatar: $("coachAvatar"),
    coachTitle: $("coachTitle"),
    coachSub: $("coachSub"),
    coachBody: $("coachBody"),
    coachPrimary: $("coachPrimary"),
    coachSecondary: $("coachSecondary"),

    // reward pop
    rewardPop: $("rewardPop"),
    rewardTitle: $("rewardTitle"),
    rewardBody: $("rewardBody"),
    rewardOk: $("rewardOk"),

    toast: $("toast"),
  };

  function show(screenKey){
    Object.values(screens).forEach(s=> s && s.classList.add("hidden"));
    const s = screens[screenKey];
    if (s) s.classList.remove("hidden");
  }

  // Lock/unlock game navigation during marking/transitions.
  // (A missing definition here previously could leave the player stuck on Q10.)
  function setNavLocked(locked){
    const L = !!locked;
    let atStart = false;
    try{ atStart = (state && state.idx===0); }catch(_){ atStart = false; }
    if(el.prevBtn) el.prevBtn.disabled = L || atStart;
    if(el.nextBtn) el.nextBtn.disabled = L;
    if(el.quitBtn) el.quitBtn.disabled = L;

    // Disable the active input if present
    const input = document.getElementById("mainInput");
    if(input) input.disabled = L;
  }

  // -------- Normalisation helpers --------
  const ACC = {"á":"a","é":"e","í":"i","ó":"o","ú":"u","ü":"u","ñ":"n","Á":"A","É":"E","Í":"I","Ó":"O","Ú":"U","Ü":"U","Ñ":"N"};
  const stripAccents = (s)=> String(s||"").split("").map(ch=>ACC[ch]||ch).join("");
  const norm = (s)=> stripAccents(String(s||"").toLowerCase().trim());

  const LANGS = {
    es: {
      label: "Spanish",
      placeholder: "Write your answer in Spanish…",
      speech: "es-ES",
      chipLabels: { ser: "ser", estar: "estar", accent: "accents", structure: "structure" },
    },
    fr: {
      label: "French",
      placeholder: "Write your answer in French…",
      speech: "fr-FR",
      // Internal keys stay ser/estar, but labels are French
      chipLabels: { ser: "être", estar: "avoir", accent: "accents", structure: "structure" },
    },
    de: {
      label: "German",
      placeholder: "Write your answer in German…",
      speech: "de-DE",
      chipLabels: { ser: "sein", estar: "haben", accent: "Umlauts/ß", structure: "Konnektoren" },
    },
  };

  function safeLang(l){ return LANGS[l] ? l : "es"; }

  const LEVEL_INFO = [
    { title: "Basics", hint: "Short sentences. Clear subject + verb + 1 detail." },
    { title: "Daily life", hint: "Use time phrases (every day, on Mondays...). Add 2 details." },
    { title: "People", hint: "Describe appearance/personality. Use connectors (and, but, because)." },
    { title: "Places", hint: "Describe a place + activities. Use there is/are style structures." },
    { title: "Past routine", hint: "Use past time markers. Keep agreements consistent." },
    { title: "Opinions", hint: "Give reasons (because, so). Add examples." },
    { title: "Comparisons", hint: "More/less than, as…as. Add 3 details." },
    { title: "Plans", hint: "Future/intentions. Use will/going to equivalents." },
    { title: "Story", hint: "Sequence (first, then, after that). Maintain tense." },
    { title: "Boss", hint: "Longer answer. Use variety: connectors, opinions, details." },
  ];

  const THEME_ICONS = ["🧱","📅","🙂","🗺️","⏳","💬","⚖️","🚀","📖","👑"];

  const THEMES = LEVEL_INFO.map((t, i)=>({
    id: "t"+(i+1),
    idx: i,
    label: t.title,
    hint: t.hint,
    icon: THEME_ICONS[i] || "🎯",
  }));

  const THEME_BY_ID = Object.fromEntries(THEMES.map(t=>[t.id, t]));

  const PROMPT_BANK = [
    // Basics
    [
      { text: "Describe your classroom.", badge: "structure", chips: ["structure"] },
      { text: "Describe your best friend.", badge: "ser", chips: ["ser"] },
      { text: "Describe your bedroom.", badge: "structure", chips: ["structure"] },
      { text: "Describe your school.", badge: "structure", chips: ["structure"] },
      { text: "Describe your family.", badge: "ser", chips: ["ser"] },
      { text: "Describe your town.", badge: "structure", chips: ["structure"] },
      { text: "Describe your routine on a school day.", badge: "structure", chips: ["structure"] },
      { text: "Describe what you like to eat.", badge: "structure", chips: ["structure"] },
      { text: "Describe a teacher you like.", badge: "ser", chips: ["ser"] },
      { text: "Describe your favourite subject.", badge: "ser", chips: ["ser"] },
      { text: "Describe your favourite sport.", badge: "ser", chips: ["ser"] },
      { text: "Describe your favourite place in your house.", badge: "structure", chips: ["structure"] },
    ],
    // Daily life
    [
      { text: "Describe what you do after school.", badge: "structure", chips: ["structure"] },
      { text: "Describe a typical weekend.", badge: "structure", chips: ["structure"] },
      { text: "Describe your morning routine.", badge: "structure", chips: ["structure"] },
      { text: "Describe your lunch.", badge: "structure", chips: ["structure"] },
      { text: "Describe your favourite day of the week.", badge: "structure", chips: ["structure"] },
      { text: "Describe what you do on Fridays.", badge: "structure", chips: ["structure"] },
      { text: "Describe your hobbies.", badge: "ser", chips: ["ser"] },
      { text: "Describe your favourite film or series.", badge: "ser", chips: ["ser"] },
      { text: "Describe your phone (and why).", badge: "ser", chips: ["ser"] },
      { text: "Describe your pets (or ideal pet).", badge: "ser", chips: ["ser"] },
      { text: "Describe your favourite food.", badge: "accent", chips: ["accent"] },
      { text: "Describe a café/restaurant you like.", badge: "structure", chips: ["structure"] },
    ],
    // People
    [
      { text: "Describe your personality.", badge: "ser", chips: ["ser"] },
      { text: "Describe your appearance.", badge: "ser", chips: ["ser"] },
      { text: "Describe your best friend’s personality.", badge: "ser", chips: ["ser"] },
      { text: "Describe your favourite celebrity.", badge: "ser", chips: ["ser"] },
      { text: "Describe a classmate.", badge: "ser", chips: ["ser"] },
      { text: "Describe what makes someone a good friend.", badge: "structure", chips: ["structure"] },
      { text: "Describe your favourite outfit.", badge: "accent", chips: ["accent"] },
      { text: "Describe your teacher (and their class).", badge: "ser", chips: ["ser"] },
      { text: "Describe a person you admire.", badge: "ser", chips: ["ser"] },
      { text: "Describe your strengths and weaknesses.", badge: "structure", chips: ["structure"] },
      { text: "Describe what you like about your school.", badge: "structure", chips: ["structure"] },
      { text: "Describe your best friend’s family.", badge: "ser", chips: ["ser"] },
    ],
    // Places
    [
      { text: "Describe your town and what there is to do.", badge: "structure", chips: ["structure"] },
      { text: "Describe a holiday destination.", badge: "structure", chips: ["structure"] },
      { text: "Describe your favourite shop.", badge: "structure", chips: ["structure"] },
      { text: "Describe a park near you.", badge: "structure", chips: ["structure"] },
      { text: "Describe a restaurant in your town.", badge: "structure", chips: ["structure"] },
      { text: "Describe your school canteen.", badge: "structure", chips: ["structure"] },
      { text: "Describe your house from outside.", badge: "structure", chips: ["structure"] },
      { text: "Describe your local area in winter.", badge: "structure", chips: ["structure"] },
      { text: "Describe your favourite city.", badge: "structure", chips: ["structure"] },
      { text: "Describe your bedroom in detail.", badge: "structure", chips: ["structure"] },
      { text: "Describe your classroom in detail.", badge: "structure", chips: ["structure"] },
      { text: "Describe what you can do in your town at night.", badge: "structure", chips: ["structure"] },
    ],
    // Past routine
    [
      { text: "Describe what you did yesterday.", badge: "structure", chips: ["structure"] },
      { text: "Describe your last weekend.", badge: "structure", chips: ["structure"] },
      { text: "Describe a holiday you had.", badge: "structure", chips: ["structure"] },
      { text: "Describe a party you went to.", badge: "structure", chips: ["structure"] },
      { text: "Describe what you did last summer.", badge: "structure", chips: ["structure"] },
      { text: "Describe your best day ever.", badge: "structure", chips: ["structure"] },
      { text: "Describe what you ate yesterday.", badge: "structure", chips: ["structure"] },
      { text: "Describe a match/game you watched or played.", badge: "structure", chips: ["structure"] },
      { text: "Describe an embarrassing moment.", badge: "structure", chips: ["structure"] },
      { text: "Describe a day out with friends.", badge: "structure", chips: ["structure"] },
      { text: "Describe what you studied last night.", badge: "structure", chips: ["structure"] },
      { text: "Describe your last birthday.", badge: "structure", chips: ["structure"] },
    ],
    // Opinions
    [
      { text: "Describe your favourite subject and why.", badge: "structure", chips: ["structure"] },
      { text: "Describe your favourite sport and why.", badge: "structure", chips: ["structure"] },
      { text: "Describe social media: good and bad.", badge: "structure", chips: ["structure"] },
      { text: "Describe the best place to live (and why).", badge: "structure", chips: ["structure"] },
      { text: "Describe school uniforms: your opinion.", badge: "structure", chips: ["structure"] },
      { text: "Describe the ideal weekend.", badge: "structure", chips: ["structure"] },
      { text: "Describe what makes a good teacher.", badge: "structure", chips: ["structure"] },
      { text: "Describe the pros/cons of homework.", badge: "structure", chips: ["structure"] },
      { text: "Describe your favourite music (and why).", badge: "structure", chips: ["structure"] },
      { text: "Describe healthy vs unhealthy eating.", badge: "structure", chips: ["structure"] },
      { text: "Describe how you relax after school.", badge: "structure", chips: ["structure"] },
      { text: "Describe your opinion on exams.", badge: "structure", chips: ["structure"] },
    ],
    // Comparisons
    [
      { text: "Describe your town compared to Dublin.", badge: "structure", chips: ["structure"] },
      { text: "Describe your school compared to primary school.", badge: "structure", chips: ["structure"] },
      { text: "Describe the best and worst day of the week.", badge: "structure", chips: ["structure"] },
      { text: "Describe a friend who is more… than you.", badge: "structure", chips: ["structure"] },
      { text: "Describe summer vs winter in Ireland.", badge: "structure", chips: ["structure"] },
      { text: "Describe city life vs country life.", badge: "structure", chips: ["structure"] },
      { text: "Describe two hobbies and which you prefer.", badge: "structure", chips: ["structure"] },
      { text: "Describe school rules: which are better/worse.", badge: "structure", chips: ["structure"] },
      { text: "Describe your favourite food vs least favourite.", badge: "structure", chips: ["structure"] },
      { text: "Describe two holidays and compare them.", badge: "structure", chips: ["structure"] },
      { text: "Describe the best sport: compare options.", badge: "structure", chips: ["structure"] },
      { text: "Describe which app is most useful and why.", badge: "structure", chips: ["structure"] },
    ],
    // Plans
    [
      { text: "Describe your plans for next weekend.", badge: "structure", chips: ["structure"] },
      { text: "Describe your plans for the summer.", badge: "structure", chips: ["structure"] },
      { text: "Describe your dream holiday.", badge: "structure", chips: ["structure"] },
      { text: "Describe your future job (and why).", badge: "structure", chips: ["structure"] },
      { text: "Describe what you will do tonight.", badge: "structure", chips: ["structure"] },
      { text: "Describe your goals for this year.", badge: "structure", chips: ["structure"] },
      { text: "Describe what you want to improve at school.", badge: "structure", chips: ["structure"] },
      { text: "Describe how you will stay healthy.", badge: "structure", chips: ["structure"] },
      { text: "Describe a trip you want to take.", badge: "structure", chips: ["structure"] },
      { text: "Describe what you will do after exams.", badge: "structure", chips: ["structure"] },
      { text: "Describe a skill you want to learn.", badge: "structure", chips: ["structure"] },
      { text: "Describe your ideal future house.", badge: "structure", chips: ["structure"] },
    ],
    // Story
    [
      { text: "Tell a short story about a surprise.", badge: "structure", chips: ["structure"] },
      { text: "Tell a story about getting lost.", badge: "structure", chips: ["structure"] },
      { text: "Tell a story about a funny moment at school.", badge: "structure", chips: ["structure"] },
      { text: "Tell a story about meeting someone new.", badge: "structure", chips: ["structure"] },
      { text: "Tell a story about a problem you solved.", badge: "structure", chips: ["structure"] },
      { text: "Tell a story about a holiday disaster.", badge: "structure", chips: ["structure"] },
      { text: "Tell a story about a competition.", badge: "structure", chips: ["structure"] },
      { text: "Tell a story about helping a friend.", badge: "structure", chips: ["structure"] },
      { text: "Tell a story about a strange day.", badge: "structure", chips: ["structure"] },
      { text: "Tell a story about a new hobby.", badge: "structure", chips: ["structure"] },
      { text: "Tell a story about a lesson you learned.", badge: "structure", chips: ["structure"] },
      { text: "Tell a story about an unexpected message.", badge: "structure", chips: ["structure"] },
    ],
    // Boss
    [
      { text: "Describe your ideal day: morning, afternoon, night.", badge: "structure", chips: ["structure"] },
      { text: "Describe your school: buildings, people, subjects, opinion.", badge: "structure", chips: ["structure"] },
      { text: "Describe a holiday: place, activities, opinion, best moment.", badge: "structure", chips: ["structure"] },
      { text: "Describe technology in your life: pros/cons and examples.", badge: "structure", chips: ["structure"] },
      { text: "Describe a person you admire: appearance, personality, why.", badge: "ser", chips: ["ser"] },
      { text: "Describe your town: what it’s like, what you do, improvements.", badge: "structure", chips: ["structure"] },
      { text: "Describe healthy living: food, sport, sleep, routines.", badge: "structure", chips: ["structure"] },
      { text: "Describe your future: job, place, hobbies, goals.", badge: "structure", chips: ["structure"] },
      { text: "Describe friendships: what matters, problems, solutions.", badge: "structure", chips: ["structure"] },
      { text: "Describe school life: pressure, supports, what you’d change.", badge: "structure", chips: ["structure"] },
      { text: "Describe your family and your role in it.", badge: "ser", chips: ["ser"] },
      { text: "Describe an unforgettable day: before, during, after.", badge: "structure", chips: ["structure"] },
    ],
  ];

  // -------- State --------
  const state = {
    themeId: "t1",
    level: 1, // 1..10 within theme
    mode: "classic",
    lang: "es",
    showCorrections: false,
    prompts: [],
    idx: 0,
    answers: [],
    maxIdxReached: 0,
    locked: [],
    startedAt: 0,
    timer: null,
    elapsedMs: 0,
    mark: { items: [], wrong: 0, scoreSec: 0, passed: false, focus: "" },
    gymRequired: false,
    workshop: { required:false, cleared:false, focus:"", gate:null, stats:{correct:0, attempts:0, streak:0} },
    ai: { ok:false, error:"" },
    isMarking: false,
    roundFinished: false,
  };

  // -------- Storage keys --------
  const kStars = (themeId)=> `loops_themeStars_${themeId}`;
  const kRounds = ()=> `loops_rounds_played`;
  const kPB = (themeId, level, mode, lang)=> `loops_pb_${themeId}_L${level}_${mode}_${lang}`;

  function getStars(themeId){
    try{
      const raw = storage.get(kStars(themeId));
      if(!raw) return Array(10).fill(false);
      const arr = JSON.parse(raw);
      if(!Array.isArray(arr)) return Array(10).fill(false);
      const out = Array(10).fill(false);
      for(let i=0;i<10;i++) out[i] = !!arr[i];
      return out;
    }catch{ return Array(10).fill(false); }
  }
  function setStar(themeId, level, val){
    const arr = getStars(themeId);
    arr[level-1] = !!val;
    storage.set(kStars(themeId), JSON.stringify(arr));
  }
  function starsCount(themeId){ return getStars(themeId).filter(Boolean).length; }
  function totalStars(){ return THEMES.reduce((sum,t)=> sum + starsCount(t.id), 0); }

  function incRounds(){
    const v = Number(storage.get(kRounds())||"0")||0;
    storage.set(kRounds(), String(v+1));
  }
  function getRounds(){ return Number(storage.get(kRounds())||"0")||0; }

  function loadPB(themeId, level, mode, lang){
    try{
      const raw = storage.get(kPB(themeId,level,mode,lang));
      if(!raw) return null;
      const o = JSON.parse(raw);
      if(!o || typeof o.bestScore !== "number") return null;
      return o;
    }catch{ return null; }
  }
  function savePBIfBetter(themeId, level, mode, lang, scoreSec, wrong, timeMs){
    const current = loadPB(themeId, level, mode, lang);
    const entry = { bestScore: scoreSec, bestWrong: wrong, bestTimeMs: timeMs, at: Date.now() };
    if(!current || scoreSec < current.bestScore){
      storage.set(kPB(themeId,level,mode,lang), JSON.stringify(entry));
      return true;
    }
    return false;
  }

  function bestForTheme(themeId, mode, lang){
    let best = null;
    for(let lvl=1; lvl<=10; lvl++){
      const pb = loadPB(themeId, lvl, mode, lang);
      if(pb && (best===null || pb.bestScore < best.bestScore)) best = pb;
    }
    return best;
  }

  // -------- Unlock targets --------
  function unlockTargetForLevel(level){ return Math.max(150, 220 - (Number(level)||1) * 7); }
  function roundPassesUnlock(wrong, score, level){ return (wrong <= 2) && (score <= unlockTargetForLevel(level)); }

  // -------- Gym scaling --------
  function gymTarget(level, wrong){
    // Gradual difficulty: Level 1–10 => target 2..6, with a small bump for big fails.
    const lvl = Math.max(1, Math.min(10, Number(level)||1));
    const base = 2 + Math.floor((lvl-1)/2); // 1–2:2, 3–4:3, 5–6:4, 7–8:5, 9–10:6
    const sev  = (wrong>=8)?1:0; // keep it kind — no +2 spikes
    return Math.min(6, base + sev);
  }

  // -------- UI helpers --------
  function fmtTime(ms){
    const s = Math.max(0, Math.round(ms/1000));
    const m = Math.floor(s/60);
    const r = String(s%60).padStart(2,"0");
    return `${m}:${r}`;
  }

  function toast(msg){
    if(!el.toast) return;
    el.toast.textContent = msg;
    el.toast.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(()=> el.toast.classList.add("hidden"), 2200);
  }

  function renderStars(container, n){
    if(!container) return;
    container.innerHTML = "";
    for(let i=0;i<10;i++){ 
      const d=document.createElement("div");
      d.className = "star" + (i < n ? " on" : "");
      container.appendChild(d);
    }
  }

  function updatePills(){
    if(el.pillPenalty) el.pillPenalty.textContent = `+${PENALTY_SEC}s`;
    if(el.pillMode) el.pillMode.textContent = state.mode;
    if(el.pillLang) el.pillLang.textContent = LANGS[state.lang].label;
    const t = THEME_BY_ID[state.themeId] || THEMES[0];
    if(el.pillLevel) el.pillLevel.textContent = `${t.label} · L${state.level}`;
    if(el.subtitle) el.subtitle.textContent = "Practice. Fix. Level up.";
  }

  // -------- Home: theme tiles --------
  function renderThemeTiles(){
    if(!el.themeGrid) return;
    el.themeGrid.innerHTML = "";
    const mode = state.mode;
    const lang = state.lang;

    THEMES.forEach(t=>{
      const stars = starsCount(t.id);
      const unlockedLevel = Math.min(10, stars+1);
      const pb = bestForTheme(t.id, mode, lang);

      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "themeTile";
      tile.innerHTML = `
        <div class="themeBg" aria-hidden="true"></div>
        <div class="themeTop">
          <div class="themeIcon">${t.icon}</div>
          <div class="themeName">${t.label}</div>
        </div>
        <div class="themeMetaLine">
          <div class="starsRow" data-stars></div>
          <div class="muted small">${stars}/10★</div>
        </div>
        <div class="themeMiniBar"><div class="themeMiniFill" style="width:${stars*10}%"></div></div>
        <div class="themeMetaLine">
          <div class="muted small">Unlocked: L${unlockedLevel}</div>
          <div class="muted small">${pb?("Best: "+pb.bestScore.toFixed(1)+"s"):"Best: —"}</div>
        </div>
      `;
      renderStars(tile.querySelector("[data-stars]"), stars);
      tile.addEventListener("click", ()=> openTheme(t.id));
      el.themeGrid.appendChild(tile);
    });

    const total = totalStars();
    if(el.globalText) el.globalText.textContent = `${total} / ${THEMES.length*10}`;
    if(el.globalFill) el.globalFill.style.width = `${(total/(THEMES.length*10))*100}%`;

    if(el.roundsOut) el.roundsOut.textContent = String(getRounds());
    if(el.pbOut){
      const pb = bestForTheme(state.themeId, state.mode, state.lang);
      el.pbOut.textContent = pb ? `${pb.bestScore.toFixed(1)}s (wrong ${pb.bestWrong})` : "—";
    }
  }

  function openTheme(themeId){
    state.themeId = themeId;
    updatePills();
    renderThemeLevelScreen();
    show("theme");
  }

  function renderThemeLevelScreen(){
    const t = THEME_BY_ID[state.themeId] || THEMES[0];
    if(el.themeTitle) el.themeTitle.textContent = t.label;
    if(el.themeSub) el.themeSub.textContent = t.hint;

    const starsArr = getStars(state.themeId);
    const stars = starsArr.filter(Boolean).length;
    renderStars(el.themeStars, stars);
    if(el.themeFill) el.themeFill.style.width = `${stars*10}%`;
    const pb = bestForTheme(state.themeId, state.mode, state.lang);
    if(el.themeBest) el.themeBest.textContent = pb ? `Best: ${pb.bestScore.toFixed(1)}s` : "Best: —";

    if(el.themeLevels){
      el.themeLevels.innerHTML = "";
      for(let lvl=1; lvl<=10; lvl++){ 
        const unlocked = (lvl===1) || (stars >= (lvl-1));
        const passed = !!starsArr[lvl-1];
        const b=document.createElement("button");
        b.type="button";
        b.className = "levelBtn" + (unlocked ? "" : " locked");
        b.innerHTML = `Level ${lvl}<span class="sub">${passed?"★ cleared":(unlocked?"open":"locked")}</span>`;
        if(!unlocked) b.disabled = true;
        b.addEventListener("click", ()=>{ state.level = lvl; updatePills(); startRound(); });
        el.themeLevels.appendChild(b);
      }
    }
  }

  // -------- Game prompts --------
  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
    return a;
  }

    function isConnectorPrompt(p){
    if(!p) return false;
    const badge = String(p.badge||"").toLowerCase();
    // Only treat explicit connector/link prompts as connector prompts.
    if(badge==="connector" || badge==="connectors" || badge==="link") return true;

    const txt = String(p.text||"").toLowerCase();
    // Connector cue words (English prompt text)
    return /\b(because|so that|however|but|then|after|before|when|while|since|first|second|finally|also|in addition|on the other hand)\b/.test(txt);
  }


  function connectorCapForLevel(level){
    const lvl = Number(level)||1;
    if(lvl<=2) return 2;
    if(lvl===3) return 3;
    if(lvl<=5) return 4;
    return 5;
  }

    function samplePrompts(themeId){
    const t = THEME_BY_ID[themeId] || THEMES[0];
    const pool = PROMPT_BANK[t.idx] || PROMPT_BANK[0] || [];
    const lvl = Number(state.level)||1;
    const cap = connectorCapForLevel(lvl);

    const out = [];
    const used = new Set();
    let connCount = 0;

    // Shuffle once and pick while respecting MAX connector cap.
    for(const p of shuffle(pool)){
      const key = String(p.text||"").trim().toLowerCase();
      if(!key || used.has(key)) continue;

      const isConn = isConnectorPrompt(p);
      if(isConn && connCount >= cap) continue;

      out.push(p);
      used.add(key);
      if(isConn) connCount++;
      if(out.length >= PROMPTS_PER_ROUND) break;
    }

    // If we still don't have 10 (small pool), top up with any non-duplicates (ignore cap as last resort)
    if(out.length < PROMPTS_PER_ROUND){
      for(const p of shuffle(pool)){
        const key = String(p.text||"").trim().toLowerCase();
        if(!key || used.has(key)) continue;
        out.push(p);
        used.add(key);
        if(out.length >= PROMPTS_PER_ROUND) break;
      }
    }

    return out.slice(0, PROMPTS_PER_ROUND);
  }


  function startRound(){
    state.prompts = samplePrompts(state.themeId);
    state.idx = 0;
    state.answers = Array(PROMPTS_PER_ROUND).fill("");
    state.locked = Array(PROMPTS_PER_ROUND).fill(false);
    state.maxIdxReached = 1;
    state.startedAt = Date.now();
    state.isMarking = false;
    state.roundFinished = false;
    state.elapsedMs = 0;
    clearInterval(state.timer);
    state.timer = setInterval(()=>{ state.elapsedMs = Date.now()-state.startedAt; updateGameHeader(); }, 400);
    buildPromptUI();
    updateGameHeader();
    show("game");
    setNavLocked(false);
  }

  function updateGameHeader(){
    const t = THEME_BY_ID[state.themeId] || THEMES[0];
    if(el.gameTitle) el.gameTitle.textContent = `${t.label} · Level ${state.level}`;
    if(el.progressText) el.progressText.textContent = `${state.idx+1} / ${PROMPTS_PER_ROUND}`;
    if(el.progressFill) el.progressFill.style.width = `${((state.idx+1)/PROMPTS_PER_ROUND)*100}%`;

    if(el.tagCap) el.tagCap.textContent = (state.mode==="sprint") ? "Sprint cap: 90s" : `Penalty: +${PENALTY_SEC}s`;
    if(el.tagTips){
      const lvl = Number(state.level)||1;
      const badge = (state.prompts && state.prompts[state.idx] && state.prompts[state.idx].badge) ? state.prompts[state.idx].badge : "";
      if(lvl<=2){
        el.tagTips.textContent = "Tip: one clean sentence + one detail.";
      }else if(lvl<=4){
        el.tagTips.textContent = "Tip: one clean sentence + one detail. Watch verbs & articles. Connectors only if they fit.";
      }else{
        el.tagTips.textContent = "Tip: accuracy first (verbs/articles), then flow (connectors).";
      }
    }
    if(el.nextBtn && !state.isMarking){ el.nextBtn.textContent = (state.idx < PROMPTS_PER_ROUND-1) ? "Next" : "Finish"; }
    if(el.prevBtn && !state.isMarking){ el.prevBtn.disabled = (state.idx===0); }
  }

  // TTS + Dictation
  function speak(text){ try{ if(!window.speechSynthesis) return; const u=new SpeechSynthesisUtterance(String(text||"")); u.lang=LANGS[state.lang].speech; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); }catch{} }
  function startDictation(onText){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ toast("Dictation not supported on this browser"); return; }
    try{
      const rec = new SR();
      rec.lang = LANGS[state.lang].speech;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e)=>{ const txt = e.results && e.results[0] && e.results[0][0] ? e.results[0][0].transcript : ""; onText && onText(txt); };
      rec.start();
    }catch{}
  }

  
  function isIdxLocked(i){
    // Once you move past a question, it becomes read-only (no editing by going back).
    const max = Number(state.maxIdxReached)||1;
    if(i < (max-1)) return true;
    return !!state.locked[i];
  }

function buildPromptUI(){
    if(!el.promptArea) return;
    el.promptArea.innerHTML = "";
    const p = state.prompts[state.idx];

    const wrap = document.createElement("div");
    wrap.className = "promptCard";

    const chipText = (p && p.chips && p.chips.length) ? p.chips.map(k=>LANGS[state.lang].chipLabels[k]||k).join(" · ") : "—";

    wrap.innerHTML = `
      <div class="promptText">${p ? p.text : "—"}</div>
      <div class="chipRow">${chipText}</div>
      ${scaffoldHtml(scaffoldForPrompt(p ? p.text : "", state.level, state.lang))}
      <div class="inputRow">
        <textarea class="input mainInput" id="mainInput" rows="4" spellcheck="false" placeholder="${LANGS[state.lang].placeholder}"></textarea>
        <button class="btn ghost tiny" id="speakBtn" type="button">🔊</button>
        <button class="btn ghost tiny" id="micBtn" type="button">🎤</button>
      </div>
      <div class="hint">${(THEME_BY_ID[state.themeId]||THEMES[0]).hint}</div>
    `;
    el.promptArea.appendChild(wrap);

    const input = wrap.querySelector("#mainInput");
    input.value = state.answers[state.idx] || "";

    const isLocked = isIdxLocked(state.idx);
    if(isLocked){
      input.readOnly = true;
      input.classList.add("locked");
    }else{
      input.addEventListener("input", ()=>{ state.answers[state.idx] = input.value; });
      input.addEventListener("keydown", (e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); handleNext(); } });
    }

    wrap.querySelector("#speakBtn").addEventListener("click", ()=> speak(p.text));
    wrap.querySelector("#micBtn").addEventListener("click", ()=> startDictation((t)=>{ if(!isLocked){ input.value=t; state.answers[state.idx]=t; } }));
    // focus only when editable (avoid mobile scroll jump when reviewing)
    if(!isLocked) input.focus();
  }

  function handlePrev(){
    if(state.idx===0) return;
    // Save defensively: never overwrite a non-empty saved answer with an empty DOM value.
    const cur = document.getElementById("mainInput");
    if(cur){
      const v = cur.value;
      if(String(v||"").trim() || !String(state.answers[state.idx]||"").trim()) state.answers[state.idx] = v;
    }
    state.locked[state.idx] = true;
    state.maxIdxReached = Math.max(state.maxIdxReached, state.idx+1);
    state.idx--;
    buildPromptUI();
    updateGameHeader();
  }
  function handleNext(){
    // Save defensively and lock once the learner moves on
    const cur = document.getElementById("mainInput");
    if(cur){
      const v = cur.value;
      if(String(v||"").trim() || !String(state.answers[state.idx]||"").trim()) state.answers[state.idx] = v;
    }
    state.locked[state.idx] = true;
    state.maxIdxReached = Math.max(state.maxIdxReached, state.idx+1);
    if(state.idx < PROMPTS_PER_ROUND-1){
      state.idx++;
      state.maxIdxReached = Math.max(state.maxIdxReached, state.idx+1);
      buildPromptUI();
      updateGameHeader();
      return;
    }
    finishRound();
  }

  // Marking helpers
  function computeScoreSec(timeMs, wrong){ return (timeMs/1000) + wrong*PENALTY_SEC; }
  function levelRubric(level){
    const lvl = Math.min(10, Math.max(1, Number(level)||1));
    const minWordsByLevel = [0,4,5,6,7,8,9,10,11,12,13];
    const minWords = minWordsByLevel[lvl] || 6;
    const minChars = Math.min(260, 20 + lvl*14);
    const requireConnector = (lvl>=6);
    const requireBe = (lvl>=2);
    return {minWords,minChars,requireConnector,requireBe};
  }
  const ES_FIX = {"espanol":"español","tambien":"también","facil":"fácil","dificil":"difícil","futbol":"fútbol","musica":"música","también":"también"};
  function tidySuggestion(raw){ let s=String(raw||"").trim(); if(!s) return ""; s=s.replace(/\s+/g," ").trim(); s=s.charAt(0).toUpperCase()+s.slice(1); if(state.lang==="es"){ s=s.split(/(\b)/).map(tok=>{ const low=tok.toLowerCase(); return ES_FIX[low] ? ES_FIX[low] : tok; }).join(""); s=s.replace(/\bde\s+español\b/i, "de español"); } if(!/[.!?]$/.test(s)) s += "."; return s; }
  function countWords(s){ return String(s||"").trim().split(/\s+/).filter(Boolean).length; }
  function connectorPresent(s){ const x=norm(s); return /(\by\b|\bpero\b|\bporque\b|\bademas\b|\bentonces\b|\btambien\b|\bya\s+que\b)/.test(x) || /(\bet\b|\bmais\b|\bparce\s+que\b|\bdonc\b)/.test(x) || /(\bund\b|\baber\b|\bweil\b|\bdeshalb\b)/.test(x); }
  function beVerbPresent(s){ const x=norm(s); if(state.lang==="es") return /(\bes\b|\bson\b|\bestoy\b|\bestá\b|\bsoy\b)/.test(x); if(state.lang==="fr") return /(\bc\s*est\b|\best\b|\bsont\b|\bsuis\b|\bai\b|\bas\b|\ba\b|\bont\b)/.test(x); if(state.lang==="de") return /(\bist\b|\bsind\b|\bbin\b|\bseid\b|\bhabe\b|\bhat\b|\bhaben\b)/.test(x); return false; }
  
  function pickModelAnswer(p){
    const prompt = (p && p.text) ? String(p.text) : "";
    // Always return a prompt-based model. Never echo the learner's own answer.
    try{
      const rub = levelRubric(state.level);
      return buildSuggestionForItem(prompt, "", state.lang, rub, "detail");
    }catch(_){
      // ultra-safe fallback
      if(state.lang==="es") return "Es interesante y me gusta bastante.";
      if(state.lang==="fr") return "C’est intéressant et j’aime bien.";
      if(state.lang==="de") return "Es ist interessant und ich mag es.";
      return "It’s interesting and I like it.";
    }
  }

  function escapeHtml(s){ return String(s||"").replace(/[&<>"]/g, ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch])); }
function scaffoldForPrompt(text, level, lang){
    const t = String(text||"").toLowerCase();
    const lvl = Math.min(10, Math.max(1, Number(level)||1));

    const base = [];
    if(lvl <= 2){ base.push("1 clean sentence"); base.push("+ 1 extra detail"); }
    else if(lvl <= 5){ base.push("2 ideas"); base.push("1 opinion"); base.push("1 detail"); }
    else { base.push("opinion + reason (porque)"); base.push("1 connector"); base.push("1 extra detail"); }

    let out = [];
    // Topic-specific scaffolds (JC-style)
    if(t.includes("town") || t.includes("city") || t.includes("village") || t.includes("pueblo") || t.includes("ciudad")){
      out = ["location / size", "2 places (parque, cine…)", "1 activity"].concat(base);
    } else if(t.includes("school") || t.includes("college") || t.includes("coleg") || t.includes("institut") || t.includes("escuela")){
      out = ["where it is", "2 details (subjects / teachers / rules)", "opinion", "why (porque)"];
    } else if(t.includes("best friend") || t.includes("friend") || t.includes("amigo") || t.includes("person") || t.includes("admire")){
      out = ["appearance", "personality", "what they do/like", "why (porque)"];
    } else if(t.includes("house") || t.includes("home") || t.includes("casa") || t.includes("bedroom") || t.includes("habitaci")){
      out = ["where it is", "2 rooms / objects", "opinion", "1 extra detail"].concat(base);
    } else if(t.includes("routine") || t.includes("weekday") || t.includes("daily") || t.includes("día") || t.includes("horario")){
      out = ["time phrase", "3 verbs", "1 connector", "opinion"].concat(base);
    } else {
      out = base;
    }

    // De-dup + cap length
    const seen = new Set();
    const clean = [];
    for(const s of out){
      const k = String(s||"").trim();
      if(!k) continue;
      const low = k.toLowerCase();
      if(seen.has(low)) continue;
      seen.add(low);
      clean.push(k);
    }
    return clean.slice(0,6);
  }

  function scaffoldHtml(list){
    if(!list || !list.length) return "";
    return `<div class="scaffoldBar">${list.map(x=>`<span class="scaffoldChip">${escapeHtml(x)}</span>`).join("")}</div>`;
  }

  

  async function markWithAI(payload){
    if(typeof window.aiCorrect !== "function") throw new Error("aiCorrect not found");
    const timeoutMs = 12000;
    return await Promise.race([
      window.aiCorrect(payload),
      new Promise((_,rej)=> setTimeout(()=> rej(new Error("AI timeout")), timeoutMs))
    ]);
  }

  async function finishRound(){
    if(state.isMarking) return;
    state.isMarking = true;
    state.roundFinished = true;
    setNavLocked(true);
    clearInterval(state.timer);
    state.elapsedMs = Date.now() - state.startedAt;
    if(el.aiStatusText) el.aiStatusText.textContent = "Marking with coach…";

    try{

    const rubric = levelRubric(state.level);
    const payload = {
      lang: state.lang,
      theme: state.themeId,
      level: state.level,
      mode: state.mode,
      penalty_sec: PENALTY_SEC,
      rubric,
      prompts: state.prompts.map(p=>p.text),
      badges: state.prompts.map(p=>p.badge||""),
      answers: state.answers,
    };

    let aiResp=null;
    try{ aiResp = await markWithAI(payload); state.ai.ok=true; state.ai.error=""; }
    catch(e){ state.ai.ok=false; state.ai.error=String(e&&e.message?e.message:e); }

    const aiItems = [];
    if(aiResp){
      const list = aiResp.items || aiResp.results || aiResp.answers || aiResp.data;
      if(Array.isArray(list)) list.forEach((it,i)=> aiItems[i]=it||null);
    }

    const items=[];
    const reasonsCount={};
    let wrong=0;

    for(let i=0;i<PROMPTS_PER_ROUND;i++){ 
      const p=state.prompts[i];
      const ans=String(state.answers[i]||"").trim();
      const ai=aiItems[i]||{};
      const aiCorrection = ai.correction || ai.correct || ai.model || ai.example_answer || ai.exemplar || ai.rewrite || ai.ideal || ai.suggested || "";
      const aiTip = ai.tip || ai.next_tip || ai.advice || ai.hint || "";
      const aiWhy = ai.reason || ai.rationale || ai.notes || "";

      let ok=true;
      let reason="";
      if(!ans){ ok=false; reason="Blank"; }
      else {
        const w=countWords(ans);
        if(w < rubric.minWords || ans.length < rubric.minChars){ ok=false; reason="Too short"; }
        if(ok && rubric.requireConnector && (/because|why|opinion|reasons|first|then|after|before|during|sequence|story/i.test(p.text))){ if(!connectorPresent(ans)){ ok=false; reason="Missing connector"; } }
        if(ok && rubric.requireBe && p.badge==="ser"){ if(!beVerbPresent(ans)){ ok=false; reason="Missing to-be"; } }
      }

      const aiSaysCorrect = (ai.is_correct===true) || (ai.isCorrect===true) || (ai.correct===true);
      if(!ok && aiSaysCorrect){ ok=true; reason=""; }

      const suggestion = (aiCorrection && String(aiCorrection).trim()) ? String(aiCorrection).trim() : buildSuggestionForItem(p.text, "", state.lang, rubric, "detail");
      const tip = (aiTip && String(aiTip).trim()) ? String(aiTip).trim() : (ok ? "Nice — add one extra detail next time." : "Upgrade: add one extra detail + keep it one clean sentence.");
      const why = (aiWhy && String(aiWhy).trim()) ? String(aiWhy).trim() : (ok ? "" : `To score: ${reason}.`);

      if(!ok){ wrong++; reasonsCount[reason] = (reasonsCount[reason]||0)+1; }

      const det = detectTags(p.text, ans||"", state.lang, rubric);
      const t2 = tipForTags(det.tags, state.lang) || tip;
      items.push({ n:i+1, prompt:p.text, answer:ans||"—", ok, reason, suggestion, tip: t2, why, tags: det.tags, examples: det.examples });
    }

    const scoreSec = computeScoreSec(state.elapsedMs, wrong);
    const passed = roundPassesUnlock(wrong, scoreSec, state.level);


  // Coach focus (one thing only)
  const focus = pickRoundFocus(items, state.lang, rubric);
  state.mark = { items, wrong, scoreSec, passed, focus: `${focus.label} (${focus.count})`, focusTag: focus.tag, focusLabel: focus.label, focusCount: focus.count, focusExamples: focus.examples, topTags: focus.top, tagCounts: focus.counts };
  state.gymRequired = (wrong >= 3);
  // Make feedback a cornerstone: show it by default when anything is wrong
  state.showCorrections = true;

  incRounds();
  savePBIfBetter(state.themeId, state.level, state.mode, state.lang, scoreSec, wrong, state.elapsedMs);

  let lastReward = null;
  if(passed){
    setStar(state.themeId, state.level, true);
    toast("★ Level cleared!");
    lastReward = awardForPass(scoreSec, wrong, unlockTargetForLevel(state.level));
    state.lastReward = lastReward;
  }else{
    state.lastReward = null;
  }

  // Rewrite suggestions to match focus (avoid samey output)
  state.mark.items = state.mark.items.map(it=>{
    const sugg = buildSuggestionForItem(it.prompt, it.answer, state.lang, rubric, state.mark.focusTag);
    // Only show detailed coach note for the chosen focus
    let why = it.why || "";
    if(state.mark.focusTag==="spelling" && it.examples && it.examples.length){
      why = (it.examples.slice(0,3).join(" • "));
    }else if(state.mark.focusTag==="missing_be"){
      why = (state.lang==="es") ? "Coach note: include es/está/son where needed." : why;
    }else if(state.mark.focusTag==="too_short" || state.mark.focusTag==="detail"){
      why = (state.lang==="es") ? "Coach target: add ONE extra detail (también / además...)." : "Coach target: add ONE extra detail.";
    }else if(state.mark.focusTag==="no_connector"){
      why = (state.lang==="es") ? "Coach target: connect ideas (y/pero/porque/además)." : "Coach target: use a connector.";
    }
    return {...it, suggestion: sugg, why};
  });

  // Keep corrections visible by default when mistakes exist
  renderResults();
  show("results");
    }catch(err){
      console.error(err);
      // Fallback: still produce results so the player can always finish the round.
      try{
        const rubric = levelRubric(state.level);
        const items = [];
        let wrong = 0;
        for(let i=0;i<PROMPTS_PER_ROUND;i++){
          const p = state.prompts[i] || {text:"—", badge:""};
          const ans = String(state.answers[i]||"").trim();
          let ok = !!ans;
          let reason = ok ? "" : "Blank";
          if(ok){
            const w = countWords(ans);
            if(w < rubric.minWords || ans.length < rubric.minChars){ ok=false; reason="Too short"; }
            if(ok && rubric.requireBe && (p.badge==="ser") && !beVerbPresent(ans)){ ok=false; reason="Missing to-be"; }
          }
          if(!ok) wrong++;
          const suggestion = buildSuggestionForItem(p.text||"", "", state.lang, rubric, "detail");
          const det = detectTags(p.text||"", ans||"", state.lang, rubric);
          items.push({ n:i+1, prompt:p.text||"—", answer:ans||"—", ok, reason, suggestion, tip: tipForTags(det.tags,state.lang)||"", why: ok?"":("To score: "+reason+"."), tags: det.tags, examples: det.examples });
        }
        const scoreSec = computeScoreSec(state.elapsedMs, wrong);
        const passed = roundPassesUnlock(wrong, scoreSec, state.level);
        const focus = pickRoundFocus(items, state.lang, rubric);
        state.mark = { items, wrong, scoreSec, passed, focus: `${focus.label} (${focus.count})`, focusTag: focus.tag, focusLabel: focus.label, focusCount: focus.count, focusExamples: focus.examples, topTags: focus.top, tagCounts: focus.counts };
        state.gymRequired = (wrong >= 3);
        state.showCorrections = true;
        state.ai.ok = false;
        state.ai.error = "fallback used";
      }catch(_){ }
      try{ toast("Coach was slow — showing fallback results."); }catch(_){ }
    }finally{
      state.isMarking = false;
      // Ensure results are visible if we have a mark payload
      try{ if(state.mark){ renderResults(); show("results"); } }catch(_){ }
      setNavLocked(false);
    }
}

  function showCoachIntermission(){
  const name = getPlayerName() || "mate";
  const m = state.mark;
  const focus = `${m.focusLabel}${m.focusCount?` (${m.focusCount})`:""}`;
  const vibe = m.passed ? pick(COACH.praise) : pick(COACH.push);
  const nudge = m.passed ? pick(COACH.push) : "";
  const jail = state.gymRequired ? pick(COACH.jail) : "";

  const ex = (m.focusExamples||[]).slice(0,2);
  const exHtml = ex.length ? `<div class="muted" style="margin-top:6px">Examples: ${ex.map(x=>`<b>${escapeHtml(x)}</b>`).join(" • ")}</div>` : "";

  const reward = state.lastReward;
  const rewardHtml = reward ? `<div class="muted" style="margin-top:8px"><b>Prize:</b> +${reward.coins} ⚡${reward.loot?` • ${escapeHtml(reward.loot.name)}`:""}</div>` : "";


  // One concrete example: what you wrote vs what 'correct' looks like
  const ref =
       (m.items||[]).find(it=> (it.tags||[]).includes(m.focusTag) && !it.ok)
    || (m.items||[]).find(it=> !it.ok)
    || (m.items||[])[0];

  const wrote = ref ? escapeHtml(ref.answer||"") : "";
  const model = ref ? escapeHtml(ref.suggestion||"") : "";

  const focusTag = m.focusTag || "detail";
  const reasonMap = {
    spelling: "Spelling/accents cost easy points. Fix them and everything reads smarter.",
    verb_form: "Wrong verb form breaks the sentence. We fix the engine first.",
    articles_gender: "Articles/gender are small, but they shout 'beginner' when wrong. We tighten them up.",
    articles: "Articles make Spanish sound natural (un/una, el/la).",
    word_order: "Word order changes meaning. Get the pattern, then it’s automatic.",
    missing_be: "You need the ‘to be’ verb to make descriptions work.",
    no_connector: "Your ideas need linking. One correct connector makes it flow.",
    too_short: "Too short = no marks. Add one detail and you jump up.",
    detail: "Detail wins marks. One extra fact is the difference."
  };

  const drillMap = {
    spelling: "Drill: clean spelling/accents.",
    verb_form: "Drill: verb forms (soy/tengo/me gusta).",
    articles_gender: "Drill: articles + gender (el/la).",
    articles: "Drill: articles (un/una, el/la).",
    word_order: "Drill: word order patterns.",
    missing_be: "Drill: ‘to be’ (ser/estar).",
    no_connector: "Drill: connectors (y/pero/porque…).",
    too_short: "Drill: add one extra detail.",
    detail: "Drill: add one extra detail."
  };

  const reasonText = reasonMap[focusTag] || "We fix one thing, properly.";
  const drillText  = drillMap[focusTag]  || "Drill: quick reps.";
  const warn = (COACH.levelWarnings && COACH.levelWarnings[(Number(state.level)||1)-1]) ? COACH.levelWarnings[(Number(state.level)||1)-1] : "";

  const sub = m.passed ? `Nice one, ${escapeHtml(name)}.` : `Right ${escapeHtml(name)} — quick fix time.`;
  const html = `
    <div><b>${escapeHtml(vibe)}</b> ${nudge?escapeHtml(nudge):""}</div>
    <div class="muted" style="margin-top:6px"><b>Coach diagnosis:</b> ${escapeHtml(reasonText)}</div>
    <div class="muted" style="margin-top:6px"><b>${escapeHtml(drillText)}</b>${warn?` <span style="opacity:.85">• ${escapeHtml(warn)}</span>`:""}</div>
    ${ (wrote && model) ? `<div class="muted" style="margin-top:8px"><b>You wrote:</b> ${wrote}<br><b>Coach wants:</b> ${model}</div>` : "" }
    <div class="muted" style="margin-top:6px">
      Focus: <b>${escapeHtml(focus)}</b>
      <span class="muted"> • </span>
      Score: <b>${m.scoreSec.toFixed(1)}s</b>
      <span class="muted"> • </span>
      Wrong: <b>${m.wrong}</b>
    </div>
    ${exHtml}
    ${rewardHtml}
    ${state.gymRequired ? `<div style="margin-top:10px"><b>${escapeHtml(jail)}</b></div>` : ""}
  `;

  if(state.gymRequired){
    showCoachModal({
      title: COACH.name,
      avatar: COACH.avatar,
      sub,
      html,
      primaryText: "Gym now 🔒",
      secondaryText: "Back to Home",
      onPrimary: ()=>{ openGymFromResults(); },
      onSecondary: ()=>{ show("home"); renderThemeTiles(); }
    });
  }else{
    showCoachModal({
      title: COACH.name,
      avatar: COACH.avatar,
      sub,
      html,
      primaryText: "See Results ✓",
      secondaryText: m.passed ? "Back to Home" : "Try Again",
      onPrimary: ()=>{ if(state.lastReward) showRewardPop(state.lastReward); },
      onSecondary: ()=>{ if(m.passed){ show("home"); renderThemeTiles(); } else startRound(); }
    });
  }
}

function renderResults(){
    updatePills();
    const m=state.mark;
    if(el.aiStatusText) el.aiStatusText.textContent = state.ai.ok ? "Marked by coach ✓" : `Marked (AI slow/failed — fallback used): ${state.ai.error}`;
    if(el.timeOut) el.timeOut.textContent = fmtTime(state.elapsedMs);
    if(el.wrongOut) el.wrongOut.textContent = String(m.wrong);
    if(el.scoreOut) el.scoreOut.textContent = `${m.scoreSec.toFixed(1)}s`;
    if(el.targetOut) el.targetOut.textContent = `${unlockTargetForLevel(state.level)}s + ≤2 wrong`;

    if(el.coachFocus) el.coachFocus.textContent = m.passed ? "✅ Passed — next level unlocked (in this theme)." : `Coach focus: ${m.focus}. ${state.gymRequired ? "Gym required (3+ wrong)." : "Try again."}`;

    if(el.coachVerdict){
      const nm = getPlayerName() || 'mate';
      const focus = (m.focusLabel||'Focus') + (m.focusCount?` (${m.focusCount})`:'' );
      const msg = m.passed
        ? `Good, ${nm}. Level unlocked. Don’t get sloppy.`
        : `Right, ${nm}. ${focus}. Fix it.`;
      const why = state.gymRequired
        ? 'Gym required: 3+ wrong. Clear the reps to unlock the exit.'
        : 'You can tap Gym for optional reps, or try again for a cleaner round.';
      el.coachVerdict.innerHTML = `<b>${escapeHtml(COACH.name)}:</b> ${escapeHtml(msg)}<br><span class="muted">${escapeHtml(why)}</span>`;
    }


    if(el.toggleFeedbackBtn){
      el.toggleFeedbackBtn.textContent = state.showCorrections ? "Hide Corrections" : "Show Corrections";
    }

    if(el.feedbackList){
      // Keep feedback available (even when hidden) so it never feels 'empty'
      el.feedbackList.classList.toggle("hidden", !state.showCorrections);
      el.feedbackList.innerHTML = "";

      const items = (m.items && m.items.length) ? m.items : state.prompts.map((p,i)=>({
        n:i+1,
        prompt: p ? p.text : "—",
        answer: String(state.answers[i]||"").trim() || "—",
        ok: true,
        suggestion: pickModelAnswer(p),
        tip: "",
        why: ""
      }));

      items.forEach(it=>{
        const sc = scaffoldForPrompt(it.prompt, state.level, state.lang);
        const card=document.createElement("div");
        card.className="fbCard";
        card.innerHTML = `
          <div class="fbTop">
            <div class="fbNum">${it.n}</div>
            <div class="fbPrompt">${escapeHtml(it.prompt)}${scaffoldHtml(sc)}</div>
            <div class="fbVerdict ${it.ok?"good":"bad"}">${it.ok?"OK":"Fix"}</div>
          </div>
          <div class="fbBody">
            <div class="fbBox">
              <div class="fbLabel">Your answer</div>
              <div class="fbText">${escapeHtml(it.answer)}</div>
            </div>
            <div class="fbBox">
              <div class="fbLabel">Coach model (what “correct” looks like)</div>
              <div class="fbText">${escapeHtml(it.suggestion||"—")}</div>
            </div>
          </div>
          <div class="fbTip">${escapeHtml(it.tip||"")}${it.why?("<br><span style='opacity:.85'>"+escapeHtml(it.why)+"</span>"):""}</div>
        `;
        el.feedbackList.appendChild(card);
      });

      // Nudge: if we're showing, scroll into view so it doesn't hide below the fold on mobile
      if(state.showCorrections){
        setTimeout(()=>{ try{ el.feedbackList.scrollIntoView({block:"start"}); }catch(_){ } }, 60);
      }
    }


    if(el.workshopBtn) el.workshopBtn.textContent = state.gymRequired ? "Gym" : "Gym (optional)";
    if(el.resultsHint) el.resultsHint.textContent = state.gymRequired ? "Gym is required when you get 3+ wrong. You can go Back to Home and train a different theme — but this level stays locked until you pass." : "Tip: aim for ≤2 wrong and beat the target time to unlock the next level.";
  }

  // -------- Gym --------
  function updateGymMeter(){ 
    const t = state.workshop.gate.target;
    const s = Math.min(t, state.workshop.stats.streak);
    const pct = Math.round((s/t)*100);
    if(el.wsMeterFill) el.wsMeterFill.style.width = `${pct}%`;
    if(el.wsMeterText) el.wsMeterText.textContent = `${pct}%`;
  }
    function updateGymExit(){
    if(!el.wsExit) return;
    const required = !!state.workshop.required;
    const t = state.workshop.gate.target;
    const left = Math.max(0, t - state.workshop.stats.streak);
    const unlocked = left===0;

    if(!required){
      // Optional training: always allow exit. Give a little reward moment if they clear the reps.
      el.wsExit.disabled = false;
      el.wsExit.textContent = state.workshop.cleared ? "Back to Results ✓" : "Exit Gym";
      el.wsExit.classList.toggle("wsExitReady", !!state.workshop.cleared);
      return;
    }

    // Required training (jeopardy): must clear reps before leaving
    el.wsExit.textContent = unlocked ? "Next Level ➜" : `Exit Gym 🔒 (need ${left} more)`;
    el.wsExit.disabled = !unlocked;
    el.wsExit.classList.toggle("wsExitReady", unlocked);
  }


  
  
function gymFocusType(){
  // Prefer explicit tag chosen by coach
  const tag = state.workshop.focusTag || "";
  if(tag==="spelling") return "spelling";
  if(tag==="verb_form") return "verbs";
  if(tag==="verb_ending") return "verbs";
  if(tag==="agreement") return "gender";
  if(tag==="articles_gender" || tag==="articles") return "gender";
  if(tag==="word_order") return "order";
  if(tag==="missing_be") return "be";
  if(tag==="no_connector") return "connector";
  if(tag==="too_short" || tag==="detail") return "detail";

  // fallback
  const f = String(state.workshop.focus||"").toLowerCase();
  if(f.includes("connector") || f.includes("connect") || f.includes("conector") || f.includes("connecteur")) return "connector";
  if(f.includes("to-be") || f.includes("be") || f.includes("être") || f.includes("sein") || f.includes("missing to")) return "be";
  if(f.includes("short") || f.includes("blank") || f.includes("detail")) return "detail";
  return "upgrade";
}



function isBadGymSeed(ans){
  const t = String(ans||"").trim();
  if(!t) return true;
  // Treat dash-only / punctuation-only as empty (e.g., "—", "-", "...")
  if(/^[\-—–.·•,;:!?()\[\]{}'"]+$/.test(t)) return true;
  // Treat leading dash fragments as unusable models (e.g., "—. Porque ...")
  if(/^[\-—–]\s*\.?\s*/.test(t)) return true;
  // Very short fragments are usually unusable as seeds
  if(t.length < 3) return true;
  return false;
}

function buildGymPool(){
  const items = Array.isArray(state.mark.items) ? state.mark.items : [];
  const pool = [];
  for(let i=0;i<items.length;i++){
    const it = items[i] || {};
    let prompt = String(it.prompt||"").trim();
    if(!prompt && Array.isArray(state.prompts) && state.prompts[i] && state.prompts[i].text) prompt = String(state.prompts[i].text).trim();
    const answer = String(it.answer||"").trim();
    const key = (prompt+"|"+answer).slice(0,220);
    pool.push(Object.assign({}, it, {_idx:i, _key:key, prompt, answer}));
  }
  // If the round didn’t produce many usable items (e.g., lots of blanks), add prompt-only items
  // so the Gym can still vary exercises and feel ‘organic’ instead of repeating the same seed.
  if(pool.length < 6 && Array.isArray(state.prompts)){
    const existingPrompts = new Set(pool.map(x=>String(x.prompt||"").trim().toLowerCase()).filter(Boolean));
    for(let j=0;j<state.prompts.length && pool.length<10;j++){
      const pr = state.prompts[j] && state.prompts[j].text ? String(state.prompts[j].text).trim() : "";
      const keyp = pr.toLowerCase();
      if(!pr || existingPrompts.has(keyp)) continue;
      existingPrompts.add(keyp);
      pool.push({prompt: pr, answer:"—", ok:false, reason:"", suggestion:"", tip:"", why:"", tags:["detail"], _idx:j, _key:(pr+"|—").slice(0,220)});
    }
  }
  return pool;
}

function pickGymItem(preferTag){
  const pool = Array.isArray(state.workshop.pool) ? state.workshop.pool : [];
  if(!pool.length) return (state.workshop.currentItem || state.workshop.refItem) || {prompt:"", answer:""};
  const recent = Array.isArray(state.workshop.recentItemKeys) ? state.workshop.recentItemKeys : [];
  const lastPrompt = String(state.workshop.lastPrompt || "");
  // Start with valid seeds (avoid "—" etc.)
  let candidates = pool.filter(it=> !isBadGymSeed(it.answer) || String(it.prompt||"").trim());
  // Prefer items that match the focus tag, if we have enough
  if(preferTag){
    const tagged = candidates.filter(it=> (it.tags||[]).includes(preferTag));
    if(tagged.length >= 2) candidates = tagged;
  }
  // Avoid immediate repetition
  const notRecent = candidates.filter(it=> !recent.includes(it._key));
  // Avoid repeating the same prompt text twice in a row when possible
  const notSamePrompt = (lastPrompt ? notRecent.filter(it=> String(it.prompt||"").trim() && String(it.prompt||"").trim() !== lastPrompt) : notRecent);
  const pickFrom = notSamePrompt.length ? notSamePrompt : (notRecent.length ? notRecent : candidates);
  const picked = pickFrom[Math.floor(Math.random()*pickFrom.length)] || candidates[0] || pool[0];
  state.workshop.lastPrompt = String(picked && picked.prompt ? picked.prompt : "").trim();
  if(picked && picked._key){
    const nextRecent = [picked._key].concat(recent.filter(k=>k!==picked._key)).slice(0,6);
    state.workshop.recentItemKeys = nextRecent;
  }
  return picked || {prompt:"", answer:""};
}


function openGymFromResults(){
  const focusTag = state.mark.focusTag || "detail";
  const focusLabel = state.mark.focusLabel || "Detail";

  const refItem =
       (state.mark.items||[]).find(it=> (it.tags||[]).includes(focusTag) && String(it.answer||"").trim())
    || (state.mark.items||[]).find(it=>!it.ok && String(it.answer||"").trim())
    || (state.mark.items||[]).find(it=> String(it.answer||"").trim())
    || {prompt:"", answer:""};

  state.workshop.required = state.gymRequired;
  state.workshop.cleared = false;
  state.workshop.focus = focusLabel;
  state.workshop.focusTag = focusTag;
  state.workshop.refItem = refItem;
  state.workshop.currentItem = null;
  state.workshop.pool = buildGymPool();
  state.workshop.recentItemKeys = [];
  state.workshop.currentItem = null;

  state.workshop.stats = {correct:0, attempts:0, streak:0};
  state.workshop.gate = { type:"streak", target: gymTarget(state.level, state.mark.wrong) };

  const sub = state.gymRequired ? "Coach says: earn your exit." : "Optional training: sharpen one thing.";
  if(el.wsSubtitle) el.wsSubtitle.textContent = sub;

  if(el.wsCogs){
    el.wsCogs.innerHTML="";
    const lines = [
      "Main focus: " + focusLabel,
      "Goal: " + state.workshop.gate.target + " correct in a row",
      state.gymRequired ? "Coach rule: clear the reps to move on." : "Optional: do a few reps, then leave"
    ];

    // Show other common “cogs” from this round so learners know what else matters.
    const top = Array.isArray(state.mark.topTags) ? state.mark.topTags : [];
    const also = top.filter(t=>t && t.tag && t.tag!==focusTag).slice(0,3).map(t=>t.label);
    if(also.length){
      lines.push("Also watch: " + also.join(" · "));
    }
    lines.forEach(t=>{ const d=document.createElement("div"); d.className="wsCog"; d.textContent=t; el.wsCogs.appendChild(d); });
  }
  if(el.wsGateType) el.wsGateType.textContent = "Streak";
  if(el.wsGateTarget) el.wsGateTarget.textContent = `${state.workshop.gate.target} correct in a row`;
  updateGymMeter(); updateGymExit();
  nextGymDrill();
  show("gym");
}


  function gymMark(ok, msg){
    state.workshop.stats.attempts++;
    if(ok){ state.workshop.stats.correct++; state.workshop.stats.streak++; }
    else { state.workshop.stats.streak = 0; }
    if(el.wsFeedback) el.wsFeedback.textContent = msg;
    updateGymMeter(); updateGymExit();
    if(state.workshop.stats.streak >= state.workshop.gate.target){ state.workshop.cleared=true; toast("Gym cleared ✓"); }
    else setTimeout(()=> nextGymDrill(), 450);
  }

  function nextGymDrill(){
    // Pick a fresh source item to avoid repetition and keep drills tied to the learner's own work
    state.workshop.currentItem = pickGymItem(state.workshop.focusTag);

    const type = gymFocusType();
    let variant = Math.random() < 0.55 ? "choice" : "type";
    if(state.workshop.lastVariant && state.workshop.lastVariant===variant) variant = (variant==="choice"?"type":"choice");
    state.workshop.lastVariant = variant;

    // Helpers for language-specific tokens
    const L = state.lang;
    const conj = (L==="es") ? ["y","pero","porque","además","entonces","también"] :
                 (L==="fr") ? ["et","mais","parce que","donc","aussi"] :
                              ["und","aber","weil","deshalb","auch"];
    const beForms = (L==="es") ? ["soy","eres","es","somos","son","estoy","estás","está","estamos","están"] :
                    (L==="fr") ? ["suis","es","est","sommes","êtes","sont","ai","as","a","avons","avez","ont"] :
                                 ["bin","bist","ist","sind","seid","haben","hast","hat","habt"];

    if(variant==="choice"){
      el.wsChoices.classList.remove("hidden");
      el.wsInputRow.classList.add("hidden");
      el.wsChoices.innerHTML = "";

      
if(type==="spelling"){
  if(el.wsPrompt) el.wsPrompt.textContent = (L==="es") ? "Pick the correct spelling (coach focus)." : "Pick the correct spelling.";
  const ref = (state.workshop.currentItem || state.workshop.refItem) || {answer:""};
  const ans = String(ref.answer||"");
  const fx = (L==="es") ? wordFixesES(ans) : {fixed:ans, changes:[]};

  const change = (fx.changes||[])[0];
  if(!change){
    // No obvious spelling issue — do a detail rep instead
    state.workshop.focusTag = "detail";
    if(el.wsHelp) el.wsHelp.textContent = "No spelling issue found — do a detail rep.";
    nextGymDrill();
    return;
  }

  const pair = change.split("→").map(s=>s.trim());
  const wrongW = pair[0] || "—";
  const rightW = pair[1] || "—";

  const distract = ["habitación","pequeño","pequeña","español","fácil","también","paredes","capital","voy","blancas"]
    .filter(x=>x!==rightW && x!==wrongW);
  const opts = shuffle([rightW, wrongW, distract[Math.floor(Math.random()*distract.length)], distract[Math.floor(Math.random()*distract.length)]]).slice(0,4);

  opts.forEach(o=>{
    const b=document.createElement("button");
    b.className="wsChoice";
    b.type="button";
    b.textContent=o;
    b.addEventListener("click", ()=>{
      const ok = (o===rightW);
      gymMark(ok, ok ? "Yes — nailed it." : "Not quite — pick the correct spelling.");
    });
    el.wsChoices.appendChild(b);
  });

  if(el.wsHelp) el.wsHelp.textContent = (L==="es") ? "Aim: clean spelling + accents." : "Aim: clean spelling.";
}
else
if(type==="verbs"){
  if(el.wsPrompt) el.wsPrompt.textContent = (L==="es") ? "Pick the correct verb form (no guessing)." :
                                        (L==="fr") ? "Choisis la bonne forme du verbe." :
                                                     "Wähle die richtige Verbform.";
  // Simple high-impact set: be / have / like
  const sets = (L==="es") ? [
      {good:"Yo soy simpático.", bad:["Yo es simpático.","Yo estoy simpático."]},
      {good:"Yo tengo un perro.", bad:["Yo tiene un perro.","Yo tener un perro."]},
      {good:"Me gusta el fútbol.", bad:["Yo gusta el fútbol.","Me gusto el fútbol."]},
    ] :
    (L==="fr") ? [
      {good:"Je suis sympa.", bad:["Je est sympa.","Je suis sympa"]},
      {good:"J’ai un chien.", bad:["Je a un chien.","Je suis un chien."]},
      {good:"J’aime le sport.", bad:["Je aime le sport.","J’aime le sport"]},
    ] :
    [
      {good:"Ich bin nett.", bad:["Ich ist nett.","Ich haben nett."]},
      {good:"Ich habe einen Hund.", bad:["Ich hat einen Hund.","Ich haben ein Hund."]},
      {good:"Ich mag Sport.", bad:["Ich magt Sport.","Ich mögen Sport."]},
    ];
  const s = sets[Math.floor(Math.random()*sets.length)];
  const opts = shuffle([s.good, ...s.bad, tidySuggestion(s.good.replace(".", " und sehr fleißig."))]).slice(0,4);
  opts.forEach(o=>{
    const b=document.createElement("button");
    b.className="wsChoice"; b.type="button"; b.textContent=o;
    b.addEventListener("click", ()=> gymMark(o===s.good || o.startsWith(s.good.slice(0,-1)), (o===s.good || o.startsWith(s.good.slice(0,-1))) ? "Yes — correct verb form." : "No — pick the option with the correct verb form."));
    el.wsChoices.appendChild(b);
  });
  if(el.wsHelp) el.wsHelp.textContent = (L==="es") ? "Aim: correct verb form (soy/tengo/me gusta)." : "Aim: correct verb form.";
}
else
if(type==="gender"){
  if(L!=="es"){
    // For now, keep this Spanish‑focused; other languages get detail reps.
    state.workshop.focusTag = "detail";
    nextGymDrill();
    return;
  }
  if(el.wsPrompt) el.wsPrompt.textContent = "Pick the correct article + noun (gender matters).";
  const fem = ["casa","habitación","clase","escuela","familia","ciudad"];
  const masc = ["colegio","instituto","padre","hermano","amigo","pueblo"];
  const isFem = Math.random() < 0.5;
  const noun = (isFem ? fem : masc)[Math.floor(Math.random()*(isFem?fem.length:masc.length))];
  const good = isFem ? `la ${noun}` : `el ${noun}`;
  const bad1 = isFem ? `el ${noun}` : `la ${noun}`;
  const bad2 = isFem ? `un ${noun}` : `una ${noun}`;
  const bad3 = isFem ? `una ${noun}` : `un ${noun}`;
  const opts = shuffle([good, bad1, bad2, bad3]).slice(0,4);
  opts.forEach(o=>{
    const b=document.createElement("button");
    b.className="wsChoice"; b.type="button"; b.textContent=o;
    b.addEventListener("click", ()=> gymMark(o===good, o===good ? "Correct — article matches the noun." : "Not quite — match the article to the noun’s gender."));
    el.wsChoices.appendChild(b);
  });
  if(el.wsHelp) el.wsHelp.textContent = "Aim: el + masculine, la + feminine.";
}
else
if(type==="order"){
  if(L!=="es"){
    state.workshop.focusTag = "detail";
    nextGymDrill();
    return;
  }
  if(el.wsPrompt) el.wsPrompt.textContent = "Pick the correct word order (me gusta…).";
  const good = "Me gusta el fútbol porque es divertido.";
  const bad1 = "Yo gusta el fútbol porque es divertido.";
  const bad2 = "Me gusto el fútbol porque es divertido.";
  const bad3 = "Gusta me el fútbol porque es divertido.";
  const opts = shuffle([good,bad1,bad2,bad3]).slice(0,4);
  opts.forEach(o=>{
    const b=document.createElement("button");
    b.className="wsChoice"; b.type="button"; b.textContent=o;
    b.addEventListener("click", ()=> gymMark(o===good, o===good ? "Perfect — that’s the order." : "No — pick the sentence with the correct order."));
    el.wsChoices.appendChild(b);
  });
  if(el.wsHelp) el.wsHelp.textContent = "Aim: Me gusta + noun (not 'yo gusta').";
}

else
if(type==="connector"){
        if(el.wsPrompt) el.wsPrompt.textContent = "Pick the best connector to upgrade the sentence.";
        const connector = conj[Math.floor(Math.random()*conj.length)];
        const stem = (L==="es") ? "Me gusta el colegio" : (L==="fr") ? "J’aime l’école" : "Ich mag die Schule";
        const tail = (L==="es") ? " es interesante." : (L==="fr") ? " c’est intéressant." : " sie ist interessant.";
        const good = `${stem} ${connector}${tail}`;
        const opts = shuffle([
          good,
          `${stem}.${tail}`,
          `${stem} ${conj[0]}${tail}`,
          `${stem} ${conj[1]}${tail}`,
          `${stem} ${conj[2]}${tail}`,
        ]).slice(0,4);

        opts.forEach(o=>{
          const b=document.createElement("button");
          b.className="wsChoice";
          b.type="button";
          b.textContent=o;
          b.addEventListener("click", ()=>{
            const ok = connectorPresent(o);
            gymMark(ok, ok ? "Nice — connector used well." : "Try again: choose the option with a connector.");
          });
          el.wsChoices.appendChild(b);
        });
        if(el.wsHelp) el.wsHelp.textContent = "Aim: join ideas with a connector (y/pero/porque…).";
      }
      else if(type==="be"){
        if(el.wsPrompt) el.wsPrompt.textContent = "Pick the best ‘to be’ sentence.";
        const good = (L==="es") ? "El profesor de español es divertido." :
                     (L==="fr") ? "Le prof d’espagnol est sympa." :
                                  "Der Spanischlehrer ist nett.";
        const bad1 = (L==="es") ? "El profesor de español divertido." :
                     (L==="fr") ? "Le prof d’espagnol sympa." :
                                  "Der Spanischlehrer nett.";
        const bad2 = (L==="es") ? "El profesor de español está divertido." :
                     (L==="fr") ? "Le prof d’espagnol a sympa." :
                                  "Der Spanischlehrer haben nett.";
        const opts = shuffle([good, bad1, bad2, tidySuggestion(good.replace(".", " y alto."))]).slice(0,4);
        opts.forEach(o=>{
          const b=document.createElement("button");
          b.className="wsChoice"; b.type="button"; b.textContent=o;
          b.addEventListener("click", ()=> gymMark(beVerbPresent(o), beVerbPresent(o) ? "Great — correct ‘to be’." : "Not quite — include the correct ‘to be’ form."));
          el.wsChoices.appendChild(b);
        });
        if(el.wsHelp) el.wsHelp.textContent = "Aim: include the correct form of ‘to be’ (es/está/est…).";
      }
      else 
if(type==="detail" || type==="upgrade"){
        const ref = (state.workshop.currentItem || state.workshop.refItem || {prompt:"", answer:""});
        const ptxt = String(ref.prompt||"").trim();
        const ans = String(ref.answer||"").trim();
        let model = String(ref.suggestion||"").trim() || pickModelAnswer({text: ptxt || "Describe something."});
        // Never allow placeholder / fragment "—" models in the Gym.
        if(!model || /^—/.test(model) || isBadGymSeed(model)){
          model = pickModelAnswer({text: ptxt || "Describe something."});
        }
        const base = (!isBadGymSeed(ans)) ? tidySuggestion(ans) : (String(model).split(".")[0] + ".");
        const stronger = tidySuggestion(model);

        if(el.wsPrompt){
          el.wsPrompt.textContent = (type==="detail")
            ? ((L==="es") ? "Pick the answer with ONE extra detail:"
               : (L==="fr") ? "Choisis la réponse avec UN détail en plus :"
                            : "Wähle die Antwort mit EINEM Extra-Detail:")
            : ((L==="es") ? "Pick the strongest model answer:"
               : (L==="fr") ? "Choisis la meilleure réponse modèle :"
                            : "Wähle die beste Musterantwort:");
        }

        const weak = (L==="es") ? "Es bueno." : (L==="fr") ? "C’est bien." : "Es ist gut.";
        const near = stronger.replace(/\.$/, "") + ((L==="es") ? " y además es muy interesante." : (L==="fr") ? " et en plus c’est très intéressant." : " und außerdem ist es sehr interessant.");
        const opts = shuffle([
          stronger,
          (type==="detail") ? near : stronger,
          base || tidySuggestion(weak),
          tidySuggestion(weak)
        ]).slice(0,4);

        el.wsChoices.innerHTML = "";
        opts.forEach(o=>{
          const b=document.createElement("button");
          b.className="wsChoice"; b.type="button"; b.textContent=o;
          b.addEventListener("click", ()=>{
            const ok = (o===stronger) || o.startsWith(stronger.slice(0, Math.min(18, stronger.length)));
            gymMark(ok, ok ? "Yes. That’s the standard." : "No. Pick the cleanest, most detailed option.");
          });
          el.wsChoices.appendChild(b);
        });

        if(el.wsHelp){
          const hintP = ptxt ? `Prompt: ${ptxt}` : "";
          const hintM = stronger ? `Coach model: ${stronger}` : "";
          el.wsHelp.textContent = [hintP, hintM].filter(Boolean).join(" • ");
        }

      }

      return;

    }

    // TYPE variant
    el.wsChoices.classList.add("hidden");
    el.wsInputRow.classList.remove("hidden");
    if(el.wsInput) el.wsInput.value="";
    if(el.wsFeedback) el.wsFeedback.textContent="";

    
if(type==="spelling"){
  const ref = (state.workshop.currentItem || state.workshop.refItem) || {answer:""};
  const fx = (state.lang==="es") ? wordFixesES(ref.answer||"") : {fixed: ref.answer||""};
  if(el.wsPrompt) el.wsPrompt.textContent =
    (state.lang==="es") ? `Type the corrected version (spelling/accents):\n"${String(ref.answer||"").trim()}"` :
                          "Type the corrected version (spelling).";
  if(el.wsHelp) el.wsHelp.textContent = (state.lang==="es") ? `Target: ${String(fx.fixed||"").trim()}` : "Fix spelling cleanly.";
} else
if(type==="verbs"){
  if(el.wsPrompt) el.wsPrompt.textContent =
    (L==="es") ? "Type ONE clean sentence with a correct verb form (soy / tengo / me gusta)." :
    (L==="fr") ? "Tape UNE phrase avec une forme correcte (je suis / j’ai / j’aime)." :
                 "Schreibe EINEN Satz mit korrekter Verbform (ich bin / ich habe / ich mag).";
  if(el.wsHelp) el.wsHelp.textContent =
    (L==="es") ? "Example: Tengo un perro. / Me gusta el fútbol." :
    (L==="fr") ? "Exemple: J’ai un chien. / J’aime le sport." :
                 "Beispiel: Ich habe einen Hund. / Ich mag Sport.";
} else
if(type==="gender"){
  if(L!=="es"){
    state.workshop.focusTag = "detail";
    nextGymDrill();
    return;
  }
  if(el.wsPrompt) el.wsPrompt.textContent = "Type a correct phrase with article + noun (e.g., la casa / el colegio).";
  if(el.wsHelp) el.wsHelp.textContent = "Aim: la casa, la habitación, el colegio, el instituto…";
} else
if(type==="order"){
  if(L!=="es"){
    state.workshop.focusTag = "detail";
    nextGymDrill();
    return;
  }
  if(el.wsPrompt) el.wsPrompt.textContent = "Type ONE sentence using 'me gusta' correctly.";
  if(el.wsHelp) el.wsHelp.textContent = "Example: Me gusta el fútbol porque es divertido.";
} else
if(type==="connector"){
      if(el.wsPrompt) el.wsPrompt.textContent = (L==="es") ? "Type ONE sentence using y/pero/porque." :
                                               (L==="fr") ? "Tape UNE phrase avec et/mais/parce que." :
                                                            "Schreibe EINEN Satz mit und/aber/weil.";
      if(el.wsHelp) el.wsHelp.textContent = "Example: Es divertido porque explica muy bien.";
    } else if(type==="be"){
      if(el.wsPrompt) el.wsPrompt.textContent = (L==="es") ? "Type ONE sentence with a correct form of ‘ser/estar’." :
                                               (L==="fr") ? "Tape UNE phrase avec être / avoir." :
                                                            "Schreibe EINEN Satz mit sein.";
      if(el.wsHelp) el.wsHelp.textContent = "Example: El profesor es simpático.";
    
  } else if(type==="detail"){
      const ref = (state.workshop.currentItem || state.workshop.refItem || {prompt:"", answer:"", suggestion:""});
      const baseAns = String(ref.answer||"").trim();
      const basePrompt = String(ref.prompt||"").trim();
      let model = String(ref.suggestion||"").trim();
      if(!model || isBadGymSeed(model)) model = pickModelAnswer({text: basePrompt || "Describe something."});

      if(el.wsPrompt){
        if(!isBadGymSeed(baseAns)){
          el.wsPrompt.textContent =
            (L==="es") ? `Upgrade THIS answer (add ONE extra detail):
"${baseAns}"` :
            (L==="fr") ? `Améliore CETTE réponse (ajoute UN détail):
"${baseAns}"` :
                         `Verbessere DIESE Antwort (ein Detail mehr):
"${baseAns}"`;
        }else{
          el.wsPrompt.textContent =
            (L==="es") ? `Write a NEW answer with ONE extra detail for:
"${basePrompt||"the prompt"}"` :
            (L==="fr") ? `Écris une NOUVELLE réponse avec UN détail en plus pour :
"${basePrompt||"le prompt"}"` :
                         `Schreibe eine NEUE Antwort mit EINEM Detail mehr für:
"${basePrompt||"die Aufgabe"}"`;
        }
      }

      if(el.wsHelp){
        const lines = [];
        if(basePrompt) lines.push(`Prompt: ${basePrompt}`);
        if(model) lines.push(`Coach model: ${model}`);
        lines.push((L==="es") ? "Aim: ONE extra detail • 6+ words." :
                   (L==="fr") ? "Objectif: UN détail en plus • 6+ mots." :
                                "Ziel: EIN Detail mehr • 6+ Wörter.");
        el.wsHelp.textContent = lines.join(" • ");
      }
    } else {
      if(el.wsPrompt) el.wsPrompt.textContent = "Type ONE improved sentence (clean + slightly longer).";
      if(el.wsHelp) el.wsHelp.textContent = "Aim for 8+ words.";
    }
  }

  function handleGymSubmit(){
    if(el.wsInputRow.classList.contains("hidden")) return;
    const val = String(el.wsInput.value||"").trim();
    const type = gymFocusType();
    const lvlRub = levelRubric(state.level);

    let ok=false, msgOk="Nice!", msgNo="Try again.";
    
if(type==="spelling"){
  const ref = (state.workshop.currentItem || state.workshop.refItem) || {answer:""};
  const fx = (state.lang==="es") ? wordFixesES(ref.answer||"") : {fixed: ref.answer||""};
  const want = String(fx.fixed||"").trim().toLowerCase();
  ok = val.trim().toLowerCase() === want;
  msgOk = "Clean — spelling fixed.";
  msgNo = "Try again: type the corrected version (with accents).";
} else
if(type==="verbs"){
  const L = state.lang;
  if(L==="es"){
    ok = val.length >= 8 && (/(\bsoy\b)/i.test(val) || /(\btengo\b)/i.test(val) || /(\bme\s+gusta\b)/i.test(val));
    msgOk = "Good — correct verb form.";
    msgNo = "Try again: include soy / tengo / me gusta (correctly).";
  }else if(L==="fr"){
    ok = val.length >= 8 && (/(\bsuis\b)/i.test(val) || /(\bj['’]?ai\b|\bai\b)/i.test(val) || /(\bj['’]?aime\b|\baime\b)/i.test(val));
    msgOk = "Bien — forme correcte.";
    msgNo = "Essaie encore : suis / j’ai / j’aime.";
  }else{
    ok = val.length >= 8 && (/(\bbin\b)/i.test(val) || /(\bhabe\b)/i.test(val) || /(\bmag\b)/i.test(val));
    msgOk = "Gut — richtige Verbform.";
    msgNo = "Nochmal: bin / habe / mag.";
  }
} else
if(type==="gender"){
  if(state.lang!=="es"){
    ok = countWords(val) >= 6;
    msgOk = "Good.";
    msgNo = "Try a short phrase with an article.";
  }else{
    const low = val.toLowerCase();
    const m = low.match(/\b(el|la|un|una)\s+(casa|habitaci[oó]n|clase|escuela|familia|ciudad|colegio|instituto|padre|hermano|amigo|pueblo)\b/);
    if(!m){ ok=false; }
    else{
      const art=m[1], noun=m[2];
      const fem = /^(casa|habitaci[oó]n|clase|escuela|familia|ciudad)$/.test(noun);
      const masc = /^(colegio|instituto|padre|hermano|amigo|pueblo)$/.test(noun);
      ok = (fem && (art==="la" || art==="una")) || (masc && (art==="el" || art==="un"));
    }
    msgOk = "Correct — article matches gender.";
    msgNo = "Try again: match el/la (or un/una) to the noun.";
  }
} else
if(type==="order"){
  if(state.lang!=="es"){
    ok = countWords(val) >= 6;
    msgOk = "Good.";
    msgNo = "Try a clean sentence.";
  }else{
    ok = /(\bme\s+gusta\b)/i.test(val) && val.length >= 10;
    msgOk = "Perfect — correct order.";
    msgNo = "Try again: use 'me gusta' (not 'yo gusta').";
  }
} else
if(type==="connector"){
      ok = val.length >= 12 && connectorPresent(val);
      msgOk = "Great — connector spotted!";
      msgNo = "Try again: add a connector (y/pero/porque…).";
    } else if(type==="be"){
      ok = val.length >= 8 && beVerbPresent(val);
      msgOk = "Great — correct ‘to be’.";
      msgNo = "Try again: include a correct ‘to be’ form.";
    } else if(type==="detail"){
      ok = countWords(val) >= Math.max(6, Math.min(10, lvlRub.minWords));
      msgOk = "Nice — more detail added.";
      msgNo = "Try again: add one more detail (6+ words).";
    } else {
      ok = countWords(val) >= Math.max(7, Math.min(12, lvlRub.minWords+1));
      msgOk = "Nice — stronger model.";
      msgNo = "Try again: slightly longer + cleaner sentence.";
    }
    gymMark(ok, ok ? msgOk : msgNo);
  }

  // -------- Wiring --------
// -------- Wiring --------
  function wire(){

if(el.playerName){
  const saved = getPlayerName();
  el.playerName.value = saved;
  el.playerName.addEventListener("input", ()=>{
    const n=setPlayerName(el.playerName.value);
    if(el.nameHint) el.nameHint.textContent = n ? "Saved ✓" : "Saved on this device.";
  });
}
if(el.coachModal){
  el.coachModal.addEventListener("click", (e)=>{ if(e.target===el.coachModal && !state.gymRequired) hideCoachModal(); });
}
if(el.rewardOk){
  el.rewardOk.addEventListener("click", ()=> el.rewardPop && el.rewardPop.classList.add("hidden"));
}

    if(el.modeSelect) el.modeSelect.addEventListener("change", ()=>{ state.mode = el.modeSelect.value; updatePills(); renderThemeTiles(); });
    if(el.langSelect) el.langSelect.addEventListener("change", ()=>{ state.lang = safeLang(el.langSelect.value); updatePills(); renderThemeTiles(); if(!screens.theme.classList.contains("hidden")) renderThemeLevelScreen(); });
    if(el.themeBackBtn) el.themeBackBtn.addEventListener("click", ()=>{ show("home"); renderThemeTiles(); });
    if(el.prevBtn) el.prevBtn.addEventListener("click", handlePrev);
    if(el.nextBtn) el.nextBtn.addEventListener("click", handleNext);
    if(el.quitBtn) el.quitBtn.addEventListener("click", ()=>{ clearInterval(state.timer); state.isMarking=false; state.roundFinished=false; show("home"); renderThemeTiles(); });
    if(el.playAgainBtn) el.playAgainBtn.addEventListener("click", ()=> startRound());
    if(el.workshopBtn) el.workshopBtn.addEventListener("click", ()=> openGymFromResults());
    if(el.toggleFeedbackBtn) el.toggleFeedbackBtn.addEventListener("click", ()=>{ state.showCorrections = !state.showCorrections; renderResults(); try{ el.feedbackList && el.feedbackList.scrollIntoView({behavior:"smooth", block:"start"}); }catch(_){ } });
    if(el.homeBtn) el.homeBtn.addEventListener("click", ()=>{ show("home"); renderThemeTiles(); });
    if(el.wsBackResults) el.wsBackResults.addEventListener("click", ()=> show("results"));
    if(el.wsHome) el.wsHome.addEventListener("click", ()=>{ show("home"); renderThemeTiles(); });
    if(el.wsExit) el.wsExit.addEventListener("click", ()=>{
      if(el.wsExit.disabled) return;

      // If Gym was required, clearing it counts as a “training pass” and moves you forward.
      if(state.workshop.required){
        try{ setStar(state.themeId, state.level, true); }catch(_){ }
        const next = Math.min(10, (Number(state.level)||1) + 1);
        state.level = next;
        toast("Coach: Good. Next level.");
        startRound();
        return;
      }

      show("home");
      renderThemeTiles();
    });
    if(el.wsSubmit) el.wsSubmit.addEventListener("click", handleGymSubmit);
    if(el.wsInput) el.wsInput.addEventListener("keydown", (e)=>{ if(e.key==="Enter"){ e.preventDefault(); handleGymSubmit(); } });
    if(el.wsOverride) el.wsOverride.addEventListener("click", ()=>{ if(el.wsExit){ el.wsExit.disabled=false; el.wsExit.textContent="Exit Gym ✓"; } toast("Teacher override used"); });
  }

  function init(){
    try{ document.title = "LOOPS — "+BUILD_ID; }catch(e){}
    setTimeout(()=>{ try{ toast("Build "+BUILD_ID+" loaded ✓"); }catch(e){} }, 350);

    // Load player name
    const nm = getPlayerName();
    if(el.playerName) el.playerName.value = nm;

    state.lang = safeLang(el.langSelect ? el.langSelect.value : "es");
    state.mode = el.modeSelect ? el.modeSelect.value : "classic";
    updatePills();
    renderThemeTiles();
    wire();
    show("home");

    // First-run: ask for a name (optional)
    if(!getPlayerName()){
      showCoachModal({
        title: COACH.name,
        avatar: COACH.avatar,
        sub: "Quick one… what should I call you?",
        html: `<div class="muted">Type your name on the home screen (top box). I’ll use it in feedback.</div>`,
        primaryText: "Got it",
        onPrimary: ()=>{},
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);

})();