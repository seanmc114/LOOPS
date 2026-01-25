/* LOOPS — i18n SOLO ARCADE build
   - Spanish/French/German toggle
   - Badge + chips fully localised (no 'ser' leaking into French/German UI)
   - Per-round progress bar + marking progress bar
   - Global progress bar (unique setups completed) for bragging rights
   - Optional Text-to-Speech (🔊) + Voice dictation (🎤) using Web Speech APIs
*/

(function () {
  "use strict";

  const PROMPTS_PER_ROUND = 10;

  // ----------------- Language options -----------------
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

  function safeLang(l) {
    return LANGS[l] ? l : "es";
  }

  // ----------------- Data -----------------
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

  // Prompt bank (language is what students PRODUCE)
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

  function poolForLevel(level) {
    const idx = Math.max(1, Math.min(10, level)) - 1;
    const pool = PROMPT_BANK[idx] || PROMPT_BANK[0];
    return Array.isArray(pool) ? pool : PROMPT_BANK[0];
  }

  // ----------------- Helpers -----------------
  function $(id) { return document.getElementById(id); }

  function showScreen(name) {
    const screens = { home: $("screenHome"), game: $("screenGame"), results: $("screenResults"), workshop: $("screenWorkshop") };
    Object.values(screens).filter(Boolean).forEach((s) => s.classList.add("hidden"));
    (screens[name] || screens.home).classList.remove("hidden");
  }


// Tiny toast (friendly hints)
let __toastTimer = null;
function toast(msg){
  const t = $("toast");
  if(!t) return alert(msg);
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(__toastTimer);
  __toastTimer = setTimeout(()=> t.classList.add("hidden"), 2200);
}

  function fmtTime(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  function penaltyForLevel() { return 30; }
  function sprintCapForLevel(level) { return Math.max(35, 70 - level * 3); }

  function labelMode(mode) {
    switch (mode) {
      case "classic": return "Classic";
      case "sprint": return "Sprint";
      case "survival": return "Survival";
      case "relay": return "Relay";
      default: return "Classic";
    }
  }

  function shuffleInPlace(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function localizePromptText(text, lang) {
    const L = LANGS[safeLang(lang)] || LANGS.es;
    return String(text || "").replace(/\bSpanish\b/g, L.label);
  }

  function buildRound({ level, seed, lang }) {
    const pool = poolForLevel(level);
    const rng = mulberry32(seed + level * 9991);

    const idx = Array.from({ length: pool.length }, (_, i) => i);
    shuffleInPlace(idx, rng);

    const chosen = idx.slice(0, PROMPTS_PER_ROUND).map((k) => pool[k]);

    return chosen.map((p, i) => ({
      n: i + 1,
      badge: p.badge,
      text: localizePromptText(p.text, lang),
      chips: p.chips || [],
    }));
  }

  // ----------------- Speech (TTS + Dictation) -----------------
  const canTTS = typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined";
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canDictate = !!SpeechRecognition;

  function speak(text, lang) {
    if (!canTTS) { alert("Text-to-speech isn't available on this browser/device."); return; }
    const utter = new SpeechSynthesisUtterance(String(text || ""));
    const L = LANGS[safeLang(lang)] || LANGS.es;
    utter.lang = L.speech || "es-ES";
    try { window.speechSynthesis.cancel(); window.speechSynthesis.speak(utter); }
    catch { alert("Text-to-speech failed on this browser/device."); }
  }

  function makeRecognizer(lang) {
    if (!canDictate) return null;
    const rec = new SpeechRecognition();
    const L = LANGS[safeLang(lang)] || LANGS.es;
    rec.lang = L.speech || "es-ES";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    return rec;
  }

  // ----------------- State -----------------
  const state = {
    level: 1,
    mode: "classic",
    lang: "es",
    seed: 0,
    prompts: [],
    idx: 0,
    answers: [],
    wrongMarks: [],
    reviewed: [], // for marking progress
    startedAt: 0,
    elapsedMs: 0,
    timer: null,
    relayTurn: "A",
    // LOOPS: results/workshop gating
    markLocked: false,
    workshop: { required:false, cleared:false, focus:"", gate:null, stats:{correct:0, attempts:0, streak:0}, current:null },
    // AI marking (Move 1)
    ai: { ok:false, items:[], summary:null, error:null },
    roundPassed: false,
    gymRequired: false,
    unlockTarget: 0,
  };

  // ----------------- DOM -----------------
  const el = {
    pillLevel: $("pillLevel"),
    pillMode: $("pillMode"),
    pillLang: $("pillLang"),
    pillPenalty: $("pillPenalty"),

    levelSelect: $("levelSelect"),
    modeSelect: $("modeSelect"),
    langSelect: $("langSelect"),
    langHint: $("langHint"),
    subtitle: $("subtitle"),

    levelHint: $("levelHint"),
    unlockHint: $("unlockHint"),
    modeHintHome: $("modeHintHome"),

    soloBtn: $("soloBtn"),
    pbOut: $("pbOut"),
    roundsOut: $("roundsOut"),

    globalFill: $("globalFill"),
    globalText: $("globalText"),

    gameTitle: $("gameTitle"),
    tagCap: $("tagCap"),
    tagTips: $("tagTips"),

    progressFill: $("progressFill"),
    progressText: $("progressText"),

    promptArea: $("promptArea"),
    prevBtn: $("prevBtn"),
    nextBtn: $("nextBtn"),
    quitBtn: $("quitBtn"),
    modeHint: $("modeHint"),

    // Results
    timeOut: $("timeOut"),
    wrongOut: $("wrongOut"),
    scoreOut: $("scoreOut"),

    aiStatus: $("aiStatus"),
    aiStatusText: $("aiStatusText"),
    aiSpin: $("aiSpin"),

    markFill: $("markFill"),
    markText: $("markText"),

    markGrid: $("markGrid"),
    answersWrap: $("answersWrap"),

    allCorrectBtn: $("allCorrectBtn"),
    blanksWrongBtn: $("blanksWrongBtn"),
    expandBtn: $("expandBtn"),
    copyBtn: $("copyBtn"),

    playAgainBtn: $("playAgainBtn"),
    homeBtn: $("homeBtn"),
    pbBanner: $("pbBanner"),

    // LOOPS: workshop + feedback lock
    lockFeedbackBtn: $("lockFeedbackBtn"),
    workshopBtn: $("workshopBtn"),
    workshopHint: $("workshopHint"),

    // Workshop screen
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
  };

  // ----------------- Storage keys -----------------
  function setupKey(s) { return `LOOPS_SETUP_v1_${safeLang(s.lang)}_L${s.level}_${s.mode}`; }
  function pbKey(s) { return `LOOPS_PB_v3_${safeLang(s.lang)}_L${s.level}_${s.mode}`; }
  function roundsKey() { return "LOOPS_ROUNDS_v1"; }
  function doneKey() { return "LOOPS_DONE_v1"; } // json map of completed setup keys

  const TOTAL_SETUPS = 10 * 4 * 3; // levels * modes * langs

  // ----------------- Level unlocks (Move 1) -----------------
  function unlockKey(lang){ return `LOOPS_UNLOCK_v1_${safeLang(lang)}`; }

  function loadUnlockedLevel(lang){
    const raw = localStorage.getItem(unlockKey(lang));
    const n = raw ? Number(raw) : 1;
    return Math.min(10, Math.max(1, isFinite(n) ? n : 1));
  }

  function saveUnlockedLevel(lang, level){
    const n = Math.min(10, Math.max(1, Number(level)||1));
    localStorage.setItem(unlockKey(lang), String(n));
  }

  function isLevelUnlocked(level, lang){
    return Number(level) <= loadUnlockedLevel(lang);
  }

  // Turbo-style target score to unlock the NEXT level
  function unlockTargetForLevel(level){
    // seconds (Score = time + wrong*penalty)
    // Level 1 is lenient; gets tighter as levels go up.
    return Math.max(150, 220 - (Number(level)||1) * 7);
  }

  function roundPassesUnlock(wrong, score, level){
    return (wrong <= 2) && (score <= unlockTargetForLevel(level));
  }



  // ----------------- PB -----------------
  function loadPB(s) {
    try {
      const raw = localStorage.getItem(pbKey(s));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj.bestScore !== "number") return null;
      return obj;
    } catch { return null; }
  }

  function savePBIfBetter(s, scoreSec, wrong, timeMs) {
    const current = loadPB(s);
    const entry = { bestScore: scoreSec, bestWrong: wrong, bestTimeMs: timeMs, at: Date.now() };
    if (!current || scoreSec < current.bestScore) {
      localStorage.setItem(pbKey(s), JSON.stringify(entry));
      return true;
    }
    return false;
  }

  function incRounds() {
    const v = Number(localStorage.getItem(roundsKey()) || "0") || 0;
    localStorage.setItem(roundsKey(), String(v + 1));
  }
  function getRounds() { return Number(localStorage.getItem(roundsKey()) || "0") || 0; }

  // ----------------- Global progress -----------------
  function getDoneMap() {
    try {
      const raw = localStorage.getItem(doneKey());
      if (!raw) return {};
      const obj = JSON.parse(raw);
      return obj && typeof obj === "object" ? obj : {};
    } catch { return {}; }
  }

  function markSetupDone(s) {
    const map = getDoneMap();
    const k = setupKey(s);
    if (!map[k]) {
      map[k] = true;
      localStorage.setItem(doneKey(), JSON.stringify(map));
    }
  }

  function countDone() {
    const map = getDoneMap();
    return Object.keys(map).length;
  }

  function syncGlobalProgress() {
    const done = countDone();
    if (el.globalText) el.globalText.textContent = `${done} / ${TOTAL_SETUPS}`;
    if (el.globalFill) el.globalFill.style.width = `${Math.min(100, (done / TOTAL_SETUPS) * 100)}%`;
  }

  // ----------------- UI sync -----------------
  function syncPills() {
    const pen = penaltyForLevel();
    const L = LANGS[safeLang(state.lang)] || LANGS.es;
    const info = LEVEL_INFO[state.level - 1] || { title: `Level ${state.level}` };
    el.pillLevel.textContent = `Level: ${info.title}`;
    el.pillMode.textContent = `Mode: ${labelMode(state.mode)}`;
    el.pillLang.textContent = `Language: ${L.label}`;
    el.pillPenalty.textContent = `Penalty: +${pen}s`;
  }

  function syncHints() {
    const info = LEVEL_INFO[state.level - 1] || LEVEL_INFO[0];
    el.levelHint.textContent = `${info.title} — ${info.hint}`;

    // Unlock target (Turbo score) for this level
    state.unlockTarget = unlockTargetForLevel(state.level);
    const unlocked = loadUnlockedLevel(state.lang);
    if (el.unlockHint) {
      if (state.level < 10) {
        el.unlockHint.textContent = `Unlock next level: score ≤ ${state.unlockTarget}s and ≤ 2 wrong. Unlocked: ${unlocked}/10.`;
      } else {
        el.unlockHint.textContent = `Final level — aim for score ≤ ${state.unlockTarget}s and ≤ 2 wrong.`;
      }
    }



    const L = LANGS[safeLang(state.lang)] || LANGS.es;
    if (el.langHint) el.langHint.textContent = `Answers should be in ${L.label}. Dictation (🎤) uses ${L.speech} if supported.`;
    if (el.subtitle) el.subtitle.textContent = `Junior Cycle — describe people, places & routines (${L.label})`;

    el.modeHintHome.textContent =
      state.mode === "classic" ? "No cap. Finish all 10."
      : state.mode === "sprint" ? `Time cap: ${sprintCapForLevel(state.level)}s. Submit fast.`
      : state.mode === "survival" ? "One wrong ends the round. Be precise."
      : "Relay: write answers twice (A then B).";
  }

  function syncHomeStats() {
    const pb = loadPB(state);
    if (!pb) el.pbOut.textContent = "—";
    else el.pbOut.textContent = `${pb.bestScore.toFixed(1)}s (wrong: ${pb.bestWrong})`;
    el.roundsOut.textContent = String(getRounds());
    syncGlobalProgress();
  }

  function buildLevelOptions() {
    const unlocked = loadUnlockedLevel(state.lang);
    el.levelSelect.innerHTML = "";
    for (let i = 1; i <= 10; i++) {
      const info = LEVEL_INFO[i - 1] || { title: `Level ${i}` };
      const opt = document.createElement("option");
      opt.value = String(i);
      const locked = i > unlocked;
      opt.textContent = locked ? `🔒 ${info.title}` : info.title;
      opt.disabled = locked;
      el.levelSelect.appendChild(opt);
    }

    // Keep current selection valid
    if (state.level > unlocked) state.level = unlocked;
    el.levelSelect.value = String(state.level);
  }

  // ----------------- Progress bars -----------------
  function syncProgress() {
    const done = state.idx + 1;
    const pct = (done / PROMPTS_PER_ROUND) * 100;
    if (el.progressFill) el.progressFill.style.width = `${pct}%`;
    if (el.progressText) el.progressText.textContent = `${done} / ${PROMPTS_PER_ROUND}`;
  }

  function syncMarkProgress() {
    const reviewed = state.reviewed.reduce((a, b) => a + (b ? 1 : 0), 0);
    const pct = (reviewed / PROMPTS_PER_ROUND) * 100;
    if (el.markFill) el.markFill.style.width = `${pct}%`;
    if (el.markText) el.markText.textContent = `${reviewed} / ${PROMPTS_PER_ROUND}`;
  }

function markingComplete(){
  return state.reviewed.length === PROMPTS_PER_ROUND && state.reviewed.every(Boolean);
}

function countWrong(){
  return state.wrongMarks.reduce((a,b)=> a + (b?1:0), 0);
}

function syncLockBtn(){
  if(!el.lockFeedbackBtn) return;
  if(state.markLocked){
    el.lockFeedbackBtn.textContent = "Feedback locked ✓";
    el.lockFeedbackBtn.disabled = true;
    el.lockFeedbackBtn.classList.add("disabled");
  }else{
    el.lockFeedbackBtn.textContent = "Lock feedback";
    el.lockFeedbackBtn.disabled = false;
    el.lockFeedbackBtn.classList.remove("disabled");
  }
}

function syncWorkshopCta(){
  if(!el.workshopBtn) return;
  const complete = markingComplete();
  const locked = !!state.markLocked;
  const wrong = countWrong();

  // Workshop is only available after marking is complete AND feedback is locked.
  if(!complete){
    el.workshopBtn.textContent = "Workshop 🔒";
    el.workshopBtn.disabled = true;
    if(el.workshopHint) el.workshopHint.textContent = "Step 1: Mark all 10 boxes to finish feedback.";
    return;
  }
  if(!locked){
    el.workshopBtn.textContent = "Workshop 🔒";
    el.workshopBtn.disabled = true;
    if(el.workshopHint) el.workshopHint.textContent = "Step 2: Press “Lock feedback” to open Workshop.";
    return;
  }

  el.workshopBtn.disabled = false;
  if (wrong > 0 && !state.workshop.cleared){
    el.workshopBtn.textContent = "Open Workshop";
    if(el.workshopHint) el.workshopHint.textContent = "Workshop is required when you have wrong answers — it will drill your top “cog”.";
  } else {
    el.workshopBtn.textContent = "Workshop (optional)";
    if(el.workshopHint) el.workshopHint.textContent = wrong === 0 ? "Perfect round — Workshop is optional practice." : "Workshop cleared ✓";
  }
}

  // ----------------- Game flow -----------------
  function startTimer() {
    state.startedAt = performance.now();
    state.elapsedMs = 0;
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(() => {
      state.elapsedMs = performance.now() - state.startedAt;
      if (state.mode === "sprint") {
        const cap = sprintCapForLevel(state.level) * 1000;
        if (state.elapsedMs >= cap) {
          state.elapsedMs = cap;
          stopTimer();
          goToResults();
        }
      }
    }, 100);
  }

  function stopTimer() { if (state.timer) clearInterval(state.timer); state.timer = null; }

  function resetRun() {
    state.answers = Array(PROMPTS_PER_ROUND).fill("");
    state.wrongMarks = Array(PROMPTS_PER_ROUND).fill(false);
    state.reviewed = Array(PROMPTS_PER_ROUND).fill(false);
    state.idx = 0;
    state.relayTurn = "A";
  }

  function startRound(seed) {
    resetRun();
    state.seed = seed;
    state.prompts = buildRound({ level: state.level, seed: state.seed, lang: state.lang });

    syncPills();
    renderGame();
    showScreen("game");
    startTimer();
  }

  function startSolo() { startRound(Math.floor(Math.random() * 1296)); }

  // ----------------- Render game -----------------
  function renderGame() {
    const info = LEVEL_INFO[state.level - 1] || LEVEL_INFO[0];
    el.gameTitle.textContent = `${info.title}`;
    el.tagCap.textContent = state.mode === "sprint" ? `Sprint cap: ${sprintCapForLevel(state.level)}s` : "Sprint cap: —";
    el.tagTips.textContent = `Tips: ${info.hint}`;

    el.modeHint.textContent =
      state.mode === "classic" ? "Write 10 answers. Then mark wrong fast."
      : state.mode === "sprint" ? "Time cap mode: go fast."
      : state.mode === "survival" ? "One wrong ends the round."
      : "Relay: answer twice (A then B).";

    renderPrompt();
  }

  function makeChip(label, klass) {
    const d = document.createElement("span");
    d.className = `chip ${klass || ""}`.trim();
    d.textContent = label;
    return d;
  }

  function renderPrompt() {
    el.promptArea.innerHTML = "";

    const p = state.prompts[state.idx];
    const L = LANGS[safeLang(state.lang)] || LANGS.es;

    const card = document.createElement("div");
    card.className = "promptCard";

    const top = document.createElement("div");
    top.className = "promptTop";

    const left = document.createElement("div");
    const text = document.createElement("div");
    text.className = "promptText";
    text.textContent = `${p.n}. ${p.text}`;
    left.appendChild(text);

    const badge = document.createElement("div");
    badge.className = "badge";
    const b = p.badge || "";

    // FULLY localise badge label so French/German never see 'ser'
    const badgeLabel = (L.chipLabels && L.chipLabels[b]) ? L.chipLabels[b] : (b || "prompt");
    badge.textContent = badgeLabel;

    if (b === "ser") badge.classList.add("green");
    if (b === "estar") badge.classList.add("purple");

    top.appendChild(left);
    top.appendChild(badge);

    const chips = document.createElement("div");
    chips.className = "chips";
    const chipLabels = L.chipLabels || LANGS.es.chipLabels;

    (p.chips || []).forEach((c) => {
      const label = chipLabels[c] || c;
      chips.appendChild(makeChip(label, c));
    });

    const row = document.createElement("div");
    row.className = "answerRow";

    const input = document.createElement("input");
    input.type = "text";
    input.value = state.answers[state.idx] || "";
    input.placeholder = L.placeholder || "Write your answer…";
    input.autocomplete = "off";
    input.spellcheck = true;

    input.addEventListener("input", () => {
      state.answers[state.idx] = input.value;
    });

    // Read aloud button
    const speakBtn = document.createElement("button");
    speakBtn.className = "iconBtn";
    speakBtn.type = "button";
    speakBtn.title = canTTS ? "Read prompt aloud" : "Text-to-speech not supported";
    speakBtn.textContent = "🔊";
    if (!canTTS) speakBtn.disabled = true;
    speakBtn.addEventListener("click", () => speak(p.text, state.lang));

    // Dictation button
    const micBtn = document.createElement("button");
    micBtn.className = "iconBtn";
    micBtn.type = "button";
    micBtn.title = canDictate ? "Dictate answer" : "Voice dictation not supported";
    micBtn.textContent = "🎤";
    if (!canDictate) micBtn.disabled = true;

    let activeRec = null;
    micBtn.addEventListener("click", () => {
      if (!canDictate) return;

      if (activeRec) {
        try { activeRec.stop(); } catch {}
        activeRec = null;
        micBtn.textContent = "🎤";
        return;
      }

      const rec = makeRecognizer(state.lang);
      if (!rec) return;

      activeRec = rec;
      micBtn.textContent = "⏺️";

      let finalText = "";

      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          const t = r[0] && r[0].transcript ? r[0].transcript : "";
          if (r.isFinal) finalText += t;
          else interim += t;
        }
        const combined = (finalText + " " + interim).trim().replace(/\s+/g, " ");
        input.value = combined;
        state.answers[state.idx] = combined;
      };

      rec.onerror = () => {
        activeRec = null;
        micBtn.textContent = "🎤";
        alert("Dictation failed (browser permission or support issue).");
      };

      rec.onend = () => {
        activeRec = null;
        micBtn.textContent = "🎤";
      };

      try { rec.start(); }
      catch {
        activeRec = null;
        micBtn.textContent = "🎤";
        alert("Dictation couldn't start on this browser/device.");
      }
    });

    row.appendChild(input);
    row.appendChild(speakBtn);
    row.appendChild(micBtn);

    card.appendChild(top);
    if ((p.chips || []).length) card.appendChild(chips);
    card.appendChild(row);

    el.promptArea.appendChild(card);

    el.prevBtn.disabled = state.idx === 0;
    el.nextBtn.textContent = state.idx === PROMPTS_PER_ROUND - 1 ? "Finish" : "Next";

    syncProgress();
  }

  function next() {
    if (state.idx >= PROMPTS_PER_ROUND - 1) {
      if (state.mode === "relay" && state.relayTurn === "A") {
        state.relayTurn = "B";
        state.answers = Array(PROMPTS_PER_ROUND).fill("");
        state.wrongMarks = Array(PROMPTS_PER_ROUND).fill(false);
        state.reviewed = Array(PROMPTS_PER_ROUND).fill(false);
        state.idx = 0;
        renderGame();
        return;
      }
      goToResults();
      return;
    }
    state.idx++;
    renderPrompt();
  }

  function prev() { if (state.idx > 0) { state.idx--; renderPrompt(); } }

  function quitToHome() {
    stopTimer();
    showScreen("home");
    syncPills();
    syncHints();
    syncHomeStats();
  }

  // ----------------- Scoring + marking -----------------
  function computeScore() {
    const pen = penaltyForLevel();
    const wrong = state.wrongMarks.reduce((a, b) => a + (b ? 1 : 0), 0);
    const base = state.elapsedMs / 1000;
    const score = base + wrong * pen;
    return { wrong, score };
  }

  function renderMarkGrid() {
    el.markGrid.innerHTML = "";
    for (let i = 0; i < PROMPTS_PER_ROUND; i++) {
      const cell = document.createElement("div");
      cell.className = "markCell";
      cell.textContent = String(i + 1);

      const isWrong = !!state.wrongMarks[i];
      cell.classList.add(isWrong ? "bad" : "good");

      cell.addEventListener("click", () => {
        if (state.markLocked) { toast("Feedback is locked. Open Workshop or play again."); return; }
        state.wrongMarks[i] = !state.wrongMarks[i];
        state.reviewed[i] = true; // counts towards marking progress
        renderResults(false);
      });

      el.markGrid.appendChild(cell);
    }
  }

  function renderAnswers(expanded) {
    el.answersWrap.innerHTML = "";
    if (!expanded) return;

    state.prompts.forEach((p, i) => {
      const item = document.createElement("div");
      item.className = "answerItem";

      const n = document.createElement("div");
      n.className = "answerN";
      n.textContent = String(i + 1);

      const prompt = document.createElement("div");
      prompt.className = "answerPrompt";
      prompt.textContent = p.text;

      const ans = document.createElement("div");
      ans.className = "answerGiven";
      const txt = String(state.answers[i] || "").trim();
      ans.textContent = txt ? `Your answer: ${txt}` : "Your answer: (blank)";

      item.appendChild(n);
      item.appendChild(prompt);
      item.appendChild(ans);

      // AI coach (Move 1)
      const aiItem = (state.ai && state.ai.ok && Array.isArray(state.ai.items)) ? state.ai.items[i] : null;
      if (aiItem) {
        const coach = document.createElement("div");
        coach.className = "answerCoach";

        const check = (state.ai && state.ai.rubric && state.ai.rubric[i]) ? state.ai.rubric[i] : null;
        const isCorrect = check ? check.ok : ((aiItem.is_correct ?? aiItem.isCorrect ?? aiItem.correct ?? false) === true);
        const verdict = document.createElement("div");
        verdict.innerHTML = `<span class="tag">${isCorrect ? "✅ Complete" : "❌ Incomplete"}</span>`;
        coach.appendChild(verdict);

        const corr = aiItem.correction || aiItem.best_correction || aiItem.bestCorrection || aiItem.model || aiItem.model_answer || aiItem.modelAnswer ||
          aiItem.suggested || aiItem.suggestion || aiItem.example || aiItem.exemplar || aiItem.target || aiItem.ideal ||
          aiItem.expected || aiItem.expected_answer || aiItem.expectedAnswer || aiItem.rewrite || aiItem.rewrite_answer || aiItem.rewriteAnswer ||
          aiItem.fix || aiItem.correct_answer || aiItem.correctAnswer || "";
        const tip = aiItem.tip || aiItem.next_tip || aiItem.nextTip || aiItem.feedback || aiItem.kind_feedback || aiItem.kindFeedback || "";
        const why = aiItem.reason || aiItem.why || aiItem.rationale || aiItem.notes || "";

        // If the AI didn't return a model answer, show a short "coach example" so students know what to aim for.
        let corrText = corr;
        if (!corrText) corrText = localExample(p, safeLang(state.lang));

        // Also show a clear, arcade-style requirement hint when the rubric says it's incomplete.
        const reqHint = (!isCorrect && check) ? rubricHint(check.reason, safeLang(state.lang)) : "";

        if (corrText) {
          const c = document.createElement("div");
          c.textContent = `Example: ${corrText}`;
          coach.appendChild(c);
        }

        if (reqHint) {
          const h = document.createElement("div");
          h.textContent = `To score: ${reqHint}`;
          coach.appendChild(h);
        }
        if (tip) {
          const t = document.createElement("div");
          t.textContent = `Tip: ${tip}`;
          coach.appendChild(t);
        }
        if (why) {
          const w = document.createElement("div");
          w.textContent = `Why: ${why}`;
          coach.appendChild(w);
        }
        item.appendChild(coach);
      }


            el.answersWrap.appendChild(item);
    });
  }

  function renderResults(firstRender) {
    const { wrong, score } = computeScore();

    el.timeOut.textContent = fmtTime(state.elapsedMs);
    el.wrongOut.textContent = String(wrong);
    el.scoreOut.textContent = `${score.toFixed(1)}s`;

    // Feedback list
    renderAnswers(expanded);

    // Status banner
    if (el.aiStatus) {
      el.aiStatus.classList.add("done");
      el.aiStatus.classList.remove("ok", "fail");
      if (state.ai && state.ai.ok) el.aiStatus.classList.add("ok");
      else el.aiStatus.classList.add("fail");
    }
    if (el.aiSpin) el.aiSpin.classList.remove("hidden");
    if (el.aiStatusText) {
      if (state.ai && state.ai.ok) {
        el.aiStatusText.textContent = "Marked by AI ✓";
      } else if (state.ai && state.ai.error) {
        el.aiStatusText.textContent = `AI marking failed (fallback used): ${state.ai.error}`;
      } else {
        el.aiStatusText.textContent = "Marking…";
      }
    }

    // Gym rule (your decision): mandatory after 3+ wrong
    state.gymRequired = wrong >= 3;

    // Unlock rule: score target + ≤2 wrong
    const passed = roundPassesUnlock(wrong, score, state.level);
    state.roundPassed = passed;

    if (el.workshopBtn) {
      el.workshopBtn.textContent = state.gymRequired && !state.workshop.cleared ? "Gym (required)" : "Gym";
    }
    if (el.workshopHint) {
      if (state.gymRequired && !state.workshop.cleared) {
        el.workshopHint.textContent = "3+ wrong → Gym is required. Clear the gate, then try the level again.";
      } else if (!passed) {
        el.workshopHint.textContent = `Not passed yet — beat the unlock target (≤ ${state.unlockTarget}s) with ≤2 wrong to unlock the next level.`;
      } else {
        el.workshopHint.textContent = "Passed ✓ Level progress unlocked.";
      }
    }

    if (firstRender) {
      // Save bragging-rights completion + PB
      markSetupDone(state);

      const becamePB = savePBIfBetter(state, score, wrong, state.elapsedMs);
      incRounds();
      syncHomeStats();

      if (becamePB) {
        el.pbBanner.classList.remove("hidden");
        setTimeout(() => el.pbBanner.classList.add("hidden"), 2200);
      } else {
        el.pbBanner.classList.add("hidden");
      }

      // Unlock next level if passed
      const unlocked = loadUnlockedLevel(state.lang);
      if (passed && state.level === unlocked && unlocked < 10) {
        saveUnlockedLevel(state.lang, unlocked + 1);
        buildLevelOptions();
        toast(`Level up! Unlocked: ${unlocked + 1}/10`);
      }
    }
  }

  function goToResults() {
    stopTimer();

    // Reset round state
    state.wrongMarks = Array(PROMPTS_PER_ROUND).fill(false);
    state.reviewed = Array(PROMPTS_PER_ROUND).fill(true); // AI will decide; treat as fully reviewed
    state.markLocked = true;

    // Reset Gym state for this round
    state.workshop = { required:false, cleared:false, focus:"", gate:null, stats:{correct:0, attempts:0, streak:0}, current:null };

    // Reset AI state
    state.ai = { ok:false, items:[], summary:null, error:null };

    // Show results immediately with a marking banner
    showScreen("results");
    if (el.aiStatus) {
      el.aiStatus.classList.remove("done", "ok", "fail");
    }
    if (el.aiStatusText) el.aiStatusText.textContent = "Marking with AI…";
    if (el.playAgainBtn) el.playAgainBtn.disabled = true;
    if (el.homeBtn) el.homeBtn.disabled = true;
    if (el.workshopBtn) el.workshopBtn.disabled = true;

    // Default: always show feedback list
    expanded = true;
    if (el.answersWrap) el.answersWrap.classList.remove("hidden");
    if (el.expandBtn) el.expandBtn.textContent = "Hide details";

    // Kick off AI marking
    (async () => {
      try {
        // Always mark blanks as wrong (AI or no AI)
        const blanks = state.answers.map(a => !String(a || "").trim());

        const payload = {
          lang: safeLang(state.lang),
          level: state.level,
          level_title: (LEVEL_INFO[state.level - 1] && LEVEL_INFO[state.level - 1].title) || `Level ${state.level}`,
          mode: state.mode,
          // The coach needs context so it stops false "wrong" calls and can give better examples:
          prompts: state.prompts.map(p => p.text),
          badges: state.prompts.map(p => p.badge || ""),
          answers: state.answers,
          rubric: {
            min_chars: MIN_CHARS,
            min_words: MIN_WORDS,
            require_connector_badge: "structure",
            require_be_badge: "ser"
          },
          time_s: +(state.elapsedMs / 1000).toFixed(2),
          penalty_s: penaltyForLevel(),
          unlock_target_s: unlockTargetForLevel(state.level),
        };

        const res = await aiCorrect(payload);

        const items =
          (res && Array.isArray(res.items) && res.items) ||
          (res && Array.isArray(res.results) && res.results) ||
          (res && Array.isArray(res.answers) && res.answers) ||
          [];

        state.ai.ok = true;
        state.ai.items = items;
        state.ai.summary = res && (res.summary || res.meta || null);

        for (let i = 0; i < PROMPTS_PER_ROUND; i++) {
          // Use a clear, explainable rubric for "wrong" to avoid AI false negatives.
          const check = rubricCheck(state.answers[i], state.prompts[i], safeLang(state.lang));
          if (!state.ai.rubric) state.ai.rubric = Array(PROMPTS_PER_ROUND).fill(null);
          state.ai.rubric[i] = check;

          state.wrongMarks[i] = blanks[i] ? true : !check.ok;
        }
      } catch (err) {
        state.ai.ok = false;
        state.ai.error = (err && err.message) ? err.message : "Unknown error";

        // Fallback: still score using the same clear rubric, even if AI is unavailable
        if (!state.ai.rubric) state.ai.rubric = Array(PROMPTS_PER_ROUND).fill(null);
        for (let i = 0; i < PROMPTS_PER_ROUND; i++) {
          const check = rubricCheck(state.answers[i], state.prompts[i], safeLang(state.lang));
          state.ai.rubric[i] = check;
          state.wrongMarks[i] = !check.ok;
        }
      } finally {
        // Enable buttons
        if (el.playAgainBtn) el.playAgainBtn.disabled = false;
        if (el.homeBtn) el.homeBtn.disabled = false;
        if (el.workshopBtn) el.workshopBtn.disabled = false;

        renderResults(true);

        // Auto-open Gym if 3+ wrong (your rule)
        if (countWrong() >= 3) {
          goToWorkshop();
        }
      }
    })();
  }



  // ----------------- Buttons -----------------
  el.prevBtn.addEventListener("click", prev);
  el.nextBtn.addEventListener("click", next);
  el.quitBtn.addEventListener("click", quitToHome);
  el.soloBtn.addEventListener("click", () => startSolo());

el.playAgainBtn.addEventListener("click", () => {
  const { wrong, score } = computeScore();
  const passed = roundPassesUnlock(wrong, score, state.level);

  // Mandatory Gym after 3+ wrong
  if (wrong >= 3 && !state.workshop.cleared) {
    toast("Gym required — clear the gate first.");
    goToWorkshop();
    return;
  }

  // Loop until pass (Turbo style)
  if (!passed) {
    toast(`Try again — target is ≤ ${state.unlockTarget}s and ≤ 2 wrong.`);
    startSolo(); // retry same level
    return;
  }

  startSolo();
});

el.homeBtn.addEventListener("click", () => {
  const { wrong, score } = computeScore();
  const passed = roundPassesUnlock(wrong, score, state.level);

  if (wrong >= 3 && !state.workshop.cleared) {
    toast("Gym required — clear the gate first.");
    goToWorkshop();
    return;
  }

  // Until passed, keep them in the loop (your request)
  if (!passed) {
    toast("Pass the level to return to menu.");
    return;
  }

  quitToHome();
});

if (el.workshopBtn) el.workshopBtn.addEventListener("click", () => {
  goToWorkshop();
});

// Workshop controls
if (el.wsSubmit) el.wsSubmit.addEventListener("click", submitWorkshopText);
if (el.wsInput) el.wsInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submitWorkshopText(); });

