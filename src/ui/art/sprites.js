// Процедурная графика — перенесено из reference/prototype-v1.html как есть (собственная работа владельца).
// Герои, монстры, боссы, предметы, портал, символы слотов — data:image/svg+xml URI; тайлы краёв — canvas.
// Типы — в sprites.d.ts.
const OL = '#1b1124'
const O = ` stroke="${OL}" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"`
const uri = (body, vb, defs = '') =>
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><defs>${defs}</defs>${body}</svg>`,
  )
const glowDef = (id, c, o = 0.75) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${o}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`
const mirror = (s) => `<g transform="translate(64,0) scale(-1,1)">${s}</g>`
const limb = (d, c, w = 4.2) =>
  `<path d="${d}" stroke="${OL}" stroke-width="${w + 2.4}" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`

/* --- hero parts (viewBox 0 0 64 80) --- */
const HAIR_BACK = {
  long: (h) => `<path d="M22 17 C21 5 43 5 42 17 L44.5 52 Q32 56 19.5 52 Z" fill="${h}"${O}/>`,
  twin: (h) =>
    `<ellipse cx="32" cy="16" rx="10.4" ry="9" fill="${h}"${O}/><path d="M24 11 C13 13 11 33 15.5 51 C18 41 19 28 25.5 19Z" fill="${h}"${O}/>` +
    mirror(`<path d="M24 11 C13 13 11 33 15.5 51 C18 41 19 28 25.5 19Z" fill="${h}"${O}/>`),
  pony: (h) =>
    `<ellipse cx="32" cy="16" rx="10.4" ry="9" fill="${h}"${O}/><path d="M40 10 C51 11 51 35 46.5 48 C45.5 37 44 25 39 18Z" fill="${h}"${O}/>`,
  braid: (h) =>
    `<ellipse cx="32" cy="16" rx="10.4" ry="9" fill="${h}"${O}/>` +
    [30, 35, 40, 45, 50]
      .map((y, i) => `<ellipse cx="${40 + i * 0.3}" cy="${y}" rx="2.6" ry="3.1" fill="${h}"${O}/>`)
      .join(''),
  bob: (h) => `<path d="M21.6 18 C20.6 5.5 43.4 5.5 42.4 18 L43.2 31 Q32 34 20.8 31 Z" fill="${h}"${O}/>`,
  short: (h) => `<ellipse cx="32" cy="16" rx="10.2" ry="8.8" fill="${h}"${O}/>`,
  spiky: (h) => `<ellipse cx="32" cy="16" rx="10.2" ry="8.8" fill="${h}"${O}/>`,
  slick: (h) =>
    `<ellipse cx="32" cy="16" rx="10.2" ry="8.8" fill="${h}"${O}/><path d="M39 20 C43 24 43 29 41 32 L39.5 25Z" fill="${h}"${O}/>`,
  none: () => '',
}
const LOCKS = (h) =>
  `<path d="M22.8 15 C20.8 24 21.3 33 22.8 39 L25 30.5 L24.5 17Z" fill="${h}"${O}/>` +
  mirror(`<path d="M22.8 15 C20.8 24 21.3 33 22.8 39 L25 30.5 L24.5 17Z" fill="${h}"${O}/>`)
const HAIR_FRONT = {
  short: (h) =>
    `<path d="M22.6 19 C21.5 7 42.5 7 41.4 19 C39.5 14 37 13.5 35.5 11.5 C33 14.5 29 14 27.5 12.5 C26 15 24 16 22.6 19Z" fill="${h}"${O}/>`,
  spiky: (h) =>
    `<path d="M21.5 19 L22.5 12 L18.5 9.5 L24.5 8.5 L24.5 3.5 L29 7 L32 1.5 L35 7 L39.5 3.5 L39.5 8.5 L45.5 9.5 L41.5 12 L42.5 19 C40 14.5 37.5 13.5 35.5 12 C33 15.5 29 15 27.5 12.5 C25.5 14.5 23.5 15.5 21.5 19Z" fill="${h}"${O}/>`,
  long: (h) =>
    `<path d="M22.6 21 C20.5 6 43.5 6 41.4 21 C40.5 16 38.5 13.5 36 12.5 C33 16 28 17 24.5 15.5 C23.8 17 23.2 19 22.6 21Z" fill="${h}"${O}/>` +
    LOCKS(h),
  bob: (h) =>
    `<path d="M22.2 22 C20.5 5 43.5 5 41.8 22 L40.4 22 C40.4 16 39 14 37.5 13 L32 14.6 L26.5 13 C25 14 23.6 16 23.6 22Z" fill="${h}"${O}/><path d="M21.6 18 L21.4 31 L24.4 31 L24 19Z" fill="${h}"${O}/><path d="M42.4 18 L42.6 31 L39.6 31 L40 19Z" fill="${h}"${O}/>`,
  slick: (h) =>
    `<path d="M22.7 18 C22 7.5 42 7.5 41.3 18 C39.5 12 35.5 10.5 32 14 C28.5 10.5 24.5 12 22.7 18Z" fill="${h}"${O}/>`,
  none: () => '',
}
HAIR_FRONT.twin = HAIR_FRONT.long
HAIR_FRONT.pony = HAIR_FRONT.long
HAIR_FRONT.braid = HAIR_FRONT.long

const HEAD =
  'M22.8 18 C22.8 10.5 27 8.6 32 8.6 C37 8.6 41.2 10.5 41.2 18 C41.2 24.5 37.5 29.6 32 29.6 C26.5 29.6 22.8 24.5 22.8 18Z'
function faceSVG(c) {
  if (c.face === 'skull')
    return `<path d="${HEAD}" fill="#ece6d6"${O}/><ellipse cx="28" cy="19.5" rx="3" ry="3.4" fill="#120a18"/><ellipse cx="36" cy="19.5" rx="3" ry="3.4" fill="#120a18"/><circle cx="28" cy="19.8" r="1.3" fill="${c.eye}"/><circle cx="36" cy="19.8" r="1.3" fill="${c.eye}"/><path d="M32 22.5 L30.8 25 L33.2 25Z" fill="#120a18"/><path d="M27.5 27 H36.5 M29.5 26 V28.5 M32 26 V28.5 M34.5 26 V28.5" stroke="#120a18" stroke-width=".8"/>`
  const e = c.eye || '#6a4bd8',
    b = c.brow || c.hair || '#3a2a20',
    sk = c.skin
  let s = `<path d="${HEAD}" fill="${sk}"${O}/>`
  if (c.face === 'plague')
    return (
      s +
      `<circle cx="28" cy="19.5" r="2.8" fill="#2a3b3f" stroke="#c9a55a" stroke-width="1.2"/><circle cx="36" cy="19.5" r="2.8" fill="#2a3b3f" stroke="#c9a55a" stroke-width="1.2"/><circle cx="27.2" cy="18.7" r=".8" fill="#9fe6ff"/><circle cx="35.2" cy="18.7" r=".8" fill="#9fe6ff"/><path d="M29.5 22 Q32 20.5 34.5 22 L46 33 Q36 31 30 26Z" fill="#d8cbb0"${O}/><path d="M24 24 Q32 31 40 24 L40 28 Q32 33 24 28Z" fill="#3a3040"/>`
    )
  const eye = (x) =>
    `<path d="M${x - 2.6} 19.4 Q${x} 17.6 ${x + 2.6} 19.2" stroke="${OL}" stroke-width="1.35" fill="none" stroke-linecap="round"/><ellipse cx="${x}" cy="20.9" rx="1.55" ry="2.05" fill="${e}"/><circle cx="${x}" cy="21.2" r=".75" fill="${OL}"/><circle cx="${x - 0.6}" cy="20.1" r=".55" fill="#fff"/>`
  s += eye(28) + eye(36)
  s += `<path d="M25.6 16.5 Q28 15.4 30.3 16.2" stroke="${b}" stroke-width="1" fill="none" stroke-linecap="round"/><path d="M33.7 16.2 Q36 15.4 38.4 16.5" stroke="${b}" stroke-width="1" fill="none" stroke-linecap="round"/>`
  s += `<path d="M32.2 22.6 L31.6 24.1 L32.5 24.3" stroke="${OL}" stroke-width=".6" fill="none" opacity=".55"/>`
  s += `<ellipse cx="25.6" cy="24.2" rx="1.8" ry=".9" fill="#ff7aa2" opacity=".35"/><ellipse cx="38.4" cy="24.2" rx="1.8" ry=".9" fill="#ff7aa2" opacity=".35"/>`
  s += `<path d="M30.7 26.4 Q32 27.2 33.3 26.4" stroke="#9a3a52" stroke-width=".95" fill="none" stroke-linecap="round"/>`
  return s
}
const ARMS = (c) => {
  const sl = c.sleeve || c.c1
  return limb('M24.2 35 L21.3 45.5 L21.2 53.6', sl) + limb('M39.8 35 L42.8 45.5 L43.6 53.6', sl)
}
const HANDS = (c) =>
  `<circle cx="21.2" cy="55.4" r="2.3" fill="${c.skin}"${O}/><circle cx="43.6" cy="55.4" r="2.3" fill="${c.skin}"${O}/>`
