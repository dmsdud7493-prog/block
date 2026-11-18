// 캐릭터 캐리커처 생성기 (2026-11-18, 3안 표정·상황) — 사용법: node scripts/characters.cjs /tmp/preview.html public/characters
// 캐릭터 시안 3가지 스타일 × 7명 — SVG 문자열을 만들어 HTML 한 장으로
// eslint-disable-next-line @typescript-eslint/no-require-imports -- 단독 실행 스크립트
const fs = require("fs");

const SKIN = { light: ["#ffe1c6", "#f2bf98"], warm: ["#f6cfa8", "#dfa77c"], olive: ["#e9c19a", "#c9966b"] };
const INK = "#2a2438";

// 스타일: A 플랫 일러스트, B 스티커(굵은 선), C 세미 리얼
const STYLES = {
  A: { stroke: "none", sw: 0, head: [40, 44], eye: "dot" },
  B: { stroke: INK, sw: 3.2, head: [44, 45], eye: "big" },
  C: { stroke: "none", sw: 0, head: [36, 43], eye: "almond" },
};

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

const W = (st) => (st.stroke === "none" ? { stroke: "#b8c0cc", sw: 1.6 } : st);
const P = (d, fill, st, extra = "") => `<path d="${d}" fill="${fill}" stroke="${st.stroke}" stroke-width="${st.sw}" stroke-linejoin="round" ${extra}/>`;

function body(c, st) {
  const shoulders = "M26 200 Q28 152 100 146 Q172 152 174 200 Z";
  return P(shoulders, c.cloth, st) + (st.stroke === "none" ? P("M100 146 Q172 152 174 200 L140 200 Q140 165 100 160Z", shade(c.cloth, 0.86), { stroke: "none", sw: 0 }) : "");
}

function neck(skin, st) {
  return P("M86 118 L86 150 Q100 158 114 150 L114 118 Z", skin[1], st);
}

function head(skin, st) {
  const [rx, ry] = st.head;
  const ears = `<ellipse cx="${100 - rx}" cy="98" rx="7" ry="9" fill="${skin[0]}" stroke="${st.stroke}" stroke-width="${st.sw}"/><ellipse cx="${100 + rx}" cy="98" rx="7" ry="9" fill="${skin[0]}" stroke="${st.stroke}" stroke-width="${st.sw}"/>`;
  return ears + `<ellipse cx="100" cy="92" rx="${rx}" ry="${ry}" fill="${skin[0]}" stroke="${st.stroke}" stroke-width="${st.sw}"/>`;
}

function eyes(c, st) {
  const brow = c.brow ?? INK;
  const bw = c.bushy ? 5 : 3;
  const brows = `<path d="M78 ${c.browY ?? 80} q8 -5 15 -1 M107 ${(c.browY ?? 80) - 1} q7 -4 15 1" fill="none" stroke="${brow}" stroke-width="${bw}" stroke-linecap="round"/>`;
  if (st.eye === "dot") return brows + `<ellipse cx="86" cy="95" rx="4" ry="5" fill="${INK}"/><ellipse cx="114" cy="95" rx="4" ry="5" fill="${INK}"/><circle cx="87.5" cy="93" r="1.4" fill="#fff"/><circle cx="115.5" cy="93" r="1.4" fill="#fff"/>`;
  if (st.eye === "big") return brows + `<ellipse cx="86" cy="96" rx="5.5" ry="7" fill="${INK}"/><ellipse cx="114" cy="96" rx="5.5" ry="7" fill="${INK}"/><circle cx="88" cy="93" r="2.2" fill="#fff"/><circle cx="116" cy="93" r="2.2" fill="#fff"/><circle cx="84.5" cy="99" r="1" fill="#fff"/><circle cx="112.5" cy="99" r="1" fill="#fff"/>`;
  return brows + `<path d="M79 95 q7 -6 14 0 q-7 4 -14 0z M107 95 q7 -6 14 0 q-7 4 -14 0z" fill="#fff"/><circle cx="86" cy="94.5" r="3.6" fill="${c.iris ?? "#4a3426"}"/><circle cx="114" cy="94.5" r="3.6" fill="${c.iris ?? "#4a3426"}"/><circle cx="87" cy="93.5" r="1.1" fill="#fff"/><circle cx="115" cy="93.5" r="1.1" fill="#fff"/><path d="M79 95 q7 -6 14 0 M107 95 q7 -6 14 0" fill="none" stroke="${INK}" stroke-width="1.8"/>`;
}