if (el.wsBackResults) el.wsBackResults.addEventListener("click", () => { showScreen("results"); renderResults(false); });
if (el.wsHome) el.wsHome.addEventListener("click", () => {
  if (state.workshop.required && !state.workshop.cleared) { toast("Exit locked — clear the gate first."); return; }
  quitToHome();
});
if (el.wsExit) el.wsExit.addEventListener("click", () => { showScreen("results"); renderResults(false); });

// Teacher override: Shift+O toggles override button visibility
document.addEventListener("keydown", (e) => {
  if (e.key && e.key.toLowerCase() === "o" && e.shiftKey) {
    if (el.wsTeacher) el.wsTeacher.classList.toggle("hidden");
    toast((el.wsTeacher && el.wsTeacher.classList.contains("hidden")) ? "Override hidden" : "Override shown");
  }
});
if (el.wsOverride) el.wsOverride.addEventListener("click", () => {
  state.workshop.cleared = true;
  syncExitLock();
  toast("Exit unlocked.");
});
  if (el.allCorrectBtn) el.allCorrectBtn.addEventListener("click", () => {
    toast("AI marking is automatic.");
  });
  if (el.blanksWrongBtn) el.blanksWrongBtn.addEventListener("click", () => {
    toast("AI marking is automatic.");
  });

  let expanded = true;
  if (el.expandBtn) el.expandBtn.addEventListener("click", () => {
    expanded = !expanded;
    if (el.answersWrap) {
      if (expanded) el.answersWrap.classList.remove("hidden");
      else el.answersWrap.classList.add("hidden");
    }
    renderAnswers(expanded);
    el.expandBtn.textContent = expanded ? "Hide details" : "Show details";
  });

  el.copyBtn.addEventListener("click", async () => {
    const info = LEVEL_INFO[state.level - 1] || LEVEL_INFO[0];
    const { wrong, score } = computeScore();
    const L = LANGS[safeLang(state.lang)] || LANGS.es;

    const txt =
      `LOOPS\n` +
      `${info.title} | Mode: ${labelMode(state.mode)} | Language: ${L.label}\n` +
      `Time: ${fmtTime(state.elapsedMs)} | Wrong: ${wrong} | Score: ${score.toFixed(1)}s\n` +
      `Global progress: ${countDone()} / ${TOTAL_SETUPS}`;

    try { await navigator.clipboard.writeText(txt); alert("Copied!"); }
    catch { alert("Copy failed on this browser/device."); }
  });

  // ----------------- Select changes -----------------
  el.levelSelect.addEventListener("change", () => {
    const chosen = Number(el.levelSelect.value) || 1;
    if (!isLevelUnlocked(chosen, state.lang)) {
      toast("Level locked — beat the unlock target to open it.");
      buildLevelOptions();
      return;
    }
    state.level = chosen;
    syncPills(); syncHints(); syncHomeStats();
  });

  el.modeSelect.addEventListener("change", () => {
    state.mode = String(el.modeSelect.value || "classic");
    syncPills(); syncHints(); syncHomeStats();
  });

  el.langSelect.addEventListener("change", () => {
    state.lang = safeLang(el.langSelect.value);
    buildLevelOptions();
    syncPills(); syncHints(); syncHomeStats();
  });

  // ----------------- LOOPS: Workshop (inner loop) -----------------