function legsSVG(c) {
  const p = c.legs || '#2b2236',
    bt = c.boots || '#241a2c'
  const leg = `<path d="M27.2 51 L31 51 L30.7 66 L27.5 66Z" fill="${p}"${O}/><path d="M26.8 63.5 L31.2 63.5 L31.4 74 Q29 75.6 25.8 74.6Z" fill="${bt}"${O}/>`
  return leg + mirror(leg)
}
const OUTFIT = {
  robe: (a, b) =>
    `<path d="M23.5 33.5 Q32 31.5 40.5 33.5 L39 46 L44.5 74 Q32 77.2 19.5 74 L25 46 Z" fill="${a}"${O}/><path d="M31 46 L33 46 L33.7 76.2 L30.3 76.2Z" fill="${b}"/><path d="M20 72.4 Q32 75.6 44 72.4" stroke="${b}" stroke-width="1.8" fill="none"/><path d="M24.8 45.2 H39.2 V48 H24.6Z" fill="${b}"${O}/><path d="M28 33 L32 37.5 L36 33" fill="${b}"${O}/>`,
  dress: (a, b) =>
    `<path d="M25.5 46 L38.5 46 L46.5 73 Q32 77.4 17.5 73Z" fill="${a}"${O}/><path d="M18.3 72 Q21.5 74.6 25 73.2 Q28.5 75.8 32 74 Q35.5 75.8 39 73.2 Q42.5 74.6 45.7 72" stroke="${b}" stroke-width="1.8" fill="none"/><path d="M24 33.5 Q32 31.8 40 33.5 L38.5 46.5 L25.5 46.5Z" fill="${a}"${O}/><path d="M29 33 Q32 35.5 35 33 L35 35 Q32 37.5 29 35Z" fill="${b}"/><path d="M25.2 45 H38.8 V47.6 H25.2Z" fill="${b}"/><path d="M32 46.3 L28.5 44.4 L28.5 48.4Z M32 46.3 L35.5 44.4 L35.5 48.4Z" fill="${b}"${O}/>`,
  armor: (a, b) =>
    `<path d="M25 46 L39 46 L41 55 L23 55Z" fill="${a}"${O}/><path d="M28.5 46 V55 M32 46 V55 M35.5 46 V55" stroke="${OL}" stroke-width=".7" opacity=".6"/><path d="M23.5 33.5 Q32 31.5 40.5 33.5 L39 46.5 Q32 48.5 25 46.5Z" fill="${a}"${O}/><path d="M27 35.5 Q32 34.2 37 35.5 L36 43 Q32 45.2 28 43Z" fill="${b}" opacity=".9"/><path d="M29.5 37 Q32 36.3 34.5 37" stroke="#fff" stroke-width=".9" fill="none" opacity=".6"/><ellipse cx="23.6" cy="35.4" rx="4.8" ry="3.6" fill="${b}"${O}/><ellipse cx="40.4" cy="35.4" rx="4.8" ry="3.6" fill="${b}"${O}/><path d="M24.6 46 H39.4 V48.6 H24.6Z" fill="${OL}" opacity=".55"/>`,
  coat: (a, b) =>
    `<path d="M29 33 L35 33 L34.6 55 L29.4 55Z" fill="${b}"${O}/><path d="M23.5 33.5 Q32 31.5 40.5 33.5 L39.5 46 L43.5 72.5 L35.8 72.5 L33.6 54 L33.6 33.6 L30.4 33.6 L30.4 54 L28.2 72.5 L20.5 72.5 L24.5 46Z" fill="${a}"${O}/><path d="M30.4 33.6 L27.6 40 L30.4 44 M33.6 33.6 L36.4 40 L33.6 44" stroke="${b}" stroke-width="1.4" fill="none"/><path d="M24.6 45.4 H39.4 V47.8 H24.6Z" fill="${OL}" opacity=".6"/><circle cx="32" cy="46.6" r="1.2" fill="#ffc94d"/>`,
  gi: (a, b) =>
    `<path d="M25 53 L39 53 L41.5 70 L34.4 70 L32 58 L29.6 70 L22.5 70Z" fill="${a}"${O}/><path d="M25 53 L39 53 L41.5 70 L34.4 70 L32 58 L29.6 70 L22.5 70Z" fill="#000" opacity=".25"/><path d="M23.5 33.5 Q32 31.5 40.5 33.5 L39 54 L25 54Z" fill="${a}"${O}/><path d="M27 33 L36 45 M37 33 L30.5 41.5" stroke="${b}" stroke-width="1.8"/><path d="M24.6 44.5 H39.4 V48.5 H24.6Z" fill="${b}"${O}/>`,
  leather: (a, b) =>
    `<path d="M23.5 33.5 Q32 31.5 40.5 33.5 L39 46 L40.5 55 L23.5 55 L25 46Z" fill="${a}"${O}/><path d="M25 35 L39 50" stroke="${b}" stroke-width="2.2"/><path d="M24.4 45.6 H39.6 V48.4 H24.4Z" fill="${b}"${O}/><rect x="30.6" y="45.4" width="2.8" height="3.2" fill="#ffc94d"/><path d="M28 33 L32 36.5 L36 33" stroke="${b}" stroke-width="1.3" fill="none"/>`,
}
function weaponSVG(c, defs) {
  const o = c.orb || '#4fd8e8'
  const wood = '#6b4423',
    steel = '#e6ecf5'
  const orb = (x, y, r) => {
    defs.push(glowDef('og', o, 0.9))
    return `<circle cx="${x}" cy="${y}" r="${r * 2.2}" fill="url(#og)"/><circle cx="${x}" cy="${y}" r="${r}" fill="${o}"${O}/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.32}" fill="#fff" opacity=".85"/>`
  }
  switch (c.wp) {
    case 'staff':
      return limb('M46.6 9 L43.2 77', wood, 2.2) + orb(46.8, 6.2, 3.8)
    case 'pole':
      return limb('M47 4 L43.2 77', wood, 2.2)
    case 'sword':
      return (
        `<path d="M42.6 54 L45.8 25 L47.7 25.4 L44.8 54.6Z" fill="${steel}"${O}/><path d="M44.6 28 L44.2 52" stroke="#9fb0c8" stroke-width=".7"/>` +
        limb('M40.6 53.6 L47.6 55.4', '#ffc94d', 1.6)
      )
    case 'katana':
      return `<path d="M42.8 55 Q45 38 51 21.5 L52.4 22.1 Q47 39 44.6 55.4Z" fill="#f1f5fb"${O}/><ellipse cx="43.7" cy="54.8" rx="2.6" ry="1.1" fill="#ffc94d"${O}/>`
    case 'scythe':
      return (
        limb('M46.6 8 L43.2 77', wood, 2.2) +
        `<path d="M46.6 8 Q34 1.6 21 9 Q34 7.4 45.8 13.5Z" fill="#cfd6e2"${O}/>`
      )
    case 'bow':
      return `<path d="M47 30 Q57 51 47 72" stroke="${OL}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M47 30 Q57 51 47 72" stroke="#8a5a2e" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M47 30 L47 72" stroke="#efe6d0" stroke-width=".6"/>`
    case 'spear':
      return (
        limb('M47 7 L43.2 77', wood, 2.1) + `<path d="M47.2 0.6 L50 8.5 L44.4 8.5Z" fill="${steel}"${O}/>`
      )
    case 'lantern':
      defs.push(glowDef('lg', o, 0.85))
      return `<path d="M43.6 56 V60" stroke="${OL}" stroke-width=".9"/><circle cx="44" cy="64" r="9" fill="url(#lg)"/><rect x="41" y="60" width="6" height="8" rx="1.4" fill="${o}" stroke="#3a2a1a" stroke-width="1.3"/><path d="M41 62.5 H47 M41 65.5 H47" stroke="#3a2a1a" stroke-width=".7"/>`
    case 'wand':
      defs.push(glowDef('wg', o, 0.9))
      return (
        limb('M43.6 55 L49.2 44.4', '#2b1d33', 1.4) +
        `<circle cx="49.8" cy="42.6" r="6" fill="url(#wg)"/><path d="M49.8 38.6 L50.9 41.6 L53.9 41.8 L51.5 43.6 L52.4 46.6 L49.8 44.8 L47.2 46.6 L48.1 43.6 L45.7 41.8 L48.7 41.6Z" fill="${o}"${O}/>`
      )
    case 'book':
      return `<rect x="14.4" y="50.4" width="9.6" height="11.4" rx="1.2" fill="${c.c2}"${O}/><path d="M16 52.4 H22.4 M16 54.6 H22.4" stroke="${OL}" stroke-width=".6"/>`
  }
  return ''
}
const WINGS = {
  bat: (w) => {
    const p = `<path d="M27 38 C20 28 9 24 2 28 C6 31 5 35 2 40 C7 39 10 42 9 47 C14 44 19 46 24 50Z" fill="${w}"${O}/><path d="M24 36 L9 29 M23 41 L6 38 M24 45 L10 44" stroke="${OL}" stroke-width=".6" opacity=".7"/>`
    return p + mirror(p)
  },
  angel: (w) => {
    const p = `<path d="M27 40 C18 36 7 27 3 15 C9 19 13 20 17 22 C13 24 11 27 11 29 C16 29 19 31 21 33 C17 35 16 38 17 41 C21 41 24 42 27 45Z" fill="${w}"${O}/>`
    return p + mirror(p)
  },
  dragon: (w) => {
    const p = `<path d="M27 38 C21 26 10 18 1 20 C5 24 4 28 1 33 C6 32 9 35 7 40 C12 38 15 41 14 46 C19 43 22 45 25 49Z" fill="${w}"${O}/><path d="M26 37 L4 22 M24 41 L5 33 M24 45 L11 42" stroke="#ffc94d" stroke-width=".7" opacity=".7"/>`
    return p + mirror(p)
  },
  fairy: (w) => {
    const p = `<ellipse cx="17" cy="33" rx="12" ry="6.5" transform="rotate(-28 17 33)" fill="${w}" opacity=".6" stroke="#fff" stroke-width=".9"/><ellipse cx="19" cy="46" rx="8" ry="4.5" transform="rotate(22 19 46)" fill="${w}" opacity=".5" stroke="#fff" stroke-width=".9"/>`
    return p + mirror(p)
  },
}
const HATS = {
  witch: (h, b) =>
    `<ellipse cx="32" cy="10.6" rx="15.6" ry="3.4" fill="${h}"${O}/><path d="M23.6 10.6 Q27 1 41.5 0.8 Q35.5 4 40.4 10.6Z" fill="${h}"${O}/><path d="M24 8.8 Q32 11 40 8.8 L40.3 10.8 Q32 13 23.7 10.8Z" fill="${b}"/>`,
  hood: (h) =>
    `<path d="M21 22 C19 4 45 4 43 22 L43.5 34 Q42 31 40.6 28 C40.6 17 37.5 12 32 12 C26.5 12 23.4 17 23.4 28 Q22 31 20.5 34Z" fill="${h}"${O}/>`,
  helm: (h) =>
    `<path d="M22.3 20 C21.5 5 42.5 5 41.7 20 L40 20 C39 15 36 13.5 32 13.5 C28 13.5 25 15 24 20Z" fill="#aab3c5"${O}/><path d="M30 7 Q31 -0.4 38.5 1 Q34 3 34 7Z" fill="${h}"${O}/>`,
  helmwing: (h) =>
    HATS.helm(h) +
    `<path d="M23 13 C17 10 15 5.5 16 2.5 C18 6.5 21 8 24.5 9Z" fill="#f4eef8"${O}/>` +
    mirror(`<path d="M23 13 C17 10 15 5.5 16 2.5 C18 6.5 21 8 24.5 9Z" fill="#f4eef8"${O}/>`),
  helmhorn: (h) =>
    `<path d="M22.3 20 C21.5 5 42.5 5 41.7 20 L40 20 C39 15 36 13.5 32 13.5 C28 13.5 25 15 24 20Z" fill="#3a3346"${O}/><path d="M24 11 C18.5 9 17 3.5 19 0.8 C20.5 5 22.5 7 26.5 8.5Z" fill="#e8e0cf"${O}/>` +
    mirror(`<path d="M24 11 C18.5 9 17 3.5 19 0.8 C20.5 5 22.5 7 26.5 8.5Z" fill="#e8e0cf"${O}/>`) +
    `<path d="M27 17 H37" stroke="${h}" stroke-width="1.4"/>`,
  crown: (h) =>
    `<path d="M24.6 10.2 L25.6 3.4 L28.8 7.4 L32 1.6 L35.2 7.4 L38.4 3.4 L39.4 10.2Z" fill="#ffc94d"${O}/><circle cx="32" cy="8" r="1.4" fill="${h}"/><circle cx="27.4" cy="8.6" r=".9" fill="${h}"/><circle cx="36.6" cy="8.6" r=".9" fill="${h}"/>`,
  horns: (h) => {
    const p = `<path d="M24.5 11 C19 9 17.5 3.5 19.5 0.8 C21 5 23 7 27 8.5Z" fill="${h}"${O}/>`
    return p + mirror(p)
  },
  halo: () =>
    `<ellipse cx="32" cy="4.2" rx="9" ry="2.4" fill="none" stroke="#ffe27a" stroke-width="3.2" opacity=".35"/><ellipse cx="32" cy="4.2" rx="9" ry="2.4" fill="none" stroke="#ffe27a" stroke-width="1.6"/>`,
  tiara: (h) =>
    `<path d="M24 11.8 Q32 8.6 40 11.8" stroke="#e8eefc" stroke-width="1.6" fill="none"/><path d="M32 6.4 L33.6 9.6 L32 11.4 L30.4 9.6Z" fill="${h}"${O}/><circle cx="27.8" cy="10.4" r=".8" fill="${h}"/><circle cx="36.2" cy="10.4" r=".8" fill="${h}"/>`,
  bandana: (h) =>
    `<path d="M22.8 14.4 Q32 11 41.2 14.4 L41.2 17 Q32 13.6 22.8 17Z" fill="${h}"${O}/><path d="M41 15 L48.4 12.8 L46.8 18.6Z" fill="${h}"${O}/>`,
  hunter: (h, b) =>
    `<ellipse cx="32" cy="11" rx="16.4" ry="3.4" fill="${h}"${O}/><path d="M25 11 Q25.5 2 32 2 Q38.5 2 39 11Z" fill="${h}"${O}/><path d="M25.3 8.6 Q32 10.4 38.7 8.6 L38.9 10.6 Q32 12.4 25.1 10.6Z" fill="${b}"/>`,
  plague: (h) =>
    `<ellipse cx="32" cy="11" rx="16" ry="3.2" fill="${h}"${O}/><path d="M25.5 11 L26.5 3 Q32 1.6 37.5 3 L38.5 11Z" fill="${h}"${O}/>`,
  cat: (h) => {
    const p = `<path d="M24.2 12.5 L24.8 2.6 L30.4 9.2Z" fill="${h}"${O}/><path d="M25.6 9.8 L25.9 5.4 L28.4 8.6Z" fill="#ff9ac0"/>`
    return p + mirror(p)
  },
  fox: (h) => {
    const p = `<path d="M23.6 13 L22.6 0.8 L30.6 9Z" fill="${h}"${O}/><path d="M23.1 3.6 L22.6 0.8 L25.2 3.2Z" fill="#fff"/><path d="M24.8 9.4 L24.4 4.6 L28 8.4Z" fill="#fff3e0"/>`
    return p + mirror(p)
  },
}
function heroSVG(c) {
  const defs = []
  let s = ''
  if (c.aura) {
    defs.push(glowDef('au', c.aura, 0.55))
    s += `<ellipse cx="32" cy="44" rx="31" ry="36" fill="url(#au)"/>`
  }
  s += `<ellipse cx="32" cy="76.6" rx="12" ry="2.5" fill="#000" opacity=".35"/>`
  if (c.wings) s += WINGS[c.wings](c.wc || '#2b2035')
  if (c.cape) s += `<path d="M23.5 33.5 L40.5 33.5 L46.5 75 Q32 78 17.5 75 Z" fill="${c.cape}"${O}/>`
  s += (HAIR_BACK[c.hs] || HAIR_BACK.none)(c.hair)
  if (c.out !== 'robe' && c.out !== 'dress') s += legsSVG(c)
  s += `<rect x="29.8" y="26" width="4.4" height="8" fill="${c.skin}"${O}/>`
  s += OUTFIT[c.out](c.c1, c.c2)
  s += ARMS(c)
  if (c.wp) s += weaponSVG(c, defs)
  s += HANDS(c)
  if (c.ears === 'elf') {
    const p = `<path d="M23.2 17 L14.6 12.4 L23.6 22.6Z" fill="${c.skin}"${O}/>`
    s += p + mirror(p)
  }
  s += faceSVG(c)
  s += (HAIR_FRONT[c.hs] || HAIR_FRONT.none)(c.hair)
  if (c.ears === 'cat') s += HATS.cat(c.hair)
  if (c.ears === 'fox') s += HATS.fox(c.hair)
  if (c.hat) s += HATS[c.hat](c.hc || c.c1, c.c2)
  return uri(s, '0 0 64 80', defs.join(''))
}
/* --- skins catalog --- */
const SKT = {
  porc: '#f7dccb',
  fair: '#f2cdb0',
  tan: '#d9a77f',
  brown: '#a8714c',
  deep: '#6f452b',
  choco: '#5a3825',
  vamp: '#ece4f2',
  pale: '#e2dde8',
}
const SKIN_LIST = [
  [
    'mage',
    'Ученик мага',
    'start',
    {
      skin: SKT.fair,
      hair: '#6b4a3a',
      hs: 'short',
      out: 'robe',
      c1: '#3d5bd9',
      c2: '#ffc94d',
      hat: 'witch',
      hc: '#2f46ad',
      wp: 'staff',
      orb: '#4fd8e8',
      eye: '#4fa8ff',
    },
  ],
  [
    'squire',
    'Оруженосец',
    'common',
    {
      skin: SKT.tan,
      hair: '#3a2a20',
      hs: 'short',
      out: 'armor',
      c1: '#8a93a6',
      c2: '#c9a55a',
      wp: 'sword',
      eye: '#6b8e4e',
      legs: '#3a3346',
    },
  ],
  [
    'herbalist',
    'Травница',
    'common',
    {
      skin: SKT.fair,
      hair: '#b4532a',
      hs: 'long',
      out: 'dress',
      c1: '#3f9e6b',
      c2: '#f3e3a1',
      wp: 'lantern',
      orb: '#ffe27a',
      eye: '#3fbf6a',
    },
  ],
  [
    'rogue',
    'Плут',
    'common',
    {
      skin: SKT.fair,
      hair: '#22202a',
      hs: 'short',
      out: 'leather',
      c1: '#5a3d2b',
      c2: '#2b2236',
      hat: 'hood',
      hc: '#2f4a3a',
      wp: 'sword',
      eye: '#9a8a5a',
    },
  ],
  [
    'acolyte',
    'Послушница',
    'common',
    {
      skin: SKT.porc,
      hair: '#f2d27a',
      hs: 'bob',
      out: 'robe',
      c1: '#efe9f7',
      c2: '#8c6be0',
      wp: 'wand',
      orb: '#c86bff',
      eye: '#8c6be0',
    },
  ],
  [
    'huntress',
    'Охотница',
    'common',
    {
      skin: SKT.brown,
      hair: '#3b2518',
      hs: 'pony',
      out: 'leather',
      c1: '#56653a',
      c2: '#a07a4a',
      wp: 'bow',
      eye: '#c98a3a',
      legs: '#3a2e22',
    },
  ],
  [
    'bard',
    'Бард',
    'common',
    {
      skin: SKT.fair,
      hair: '#e8c170',
      hs: 'short',
      out: 'coat',
      c1: '#c2394a',
      c2: '#ffc94d',
      hat: 'hunter',
      hc: '#5a2030',
      wp: 'wand',
      orb: '#ffc94d',
      eye: '#4fa8ff',
    },
  ],
  [
    'monk',
    'Монах',
    'common',
    {
      skin: SKT.tan,
      hair: '#2a1d14',
      hs: 'none',
      out: 'gi',
      c1: '#e07a2e',
      c2: '#6b3a1a',
      wp: 'pole',
      eye: '#6b4a2a',
    },
  ],
  [
    'witchling',
    'Ведьмочка',
    'common',
    {
      skin: SKT.fair,
      hair: '#ff7ab8',
      hs: 'twin',
      out: 'dress',
      c1: '#6b3fa0',
      c2: '#ffb3d9',
      hat: 'witch',
      hc: '#4a2a78',
      wp: 'wand',
      orb: '#ff7ab8',
      eye: '#c86bff',
    },
  ],
  [
    'guard',
    'Стражница',
    'common',
    {
      skin: SKT.deep,
      hair: '#d9452b',
      hs: 'braid',
      out: 'armor',
      c1: '#5a6b8a',
      c2: '#c0c8d8',
      wp: 'spear',
      eye: '#d9a53a',
      legs: '#2e3548',
    },
  ],
  [
    'alchemist',
    'Алхимик',
    'common',
    {
      skin: SKT.fair,
      hair: '#e8e8f0',
      hs: 'short',
      out: 'coat',
      c1: '#1f7a7a',
      c2: '#e8d9b0',
      wp: 'lantern',
      orb: '#7dff9a',
      eye: '#4fd8e8',
    },
  ],
  [
    'ninja',
    'Ниндзя',
    'rare',
    {
      skin: SKT.tan,
      hair: '#18161f',
      hs: 'spiky',
      out: 'gi',
      c1: '#23202b',
      c2: '#d8364b',
      hat: 'bandana',
      hc: '#d8364b',
      wp: 'katana',
      eye: '#ff4d5e',
    },
  ],
  [
    'samurai',
    'Самурайка',
    'rare',
    {
      skin: SKT.fair,
      hair: '#18161f',
      hs: 'pony',
      out: 'gi',
      c1: '#8e1f2f',
      c2: '#ffc94d',
      wp: 'katana',
      eye: '#8a5a3a',
    },
  ],
  [
    'elf',
    'Эльфийка-лучница',
    'rare',
    {
      skin: SKT.fair,
      hair: '#e9f0ff',
      hs: 'long',
      ears: 'elf',
      out: 'leather',
      c1: '#2f7a4f',
      c2: '#d9b86a',
      cape: '#1e4a33',
      wp: 'bow',
      eye: '#3fbf8a',
      legs: '#24382c',
    },
  ],
  [
    'vampire',
    'Вампир',
    'rare',
    {
      skin: SKT.vamp,
      hair: '#e8e4f2',
      hs: 'slick',
      out: 'coat',
      c1: '#1c1424',
      c2: '#a3243a',
      cape: '#7a1428',
      wp: 'sword',
      eye: '#ff2f4a',
    },
  ],
  [
    'neko',
    'Неко-чародейка',
    'rare',
    {
      skin: SKT.fair,
      hair: '#f4f1ff',
      hs: 'bob',
      ears: 'cat',
      out: 'dress',
      c1: '#243a7a',
      c2: '#9fe6ff',
      wp: 'wand',
      orb: '#9fe6ff',
      eye: '#ffc94d',
    },
  ],
  [
    'paladin',
    'Паладин',
    'rare',
    {
      skin: SKT.tan,
      hair: '#e8c170',
      hs: 'short',
      out: 'armor',
      c1: '#e8e4ef',
      c2: '#ffc94d',
      cape: '#2f5bd9',
      wp: 'sword',
      eye: '#4fa8ff',
      legs: '#5a5a6a',
    },
  ],
  [
    'priestess',
    'Тёмная жрица',
    'rare',
    {
      skin: SKT.porc,
      hair: '#c9c3e0',
      hs: 'long',
      out: 'robe',
      c1: '#2a1d3a',
      c2: '#b78cff',
      hat: 'hood',
      hc: '#3a2652',
      wp: 'staff',
      orb: '#b78cff',
      eye: '#b78cff',
    },
  ],
  [
    'plague',
    'Чумной доктор',
    'rare',
    {
      skin: SKT.pale,
      hair: '#222',
      hs: 'none',
      face: 'plague',
      out: 'coat',
      c1: '#1f1b24',
      c2: '#6a5a48',
      hat: 'plague',
      hc: '#1f1b24',
      wp: 'lantern',
      orb: '#7dff9a',
    },
  ],
  [
    'kitsune',
    'Кицунэ',
    'rare',
    {
      skin: SKT.fair,
      hair: '#ff9a3c',
      hs: 'long',
      ears: 'fox',
      out: 'gi',
      c1: '#f4eef8',
      c2: '#d8364b',
      wp: 'wand',
      orb: '#ff9a3c',
      eye: '#ff9a3c',
    },
  ],
  [
    'necro',
    'Некромант',
    'epic',
    {
      skin: SKT.pale,
      hair: '#2a2a33',
      hs: 'long',
      out: 'robe',
      c1: '#1e3b2e',
      c2: '#7dff9a',
      hat: 'hood',
      hc: '#173026',
      wp: 'staff',
      orb: '#7dff9a',
      aura: '#7dff9a',
      eye: '#7dff9a',
    },
  ],
  [
    'valkyrie',
    'Валькирия',
    'epic',
    {
      skin: SKT.fair,
      hair: '#ffe08a',
      hs: 'braid',
      out: 'armor',
      c1: '#c9d1e0',
      c2: '#ffc94d',
      hat: 'helmwing',
      hc: '#ffc94d',
      cape: '#f4eef8',
      wp: 'spear',
      aura: '#ffc94d',
      eye: '#4fa8ff',
      legs: '#8a93a6',
    },
  ],
  [
    'storm',
    'Ведьма бури',
    'epic',
    {
      skin: SKT.tan,
      hair: '#3fd6d0',
      hs: 'long',
      out: 'dress',
      c1: '#1a2a6b',
      c2: '#4fd8e8',
      hat: 'witch',
      hc: '#14204f',
      wp: 'staff',
      orb: '#4fd8e8',
      aura: '#4fd8e8',
      eye: '#4fd8e8',
    },
  ],
  [
    'deathknight',
    'Рыцарь смерти',
    'epic',
    {
      skin: SKT.pale,
      hair: '#222',
      hs: 'none',
      out: 'armor',
      c1: '#2b2633',
      c2: '#a3243a',
      hat: 'helmhorn',
      hc: '#ff2f4a',
      cape: '#3a1020',
      wp: 'sword',
      aura: '#ff2f4a',
      eye: '#ff2f4a',
      legs: '#1f1b26',
    },
  ],
  [
    'selena',
    'Селена, лунная жрица',
    'epic',
    {
      skin: SKT.choco,
      hair: '#f7f5ff',
      brow: '#ffffff',
      hs: 'long',
      out: 'dress',
      c1: '#f4f1ff',
      c2: '#9fb8ff',
      hat: 'tiara',
      hc: '#cfe0ff',
      cape: '#cfd8ff',
      wp: 'staff',
      orb: '#ffffff',
      aura: '#dfe6ff',
      eye: '#9fb8ff',
    },
  ],
  [
    'dhunter',
    'Охотница на демонов',
    'epic',
    {
      skin: SKT.fair,
      hair: '#c8324a',
      hs: 'pony',
      out: 'coat',
      c1: '#2a1f2e',
      c2: '#ff7b3a',
      hat: 'hunter',
      hc: '#2a1f2e',
      wp: 'sword',
      aura: '#ff7b3a',
      eye: '#ff7b3a',
    },
  ],
  [
    'blademaster',
    'Мастер клинков',
    'epic',
    {
      skin: SKT.tan,
      hair: '#f4f4ff',
      hs: 'spiky',
      out: 'coat',
      c1: '#1f3a8a',
      c2: '#9fe6ff',
      wp: 'katana',
      aura: '#4fa8ff',
      eye: '#4fa8ff',
    },
  ],
  [
    'demoness',
    'Демоническая чародейка',
    'epic',
    {
      skin: SKT.fair,
      hair: '#2b1a33',
      hs: 'long',
      out: 'robe',
      c1: '#8e1f3f',
      c2: '#ff5c8a',
      hat: 'horns',
      hc: '#3a2440',
      wings: 'bat',
      wc: '#5a1030',
      wp: 'staff',
      orb: '#ff5c8a',
      aura: '#ff5c8a',
      eye: '#ffc94d',
    },
  ],
  [
    'fallen',
    'Падший ангел',
    'legendary',
    {
      skin: SKT.fair,
      hair: '#f4f4ff',
      hs: 'long',
      out: 'robe',
      c1: '#1b1622',
      c2: '#ffc94d',
      hat: 'halo',
      wings: 'angel',
      wc: '#3a3346',
      wp: 'sword',
      aura: '#ffc94d',
      eye: '#ffc94d',
    },
  ],
  [
    'nightqueen',
    'Королева ночи',
    'legendary',
    {
      skin: SKT.vamp,
      hair: '#14101c',
      hs: 'long',
      out: 'dress',
      c1: '#5a0f22',
      c2: '#ff4d5e',
      hat: 'crown',
      hc: '#ff2f4a',
      wings: 'bat',
      wc: '#2a0a14',
      wp: 'wand',
      orb: '#ff2f4a',
      aura: '#ff2f4a',
      eye: '#ff2f4a',
    },
  ],
  [
    'dragonlord',
    'Повелитель драконов',
    'legendary',
    {
      skin: SKT.tan,
      hair: '#2a1a14',
      hs: 'short',
      out: 'armor',
      c1: '#1f6b4a',
      c2: '#ffc94d',
      hat: 'horns',
      hc: '#e8d9b0',
      wings: 'dragon',
      wc: '#14503a',
      wp: 'spear',
      aura: '#5fe0a0',
      eye: '#ffc94d',
      legs: '#173a2a',
    },
  ],
  [
    'lich',
    'Король-лич',
    'legendary',
    {
      skin: '#ece6d6',
      hair: '#222',
      hs: 'none',
      face: 'skull',
      out: 'robe',
      c1: '#3a1f6b',
      c2: '#c86bff',
      hat: 'crown',
      hc: '#7dff9a',
      wp: 'staff',
      orb: '#7dff9a',
      aura: '#c86bff',
      eye: '#7dff9a',
    },
  ],
  [
    'fairy',
    'Фея-архимаг',
    'legendary',
    {
      skin: SKT.porc,
      hair: '#7dffd0',
      hs: 'twin',
      out: 'dress',
      c1: '#ff7ab8',
      c2: '#fff0f7',
      wings: 'fairy',
      wc: '#bff6ff',
      wp: 'wand',
      orb: '#fff3a0',
      aura: '#ff9ad0',
      eye: '#c86bff',
    },
  ],
]

