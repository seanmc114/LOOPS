
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

// --- Player + Coach ---
const LS_NAME = "loops_playerName_v1";
const LS_REWARDS = "loops_rewards_v1"; // {coins:number, loot:{[id]:true}, last:{...}}
const COACH = {
  name: "Coach Coggs",
  avatar: "🧑‍🏫",
  praise: [
    "Lovely stuff.",
    "That’s solid work.",
    "Nice control there.",
    "Good instincts.",
    "That’s a strong round."
  ],
  push: [
    "I’m not letting you off the hook though.",
    "We can sharpen one thing and you’ll fly.",
    "One tweak and this jumps a level.",
    "Small fix, big payoff.",
    "We fix this and you’re dangerous."
  ],
  jail: [
    "Right — training time. No panic. Just reps.",
    "Gym. Now. Quick fix, then you’re free.",
    "We’re going into the machine room. Earn your exit.",
    "Coach’s call: Gym. You’ll thank me in 2 minutes.",
    "Jeopardy mode: you’re in… until you improve."
  ],
  release: [
    "Released. That’s improvement.",
    "Good. You earned it.",
    "Exit unlocked — back to business.",
    "That’s the standard. Keep it.",
    "Free to go. Don’t lose that form."
  ]
};

function getPlayerName(){
  return (localStorage.getItem(LS_NAME) || "").trim();
}
function setPlayerName(v){
  const name = String(v||"").trim().slice(0,18);
  localStorage.setItem(LS_NAME, name);
  return name;
}

function loadRewards(){
  try{
    const raw = localStorage.getItem(LS_REWARDS);
    if(!raw) return {coins:0, loot:{}, last:null};
    const obj = JSON.parse(raw);
    obj.coins = Number(obj.coins)||0;
    obj.loot = obj.loot || {};
    return obj;
  }catch(_){ return {coins:0, loot:{}, last:null}; }
}
function saveRewards(r){ localStorage.setItem(LS_REWARDS, JSON.stringify(r)); }

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
      out.push(`${w} → ${COACH_ES_FIX[key]}`);
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

  if(lang==="es"){
    const fx = wordFixesES(answer);
    if(fx.changes.length){
      tags.push("spelling");
      examples.push(...fx.changes.slice(0,3));
    }
    // missing be (very simple): adjective present but no es/está/son/soy etc
    const a = String(answer||"").toLowerCase();
    const hasAdj = /(grande|pequeñ[oa]|bonit[oa]|interesante|divertid[oa]|alto|bajo|simpátic[oa]|trabajador[oa]|difícil|fácil)/.test(a);
    const hasBe = /\b(es|está|estoy|eres|son|somos|están|era|eran|fue|eran)\b/.test(a);
    if(hasAdj && !hasBe) tags.push("missing_be");

    // connector opportunity (only if long enough)
    const hasConn = /\b(y|pero|porque|además|entonces|también)\b/.test(a);
    if(wc >= 9 && !hasConn) tags.push("no_connector");
  }

  // If nothing else, recommend detail only (but as a fallback)
  if(tags.length===0) tags.push("detail");

  return {tags, examples};
}

function focusLabel(tag, lang){
  const L = lang || "es";
  if(tag==="spelling") return (L==="es") ? "Spelling & accents" : "Spelling";
  if(tag==="missing_be") return "Missing ‘to be’";
  if(tag==="no_connector") return "Connectors";
  if(tag==="too_short") return "More detail";
  if(tag==="detail") return "More detail";
  return "One key fix";
}

function pickRoundFocus(items, lang, rubric){
  // Count tags across items (prefer spelling/missing_be over detail)
  const counts = {};
  const examples = {};
  items.forEach(it=>{
    (it.tags||[]).forEach(t=>{
      counts[t] = (counts[t]||0)+1;
      if(!examples[t]) examples[t]=[];
      if(it.examples && it.examples.length) examples[t].push(...it.examples);
    });
  });

  const priority = ["spelling","missing_be","too_short","no_connector","detail"];
  let best = null;
  let bestCount = 0;
  priority.forEach(t=>{
    const c = counts[t]||0;
    if(c>=2 && c>bestCount){ best=t; bestCount=c; }
  });
  if(!best){
    // if no strong pattern, pick top anyway but don't nag
    best = priority.find(t=>(counts[t]||0)>0) || "detail";
    bestCount = counts[best]||0;
  }

  const ex = (examples[best]||[]).slice(0,4);
  return {tag:best, count:bestCount, label:focusLabel(best, lang), examples:ex};
}