const ACCENT_BANK = {
  es: [
    ["cancion","canción"],["habitacion","habitación"],["dificil","difícil"],["facil","fácil"],["tambien","también"],
    ["corazon","corazón"],["ingles","inglés"],["musica","música"],["telefono","teléfono"],["rapido","rápido"],
    ["despues","después"],["arbol","árbol"],["lapiz","lápiz"]
  ],
  fr: [
    ["ecole","école"],["eleve","élève"],["francais","français"],["garcon","garçon"],["pere","père"],
    ["mere","mère"],["tres","très"],["ete","été"],["noel","noël"],["ou","où"],["a","à"],["ca","ça"]
  ],
  de: [
    ["schon","schön"],["gross","groß"],["fur","für"],["uber","über"],["madchen","Mädchen"],["heiss","heiß"],["spat","spät"]
  ]
};

const BE_FORMS = {
  es: [["yo","soy"],["tú","eres"],["él/ella","es"],["nosotros","somos"],["vosotros","sois"],["ellos","son"]],
  fr: [["je","suis"],["tu","es"],["il/elle","est"],["nous","sommes"],["vous","êtes"],["ils/elles","sont"]],
  de: [["ich","bin"],["du","bist"],["er/sie","ist"],["wir","sind"],["ihr","seid"],["sie","sind"]],
};