/* --- monsters (viewBox 0 0 64 64) --- */
const SH = `<ellipse cx="32" cy="60" rx="15" ry="3" fill="#000" opacity=".35"/>`
const EYE = (x, y, c, r = 2) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.35}" fill="#fff"/>`
const MON_SVG = {
  rat: () =>
    SH +
    `<path d="M46 50 C57 48 61 39 56 32" stroke="#e59aa8" stroke-width="2.6" fill="none" stroke-linecap="round"/><ellipse cx="36" cy="47" rx="14" ry="10" fill="#7d7590"${O}/><circle cx="21" cy="41" r="9" fill="#8d85a1"${O}/><circle cx="17" cy="32" r="4.6" fill="#8d85a1"${O}/><circle cx="17" cy="32" r="2.4" fill="#e59aa8"/><circle cx="26" cy="31.5" r="4.6" fill="#8d85a1"${O}/><circle cx="26" cy="31.5" r="2.4" fill="#e59aa8"/><circle cx="12.6" cy="43" r="2" fill="#e59aa8"${O}/>` +
    EYE(19, 39, '#ff4d5e', 1.9) +
    `<path d="M15 47 L16 50 L17.4 47Z" fill="#fff"/><ellipse cx="28" cy="56" rx="3" ry="1.6" fill="#e59aa8"/><ellipse cx="42" cy="56" rx="3" ry="1.6" fill="#e59aa8"/>`,
  bat: () =>
    SH +
    `<path d="M28 34 C22 24 10 20 3 24 C7 27 6 31 3 35 C8 34 11 37 10 42 C15 39 21 41 26 44Z" fill="#3b2554"${O}/>` +
    mirror(
      `<path d="M28 34 C22 24 10 20 3 24 C7 27 6 31 3 35 C8 34 11 37 10 42 C15 39 21 41 26 44Z" fill="#3b2554"${O}/>`,
    ) +
    `<path d="M25 24 L26 15 L30 22Z" fill="#5a3a7a"${O}/><path d="M39 24 L38 15 L34 22Z" fill="#5a3a7a"${O}/><circle cx="32" cy="33" r="10" fill="#5a3a7a"${O}/>` +
    EYE(28.4, 31, '#ffd84d', 2.2) +
    EYE(35.6, 31, '#ffd84d', 2.2) +
    `<path d="M29.5 37 L30.5 40 L31.4 37 M32.6 37 L33.5 40 L34.5 37" fill="#fff" stroke="#fff" stroke-width=".6"/>`,
  spider: () => {
    const L = [0, 1, 2, 3]
      .map((i) =>
        limb(
          `M30 ${38 + i * 3} C${20 - i * 2} ${30 + i * 4} ${10 - i} ${40 + i * 3} ${6 + i * 2} ${52 + i * 2}`,
          '#5a4870',
          1.8,
        ),
      )
      .join('')
    return (
      SH +
      L +
      mirror(L) +
      `<ellipse cx="32" cy="45" rx="13" ry="10.5" fill="#2d2236"${O}/><path d="M29 41 L35 41 L32 45 L35 49 L29 49 L32 45Z" fill="#d8364b"/><circle cx="32" cy="31" r="7.5" fill="#3a2d45"${O}/>` +
      EYE(29, 29.5, '#ff4d5e', 1.5) +
      EYE(35, 29.5, '#ff4d5e', 1.5) +
      EYE(30.4, 33.4, '#ff4d5e', 1) +
      EYE(33.6, 33.4, '#ff4d5e', 1)
    )
  },
  goblin: () =>
    SH +
    limb('M27 52 L26 59', '#4a3a2a', 3.6) +
    limb('M37 52 L38 59', '#4a3a2a', 3.6) +
    `<path d="M24 38 L40 38 L42 54 L22 54Z" fill="#7a5a3a"${O}/>` +
    limb('M24 41 L18 48', '#6fbf5a', 3.2) +
    `<path d="M16 48 L12 36 L14.5 35.6 L18.4 47Z" fill="#cfd6e2"${O}/><path d="M20 24 L5 18 L19 30Z" fill="#6fbf5a"${O}/>` +
    mirror(`<path d="M20 24 L5 18 L19 30Z" fill="#6fbf5a"${O}/>`) +
    `<ellipse cx="32" cy="27" rx="12.5" ry="11" fill="#6fbf5a"${O}/>` +
    EYE(27.5, 26, '#ffd84d', 2.3) +
    EYE(36.5, 26, '#ffd84d', 2.3) +
    `<path d="M26 32 Q32 37 38 32 Q32 34.6 26 32Z" fill="${OL}"/><path d="M28 33 L29 35 L30 33.6 M34 33.6 L35 35 L36 33" fill="#fff"/>`,
  skeleton: () =>
    SH +
    limb('M28 48 L27 59', '#ece6d6', 2.4) +
    limb('M36 48 L37 59', '#ece6d6', 2.4) +
    limb('M32 31 L32 48', '#ece6d6', 2.6) +
    [36, 40, 44]
      .map(
        (y) =>
          `<path d="M25 ${y} Q32 ${y - 3} 39 ${y}" stroke="${OL}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M25 ${y} Q32 ${y - 3} 39 ${y}" stroke="#ece6d6" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      )
      .join('') +
    limb('M25 35 L19 46', '#ece6d6', 2.2) +
    limb('M39 35 L45 46', '#ece6d6', 2.2) +
    `<path d="M45 46 L49 26 L51 26.4 L47 46.6Z" fill="#a8a094"${O}/><circle cx="32" cy="21" r="11" fill="#ece6d6"${O}/><path d="M25 27 L39 27 L37 32 L27 32Z" fill="#ece6d6"${O}/><ellipse cx="27.6" cy="21" rx="3" ry="3.4" fill="#120a18"/><ellipse cx="36.4" cy="21" rx="3" ry="3.4" fill="#120a18"/><circle cx="27.6" cy="21.4" r="1.4" fill="#4fd8e8"/><circle cx="36.4" cy="21.4" r="1.4" fill="#4fd8e8"/><path d="M29 29 V32 M32 29 V32 M35 29 V32" stroke="${OL}" stroke-width=".8"/>`,
  wolf: () =>
    SH +
    `<ellipse cx="38" cy="47" rx="16" ry="10" fill="#5f6476"${O}/><path d="M52 44 C60 40 61 32 57 28 C57 35 54 39 50 41Z" fill="#5f6476"${O}/>` +
    limb('M30 53 L29 59', '#5f6476', 4) +
    limb('M44 53 L45 59', '#5f6476', 4) +
    `<path d="M14 26 L18 12 L24 22Z" fill="#6f7486"${O}/><path d="M28 22 L34 11 L35 25Z" fill="#6f7486"${O}/><path d="M12 30 C12 20 34 18 36 30 C37 38 30 43 22 43 L8 39 C5 38 5 34 8 33Z" fill="#6f7486"${O}/><path d="M8 37 L22 40" stroke="${OL}" stroke-width="1"/><path d="M10 37.4 L11 40 L12.4 37.8 M15 38.4 L16 41 L17.2 38.8" fill="#fff"/><circle cx="6.6" cy="34.4" r="1.6" fill="${OL}"/>` +
    EYE(19, 29, '#ffd84d', 2.1) +
    `<path d="M22 32 Q30 34 34 30" stroke="#d9dbe6" stroke-width="2" fill="none"/>`,
  zombie: () =>
    SH +
    limb('M28 50 L27 59', '#3a4a6a', 3.8) +
    limb('M36 50 L37 59', '#3a4a6a', 3.8) +
    `<path d="M24 36 L40 36 L41 52 L35 49 L32 53 L28 49 L23 52Z" fill="#4d6a9a"${O}/>` +
    limb('M25 39 L12 41', '#8fb38a', 3.4) +
    limb('M39 39 L52 41', '#8fb38a', 3.4) +
    `<circle cx="32" cy="24" r="11" fill="#8fb38a"${O}/><path d="M22 19 C24 11 40 11 42 19 C38 15 34 17 30 14 C28 17 25 16 22 19Z" fill="#3a3a2a"${O}/>` +
    EYE(27.5, 24, '#f4f4e0', 2.4) +
    `<circle cx="36.5" cy="24" r="2" fill="#d8364b"/><path d="M27 30 Q30 28.6 33 30.6 Q35 29.4 37 30" stroke="${OL}" stroke-width="1.2" fill="none"/><path d="M35 17 L39 21 M37 17 L35 19.4 M39 19 L37 21" stroke="${OL}" stroke-width=".8"/>`,
  snake: () =>
    SH +
    `<ellipse cx="32" cy="53" rx="17" ry="6.4" fill="#3f9a5e"${O}/><ellipse cx="33" cy="46" rx="13.5" ry="6" fill="#4fae6e"${O}/><ellipse cx="31" cy="39.5" rx="10" ry="5" fill="#5fc07e"${O}/><path d="M28 39 C24 33 24 28 26 24" stroke="${OL}" stroke-width="8.4" fill="none" stroke-linecap="round"/><path d="M28 39 C24 33 24 28 26 24" stroke="#5fc07e" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M20 47 Q24 44 28 47 Q32 44 36 47 Q40 44 44 47" stroke="#d8e88a" stroke-width="1.4" fill="none"/><ellipse cx="27" cy="20" rx="9" ry="6.6" fill="#5fc07e"${O}/><path d="M19 22 L13 23 L11 21 M13 23 L11 25" stroke="#ff4d5e" stroke-width="1.1" fill="none"/><path d="M21 24 L22 27 L23 24.4" fill="#fff"/>` +
    `<ellipse cx="27" cy="18" rx="2.2" ry="2.4" fill="#ffd84d"/><path d="M27 16 V20" stroke="${OL}" stroke-width="1"/><ellipse cx="33" cy="18" rx="2" ry="2.2" fill="#ffd84d"/><path d="M33 16.2 V19.8" stroke="${OL}" stroke-width="1"/>`,
  ogre: () =>
    SH +
    limb('M25 50 L24 59', '#6b7a45', 6) +
    limb('M39 50 L40 59', '#6b7a45', 6) +
    `<ellipse cx="32" cy="41" rx="17" ry="15" fill="#8a9a5b"${O}/><ellipse cx="32" cy="45" rx="10" ry="8" fill="#a7b77a"/><path d="M19 49 L45 49 L43 56 L21 56Z" fill="#6b4a2a"${O}/>` +
    limb('M16 38 L12 50', '#8a9a5b', 5) +
    limb('M48 38 L52 30', '#8a9a5b', 5) +
    `<path d="M50 32 L56 8 Q61 7 60 13 L54 33Z" fill="#7a5233"${O}/><circle cx="57" cy="12" r="1.2" fill="#cfd6e2"/><circle cx="32" cy="22" r="9.5" fill="#8a9a5b"${O}/><path d="M25 18.6 L39 18.6" stroke="${OL}" stroke-width="2.2"/>` +
    EYE(28.5, 21.6, '#ff7b3a', 1.7) +
    EYE(35.5, 21.6, '#ff7b3a', 1.7) +
    `<path d="M27 27 L28 31 L29.4 27.6 M36.6 27.6 L36 31 L37 27" fill="#f4f0e0"${O}/>`,
  ghost: () => {
    return `<ellipse cx="32" cy="60" rx="12" ry="2.6" fill="#4fd8e8" opacity=".25"/><path d="M14 56 L14 30 C14 10 50 10 50 30 L50 56 L44 51 L38 56 L32 51 L26 56 L20 51Z" fill="#e6f2ff" opacity=".92"${O}/><path d="M16 30 C16 18 26 14 32 14" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/><ellipse cx="25.5" cy="30" rx="3.2" ry="4.4" fill="#1b2a4a"/><ellipse cx="38.5" cy="30" rx="3.2" ry="4.4" fill="#1b2a4a"/><circle cx="25.5" cy="31" r="1.2" fill="#4fd8e8"/><circle cx="38.5" cy="31" r="1.2" fill="#4fd8e8"/><ellipse cx="32" cy="41" rx="3.4" ry="4.4" fill="#1b2a4a"/>`
  },
  demon: () =>
    SH +
    `<path d="M40 50 C52 54 56 46 52 40 L56 38 L53 35 L50 40" stroke="${OL}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M40 50 C52 54 56 46 52 40" stroke="#c22a40" stroke-width="2" fill="none"/>` +
    WINGS.bat('#5a1030').replace(/<g/g, '<g opacity=".95"') +
    limb('M27 51 L26 59', '#a3243a', 4) +
    limb('M37 51 L38 59', '#a3243a', 4) +
    `<path d="M23.5 36 Q32 33 40.5 36 L41 52 L23 52Z" fill="#d8364b"${O}/>` +
    limb('M24 38 L18 47', '#d8364b', 3.6) +
    limb('M14 22 L20 58', '#3a2a2a', 1.8) +
    `<path d="M11 22 L14 12 L17 22 M14 12 L14 24 M11 18 L17 18" stroke="#ffc94d" stroke-width="1.6" fill="none"/><circle cx="32" cy="24" r="11" fill="#d8364b"${O}/><path d="M23 17 C18 13 18 6 21 3 C22 8 24 11 27 13Z" fill="#2b1a22"${O}/>` +
    mirror(`<path d="M23 17 C18 13 18 6 21 3 C22 8 24 11 27 13Z" fill="#2b1a22"${O}/>`) +
    EYE(27.5, 23.5, '#ffd84d', 2.2) +
    EYE(36.5, 23.5, '#ffd84d', 2.2) +
    `<path d="M26 29 Q32 34 38 29" stroke="${OL}" stroke-width="1.3" fill="none"/><path d="M28 30.4 L29 33 L30 31.4 M34 31.4 L35 33 L36 30.4" fill="#fff"/>`,
  scorpion: () =>
    SH +
    [0, 1, 2]
      .map(
        (i) =>
          `<path d="M${24 - i * 3} ${44 + i * 3} L${10 - i * 2} ${50 + i * 3}" stroke="${OL}" stroke-width="2.6" stroke-linecap="round"/>`,
      )
      .join('') +
    mirror(
      [0, 1, 2]
        .map(
          (i) =>
            `<path d="M${24 - i * 3} ${44 + i * 3} L${10 - i * 2} ${50 + i * 3}" stroke="${OL}" stroke-width="2.6" stroke-linecap="round"/>`,
        )
        .join(''),
    ) +
    `<path d="M38 46 C52 44 58 30 52 16 C50 10 44 10 42 14" stroke="${OL}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M38 46 C52 44 58 30 52 16 C50 10 44 10 42 14" stroke="#d9822b" stroke-width="6.6" fill="none" stroke-linecap="round"/><path d="M42 14 L36 18 L41 19Z" fill="#ff4d5e"${O}/><ellipse cx="32" cy="47" rx="14" ry="9" fill="#d9822b"${O}/><path d="M22 44 Q32 40 42 44 M21 49 Q32 46 43 49" stroke="#8a4a14" stroke-width="1" fill="none"/>` +
    limb('M20 42 L12 34', '#d9822b', 3.4) +
    `<path d="M12 34 L4 30 Q4 24 10 25 L8 29 L13 31Z" fill="#e89a3c"${O}/>` +
    limb('M44 42 L52 36', '#d9822b', 3.4) +
    `<ellipse cx="32" cy="38" rx="8" ry="6" fill="#e89a3c"${O}/>` +
    EYE(29, 37, '#ff2f4a', 1.6) +
    EYE(35, 37, '#ff2f4a', 1.6) +
    `<path d="M26 32.6 L27 27.6 L29.4 30.6 L32 26.4 L34.6 30.6 L37 27.6 L38 32.6Z" fill="#ffc94d"${O}/>`,
  troll: () =>
    SH +
    limb('M24 50 L22 59', '#566e54', 7) +
    limb('M40 50 L42 59', '#566e54', 7) +
    `<ellipse cx="32" cy="40" rx="19" ry="16" fill="#6c8a6a"${O}/><ellipse cx="32" cy="44" rx="11" ry="9" fill="#89a684"/><path d="M14 30 Q20 26 24 30 M42 28 Q47 25 50 29" stroke="#3f6a3a" stroke-width="3" stroke-linecap="round"/><path d="M18 50 L46 50 L44 57 L20 57Z" fill="#5a3a24"${O}/>` +
    limb('M14 38 L8 52', '#6c8a6a', 6) +
    limb('M50 38 L54 26', '#6c8a6a', 6) +
    `<path d="M52 28 L58 4 Q63 3 62 10 L56 29Z" fill="#6a4a2a"${O}/><circle cx="32" cy="20" r="10" fill="#6c8a6a"${O}/><path d="M30 21 Q32 30 36 26" fill="#5f7d5c"${O}/>` +
    EYE(27.5, 18.5, '#ffd84d', 1.8) +
    EYE(36.5, 18.5, '#ffd84d', 1.8) +
    `<path d="M26 26 L25.4 21 L27.6 25.6 M38 26 L38.6 21 L36.4 25.6" fill="#f4f0e0"${O}/><path d="M24 14 L40 14" stroke="${OL}" stroke-width="2"/>`,
  lich: () => {
    const d = glowDef('lg2', '#7dff9a', 0.9)
    return {
      d,
      b:
        `<ellipse cx="32" cy="34" rx="30" ry="30" fill="url(#lg2)" opacity=".5"/>` +
        SH +
        `<path d="M22 30 L42 30 L50 58 Q32 62 14 58Z" fill="#3a1f6b"${O}/><path d="M31 30 L33 30 L34 60 L30 60Z" fill="#c86bff"/>` +
        limb('M24 33 L16 46', '#3a1f6b', 4) +
        limb('M14 10 L18 60', '#4a3a2a', 2) +
        `<circle cx="14" cy="9" r="9" fill="url(#lg2)"/><circle cx="14" cy="9" r="4.2" fill="#7dff9a"${O}/><circle cx="32" cy="20" r="10" fill="#ece6d6"${O}/><ellipse cx="28" cy="20" rx="2.8" ry="3.2" fill="#120a18"/><ellipse cx="36" cy="20" rx="2.8" ry="3.2" fill="#120a18"/><circle cx="28" cy="20.4" r="1.3" fill="#7dff9a"/><circle cx="36" cy="20.4" r="1.3" fill="#7dff9a"/><path d="M28 26 H36 M30 25 V27.5 M32 25 V27.5 M34 25 V27.5" stroke="${OL}" stroke-width=".8"/><path d="M23.5 12 L24.6 4 L28.2 8.4 L32 2 L35.8 8.4 L39.4 4 L40.5 12Z" fill="#ffc94d"${O}/><circle cx="32" cy="9" r="1.4" fill="#7dff9a"/>`,
    }
  },
  dragon: () =>
    SH +
    WINGS.dragon('#6a1430') +
    `<path d="M44 52 C56 54 60 46 58 40" stroke="${OL}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M44 52 C56 54 60 46 58 40" stroke="#b8243a" stroke-width="3.8" fill="none" stroke-linecap="round"/><ellipse cx="34" cy="46" rx="14" ry="11" fill="#b8243a"${O}/><ellipse cx="32" cy="49" rx="8" ry="6" fill="#f0b45a"/>` +
    limb('M26 54 L25 59', '#b8243a', 4.4) +
    limb('M40 54 L41 59', '#b8243a', 4.4) +
    `<path d="M30 38 C26 30 22 26 20 22" stroke="${OL}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M30 38 C26 30 22 26 20 22" stroke="#b8243a" stroke-width="7.6" fill="none" stroke-linecap="round"/><path d="M10 22 C10 14 26 12 28 20 C29 26 22 28 16 28 L6 27 C3 26 4 22 7 22Z" fill="#c8303f"${O}/><path d="M18 14 L22 4 L24 15Z M24 15 L30 7 L29 18Z" fill="#f4e6c8"${O}/>` +
    EYE(19, 19, '#ffd84d', 1.9) +
    `<path d="M5 25 L-1 27 L4 28 L-1 31 L6 29.6" fill="#ff7b3a" stroke="#ffd84d" stroke-width=".7"/><path d="M8 26.6 L9 28.6 L10.2 26.8" fill="#fff"/>`,
}
const MON_SRC = {}
for (const k in MON_SVG) {
  const r = MON_SVG[k]()
  MON_SRC[k] = typeof r === 'string' ? uri(r, '-2 0 66 64') : uri(r.b, '-2 0 66 64', r.d)
}

/* --- items, portal, ui icons (viewBox 0 0 24 24 for icons) --- */
const ITEM_SRC = {
  shard: uri(
    `<circle cx="32" cy="36" r="22" fill="url(#sg)"/><path d="M32 12 L42 30 L32 54 L22 30Z" fill="#4fd8e8"${O}/><path d="M32 12 L32 54 M22 30 H42" stroke="#155a66" stroke-width="1" opacity=".6"/><path d="M32 12 L26 30 L32 30Z" fill="#d6fbff" opacity=".85"/><path d="M44 22 L49 30 L44 40 L39 30Z" fill="#7de6f2"${O}/>`,
    '0 0 64 64',
    glowDef('sg', '#4fd8e8', 0.8),
  ),
  chest: uri(
    `<ellipse cx="32" cy="54" rx="18" ry="3" fill="#000" opacity=".35"/><rect x="14" y="30" width="36" height="22" rx="2" fill="#8a4f2a"${O}/><path d="M14 30 Q14 16 32 16 Q50 16 50 30Z" fill="#a8622f"${O}/><path d="M14 30 H50" stroke="${OL}" stroke-width="1.3"/><rect x="20" y="16.6" width="4" height="35.4" fill="#ffc94d"${O}/><rect x="40" y="16.6" width="4" height="35.4" fill="#ffc94d"${O}/><rect x="29" y="27" width="6" height="8" rx="1" fill="#ffc94d"${O}/><circle cx="32" cy="31" r="1.2" fill="${OL}"/>`,
    '0 0 64 64',
  ),
  meat: uri(
    `<ellipse cx="32" cy="54" rx="14" ry="2.6" fill="#000" opacity=".35"/><path d="M38 34 L50 46" stroke="${OL}" stroke-width="7" stroke-linecap="round"/><path d="M38 34 L50 46" stroke="#f4ecd8" stroke-width="4.6" stroke-linecap="round"/><circle cx="52" cy="45" r="3.4" fill="#f4ecd8"${O}/><circle cx="49" cy="48" r="3.4" fill="#f4ecd8"${O}/><ellipse cx="29" cy="30" rx="15" ry="12" transform="rotate(35 29 30)" fill="#c0603a"${O}/><ellipse cx="25" cy="26" rx="6" ry="3" transform="rotate(35 25 26)" fill="#e88a5a" opacity=".8"/>`,
    '0 0 64 64',
  ),
  potion: uri(
    `<ellipse cx="32" cy="56" rx="13" ry="2.6" fill="#000" opacity=".35"/><circle cx="32" cy="40" r="22" fill="url(#pg)"/><rect x="27" y="12" width="10" height="12" fill="#cfe7f2"${O}/><rect x="26" y="8" width="12" height="6" rx="2" fill="#8a5a2e"${O}/><circle cx="32" cy="40" r="15" fill="#cfe7f2"${O}/><path d="M18 42 Q32 34 46 42 A14 14 0 0 1 18 42Z" fill="#ff4d6d"/><circle cx="26" cy="34" r="3" fill="#fff" opacity=".7"/>`,
    '0 0 64 64',
    glowDef('pg', '#ff4d6d', 0.6),
  ),
  altar: uri(
    `<ellipse cx="32" cy="56" rx="18" ry="3" fill="#000" opacity=".4"/><circle cx="32" cy="24" r="20" fill="url(#ag)"/><path d="M20 54 L22 34 H42 L44 54Z" fill="#5a4a66"${O}/><path d="M24 40 H40 M23 47 H41" stroke="#3a2d45" stroke-width="1.2"/><rect x="16" y="28" width="32" height="7" rx="2" fill="#6f5c80"${O}/><path d="M22 28 Q32 18 42 28Z" fill="#2a1424"${O}/><path d="M25 27 Q32 21 39 27Z" fill="#ff2f4a"/><circle cx="32" cy="16" r="4" fill="#ff4d6d" opacity=".8"/><path d="M28 44 L32 38 L36 44 L32 50Z" fill="#ff4d6d" opacity=".75"/>`,
    '0 0 64 64',
    glowDef('ag', '#ff2f4a', 0.7),
  ),
  portal: uri(
    `<ellipse cx="32" cy="34" rx="30" ry="22" fill="url(#ptg)"/><ellipse cx="32" cy="36" rx="22" ry="13" fill="#2a1046"${O}/><ellipse cx="32" cy="36.6" rx="17" ry="9.4" fill="#4a1e7a"/><ellipse cx="32" cy="37" rx="12" ry="6.4" fill="#1a0a2e"/><path d="M20 36 Q32 28 44 36" stroke="#c86bff" stroke-width="1.4" fill="none"/><path d="M24 39 Q32 34 40 39" stroke="#4fd8e8" stroke-width="1.2" fill="none"/><circle cx="32" cy="37" r="2.4" fill="#e8d6ff"/>`,
    '0 0 64 64',
    glowDef('ptg', '#c86bff', 0.7),
  ),
}

const SLOT_SRC = {
  skull: uri(
    `<circle cx="32" cy="28" r="17" fill="#ece6d6"${O}/><path d="M22 38 H42 L40 48 H24Z" fill="#ece6d6"${O}/><ellipse cx="25.5" cy="28" rx="5" ry="5.6" fill="#1b1124"/><ellipse cx="38.5" cy="28" rx="5" ry="5.6" fill="#1b1124"/><circle cx="25.5" cy="29" r="2" fill="#ff5c8a"/><circle cx="38.5" cy="29" r="2" fill="#ff5c8a"/><path d="M32 33 L29.6 38 H34.4Z" fill="#1b1124"/><path d="M28 42 V48 M32 42 V48 M36 42 V48" stroke="#1b1124" stroke-width="1.2"/>`,
    '0 0 64 64',
  ),
  candle: uri(
    `<circle cx="32" cy="16" r="14" fill="url(#cg)"/><path d="M32 5 C35 10 37 13 35 17 C34 19 30 19 29 17 C27 13 30 10 32 5Z" fill="#ffb03a"${O}/><path d="M32 11 C33.4 13 33.6 15 32.6 16.4 C31.8 17 31 16.6 31 15.4 C31 14 32 13 32 11Z" fill="#fff3a0"/><path d="M32 19 V22" stroke="${OL}" stroke-width="1"/><rect x="24" y="22" width="16" height="30" rx="2" fill="#f4eefa"${O}/><path d="M24 28 Q27 32 28 28 Q29 34 31 28" fill="#e2d6ee"/><rect x="18" y="50" width="28" height="6" rx="2" fill="#ffc94d"${O}/>`,
    '0 0 64 64',
    glowDef('cg', '#ffb03a', 0.8),
  ),
  goblet: uri(
    `<path d="M18 10 H46 Q46 30 32 34 Q18 30 18 10Z" fill="#ffc94d"${O}/><path d="M20 14 H44 Q43 26 32 30 Q21 26 20 14Z" fill="#a3243a"/><rect x="29.5" y="33" width="5" height="12" fill="#ffc94d"${O}/><path d="M20 54 Q32 44 44 54Z" fill="#ffc94d"${O}/><circle cx="32" cy="38" r="2" fill="#4fd8e8"/><path d="M23 13 Q25 22 28 26" stroke="#fff" stroke-width="1.4" fill="none" opacity=".6"/>`,
    '0 0 64 64',
  ),
  crown: uri(
    `<path d="M10 46 L12 18 L22 30 L32 12 L42 30 L52 18 L54 46Z" fill="#ffc94d"${O}/><rect x="10" y="44" width="44" height="8" rx="2" fill="#e8a92e"${O}/><circle cx="32" cy="34" r="4" fill="#ff5c8a"${O}/><circle cx="20" cy="38" r="2.6" fill="#4fd8e8"${O}/><circle cx="44" cy="38" r="2.6" fill="#4fd8e8"${O}/><circle cx="12" cy="18" r="2.4" fill="#ffc94d"${O}/><circle cx="32" cy="12" r="2.4" fill="#ffc94d"${O}/><circle cx="52" cy="18" r="2.4" fill="#ffc94d"${O}/>`,
    '0 0 64 64',
  ),
  eye: uri(
    `<circle cx="32" cy="32" r="28" fill="url(#eg)"/><path d="M4 32 Q32 6 60 32 Q32 58 4 32Z" fill="#ffe7a0"${O}/><ellipse cx="32" cy="32" rx="12" ry="14" fill="#ff7b3a"${O}/><ellipse cx="32" cy="32" rx="3.2" ry="12" fill="#1b1124"/><circle cx="27" cy="26" r="3" fill="#fff" opacity=".85"/>`,
    '0 0 64 64',
    glowDef('eg', '#ff7b3a', 0.6),
  ),
}

const BIOMES = [
  {
    n: 'Склеп',
    wall: '#5a4876',
    hi: '#7d6aa0',
    mortar: '#33284a',
    top: '#271e38',
    floor: ['#3a2f52', '#362b4c', '#3e3256'],
    fm: '#271e3a',
    acc: '#ff5c8a',
    deco: 'bones',
    void: '#0b0812',
  },
  {
    n: 'Изумрудные пещеры',
    wall: '#376e66',
    hi: '#58a096',
    mortar: '#1c4440',
    top: '#15302d',
    floor: ['#24443f', '#213f3b', '#284a45'],
    fm: '#16302c',
    acc: '#5fe0c0',
    deco: 'crystal',
    void: '#06100f',
  },
  {
    n: 'Кровавый собор',
    wall: '#7a3248',
    hi: '#ac5072',
    mortar: '#46182a',
    top: '#2e111d',
    floor: ['#48283a', '#432434', '#4f2c3f'],
    fm: '#2e1522',
    acc: '#ffc94d',
    deco: 'rune',
    void: '#0e0509',
  },
  {
    n: 'Ледяной некрополь',
    wall: '#4a6f9a',
    hi: '#80a8d4',
    mortar: '#27416a',
    top: '#1b2d46',
    floor: ['#2e4462', '#2a3f5b', '#334a6a'],
    fm: '#1d2e46',
    acc: '#9fe6ff',
    deco: 'ice',
    void: '#060b14',
  },
  {
    n: 'Бездна',
    wall: '#3a2b5a',
    hi: '#6a4fa0',
    mortar: '#1f1638',
    top: '#150e25',
    floor: ['#241b38', '#211932', '#291f3e'],
    fm: '#150f24',
    acc: '#c86bff',
    deco: 'rune',
    void: '#05030a',
  },
]
const biomeOf = (f) => BIOMES[Math.floor((f - 1) / 5) % BIOMES.length]

const hash = (x, y, f) => {
  let h = (x * 374761393 + y * 668265263 + f * 2246822519) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  return (h ^ (h >>> 16)) >>> 0
}
function mulberry(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const TILEC = {}
function tiles(b, T, dpr) {
  const key = b.n + '|' + T + '|' + dpr
  if (TILEC[key]) return TILEC[key]
  const mk = (seed, fn) => {
    const c = document.createElement('canvas')
    c.width = c.height = Math.ceil(T * dpr)
    const x = c.getContext('2d')
    x.scale(dpr, dpr)
    fn(x, mulberry(seed))
    return c
  }
  const face = [0, 1, 2].map((v) =>
    mk(11 + v, (x, R) => {
      x.fillStyle = b.wall
      x.fillRect(0, 0, T, T)
      const h = T / 4
      for (let r = 0; r < 4; r++) {
        const off = ((r % 2) * T) / 4
        for (let xx = -off; xx < T; xx += T / 2) {
          const l = R()
          if (l < 0.3) {
            x.fillStyle = l < 0.15 ? b.hi + '55' : '#00000022'
            x.fillRect(xx + 1, r * h + 1, T / 2 - 2, h - 2)
          }
          x.strokeStyle = b.mortar
          x.lineWidth = 1.2
          x.strokeRect(xx + 0.6, r * h + 0.6, T / 2 - 1.2, h - 1.2)
        }
      }
      x.fillStyle = b.hi
      x.fillRect(0, 0, T, Math.max(2, T * 0.07))
      const g = x.createLinearGradient(0, T * 0.7, 0, T)
      g.addColorStop(0, '#0000')
      g.addColorStop(1, '#0006')
      x.fillStyle = g
      x.fillRect(0, T * 0.7, T, T * 0.3)
    }),
  )
  const top = mk(5, (x) => {
    x.fillStyle = b.top
    x.fillRect(0, 0, T, T)
    x.strokeStyle = b.mortar
    x.globalAlpha = 0.6
    x.lineWidth = 1
    x.strokeRect(0.5, 0.5, T - 1, T - 1)
    x.globalAlpha = 0.25
    x.beginPath()
    x.moveTo(0, T / 2)
    x.lineTo(T / 2, 0)
    x.lineTo(T, T / 2)
    x.lineTo(T / 2, T)
    x.closePath()
    x.stroke()
  })
  const floor = [0, 1, 2].map((v) =>
    mk(31 + v, (x, R) => {
      x.fillStyle = b.floor[v]
      x.fillRect(0, 0, T, T)
      x.strokeStyle = b.fm
      x.lineWidth = 1.3
      x.globalAlpha = 0.9
      x.strokeRect(0.6, 0.6, T / 2 - 0.6, T / 2 - 0.6)
      x.strokeRect(T / 2, 0.6, T / 2 - 0.6, T / 2 - 0.6)
      x.strokeRect(0.6, T / 2, T / 2 - 0.6, T / 2 - 0.6)
      x.strokeRect(T / 2, T / 2, T / 2 - 0.6, T / 2 - 0.6)
      x.globalAlpha = 1
      for (let i = 0; i < 5; i++) {
        x.fillStyle = R() < 0.5 ? '#ffffff0c' : '#0000001a'
        x.fillRect(R() * T, R() * T, 1.6, 1.6)
      }
      if (v === 2) {
        x.strokeStyle = '#00000040'
        x.beginPath()
        x.moveTo(T * 0.2, T * 0.3)
        x.lineTo(T * 0.4, T * 0.45)
        x.lineTo(T * 0.35, T * 0.7)
        x.stroke()
      }
    }),
  )
  return (TILEC[key] = { face, top, floor })
}
function decoDraw(x, b, X, Y, T, t, h) {
  x.save()
  if (b.deco === 'bones') {
    x.strokeStyle = '#e8e0cf'
    x.globalAlpha = 0.55
    x.lineWidth = T * 0.06
    x.lineCap = 'round'
    x.beginPath()
    x.moveTo(X + T * 0.3, Y + T * 0.6)
    x.lineTo(X + T * 0.6, Y + T * 0.72)
    x.moveTo(X + T * 0.45, Y + T * 0.55)
    x.lineTo(X + T * 0.5, Y + T * 0.8)
    x.stroke()
    x.fillStyle = '#e8e0cf'
    x.beginPath()
    x.arc(X + T * 0.7, Y + T * 0.5, T * 0.09, 0, 7)
    x.fill()
  } else if (b.deco === 'crystal' || b.deco === 'ice') {
    const c = b.deco === 'ice' ? '#d6f4ff' : b.acc
    x.globalAlpha = 0.8 + 0.2 * Math.sin(t / 500 + h)
    x.fillStyle = c
    x.shadowColor = c
    x.shadowBlur = T * 0.3
    ;[
      [0.35, 0.75, 0.08, 0.3],
      [0.55, 0.78, 0.06, 0.22],
      [0.48, 0.8, 0.05, 0.15],
    ].forEach(([a, bb, w, hh]) => {
      x.beginPath()
      x.moveTo(X + T * (a - w), Y + T * bb)
      x.lineTo(X + T * a, Y + T * (bb - hh))
      x.lineTo(X + T * (a + w), Y + T * bb)
      x.closePath()
      x.fill()
    })
  } else {
    x.globalAlpha = 0.25 + 0.15 * Math.sin(t / 700 + h)
    x.strokeStyle = b.acc
    x.lineWidth = 1.2
    x.beginPath()
    x.arc(X + T / 2, Y + T / 2, T * 0.3, 0, 7)
    x.stroke()
    x.beginPath()
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5
      const px = X + T / 2 + Math.cos(a) * T * 0.3,
        py = Y + T / 2 + Math.sin(a) * T * 0.3
      if (i) x.lineTo(px, py)
      else x.moveTo(px, py)
    }
    x.closePath()
    x.stroke()
  }
  x.restore()
}

const BY_ID = new Map(SKIN_LIST.map(([id, , , c]) => [id, c]))
const cache = new Map()
/** Портрет облика (data URI), кэшируется. */
export function heroSrc(id) {
  let v = cache.get(id)
  if (!v) {
    const c = BY_ID.get(id) ?? BY_ID.get('mage')
    v = heroSVG(c)
    cache.set(id, v)
  }
  return v
}
/** Цвета облика для фона и ауры. */
export function skinColors(id) {
  const c = BY_ID.get(id) ?? BY_ID.get('mage')
  return { c1: c.c1, c2: c.c2, aura: c.aura ?? null, eye: c.eye ?? null }
}
export { SLOT_SRC, MON_SRC, ITEM_SRC, BIOMES, biomeOf, tiles, decoDraw, hash }