function buildSuggestionForItem(prompt, answer, lang, rubric, focusTag){
  const a = String(answer||"").trim();
  if(!a) return "—";

  if(lang==="es"){
    const fx = wordFixesES(a);
    // If the focus is spelling and there are changes, return corrected version (no fluff)
    if(focusTag==="spelling" && fx.changes.length){
      return fx.fixed;
    }
    // If missing_be, try a gentle fix: prepend "Es ..." when starts with adjective or noun phrase
    if(focusTag==="missing_be"){
      const low = a.toLowerCase();
      if(!/\b(es|está|son|soy|eres|somos)\b/.test(low)){
        // simple: if starts with "mi ..." keep; else start with "Es ..."
        const fixed = low.startsWith("mi ") ? (a[0].toUpperCase()+a.slice(1)) : ("Es " + a);
        return wordFixesES(fixed).fixed;
      }
    }
    // Detail focus: add ONE extra detail, varied
    if(focusTag==="too_short" || focusTag==="detail"){
      const starters = ["También", "Además", "Y", "Porque"];
      const addOns = [
        "tengo un armario.",
        "hay una ventana.",
        "es bastante moderno.",
        "me gusta mucho.",
        "es muy cómodo.",
        "tiene muchos libros.",
        "hay un patio grande.",
        "es interesante para mí."
      ];
      const st = starters[Math.floor(Math.random()*starters.length)];
      const ad = addOns[Math.floor(Math.random()*addOns.length)];
      const base = wordFixesES(a).fixed.replace(/[.!?]+$/,".");
      return `${base} ${st} ${ad[0].toLowerCase()+ad.slice(1)}`;
    }
    // Connector focus
    if(focusTag==="no_connector"){
      const base = wordFixesES(a).fixed.replace(/[.!?]+$/,".");
      const conns = ["porque","pero","y","además"];
      const c = conns[Math.floor(Math.random()*conns.length)];
      const tail = (c==="porque") ? "es importante." : "es interesante.";
      return `${base} ${c} ${tail}`;
    }

    // Default: corrected text
    return wordFixesES(a).fixed;
  }

  // Non-ES fallback: just tidy + add one simple detail sometimes
  const base = a[0]===a[0].toLowerCase()? (a[0].toUpperCase()+a.slice(1)) : a;
  return /[.!?]$/.test(base) ? base : (base+".");
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

  // -------- Normalisation helpers --------
  const ACC = {"á":"a","é":"e","í":"i","ó":"o","ú":"u","ü":"u","ñ":"n","Á":"A","É":"E","Í":"I","Ó":"O","Ú":"U","Ü":"U","Ñ":"N"};
  const stripAccents = (s)=> String(s||"").split("").map(ch=>ACC[ch]||ch).join("");
  const norm = (s)=> stripAccents(String(s||"").toLowerCase().trim());

  const LANGS = {
    es: {
      label: "Spanish",
      placeholder: "Write your answer in Spanish…",
      speech: "es-ES",
      chipLabels: { ser: "ser", estar: "estar", accent: "accents", structure: "connectors" },
    },
    fr: {
      label: "French",
      placeholder: "Write your answer in French…",
      speech: "fr-FR",
      // Internal keys stay ser/estar, but labels are French
      chipLabels: { ser: "être", estar: "avoir", accent: "accents", structure: "connecteurs" },
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
    prompts: [],
    idx: 0,
    answers: [],
    startedAt: 0,
    timer: null,
    elapsedMs: 0,
    mark: { items: [], wrong: 0, scoreSec: 0, passed: false, focus: "" },
    gymRequired: false,
    workshop: { required:false, cleared:false, focus:"", gate:null, stats:{correct:0, attempts:0, streak:0} },
    ai: { ok:false, error:"" },
  };

  // -------- Storage keys --------
  const kStars = (themeId)=> `loops_themeStars_${themeId}`;
  const kRounds = ()=> `loops_rounds_played`;
  const kPB = (themeId, level, mode, lang)=> `loops_pb_${themeId}_L${level}_${mode}_${lang}`;

  function getStars(themeId){
    try{
      const raw = localStorage.getItem(kStars(themeId));
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
    localStorage.setItem(kStars(themeId), JSON.stringify(arr));
  }
  function starsCount(themeId){ return getStars(themeId).filter(Boolean).length; }
  function totalStars(){ return THEMES.reduce((sum,t)=> sum + starsCount(t.id), 0); }

  function incRounds(){
    const v = Number(localStorage.getItem(kRounds())||"0")||0;
    localStorage.setItem(kRounds(), String(v+1));
  }
  function getRounds(){ return Number(localStorage.getItem(kRounds())||"0")||0; }

  function loadPB(themeId, level, mode, lang){
    try{
      const raw = localStorage.getItem(kPB(themeId,level,mode,lang));
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
      localStorage.setItem(kPB(themeId,level,mode,lang), JSON.stringify(entry));
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

  function samplePrompts(themeId){
    const t = THEME_BY_ID[themeId] || THEMES[0];
    const pool = PROMPT_BANK[t.idx] || PROMPT_BANK[0] || [];
    return shuffle(pool).slice(0, PROMPTS_PER_ROUND);
  }

  function startRound(){
    state.prompts = samplePrompts(state.themeId);
    state.idx = 0;
    state.answers = Array(PROMPTS_PER_ROUND).fill("");
    state.startedAt = Date.now();
    state.elapsedMs = 0;
    clearInterval(state.timer);
    state.timer = setInterval(()=>{ state.elapsedMs = Date.now()-state.startedAt; updateGameHeader(); }, 200);
    buildPromptUI();
    updateGameHeader();
    show("game");
  }

  function updateGameHeader(){
    const t = THEME_BY_ID[state.themeId] || THEMES[0];
    if(el.gameTitle) el.gameTitle.textContent = `${t.label} · Level ${state.level}`;
    if(el.progressText) el.progressText.textContent = `${state.idx+1} / ${PROMPTS_PER_ROUND}`;
    if(el.progressFill) el.progressFill.style.width = `${((state.idx+1)/PROMPTS_PER_ROUND)*100}%`;

    if(el.tagCap) el.tagCap.textContent = (state.mode==="sprint") ? "Sprint cap: 90s" : `Penalty: +${PENALTY_SEC}s`;
    if(el.tagTips) el.tagTips.textContent = `Tip: add detail + one connector`;
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
      <div class="inputRow">
        <textarea class="input mainInput" id="mainInput" rows="2" spellcheck="false" placeholder="${LANGS[state.lang].placeholder}"></textarea>
        <button class="btn ghost tiny" id="speakBtn" type="button">🔊</button>
        <button class="btn ghost tiny" id="micBtn" type="button">🎤</button>
      </div>
      <div class="hint">${(THEME_BY_ID[state.themeId]||THEMES[0]).hint}</div>
    `;
    el.promptArea.appendChild(wrap);

    const input = wrap.querySelector("#mainInput");
    input.value = state.answers[state.idx] || "";
    input.addEventListener("input", ()=>{ state.answers[state.idx] = input.value; });
    input.addEventListener("keydown", (e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); handleNext(); } });

    wrap.querySelector("#speakBtn").addEventListener("click", ()=> speak(p.text));
    wrap.querySelector("#micBtn").addEventListener("click", ()=> startDictation((t)=>{ input.value=t; state.answers[state.idx]=t; }));
    input.focus();
  }

  function handlePrev(){ if(state.idx===0) return; state.idx--; buildPromptUI(); updateGameHeader(); }
  function handleNext(){ if(state.idx < PROMPTS_PER_ROUND-1){ state.idx++; buildPromptUI(); updateGameHeader(); return; } finishRound(); }

  // Marking helpers
  function computeScoreSec(timeMs, wrong){ return (timeMs/1000) + wrong*PENALTY_SEC; }
  function levelRubric(level){ const lvl=Number(level)||1; const minWords=Math.min(16, 3 + Math.floor(lvl/2)); const minChars=Math.min(220, 14 + lvl*6); const requireConnector=lvl>=4; const requireBe=lvl>=2; return {minWords,minChars,requireConnector,requireBe}; }
  const ES_FIX = {"espanol":"español","tambien":"también","facil":"fácil","dificil":"difícil","futbol":"fútbol","musica":"música","también":"también"};
  function tidySuggestion(raw){ let s=String(raw||"").trim(); if(!s) return ""; s=s.replace(/\s+/g," ").trim(); s=s.charAt(0).toUpperCase()+s.slice(1); if(state.lang==="es"){ s=s.split(/(\b)/).map(tok=>{ const low=tok.toLowerCase(); return ES_FIX[low] ? ES_FIX[low] : tok; }).join(""); s=s.replace(/\bde\s+español\b/i, "de español"); } if(!/[.!?]$/.test(s)) s += "."; return s; }
  function countWords(s){ return String(s||"").trim().split(/\s+/).filter(Boolean).length; }
  function connectorPresent(s){ const x=norm(s); return /(\by\b|\bpero\b|\bporque\b|\bademas\b|\bentonces\b|\btambien\b|\bya\s+que\b)/.test(x) || /(\bet\b|\bmais\b|\bparce\s+que\b|\bdonc\b)/.test(x) || /(\bund\b|\baber\b|\bweil\b|\bdeshalb\b)/.test(x); }
  function beVerbPresent(s){ const x=norm(s); if(state.lang==="es") return /(\bes\b|\bson\b|\bestoy\b|\bestá\b|\bsoy\b)/.test(x); if(state.lang==="fr") return /(\bc\s*est\b|\best\b|\bsont\b|\bsuis\b|\bai\b|\bas\b|\ba\b|\bont\b)/.test(x); if(state.lang==="de") return /(\bist\b|\bsind\b|\bbin\b|\bseid\b|\bhabe\b|\bhat\b|\bhaben\b)/.test(x); return false; }
  function pickModelAnswer(p, given){ const t=tidySuggestion(given); if(t && t.length>=10) return t; const text=(p&&p.text)?p.text.toLowerCase():""; if(state.lang==="es"){ if(text.includes("teacher")) return "El profesor es simpático y explica muy bien."; if(text.includes("best friend")) return "Mi mejor amigo es divertido y muy amable."; if(text.includes("classroom")) return "Mi clase es grande y luminosa."; if(text.includes("school")) return "Mi colegio es moderno y está en el centro."; if(text.includes("bedroom")) return "Mi habitación es cómoda y ordenada."; return "Es muy interesante y me gusta mucho."; } if(state.lang==="fr"){ if(text.includes("teacher")) return "Le professeur est sympa et il explique très bien."; if(text.includes("best friend")) return "Mon meilleur ami est drôle et très gentil."; if(text.includes("classroom")) return "Ma salle de classe est grande et lumineuse."; if(text.includes("school")) return "Mon école est moderne et elle est au centre."; if(text.includes("bedroom")) return "Ma chambre est confortable et bien rangée."; return "C’est très intéressant et j’aime beaucoup."; } if(state.lang==="de"){ if(text.includes("teacher")) return "Der Lehrer ist nett und erklärt sehr gut."; if(text.includes("best friend")) return "Mein bester Freund ist lustig und sehr freundlich."; if(text.includes("classroom")) return "Mein Klassenzimmer ist groß und hell."; if(text.includes("school")) return "Meine Schule ist modern und liegt im Zentrum."; if(text.includes("bedroom")) return "Mein Zimmer ist gemütlich und ordentlich."; return "Es ist sehr interessant und ich mag es sehr."; } return tidySuggestion(given)||""; }
  function escapeHtml(s){ return String(s||"").replace(/[&<>"]/g, ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch])); }

  async function markWithAI(payload){
    if(typeof window.aiCorrect !== "function") throw new Error("aiCorrect not found");
    const timeoutMs = 12000;
    return await Promise.race([
      window.aiCorrect(payload),
      new Promise((_,rej)=> setTimeout(()=> rej(new Error("AI timeout")), timeoutMs))
    ]);
  }

  async function finishRound(){
    clearInterval(state.timer);
    state.elapsedMs = Date.now() - state.startedAt;
    if(el.aiStatusText) el.aiStatusText.textContent = "Marking with coach…";

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
        if(ok && rubric.requireConnector && (p.badge==="structure" || /because|why|opinion|reasons/i.test(p.text))){ if(!connectorPresent(ans)){ ok=false; reason="Missing connector"; } }
        if(ok && rubric.requireBe && p.badge==="ser"){ if(!beVerbPresent(ans)){ ok=false; reason="Missing to-be"; } }
      }

      const aiSaysCorrect = (ai.is_correct===true) || (ai.isCorrect===true) || (ai.correct===true);
      if(!ok && aiSaysCorrect){ ok=true; reason=""; }

      const suggestion = (aiCorrection && String(aiCorrection).trim()) ? String(aiCorrection).trim() : pickModelAnswer(p, ans);
      const tip = (aiTip && String(aiTip).trim()) ? String(aiTip).trim() : (ok ? "Nice — add one extra detail next time." : "Upgrade: add one extra detail + keep it one clean sentence.");
      const why = (aiWhy && String(aiWhy).trim()) ? String(aiWhy).trim() : (ok ? "" : `To score: ${reason}.`);

      if(!ok){ wrong++; reasonsCount[reason] = (reasonsCount[reason]||0)+1; }

      const det = detectTags(p.text, ans||"", state.lang, rubric);
      items.push({ n:i+1, prompt:p.text, answer:ans||"—", ok, reason, suggestion, tip, why, tags: det.tags, examples: det.examples });
    }

    const scoreSec = computeScoreSec(state.elapsedMs, wrong);
    const passed = roundPassesUnlock(wrong, scoreSec, state.level);


  // Coach focus (one thing only)
  const focus = pickRoundFocus(items, state.lang, rubric);
  state.mark = { items, wrong, scoreSec, passed, focus: `${focus.label} (${focus.count})`, focusTag: focus.tag, focusLabel: focus.label, focusCount: focus.count, focusExamples: focus.examples };
  state.gymRequired = (wrong >= 3);

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

  renderResults();
  show("results");

  // Coach intermission (tap to continue)
  showCoachIntermission();
}

  function showCoachIntermission(){
  const name = getPlayerName() || "mate";
  const m = state.mark;
  const target = unlockTargetForLevel(state.level);
  const vibe = m.passed ? pick(COACH.praise) : pick(COACH.push);
  const jail = state.gymRequired ? pick(COACH.jail) : "";
  const focusLine = `<b>Today’s focus:</b> ${escapeHtml(m.focusLabel)}${m.focusCount?` <span class="muted">(${m.focusCount} answers)</span>`:""}`;
  const ex = (m.focusExamples||[]).slice(0,3);
  const exHtml = ex.length ? ("<div class='muted' style='margin-top:6px'><b>Examples:</b><ul>"+ex.map(x=>"<li>"+escapeHtml(x)+"</li>").join("")+"</ul></div>") : "";

  const reward = state.lastReward;
  const rewardHtml = reward ? `<div class="muted" style="margin-top:10px"><b>Prize:</b> +${reward.coins} ⚡${reward.loot?` • <b>Loot:</b> ${escapeHtml(reward.loot.name)}`:""}</div>` : "";

  const sub = m.passed ? `Well done, ${escapeHtml(name)}.` : `Alright ${escapeHtml(name)} — we can fix this.`;
  const html = `
    <div>${escapeHtml(vibe)} ${m.passed ? "" : escapeHtml(pick(COACH.push))}</div>
    <div class="muted" style="margin-top:8px">
      <b>Time:</b> ${escapeHtml(fmtTime(state.elapsedMs))} &nbsp; • &nbsp;
      <b>Wrong:</b> ${m.wrong} &nbsp; • &nbsp;
      <b>Turbo score:</b> ${m.scoreSec.toFixed(1)}s
    </div>
    <div class="muted" style="margin-top:8px">
      <b>Unlock target:</b> ${target}s + ≤2 wrong
    </div>
    <div style="margin-top:10px">${focusLine}</div>
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
      primaryText: "Enter Gym 🔒",
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
      primaryText: m.passed ? "See Results ✓" : "See Results",
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

    if(el.feedbackList){
      el.feedbackList.innerHTML="";
      m.items.forEach(it=>{
        const card=document.createElement("div");
        card.className="fbCard";
        card.innerHTML = `
          <div class="fbTop">
            <div class="fbNum">${it.n}</div>
            <div class="fbPrompt">${escapeHtml(it.prompt)}</div>
            <div class="fbVerdict ${it.ok?"good":"bad"}">${it.ok?"OK":"Fix"}</div>
          </div>
          <div class="fbBody">
            <div class="fbBox">
              <div class="fbLabel">Your answer</div>
              <div class="fbText">${escapeHtml(it.answer)}</div>
            </div>
            <div class="fbBox">
              <div class="fbLabel">Suggested upgrade</div>
              <div class="fbText">${escapeHtml(it.suggestion||"—")}</div>
            </div>
          </div>
          <div class="fbTip">${escapeHtml(it.tip||"")}${it.why?("<br><span style='opacity:.85'>"+escapeHtml(it.why)+"</span>"):""}</div>
        `;
        el.feedbackList.appendChild(card);
      });
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
    const t = state.workshop.gate.target;
    const left = Math.max(0, t - state.workshop.stats.streak);
    const unlocked = left===0;
    el.wsExit.textContent = unlocked ? "Exit Gym ✓" : `Exit Gym 🔒 (need ${left} more)`;
    el.wsExit.disabled = !unlocked;
  }

  
  
function gymFocusType(){
  // Prefer explicit tag chosen by coach
  const tag = state.workshop.focusTag || "";
  if(tag==="spelling") return "spelling";
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
  state.workshop.stats = {correct:0, attempts:0, streak:0};
  state.workshop.gate = { type:"streak", target: gymTarget(state.level, state.mark.wrong) };

  const sub = state.gymRequired ? "Coach says: earn your exit." : "Optional training: sharpen one thing.";
  if(el.wsSubtitle) el.wsSubtitle.textContent = sub;

  if(el.wsCogs){
    el.wsCogs.innerHTML="";
    const lines = [
      "Main focus: " + focusLabel,
      "Goal: " + state.workshop.gate.target + " correct in a row",
      state.gymRequired ? "Jeopardy: no exit until cleared" : "Quick reps, then leave"
    ];
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
    const type = gymFocusType();
    const variant = Math.random() < 0.55 ? "choice" : "type";

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
  const ref = state.workshop.refItem || {answer:""};
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
      else if(type==="detail"){
        if(el.wsPrompt) el.wsPrompt.textContent = "Pick the best upgraded answer (more detail).";
        const base = (L==="es") ? "Mi amigo es simpático." : (L==="fr") ? "Mon ami est sympa." : "Mein Freund ist nett.";
        const good = (L==="es") ? "Mi amigo es simpático y muy trabajador." :
                     (L==="fr") ? "Mon ami est sympa et très travailleur." :
                                  "Mein Freund ist nett und sehr fleißig.";
        const opts = shuffle([good, base, tidySuggestion(base.replace(".", " y divertido.")), base.replace(".", "")]).slice(0,4);
        opts.forEach(o=>{
          const b=document.createElement("button");
          b.className="wsChoice"; b.type="button"; b.textContent=o;
          b.addEventListener("click", ()=> gymMark(o===good, o===good ? "Nice — stronger detail." : "Try again: pick the option with extra detail."));
          el.wsChoices.appendChild(b);
        });
        if(el.wsHelp) el.wsHelp.textContent = "Aim: add ONE extra detail (adjective, reason, or second fact).";
      }
      else {
        if(el.wsPrompt) el.wsPrompt.textContent = "Pick the best upgraded answer.";
        const good = pickModelAnswer({text:""}, "");
        const bad = (L==="es") ? "Es bueno." : (L==="fr") ? "C’est bien." : "Es ist gut.";
        const opts = shuffle([good, tidySuggestion(bad), bad, good.replace(".", " y muy interesante.")]).slice(0,4);
        opts.forEach(o=>{
          const b=document.createElement("button");
          b.className="wsChoice"; b.type="button"; b.textContent=o;
          b.addEventListener("click", ()=>{ const ok = (o===good) || o.startsWith(good); gymMark(ok, ok?"Nice — strong model.":"Not quite — pick the strongest model."); });
          el.wsChoices.appendChild(b);
        });
        if(el.wsHelp) el.wsHelp.textContent = "Choose the option with more detail + clean structure.";
      }

      return;
    }

    // TYPE variant
    el.wsChoices.classList.add("hidden");
    el.wsInputRow.classList.remove("hidden");
    if(el.wsInput) el.wsInput.value="";
    if(el.wsFeedback) el.wsFeedback.textContent="";

    
if(type==="spelling"){
  const ref = state.workshop.refItem || {answer:""};
  const fx = (state.lang==="es") ? wordFixesES(ref.answer||"") : {fixed: ref.answer||""};
  if(el.wsPrompt) el.wsPrompt.textContent =
    (state.lang==="es") ? `Type the corrected version (spelling/accents):\n"${String(ref.answer||"").trim()}"` :
                          "Type the corrected version (spelling).";
  if(el.wsHelp) el.wsHelp.textContent = (state.lang==="es") ? `Target: ${String(fx.fixed||"").trim()}` : "Fix spelling cleanly.";
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
      const ref = state.workshop.refItem || {prompt:"", answer:""};
      const baseAns = String(ref.answer||"").trim();
      const basePrompt = String(ref.prompt||"").trim();

      if(baseAns){
        if(el.wsPrompt) el.wsPrompt.textContent =
          (L==="es") ? `Upgrade THIS answer (add ONE extra detail):\n"${baseAns}"` :
          (L==="fr") ? `Améliore CETTE réponse (ajoute UN détail):\n"${baseAns}"` :
                       `Verbessere DIESE Antwort (ein Detail mehr):\n"${baseAns}"`;
      }else{
        if(el.wsPrompt) el.wsPrompt.textContent =
          (L==="es") ? `Write a NEW upgraded answer for:\n"${basePrompt||"the last prompt"}"` :
          (L==="fr") ? `Écris une NOUVELLE réponse améliorée pour :\n"${basePrompt||"le dernier prompt"}"` :
                       `Schreibe eine NEUE verbesserte Antwort für:\n"${basePrompt||"die letzte Aufgabe"}"`;
      }

      if(el.wsHelp) el.wsHelp.textContent =
        (L==="es") ? "Aim: ONE extra detail (también / además…) • 6+ words." :
        (L==="fr") ? "Objectif: UN détail en plus • 6+ mots." :
                     "Ziel: EIN Detail mehr • 6+ Wörter.";} else {
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
  const ref = state.workshop.refItem || {answer:""};
  const fx = (state.lang==="es") ? wordFixesES(ref.answer||"") : {fixed: ref.answer||""};
  const want = String(fx.fixed||"").trim().toLowerCase();
  ok = val.trim().toLowerCase() === want;
  msgOk = "Clean — spelling fixed.";
  msgNo = "Try again: type the corrected version (with accents).";
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
    if(el.quitBtn) el.quitBtn.addEventListener("click", ()=>{ clearInterval(state.timer); show("home"); renderThemeTiles(); });
    if(el.playAgainBtn) el.playAgainBtn.addEventListener("click", ()=> startRound());
    if(el.workshopBtn) el.workshopBtn.addEventListener("click", ()=> openGymFromResults());
    if(el.homeBtn) el.homeBtn.addEventListener("click", ()=>{ show("home"); renderThemeTiles(); });
    if(el.wsBackResults) el.wsBackResults.addEventListener("click", ()=> show("results"));
    if(el.wsHome) el.wsHome.addEventListener("click", ()=>{ show("home"); renderThemeTiles(); });
    if(el.wsExit) el.wsExit.addEventListener("click", ()=>{ if(el.wsExit.disabled) return; show("home"); renderThemeTiles(); });
    if(el.wsSubmit) el.wsSubmit.addEventListener("click", handleGymSubmit);
    if(el.wsInput) el.wsInput.addEventListener("keydown", (e)=>{ if(e.key==="Enter"){ e.preventDefault(); handleGymSubmit(); } });
    if(el.wsOverride) el.wsOverride.addEventListener("click", ()=>{ if(el.wsExit){ el.wsExit.disabled=false; el.wsExit.textContent="Exit Gym ✓"; } toast("Teacher override used"); });
  }

  function init(){
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