const CONNECTORS = {
  es: ["y","pero","porque","también","además","aunque"],
  fr: ["et","mais","parce que","aussi","en plus","même si"],
  de: ["und","aber","weil","auch","außerdem","obwohl"]
};

function topCogsFromRound(){
  const counts = { accent:0, ser:0, structure:0, other:0 };
  for (let i = 0; i < PROMPTS_PER_ROUND; i++){
    if (!state.wrongMarks[i]) continue;
    const b = (state.prompts[i] && state.prompts[i].badge) ? state.prompts[i].badge : "other";
    if (counts[b] !== undefined) counts[b]++; else counts.other++;
  }
  const entries = Object.entries(counts).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  return entries.length ? entries : [["accent",0],["ser",0],["structure",0]];
}

function labelCog(key){
  const L = LANGS[safeLang(state.lang)] || LANGS.es;
  if (key === "ser") return (L.chipLabels && L.chipLabels.ser) ? L.chipLabels.ser : "be";
  if (key === "structure") return (L.chipLabels && L.chipLabels.structure) ? L.chipLabels.structure : "connectors";
  if (key === "accent") return (L.chipLabels && L.chipLabels.accent) ? L.chipLabels.accent : "accents";
  return "other";
}

function gymBaseForLevel(level){
  // Level 1–2:3, 3–4:4, 5–6:5, 7–8:6, 9–10:7
  const L = Math.max(1, Math.min(10, level||1));
  return 3 + Math.floor((L-1)/2);
}

