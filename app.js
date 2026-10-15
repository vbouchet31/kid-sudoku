(function () {
  'use strict';

  // Palettes pour le mode « Couleurs ». Les premières couleurs sont les plus faciles
  // à distinguer : une grille 4 × 4 n'utilise que les 4 premières.
  const PALETTES = {
    arcenciel: {
      name: 'Arc-en-ciel',
      colors: ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#fb8c00', '#8e24aa', '#ec407a', '#6d4c41', '#212121'],
    },
    pastel: {
      name: 'Pastel',
      // Menthe, pêche, pervenche, anis, rose poudré, sable, bleu glacier, mauve, gris perle.
      colors: ['#6fd6bd', '#ffb38a', '#a9b4f5', '#c6e377', '#f6a6c8', '#e8d29a', '#a8dcf0', '#d7a6e6', '#c9c9d1'],
    },
    nature: {
      name: 'Nature',
      colors: ['#c62828', '#1565c0', '#f9a825', '#2e7d32', '#ef6c00', '#6a1b9a', '#81c784', '#795548', '#4fc3f7'],
    },
    daltonisme: {
      // Palette Okabe-Ito, lisible par la plupart des personnes daltoniennes.
      name: 'Daltonisme',
      colors: ['#e69f00', '#0072b2', '#f0e442', '#009e73', '#d55e00', '#cc79a7', '#56b4e9', '#000000', '#999999'],
    },
  };

  const SHAPE_NAMES = ['rond', 'carré', 'triangle', 'étoile', 'cœur', 'losange', 'hexagone', 'croix', 'lune'];

  const THEME = { line: '#3b3363', ink: '#2b2160', accent: '#e8505b', boxA: '#ffffff', boxB: '#f8f7fc' };

  const LEVEL_NAMES = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' };
  const SYMBOL_WORDS = { chiffres: 'chiffre', couleurs: 'couleur', formes: 'forme' };

  const form = document.getElementById('options');
  const sheets = document.getElementById('sheets');
  const paletteBox = document.getElementById('palettes');
  const paletteField = document.getElementById('palette-field');

  // Boutons de palette avec aperçu des 4 premières couleurs.
  Object.entries(PALETTES).forEach(([key, p], i) => {
    const label = document.createElement('label');
    const swatches = p.colors.slice(0, 4).map(c => `<i style="background:${c}"></i>`).join('');
    label.innerHTML = `<input type="radio" name="palette" value="${key}"${i === 0 ? ' checked' : ''}>` +
      `<span><b class="swatch">${swatches}</b>${p.name}</span>`;
    paletteBox.appendChild(label);
  });

  function settings() {
    const f = new FormData(form);
    return {
      size: Number(f.get('size')),
      difficulty: f.get('difficulty'),
      symbols: f.get('symbols'),
      palette: f.get('palette'),
      perPage: Number(f.get('perPage')),
      pages: Math.min(20, Math.max(1, Number(f.get('pages')) || 1)),
      solutions: f.get('solutions') === 'on',
      eco: f.get('eco') === 'on',
    };
  }

  function updateLabels() {
    const s = settings();
    document.querySelectorAll('[data-givens]').forEach(el => {
      el.textContent = `(${Sudoku.GIVENS[s.size][el.dataset.givens]} cases)`;
    });
    paletteField.hidden = s.symbols !== 'couleurs';
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, text) {
    const node = document.createElementNS(SVG_NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function regularPolygon(n, r, rotation) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = rotation + (i * 2 * Math.PI) / n;
      pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`);
    }
    return pts.join(' ');
  }

  function starPoints() {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 15 : 36, a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(53 + r * Math.sin(a)).toFixed(1)}`);
    }
    return pts.join(' ');
  }

  // Formes dessinées dans une case de 100 × 100, centrées sur (50, 50).
  const SHAPES = [
    () => el('circle', { cx: 50, cy: 50, r: 30 }),
    () => el('rect', { x: 23, y: 23, width: 54, height: 54, rx: 4 }),
    () => el('polygon', { points: '50,17 84,79 16,79' }),
    () => el('polygon', { points: starPoints() }),
    () => el('path', { d: 'M50 82 C22 63 14 46 21 33 C28 20 45 21 50 34 C55 21 72 20 79 33 C86 46 78 63 50 82 Z' }),
    () => el('polygon', { points: '50,14 82,50 50,86 18,50' }),
    () => el('polygon', { points: regularPolygon(6, 33, 0) }),
    () => el('polygon', { points: '40,16 60,16 60,40 84,40 84,60 60,60 60,84 40,84 40,60 16,60 16,40 40,40' }),
    () => el('path', { d: 'M58 16 A34 34 0 1 0 82 70 A28 28 0 1 1 58 16 Z' }),
  ];

  // Chiffres dessinés en tracés (pas de police) : ils s'impriment partout, y compris sur Android.
  const DIGITS = [
    'M40 33 L52 23 V78',
    'M35 35 C36 23 65 21 65 36 C65 49 49 57 35 78 H67',
    'M35 29 C45 18 66 22 64 36 C63 45 54 49 46 49 C57 49 67 53 66 64 C65 78 44 82 34 72',
    'M58 78 V23 L32 62 H70',
    'M64 24 H39 L36 48 C46 42 66 44 66 61 C66 77 45 82 34 72',
    'M62 27 C50 18 34 28 34 52 C34 70 42 78 51 78 C61 78 67 70 67 61 C67 51 60 45 51 45 C43 45 36 50 34 57',
    'M34 24 H66 L46 78',
    'M50 49 C38 49 37 23 50 23 C63 23 62 49 50 49 C36 49 34 78 50 78 C66 78 64 49 50 49 Z',
    'M38 73 C50 82 66 72 66 48 C66 30 58 22 49 22 C39 22 33 30 33 39 C33 49 40 55 49 55 C57 55 64 50 66 43',
  ];

  /*
   * Symbole `value` (1..taille) dans une case de 100 × 100.
   * `hint` = case trouvée sur la page des solutions : symbole plus petit, couleur d'accent.
   * En mode économie d'encre : ronds plus petits, formes en contour, chiffres non gras.
   */
  function symbol(value, s, hint) {
    const g = el('g', {});
    const color = hint ? THEME.accent : THEME.ink;
    if (s.symbols === 'couleurs') {
      const r = s.eco ? (hint ? 16 : 22) : (hint ? 24 : 33);
      g.appendChild(el('circle', { cx: 50, cy: 50, r, fill: PALETTES[s.palette].colors[value - 1],
        stroke: THEME.ink, 'stroke-width': s.eco ? 1.5 : 2.5, 'stroke-dasharray': hint ? '6 5' : 'none' }));
    } else if (s.symbols === 'formes') {
      const shape = SHAPES[value - 1]();
      if (s.eco) {
        shape.setAttribute('fill', 'none');
        shape.setAttribute('stroke', color);
        shape.setAttribute('stroke-width', 5);
        shape.setAttribute('stroke-linejoin', 'round');
      } else {
        shape.setAttribute('fill', color);
      }
      if (hint) shape.setAttribute('transform', 'translate(50 50) scale(.75) translate(-50 -50)');
      g.appendChild(shape);
    } else {
      g.appendChild(el('path', { d: DIGITS[value - 1], fill: 'none', stroke: color,
        'stroke-width': hint || s.eco ? 6 : 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    }
    return g;
  }

  function place(node, x, y) {
    node.setAttribute('transform', `translate(${x} ${y})`);
    return node;
  }

  // Dessine une grille en SVG. Si `showSolution`, les cases à trouver sont remplies en plus discret.
  function renderGrid(game, s, showSolution) {
    const { size, puzzle, solution } = game;
    const box = Sudoku.BOXES[size];
    const cell = 100, total = size * cell;
    const svg = el('svg', { viewBox: `-6 -6 ${total + 12} ${total + 12}`, class: 'grid', role: 'img' });
    svg.setAttribute('aria-label', `Sudoku ${size} par ${size}`);

    // Un carré sur deux légèrement teinté pour bien repérer les carrés (sauf en économie d'encre).
    for (let r = 0; r < size && !s.eco; r++) {
      for (let c = 0; c < size; c++) {
        const shade = (Math.floor(r / box.rows) + Math.floor(c / box.cols)) % 2;
        svg.appendChild(el('rect', { x: c * cell, y: r * cell, width: cell, height: cell, fill: shade ? THEME.boxB : THEME.boxA }));
      }
    }

    const thin = s.eco ? 1 : 1.5, thick = s.eco ? 3 : 6, outer = s.eco ? 4 : 9;
    for (let i = 1; i < size; i++) {
      const thickV = i % box.cols === 0, thickH = i % box.rows === 0;
      svg.appendChild(el('line', { x1: i * cell, y1: 0, x2: i * cell, y2: total, stroke: THEME.line,
        'stroke-width': thickV ? thick : thin, 'stroke-opacity': thickV ? 1 : 0.45 }));
      svg.appendChild(el('line', { x1: 0, y1: i * cell, x2: total, y2: i * cell, stroke: THEME.line,
        'stroke-width': thickH ? thick : thin, 'stroke-opacity': thickH ? 1 : 0.45 }));
    }
    svg.appendChild(el('rect', { x: 0, y: 0, width: total, height: total, rx: s.eco ? 8 : 14, fill: 'none', stroke: THEME.line, 'stroke-width': outer }));

    for (let i = 0; i < size * size; i++) {
      const given = puzzle[i];
      if (!given && !showSolution) continue;
      const r = Math.floor(i / size), c = i % size;
      svg.appendChild(place(symbol(given || solution[i], s, !given), c * cell, r * cell));
    }
    return svg;
  }

  // Bandeau qui montre les symboles à placer.
  function legend(s) {
    const wrap = document.createElement('div');
    wrap.className = 'legend';
    const title = document.createElement('span');
    title.textContent = s.symbols === 'chiffres' ? 'Chiffres à placer :' : s.symbols === 'couleurs' ? 'Couleurs à placer :' : 'Formes à placer :';
    wrap.appendChild(title);
    for (let v = 1; v <= s.size; v++) {
      const svg = el('svg', { viewBox: '0 0 100 100', class: 'legend-item' });
      const label = s.symbols === 'formes' ? SHAPE_NAMES[v - 1] : String(v);
      svg.appendChild(el('title', {}, label));
      svg.appendChild(symbol(v, s, false));
      wrap.appendChild(svg);
    }
    return wrap;
  }

  function makePage(s, games, offset, isSolution) {
    const page = document.createElement('section');
    page.className = `page per-${s.perPage}${s.eco ? ' eco' : ''}`;

    if (isSolution) {
      const title = document.createElement('h2');
      title.className = 'page-title';
      title.textContent = `Solutions · ${s.size} × ${s.size} · ${LEVEL_NAMES[s.difficulty]}`;
      page.appendChild(title);
    }
    if (!isSolution) page.appendChild(legend(s));

    const grids = document.createElement('div');
    grids.className = 'grids';
    games.forEach((g, i) => {
      const fig = document.createElement('figure');
      fig.appendChild(renderGrid(g, s, isSolution));
      const cap = document.createElement('figcaption');
      cap.textContent = `n° ${offset + i + 1}`;
      fig.appendChild(cap);
      grids.appendChild(fig);
    });
    page.appendChild(grids);

    if (!isSolution) {
      const word = SYMBOL_WORDS[s.symbols];
      const rule = document.createElement('p');
      rule.className = 'rule';
      rule.textContent = s.symbols === 'chiffres'
        ? `Place les chiffres de 1 à ${s.size} : chacun une seule fois par ligne, par colonne et par carré épais.`
        : `Dessine les ${word}s manquantes : chaque ${word} une seule fois par ligne, par colonne et par carré épais.`;
      page.appendChild(rule);
    }
    return page;
  }

  let current = null;

  function generate() {
    const s = settings();
    const games = [];
    for (let i = 0; i < s.perPage * s.pages; i++) games.push(Sudoku.generate(s.size, s.difficulty));
    current = { s, games };
    render();
  }

  // Redessine sans régénérer : les symboles, la palette et les solutions ne changent pas les grilles.
  function render() {
    const now = settings();
    const s = Object.assign({}, current.s, { symbols: now.symbols, palette: now.palette, solutions: now.solutions, eco: now.eco });
    sheets.innerHTML = '';
    const chunks = [];
    for (let p = 0; p < s.pages; p++) chunks.push(current.games.slice(p * s.perPage, (p + 1) * s.perPage));
    chunks.forEach((games, p) => sheets.appendChild(makePage(s, games, p * s.perPage, false)));
    if (s.solutions) chunks.forEach((games, p) => sheets.appendChild(makePage(s, games, p * s.perPage, true)));
  }

  const RENDER_ONLY = ['symbols', 'palette', 'solutions', 'eco'];
  form.addEventListener('submit', e => { e.preventDefault(); generate(); });
  form.addEventListener('change', e => {
    updateLabels();
    if (RENDER_ONLY.includes(e.target.name)) render();
    else generate();
  });
  document.getElementById('print').addEventListener('click', () => window.print());

  updateLabels();
  generate();
})();