function face(c, skin, st) {
  const nose = st.eye === "almond" ? `<path d="M100 98 q-3 9 0 11 q3 1 5 -1" fill="none" stroke="${skin[1]}" stroke-width="2.2" stroke-linecap="round"/>` : `<ellipse cx="100" cy="106" rx="2.6" ry="1.8" fill="${skin[1]}"/>`;
  const mouth = c.beardMouth ? "" : `<path d="M90 ${st.eye === "almond" ? 117 : 115} q10 ${st.eye === "almond" ? 6 : 8} 20 0" fill="${st.eye === "big" ? "#c2410c" : "none"}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  const blush = st.eye === "almond" ? "" : `<ellipse cx="76" cy="108" rx="6" ry="3.5" fill="#fb7185" opacity=".35"/><ellipse cx="124" cy="108" rx="6" ry="3.5" fill="#fb7185" opacity=".35"/>`;
  const wrinkle = c.old ? `<path d="M72 98 l-4 -2 M72 102 l-4 1 M128 98 l4 -2 M128 102 l4 1" stroke="${skin[1]}" stroke-width="1.6" stroke-linecap="round"/>` : "";
  const glasses = c.glasses ? `<g fill="none" stroke="${c.glasses}" stroke-width="2.4"><circle cx="86" cy="95" r="10"/><circle cx="114" cy="95" r="10"/><path d="M96 95 h8"/></g>` : "";
  return eyes(c, st) + nose + mouth + blush + wrinkle + glasses;
}

/* ── 인물별 머리·옷·소품 ───────────────────────────── */
const PEOPLE = {
  teacher: {
    name: "선생님", skin: SKIN.light, cloth: "#1f2937", iris: "#3b2a20", glasses: "#111827", rectGlasses: true, bushy: true, brow: "#2f1f17", clean: true,
    // 참고 그림: 헝클어진 갈색 머리, 뒤·옆으로 삐져나온 머리카락, 검은 사각 안경, 짙은 정장 — 선은 가늘고 적게
    back: (st) => P("M48 98 Q36 54 66 34 Q94 16 128 26 Q162 40 154 96 Q150 72 140 64 L60 64 Q52 78 48 98Z", "#4a2f22", st) +
      P("M53 80 Q42 79 37 71 Q47 73 55 70Z", "#4a2f22", st) + P("M147 72 Q158 69 162 59 Q158 72 148 78Z", "#4a2f22", st) + P("M151 88 Q162 90 167 82 Q162 95 151 97Z", "#4a2f22", st) + P("M132 30 Q142 22 152 21 Q146 28 138 35Z", "#4a2f22", st),
    front: (st) => P("M52 94 Q46 54 76 38 Q104 24 134 36 Q158 50 150 92 Q144 76 134 72 Q130 84 120 86 Q118 72 104 66 Q100 80 86 82 Q88 70 78 66 Q66 76 60 90 Q57 92 52 94Z", "#5a3828", st) +
      P("M102 40 q0 -13 15 -16 q-9 6 -7 16z", "#5a3828", st),
    outfit: (st) => P("M76 148 L100 176 L124 148 Q100 158 76 148Z", "#e2e8f0", st) + P("M96 160 h8 l3 28 l-7 8 l-7 -8z", "#334155", st) + P("M64 152 L92 200 L74 200 L52 162Z", "#111827", st) + P("M136 152 L108 200 L126 200 L148 162Z", "#111827", st) +
      `<path d="M84 154 L92 184" fill="none" stroke="#f59e0b" stroke-width="2.2"/>` + P("M86 182 h14 v12 h-14z", "#ffffff", st),
  },
  density: {
    name: "아르키메데스", skin: SKIN.olive, cloth: "#f5f0e6", old: true, brow: "#e5e7eb", bushy: true, beardMouth: true, browY: 79,
    back: (st) => P("M58 104 q-10 -8 -4 -20 q-6 -12 6 -18 q2 -10 14 -8 M142 104 q10 -8 4 -20 q6 -12 -6 -18 q-2 -10 -14 -8", "#e5e7eb", W(st)),
    front: (st) => P("M66 112 Q64 152 100 160 Q136 152 134 112 Q128 126 118 120 Q110 128 100 124 Q90 128 82 120 Q72 126 66 112Z", "#e2e6ec", W(st)) + `<path d="M90 120 q10 6 20 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` +
      `<path d="M58 70 Q100 30 142 70" fill="none" stroke="#4d7c0f" stroke-width="4" stroke-linecap="round"/>` + [[60, 66, -40], [70, 55, -25], [83, 47, -12], [117, 47, 12], [130, 55, 25], [140, 66, 40]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="4" transform="rotate(${r} ${x} ${y})" fill="#65a30d" stroke="${st.stroke}" stroke-width="${st.sw * 0.6}"/>`).join(""),
    outfit: (st) => P("M40 200 Q60 160 100 152 L150 200 Z", "#e8ddc7", st) + `<circle cx="64" cy="168" r="6" fill="#eab308" stroke="${st.stroke}" stroke-width="${st.sw}"/>` + `<path d="M150 172 q6 -12 12 0 q-6 6 -12 0z" fill="#38bdf8" stroke="${st.stroke}" stroke-width="${st.sw * 0.7}"/>`,
  },
  solubility: {
    name: "게이뤼삭", skin: SKIN.light, cloth: "#1e3a8a", iris: "#2f4f2f",
    back: (st) => "",
    front: (st) => P("M58 92 Q52 46 96 42 Q140 40 144 86 Q130 58 108 60 Q118 52 104 50 Q80 54 70 70 Q62 80 58 92Z", "#4a3020", st) + P("M58 92 L56 118 Q62 124 66 118 L64 92Z", "#4a3020", st) + P("M142 92 L144 118 Q138 124 134 118 L136 92Z", "#4a3020", st),
    outfit: (st) => P("M80 146 L92 168 L100 152 L108 168 L120 146 Q100 154 80 146Z", "#ffffff", st) + P("M88 156 L100 162 L112 156 L108 170 L100 166 L92 170Z", "#111827", st) +
      `<g transform="translate(140 166)"><path d="M0 -10 q9 0 9 9 q0 8 -9 12 q-9 -4 -9 -12 q0 -9 9 -9z" fill="#ef4444" stroke="${st.stroke === "none" ? "#b91c1c" : st.stroke}" stroke-width="${Math.max(1.2, st.sw * 0.7)}"/><path d="M-3 12 h6 v5 h-6z" fill="#a16207"/></g>`,
  },
  melting: {
    name: "조지프 블랙", skin: SKIN.light, cloth: "#14532d", brow: "#9ca3af", old: true,
    back: (st) => [62, 80].map((y) => P(`M48 ${y} q-6 8 0 16 q8 4 16 0 q4 -8 -2 -16 q-8 -4 -14 0z`, "#f3f4f6", W(st)) + P(`M152 ${y} q6 8 0 16 q-8 4 -16 0 q-4 -8 2 -16 q8 -4 14 0z`, "#f3f4f6", W(st))).join(""),
    front: (st) => P("M58 84 Q58 44 100 42 Q142 44 142 84 Q130 62 100 60 Q70 62 58 84Z", "#f3f4f6", W(st)) + `<path d="M70 62 q30 -12 60 0" fill="none" stroke="#d1d5db" stroke-width="2"/>`,
    outfit: (st) => P("M84 146 Q100 176 116 146 Q100 152 84 146Z", "#ffffff", st) + P("M88 160 q12 10 24 0 q-2 12 -12 16 q-10 -4 -12 -16z", "#ffffff", st) +
      `<g transform="translate(142 170) rotate(12)"><rect x="-9" y="-9" width="18" height="18" rx="4" fill="#bae6fd" stroke="${st.stroke === "none" ? "#7dd3fc" : st.stroke}" stroke-width="${Math.max(1.4, st.sw * 0.7)}"/><path d="M-4 -4 l4 0" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></g>`,
  },
  boiling: {
    name: "셀시우스", skin: SKIN.light, cloth: "#9f1239", iris: "#1e40af", bushy: true, brow: "#5b3a21",
    back: (st) => P("M50 90 Q46 36 100 36 Q154 36 150 90 L158 150 q-10 10 -18 0 q-8 10 -16 0 L124 120 L76 120 L76 150 q-8 10 -16 0 q-8 10 -18 0Z", "#8a5a34", st) + [[54, 112], [52, 132], [148, 112], [150, 132], [58, 92], [142, 92]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#a56d3f" stroke="${st.stroke}" stroke-width="${st.sw * 0.6}"/><path d="M${x - 3} ${y} q3 -4 6 0" fill="none" stroke="#6b4423" stroke-width="1.6"/>`).join(""),
    front: (st) => P("M60 86 Q60 44 100 44 Q140 44 140 86 Q134 66 120 64 q-4 8 -12 2 q-6 8 -14 2 q-6 8 -14 0 q-10 6 -20 22Z", "#8a5a34", st),
    outfit: (st) => P("M86 146 Q100 168 114 146 Q100 152 86 146Z", "#ffffff", st) + P("M92 158 h16 l-3 14 h-10z", "#ffffff", st) +
      `<g transform="translate(144 172)"><rect x="-3" y="-20" width="6" height="22" rx="3" fill="#ffffff" stroke="${st.stroke === "none" ? "#64748b" : st.stroke}" stroke-width="${Math.max(1.2, st.sw * 0.6)}"/><rect x="-1.2" y="-12" width="2.4" height="12" fill="#ef4444"/><circle cx="0" cy="5" r="5" fill="#ef4444" stroke="${st.stroke === "none" ? "#b91c1c" : st.stroke}" stroke-width="${Math.max(1.2, st.sw * 0.6)}"/></g>`,
  },
  separation1: {
    name: "자비르", skin: SKIN.olive, cloth: "#0f766e", iris: "#3f2a1d", bushy: true, brow: "#2b1d14",
    back: (st) => "",
    front: (st) => P("M70 104 Q70 150 100 156 Q130 150 130 104 Q126 124 116 128 Q100 136 84 128 Q74 124 70 104Z", "#3b2618", st) + P("M88 111 q12 -6 24 0 q-6 3 -12 1.5 q-6 1.5 -12 -1.5z", "#3b2618", st) +
      P("M52 82 Q46 30 100 26 Q154 30 148 82 Q130 70 100 72 Q70 70 52 82Z", "#f8fafc", st) + `<path d="M56 68 Q100 44 144 68 M60 56 Q100 34 140 56" fill="none" stroke="#cbd5e1" stroke-width="3"/>` + P("M92 52 l8 -10 l8 10 l-8 10z", "#14b8a6", st),
    outfit: (st) => P("M84 146 L100 168 L116 146 Q100 154 84 146Z", "#f5f5f4", st) + `<path d="M40 186 Q100 168 160 186" fill="none" stroke="#eab308" stroke-width="5"/>` +
      `<g transform="translate(142 172)"><path d="M-8 6 q-4 -12 8 -14 q12 2 8 14 z" fill="#fde68a" stroke="${st.stroke}" stroke-width="${Math.max(1.2, st.sw * 0.6)}"/><path d="M4 -8 q10 -6 14 6" fill="none" stroke="${st.stroke}" stroke-width="2.4"/><circle cx="0" cy="-10" r="3" fill="#fde68a"/></g>`,
  },
  separation2: {
    name: "마리 퀴리", skin: SKIN.light, cloth: "#1f2937", iris: "#4b5563",
    back: (st) => `<circle cx="100" cy="42" r="16" fill="#5b4636" stroke="${st.stroke}" stroke-width="${st.sw}"/>`,
    front: (st) => P("M58 96 Q54 50 100 48 Q146 50 142 96 Q136 72 118 66 Q108 74 100 66 Q92 74 82 66 Q64 72 58 96Z", "#5b4636", st) + `<path d="M84 60 q-6 6 -4 14 M116 60 q6 6 4 14" fill="none" stroke="#7a6150" stroke-width="2" stroke-linecap="round"/>`,
    outfit: (st) => P("M80 144 Q100 158 120 144 L118 156 Q100 166 82 156Z", "#111827", st) +
      `<g transform="translate(142 170)"><circle r="13" fill="#4ade80" opacity=".25"/><path d="M-4 -12 h8 v18 q0 6 -4 6 q-4 0 -4 -6z" fill="#dcfce7" stroke="${st.stroke === "none" ? "#16a34a" : st.stroke}" stroke-width="${Math.max(1.2, st.sw * 0.6)}"/><path d="M-4 0 h8 v6 q0 6 -4 6 q-4 0 -4 -6z" fill="#22c55e"/></g>`,
  },
};


/* ── 캐리커처 3안 ───────────────────────────────────── */
const ST = STYLES.B;
const O = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

/** 인물마다 과장한 코(캐리커처의 핵심) */
const NOSE = {
  teacher: "M97 100 q-4 10 2 12 q6 1 6 -3",
  density: "M94 94 q-14 22 4 24 q16 2 10 -10 q-4 -8 -14 -14z",
  solubility: "M98 90 q-2 18 -8 24 q8 4 14 -2",
  melting: "M92 98 q-12 18 8 20 q18 0 8 -16 q-6 -6 -16 -4z",
  boiling: "M99 90 q2 14 10 22 q-8 4 -14 -2",
  separation1: "M99 96 q-3 12 2 14 q5 0 5 -4",
  separation2: "M98 96 q-3 11 2 13 q5 0 5 -3",
};

function caricNose(key, skin) {
  return `<path d="${NOSE[key]}" fill="${skin[0]}" ${O(2.6)}/>`;
}

const stOf = (c) => (c.clean ? { ...ST, sw: 2.2 } : ST);

function headGroup(key, k, ty, faceSvg) {
  const c = PEOPLE[key];
  const st = stOf(c);
  const inner = [c.back(st), head(c.skin, st), faceSvg, caricNose(key, c.skin), c.front(st)].join("");
  return `<g transform="translate(100 ${92 + ty}) scale(${k}) translate(-100 -92)">${inner}</g>`;
}

function bodyGroup(key, k) {
  const c = PEOPLE[key];
  const st = stOf(c);
  return `<g transform="translate(100 200) scale(${k}) translate(-100 -200)">${body(c, st)}${neck(c.skin, st)}${c.outfit(st)}</g>`;
}

/** 기본 얼굴(코는 따로 크게) — 눈은 크게, 입은 활짝 */
function grinFace(c) {
  const brows = `<path d="M74 78 q10 -9 20 -2 M106 76 q10 -7 20 2" fill="none" stroke="${c.brow ?? INK}" stroke-width="${c.bushy ? 6 : 4}" stroke-linecap="round"/>`;
  const eye = (x) => `<ellipse cx="${x}" cy="94" rx="7" ry="8.5" fill="#fff" ${O(2.4)}/><circle cx="${x + 1}" cy="95" r="4.4" fill="${INK}"/><circle cx="${x + 2.6}" cy="93" r="1.6" fill="#fff"/>`;
  const mouth = c.beardMouth ? "" : `<path d="M84 116 q16 18 32 0 z" fill="#9f1239" ${O(2.6)}/><path d="M88 117 q12 5 24 0" fill="#fff"/>`;
  const glasses = c.glasses ? `<g fill="none" stroke="${c.glasses}" stroke-width="3"><circle cx="86" cy="94" r="12"/><circle cx="114" cy="94" r="12"/><path d="M98 94 h4"/></g>` : "";
  return brows + eye(86) + eye(114) + mouth + glasses + `<ellipse cx="74" cy="110" rx="7" ry="4" fill="#fb7185" opacity=".45"/><ellipse cx="126" cy="110" rx="7" ry="4" fill="#fb7185" opacity=".45"/>`;
}

/* 1안 왕머리 — 머리 크게·몸 작게, 코·눈 과장 */
function idea1(key) {
  return bodyGroup(key, 0.62) + headGroup(key, 1.32, 2, grinFace(PEOPLE[key]));
}

/* 2안 트레이드마크 왕과장 — 그 사람을 떠올리게 하는 것 하나를 아주 크게 */
const BIG = {
  teacher: `<g ${O()}><rect x="138" y="118" width="40" height="54" rx="6" fill="#1e293b"/><rect x="143" y="124" width="30" height="40" rx="3" fill="#bae6fd"/><path d="M150 134 h16 M150 142 h12 M150 150 h14" stroke="#0369a1" stroke-width="3"/></g>`,
  density: `<path d="M56 120 Q40 200 100 214 Q160 200 144 120 Q132 140 120 132 Q110 146 100 138 Q90 146 80 132 Q68 140 56 120Z" fill="#eef0f3" ${O()}/><path d="M78 160 q8 10 0 20 M100 166 q8 10 0 20 M122 160 q8 10 0 20" fill="none" stroke="#cbd5e1" stroke-width="3"/><g transform="translate(158 54)"><path d="M0 -14 q12 16 0 24 q-12 -8 0 -24z" fill="#38bdf8" ${O(2.4)}/></g>`,
  solubility: `<path d="M150 70 L132 118" stroke="#78350f" stroke-width="2.4"/><path d="M164 70 L138 118" stroke="#78350f" stroke-width="2.4"/><path d="M157 6 q30 0 30 30 q0 26 -30 38 q-30 -12 -30 -38 q0 -30 30 -30z" fill="#ef4444" ${O()}/><path d="M140 14 q17 -6 34 0 M136 34 q21 -6 42 0" fill="none" stroke="#fecaca" stroke-width="3"/><rect x="148" y="74" width="18" height="12" rx="2" fill="#a16207" ${O(2.4)}/>`,
  melting: `<g ${O()}><rect x="140" y="128" width="40" height="40" rx="8" fill="#bae6fd" transform="rotate(14 160 148)"/><path d="M150 134 l12 -2" stroke="#fff" stroke-width="5"/><path d="M152 168 q4 10 0 14" fill="none" stroke="#38bdf8" stroke-width="3"/></g>`,
  boiling: `<g ${O()}><rect x="158" y="24" width="14" height="140" rx="7" fill="#fff"/><rect x="162" y="70" width="6" height="90" fill="#ef4444" stroke="none"/><circle cx="165" cy="170" r="14" fill="#ef4444"/></g><path d="M170 20 v-10 M176 26 l8 -6" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>`,
  separation1: `<g ${O()}><path d="M140 182 q-14 -30 12 -40 q26 10 12 40z" fill="#fde68a"/><path d="M160 144 q20 -26 34 -8" fill="none" stroke="${INK}" stroke-width="5"/><path d="M196 140 v20" stroke="${INK}"/></g><path d="M144 132 q-6 -10 2 -18 q8 -8 0 -16 M160 128 q-6 -10 2 -18" fill="none" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/>`,
  separation2: `<circle cx="100" cy="20" r="32" fill="#5b4636" ${O()}/><path d="M80 10 q20 -16 40 0" fill="none" stroke="#7a6150" stroke-width="3"/><g transform="translate(160 150)"><circle r="30" fill="#4ade80" opacity=".3"/><circle r="20" fill="#4ade80" opacity=".35"/><path d="M-8 -26 h16 v38 q0 12 -8 12 q-8 0 -8 -12z" fill="#dcfce7" ${O()}/><path d="M-8 0 h16 v12 q0 12 -8 12 q-8 0 -8 -12z" fill="#22c55e"/></g>`,
};
function idea2(key) {
  const behind = key === "separation2" || key === "solubility" ? BIG[key] : "";
  const front = behind ? "" : BIG[key];
  return behind + bodyGroup(key, 0.8) + headGroup(key, 1.12, 4, grinFace(PEOPLE[key])) + front;
}

/* 3안 표정·상황 — 실험 장면 속 한 순간을 과장된 표정으로 */
const MOOD = {
  teacher: { mouth: "gentle", eyes: "soft", fx: `<g transform="translate(160 152) rotate(-12)" ${O()}><path d="M-12 10 l-8 -10 q-3 -5 2 -7 q3 -1 6 3 l4 5 v-22 q0 -4 4 -4 q4 0 4 4 v14 v-18 q0 -4 4 -4 q4 0 4 4 v18 v-15 q0 -4 4 -4 q4 0 4 4 v16 v-10 q0 -4 4 -4 q4 0 4 4 v18 q0 14 -14 16 h-6 q-10 -2 -16 -12z" fill="#ffe1c6"/></g>` },
  density: { mouth: "shout", eyes: "wide", fx: `<g ${O(2.4)}><path d="M122 34 h56 v28 h-36 l-12 12 v-12 h-8z" fill="#fff"/></g><text x="150" y="53" font-size="13" font-weight="900" text-anchor="middle" fill="${INK}" font-family="Noto Sans CJK KR, sans-serif">유레카!</text><g fill="#38bdf8" ${O(2)}><path d="M30 150 q8 10 0 16 q-8 -6 0 -16z"/><path d="M44 130 q6 8 0 12 q-6 -4 0 -12z"/></g>` },
  solubility: { mouth: "smile", eyes: "up", fx: `<path d="M160 76 L150 112" stroke="#78350f" stroke-width="2"/><path d="M160 36 q18 0 18 18 q0 16 -18 22 q-18 -6 -18 -22 q0 -18 18 -18z" fill="#ef4444" ${O(2.4)}/><path d="M24 70 q10 -6 20 0 M30 56 q10 -6 20 0" fill="none" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>` },
  melting: { mouth: "chatter", eyes: "worried", cheek: "#93c5fd", fx: `<path d="M38 80 l-8 -4 l8 -4 M38 100 l-8 -4 l8 -4 M162 80 l8 -4 l-8 -4 M162 100 l8 -4 l-8 -4" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/><g transform="translate(150 160) rotate(10)" ${O()}><rect x="-14" y="-14" width="28" height="28" rx="6" fill="#bae6fd"/></g>` },
  boiling: { mouth: "o", eyes: "wide", cheek: "#f87171", fx: `<g fill="#7dd3fc" ${O(2)}><path d="M150 70 q8 10 0 16 q-8 -6 0 -16z"/><path d="M40 84 q7 9 0 14 q-7 -5 0 -14z"/></g><path d="M56 26 q-8 -10 0 -18 M100 18 q-8 -10 0 -18 M144 26 q-8 -10 0 -18" fill="none" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/>` },
  separation1: { mouth: "smile", eyes: "soft", fx: `<path d="M150 150 q-10 -14 4 -24 q14 -10 2 -24 q-10 -12 6 -22" fill="none" stroke="#99f6e4" stroke-width="5" stroke-linecap="round"/><path d="M40 160 q-8 -12 4 -20 q12 -8 2 -20" fill="none" stroke="#99f6e4" stroke-width="5" stroke-linecap="round"/>` },
  separation2: { mouth: "smile", eyes: "spark", glow: true, fx: `<g transform="translate(150 158)" ${O()}><path d="M-7 -20 h14 v30 q0 10 -7 10 q-7 0 -7 -10z" fill="#bbf7d0"/></g><g fill="#fde047"><path d="M40 60 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3z"/><path d="M168 54 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2z"/></g>` },
};

function moodFace(c, m) {
  const brows = { soft: "M74 79 q10 -6 20 -3 M106 76 q10 -3 20 3", worried: "M74 74 q10 6 20 4 M106 78 q10 2 20 -4", up: "M74 74 q10 -10 20 -4 M106 70 q10 -6 20 4", half: "M74 80 q10 -4 20 0 M106 78 q10 -6 20 0" }[m.eyes] ?? "M74 78 q10 -9 20 -2 M106 76 q10 -7 20 2";
  // 자연스러운 눈 — 아몬드 모양 흰자 + 갈색 눈동자 + 윗눈꺼풀 선 (표정은 눈썹·눈꺼풀·눈동자 위치로)
  const eye = (x, i) => {
    if (m.eyes === "wink" && i === 1) return `<path d="M${x - 9} 95 q9 -7 18 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    const tall = m.eyes === "wide" ? 12 : 9.5;
    const almond = `M${x - 10} 96 q10 -${tall} 20 0 q-10 ${tall * 0.7} -20 0z`;
    const dy = m.eyes === "up" ? -2.2 : 0;
    const ir = m.eyes === "wide" ? 4.6 : 5.2;
    const iris = `<circle cx="${x + 0.6}" cy="${94.5 + dy}" r="${ir}" fill="${c.iris ?? "#4a3426"}"/><circle cx="${x + 0.6}" cy="${94.5 + dy}" r="${ir * 0.5}" fill="${INK}"/>`;
    const shine = m.eyes === "spark" ? `<path d="M${x + 2} ${90.6 + dy} l1.2 2.6 l2.6 1.2 l-2.6 1.2 l-1.2 2.6 l-1.2 -2.6 l-2.6 -1.2 l2.6 -1.2z" fill="#fde047"/>` : `<circle cx="${x + 2.6}" cy="${92.6 + dy}" r="1.7" fill="#fff"/>`;
    const smileLid = m.eyes === "soft" ? `<path d="M${x - 11} 103 q11 -3.5 22 0 v6 h-22z" fill="${c.skin[0]}"/>` : "";
    const lid = m.eyes === "half" ? `<path d="M${x - 11} 96 q11 -${tall + 1} 22 0 z" fill="${c.skin[0]}"/><path d="M${x - 11} 95.5 h22" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M${x - 10} 96 q10 ${tall * 0.7} 20 0" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".5"/>` : `<path d="M${x - 10} 96 q10 -${tall} 20 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M${x - 10} 96 q10 ${tall * 0.7} 20 0" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".5"/>`;
    return `<clipPath id="e${x}${i}${m.eyes}"><path d="${almond}"/></clipPath><path d="${almond}" fill="#fff"/><g clip-path="url(#e${x}${i}${m.eyes})">${iris}${shine}</g>${smileLid}${lid}`;
  };
  const mouths = {
    smile: `<path d="M84 116 q16 16 32 0 z" fill="#9f1239" ${O(2.6)}/>`,
    shout: `<ellipse cx="100" cy="122" rx="12" ry="14" fill="#9f1239" ${O(2.6)}/><ellipse cx="100" cy="128" rx="7" ry="5" fill="#fb7185"/>`,
    o: `<ellipse cx="100" cy="121" rx="7" ry="9" fill="#9f1239" ${O(2.6)}/>`,
    chatter: `<path d="M84 118 h32 v8 h-32z" fill="#fff" ${O(2.4)}/><path d="M90 118 v8 M96 118 v8 M102 118 v8 M108 118 v8" stroke="${INK}" stroke-width="1.6"/>`,
    smirk: `<path d="M88 118 q14 6 24 -4" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    gentle: `<path d="M88 116 q12 10 24 0" fill="#fff" ${O(2.8)}/><path d="M92 119 q8 4 16 0" fill="#fb7185" opacity=".55"/>`,
  };
  const mouth = c.beardMouth && m.mouth !== "shout" ? "" : mouths[m.mouth];
  const glasses = c.rectGlasses ? `<g fill="none" stroke="${c.glasses}" stroke-width="3" stroke-linejoin="round"><rect x="72" y="85" width="27" height="19" rx="5"/><rect x="101" y="85" width="27" height="19" rx="5"/><path d="M99 92 h2"/></g>` : c.glasses ? `<g fill="none" stroke="${c.glasses}" stroke-width="3"><circle cx="86" cy="94" r="12"/><circle cx="114" cy="94" r="12"/><path d="M98 94 h4"/></g>` : "";
  const cheek = m.cheek ?? "#fb7185";
  return `<path d="${brows}" fill="none" stroke="${c.brow ?? INK}" stroke-width="${c.bushy ? 6 : 4}" stroke-linecap="round"/>` + eye(86, 0) + eye(114, 1) + mouth + glasses + `<ellipse cx="74" cy="110" rx="7" ry="4" fill="${cheek}" opacity=".5"/><ellipse cx="126" cy="110" rx="7" ry="4" fill="${cheek}" opacity=".5"/>`;
}

function idea3(key) {
  const m = MOOD[key];
  const glow = m.glow ? `<circle cx="100" cy="96" r="80" fill="#86efac" opacity=".35"/>` : "";
  return glow + bodyGroup(key, 0.72) + headGroup(key, 1.22, 2, moodFace(PEOPLE[key], m)) + m.fx;
}

const IDEAS_ALL = {
  1: ["1안 · 왕머리 캐리커처", "머리는 크게·몸은 작게, 코와 눈을 과장해 인물마다 얼굴로 바로 구분", idea1, "#dbeafe"],
  2: ["2안 · 트레이드마크 왕과장", "그 사람 하면 떠오르는 것 하나를 아주 크게 — 바닥까지 닿는 수염, 열기구, 거대한 온도계…", idea2, "#fef3c7"],
  3: ["3안 · 표정·상황 캐리커처 (눈 자연스럽게·남자 선생님)", "실험 속 한 순간을 과장된 표정으로 — 유레카! 외치기, 얼음 앞에서 덜덜, 끓는 물 앞에서 땀 뻘뻘", idea3, "#ede9fe"],
};
const IDEAS = { 3: IDEAS_ALL[3] };
const ORD = ["teacher", "density", "solubility", "melting", "boiling", "separation1", "separation2"];
const LABL = { teacher: "도와줄까?", density: "밀도", solubility: "용해도", melting: "녹는점", boiling: "끓는점", separation1: "혼합물 분리 1", separation2: "혼합물 분리 2" };
const svgOf = (n, k) => `<svg viewBox="0 0 200 200" width="150" height="150" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="c${n}${k}"><circle cx="100" cy="100" r="98"/></clipPath></defs><circle cx="100" cy="100" r="98" fill="${IDEAS[n][3]}"/><g clip-path="url(#c${n}${k})">${IDEAS[n][2](k)}</g><circle cx="100" cy="100" r="97" fill="none" stroke="${INK}" stroke-width="3"/></svg>`;
const sec = Object.keys(IDEAS).map((n) => `<section><h2>${IDEAS[n][0]}</h2><p>${IDEAS[n][1]}</p><div class="row">${ORD.map((k) => `<figure>${svgOf(n, k)}<figcaption><b>${PEOPLE[k].name}</b><span>${LABL[k]}</span></figcaption></figure>`).join("")}</div></section>`).join("");
fs.writeFileSync(process.argv[2], `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:20px;font-family:'Noto Sans CJK KR',sans-serif;background:#fff;color:#1f2937}section{margin-bottom:18px}h2{margin:0;font-size:20px}p{margin:2px 0 8px;color:#64748b;font-size:13px}.row{display:flex;gap:10px}figure{margin:0;display:flex;flex-direction:column;align-items:center;width:150px}figcaption{text-align:center;font-size:13px;line-height:1.3}figcaption span{display:block;color:#64748b;font-size:11px}</style>${sec}`);

// 앱용 SVG 파일 내보내기: public/characters/<look>.svg
if (process.argv[3]) {
  const LOOK = { teacher: "teacher", density: "archimedes", solubility: "gaylussac", melting: "black", boiling: "celsius", separation1: "jabir", separation2: "curie" };
  const BG = { teacher: "#e0f2fe", density: "#e0f2fe", solubility: "#dcfce7", melting: "#fce7f3", boiling: "#fef3c7", separation1: "#ccfbf1", separation2: "#f3e8ff" };
  for (const k of ORD) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><clipPath id="frame"><circle cx="100" cy="100" r="98"/></clipPath></defs><circle cx="100" cy="100" r="98" fill="${BG[k]}"/><g clip-path="url(#frame)">${idea3(k)}</g><circle cx="100" cy="100" r="97" fill="none" stroke="${INK}" stroke-width="3"/></svg>`;
    fs.writeFileSync(`${process.argv[3]}/${LOOK[k]}.svg`, svg);
  }
}