function gymSeverityExtra(wrong){
  const w = +wrong||0;
  if (w >= 7) return 2;
  if (w >= 5) return 1;
  return 0;
}

function pickGate(){
  // Scale difficulty by level + how badly they missed.
  const base = gymBaseForLevel(state.level) + gymSeverityExtra(countWrong());
  const slips = (state.level <= 4) ? 2 : (state.level <= 7 ? 1 : 1);

  // Vary gates. Keep them short + achievable, but scaling.
  const pool = [
    { type:"streak", target: base },
    { type:"repairs", target: base + 2 },
    { type:"calibration", target: base + 2, maxSlips: slips },
  ];
  return pool[Math.floor(Math.random()*pool.length)];
}

function goToWorkshop(){
  // Required if any wrong answers
  state.workshop.required = countWrong() >= 3;
  state.workshop.cleared = false;
  state.workshop.stats = { correct:0, attempts:0, streak:0 };
  state.workshop.gate = pickGate();

  const top = topCogsFromRound();
  state.workshop.focus = top[0][0] || "accent";

  renderWorkshopTop();
  nextWorkshopItem();
  syncExitLock();
  showScreen("workshop");
}

function renderWorkshopTop(){
  if (!el.wsCogs) return;
  const top = topCogsFromRound();
  el.wsCogs.innerHTML = "";
  top.slice(0,3).forEach(([k,v])=>{
    const chip = document.createElement("div");
    chip.className = "wsCog";
    chip.textContent = v ? `${labelCog(k)} ×${v}` : `${labelCog(k)}`;
    el.wsCogs.appendChild(chip);
  });

  if (el.wsGateType) el.wsGateType.textContent = state.workshop.gate ? state.workshop.gate.type : "—";
  if (el.wsGateTarget){
    const g = state.workshop.gate;
    if(!g) el.wsGateTarget.textContent = "—";
    else if (g.type === "streak") el.wsGateTarget.textContent = `${g.target} correct in a row`;
    else if (g.type === "repairs") el.wsGateTarget.textContent = `${g.target} correct repairs`;
    else if (g.type === "calibration") el.wsGateTarget.textContent = `${g.target} correct with ≤ ${g.maxSlips} slips`;
    else el.wsGateTarget.textContent = "—";
  }

  if (el.wsSubtitle){
    const g = state.workshop.gate;
    if (!g){
      el.wsSubtitle.textContent = "GYM: clear the goal to unlock the exit.";
    } else if (g.type === "streak"){
      el.wsSubtitle.textContent = `Gym: get ${g.target} correct in a row. Wrong resets the streak.`;
    } else if (g.type === "repairs"){
      el.wsSubtitle.textContent = `Gym: score ${g.target} correct reps. Keep going until you hit the target.`;
    } else if (g.type === "calibration"){
      el.wsSubtitle.textContent = `Gym: get ${g.target} correct with ≤ ${g.maxSlips} slips.`;
    } else {
      el.wsSubtitle.textContent = "GYM: clear the goal to unlock the exit.";
    }
  }
}

function setWorkshopFeedback(msg, good){
  if (!el.wsFeedback) return;
  el.wsFeedback.textContent = msg;
  el.wsFeedback.classList.remove("good","bad");
  el.wsFeedback.classList.add(good ? "good" : "bad");
}


  // ----------------- Minimal rubric (reduces false "wrong") -----------------
  // For open-ended descriptions, "wrong" should mean "incomplete / missing requirement", not "perfect grammar".
  const MIN_CHARS = 18;
  const MIN_WORDS = 4;

  function wordCount(s){
    const t = String(s||"").trim();
    if(!t) return 0;
    return t.split(/\s+/).filter(Boolean).length;
  }

  function hasConnector(ans, lang){
    const bank = CONNECTORS[lang] || CONNECTORS.es;
    const n = normalize(ans);
    return bank.some(c => n.includes(normalize(c)));
  }

  function hasBeForm(ans, lang){
    const bank = BE_FORMS[lang] || BE_FORMS.es;
    const n = " " + normalize(ans) + " ";
    // match whole-ish tokens (simple)
    return bank.some(([subj, form]) => n.includes(" " + normalize(form) + " "));
  }

  function rubricCheck(answer, promptObj, lang){
    const a = String(answer||"").trim();
    if(!a) return { ok:false, reason:"blank" };
    if(a.length < MIN_CHARS || wordCount(a) < MIN_WORDS) return { ok:false, reason:"too_short" };

    const badge = (promptObj && promptObj.badge) ? promptObj.badge : "";
    if(badge === "structure" && !hasConnector(a, lang)) return { ok:false, reason:"missing_connector" };
    if(badge === "ser" && !hasBeForm(a, lang)) return { ok:false, reason:"missing_be" };

    return { ok:true, reason:"ok" };
  }

  function rubricHint(reason, lang){
    if(reason === "too_short") return "Make it a bit longer (add 2 details).";
    if(reason === "missing_connector"){
      const bank = CONNECTORS[lang] || CONNECTORS.es;
      return `Use a connector (e.g. ${bank.slice(0,3).join(", ")}).`;
    }
    if(reason === "missing_be") return "Use the correct 'to be' form (e.g. I am / he is).";
    return "";
  }

  function localExample(promptObj, lang){
    const badge = (promptObj && promptObj.badge) ? promptObj.badge : "";
    const con = (CONNECTORS[lang] || CONNECTORS.es)[Math.floor(Math.random()* (CONNECTORS[lang]||CONNECTORS.es).length)];
    if(lang === "es"){
      if(badge === "ser") return `Es muy simpático y trabajador. Además, es divertido ${con} siempre ayuda.`;
      return `Es bastante grande ${con} tiene muchas cosas. Además, me gusta porque es cómodo.`;
    }
    if(lang === "fr"){
      if(badge === "ser") return `Il est très sympa et travailleur. En plus, il est drôle ${con} il aide toujours.`;
      return `C'est assez grand ${con} il y a beaucoup de choses. En plus, j'aime ça parce que c'est confortable.`;
    }
    if(lang === "de"){
      if(badge === "ser") return `Er ist sehr nett und fleißig. Außerdem ist er lustig ${con} er hilft immer.`;
      return `Es ist ziemlich groß ${con} es gibt viele Sachen. Außerdem mag ich es, weil es gemütlich ist.`;
    }
    // fallback
    return "";
  }

function normalize(s){
  return String(s||"").trim().toLowerCase()
    .replace(/[¿?¡!.,;:()]/g,"")
    .replace(/\s+/g," ");
}

function buildChoiceButtons(options, correct){
  if (!el.wsChoices) return;
  el.wsChoices.innerHTML = "";
  options.forEach(opt=>{
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn";
    b.textContent = opt;
    b.addEventListener("click", ()=> submitWorkshopChoice(opt, correct));
    el.wsChoices.appendChild(b);
  });
}

function nextWorkshopItem(){
  const lang = safeLang(state.lang);
  const focus = state.workshop.focus || "accent";

  if (el.wsHelp) el.wsHelp.textContent = "";
  if (el.wsInput) el.wsInput.value = "";
  if (el.wsChoices) { el.wsChoices.classList.add("hidden"); el.wsChoices.innerHTML=""; }
  if (el.wsInputRow) el.wsInputRow.classList.remove("hidden");

  if (focus === "accent"){
    const bank = ACCENT_BANK[lang] || ACCENT_BANK.es;
    const [plain, correct] = bank[Math.floor(Math.random()*bank.length)];
    state.workshop.current = { type:"accent", expected: correct };
    if (el.wsPrompt) el.wsPrompt.textContent = `Add the accent / umlaut:  ${plain}  →  ?`;
    if (el.wsHelp) el.wsHelp.textContent = "Type the correct spelling with accents (or umlauts/ß).";
    return;
  }

  if (focus === "ser"){
    const bank = BE_FORMS[lang] || BE_FORMS.es;
    const [subj, correct] = bank[Math.floor(Math.random()*bank.length)];
    // create distractors
    const forms = [...new Set(bank.map(x=>x[1]))];
    const opts = [correct];
    while (opts.length < 4 && forms.length){
      const pick = forms[Math.floor(Math.random()*forms.length)];
      if (!opts.includes(pick)) opts.push(pick);
    }
    // shuffle
    opts.sort(()=>Math.random()-0.5);

    state.workshop.current = { type:"ser", expected: correct };
    if (el.wsPrompt) el.wsPrompt.textContent = `Choose the correct form for:  ${subj}`;
    if (el.wsHelp) el.wsHelp.textContent = "Tap the right form. (Big buttons — quick win.)";

    if (el.wsInputRow) el.wsInputRow.classList.add("hidden");
    if (el.wsChoices){
      el.wsChoices.classList.remove("hidden");
      buildChoiceButtons(opts, correct);
    }
    return;
  }

  // structure
  const bank = CONNECTORS[lang] || CONNECTORS.es;
  const connector = bank[Math.floor(Math.random()*bank.length)];
  state.workshop.current = { type:"structure", expected: connector };
  if (el.wsPrompt) el.wsPrompt.textContent = `Type a short sentence using this connector:  “${connector}”`;
  if (el.wsHelp) el.wsHelp.textContent = `Any sentence is fine — just include the connector. Example: “${connector} me gusta…”`;
}

function updateGateProgress(){
  const g = state.workshop.gate;
  const s = state.workshop.stats;
  let pct = 0;

  if (!g){ pct = 0; }
  else if (g.type === "streak"){
    pct = Math.min(100, (s.streak / g.target) * 100);
  } else if (g.type === "repairs"){
    pct = Math.min(100, (s.correct / g.target) * 100);
  } else if (g.type === "calibration"){
    const slips = Math.max(0, s.attempts - s.correct);
    // progress limited if too many slips
    const base = Math.min(1, s.correct / g.target);
    const slipPenalty = slips > g.maxSlips ? 0.25 : 1;
    pct = Math.min(100, base * 100 * slipPenalty);
  }

  if (el.wsMeterFill) el.wsMeterFill.style.width = `${pct}%`;
  if (el.wsMeterText){
    const slips = Math.max(0, s.attempts - s.correct);
    const g2 = g;
    if (g2 && g2.type === "streak") el.wsMeterText.textContent = `STREAK: ${s.streak}/${g2.target} • ${Math.round(pct)}%`;
    else if (g2 && g2.type === "repairs") el.wsMeterText.textContent = `REPS: ${s.correct}/${g2.target} • ${Math.round(pct)}%`;
    else if (g2 && g2.type === "calibration") el.wsMeterText.textContent = `CALIBRATE: ${s.correct}/${g2.target} • SLIPS: ${slips}/${g2.maxSlips} • ${Math.round(pct)}%`;
    else el.wsMeterText.textContent = `${Math.round(pct)}% • Correct ${s.correct} • Attempts ${s.attempts}`;
  }

  // cleared?
  if (g){
    const slips = Math.max(0, s.attempts - s.correct);
    if (g.type === "streak" && s.streak >= g.target) state.workshop.cleared = true;
    if (g.type === "repairs" && s.correct >= g.target) state.workshop.cleared = true;
    if (g.type === "calibration" && s.correct >= g.target && slips <= g.maxSlips) state.workshop.cleared = true;
  }
}

function syncExitLock(){
  updateGateProgress();
  if (!el.wsExit) return;

  if (state.workshop.required && !state.workshop.cleared){
    const g = state.workshop.gate;
    let remainText = "";

    if (g){
      const s = state.workshop.stats;
      const slips = Math.max(0, s.attempts - s.correct);

      if (g.type === "streak"){
        remainText = ` (need ${Math.max(0, g.target - s.streak)} more in a row)`;
      } else if (g.type === "repairs"){
        remainText = ` (need ${Math.max(0, g.target - s.correct)} more correct)`;
      } else if (g.type === "calibration"){
        remainText = ` (need ${Math.max(0, g.target - s.correct)} more, slips ${slips}/${g.maxSlips})`;
      }
    }

    el.wsExit.textContent = `Exit gym 🔒${remainText}`;
    el.wsExit.disabled = true;
  } else {
    el.wsExit.textContent = "Exit gym";
    el.wsExit.disabled = false;
  }
}

function submitWorkshopText(){
  const cur = state.workshop.current;
  if (!cur) return;
  const val = String(el.wsInput ? el.wsInput.value : "").trim();
  state.workshop.stats.attempts++;

  if (cur.type === "accent"){
    const ok = normalize(val) === normalize(cur.expected);
    if (ok){
      state.workshop.stats.correct++; state.workshop.stats.streak++;
      setWorkshopFeedback("Nice. Correct.", true);
    } else {
      state.workshop.stats.streak = 0;
      setWorkshopFeedback(`Not quite. Try: ${cur.expected}`, false);
    }
    syncExitLock();
    if (!state.workshop.cleared) nextWorkshopItem();
    else { toast("Gate unlocked!"); }
    return;
  }

  if (cur.type === "structure"){
    const ok = normalize(val).includes(normalize(cur.expected)) && normalize(val).length >= 10;
    if (ok){
      state.workshop.stats.correct++; state.workshop.stats.streak++;
      setWorkshopFeedback("Good — connector spotted.", true);
    } else {
      state.workshop.stats.streak = 0;
      setWorkshopFeedback(`Include: ${cur.expected}`, false);
    }
    syncExitLock();
    if (!state.workshop.cleared) nextWorkshopItem();
    else { toast("Gate unlocked!"); }
    return;
  }
}

function submitWorkshopChoice(choice, correct){
  state.workshop.stats.attempts++;
  const ok = normalize(choice) === normalize(correct);
  if (ok){
    state.workshop.stats.correct++; state.workshop.stats.streak++;
    setWorkshopFeedback("Correct.", true);
  } else {
    state.workshop.stats.streak = 0;
    setWorkshopFeedback(`Not quite. Correct: ${correct}`, false);
  }
  syncExitLock();
  if (!state.workshop.cleared) nextWorkshopItem();
  else { toast("Gate unlocked!"); }
}

// ----------------- Init -----------------
  function init() {
    buildLevelOptions();
    el.levelSelect.value = "1";
    el.modeSelect.value = "classic";
    el.langSelect.value = "es";

    state.level = 1;
    state.mode = "classic";
    state.lang = "es";

    syncPills();
    syncHints();
    syncHomeStats();
    showScreen("home");
  }

  init();
})();
