(function () {
  'use strict';

  // Chaque palette : une couleur douce par carré, une couleur de traits et une couleur de chiffres.
  const PALETTES = {
    arcenciel: {
      name: 'Arc-en-ciel',
      boxes: ['#ffd6d6', '#ffe8c7', '#fff6bf', '#dcf5c9', '#cdeefa', '#d9dcff', '#ecd9ff', '#ffd9ef', '#d4f5ec'],
      line: '#4b3b8f', ink: '#2b2160', accent: '#e8505b',
    },
    ocean: {
      name: 'Océan',
      boxes: ['#d7f0fb', '#c7e7f5', '#dff6f3', '#cdeef0', '#e3effc', '#d2e9ff', '#c9f0e8', '#e0f2fa', '#d4e6f7'],
      line: '#0d5c7d', ink: '#0a3d55', accent: '#1aa3b8',
    },
    foret: {
      name: 'Forêt',
      boxes: ['#e4f4d0', '#f4f0c8', '#d7efd4', '#eef6d7', '#f8ead0', '#dcefc4', '#ecf2cf', '#d2ebd9', '#f3eccc'],
      line: '#3d6b2a', ink: '#2a4a1d', accent: '#d98a1f',
    },
    bonbon: {
      name: 'Bonbon',
      boxes: ['#ffd9ec', '#f1dcff', '#ffe3f1', '#e6dbff', '#ffd6e2', '#f6e0ff', '#ffe6ea', '#e9d9ff', '#ffdcf6'],
      line: '#a2367a', ink: '#6e1f54', accent: '#ff6fa9',
    },
  };

  const LEVELS = { facile: 1, moyen: 2, difficile: 3 };
  const LEVEL_NAMES = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' };

  const form = document.getElementById('options');
  const sheets = document.getElementById('sheets');
  const paletteBox = document.getElementById('palettes');

  // Boutons de palette avec aperçu des couleurs.
  Object.entries(PALETTES).forEach(([key, p], i) => {
    const label = document.createElement('label');
    const swatches = p.boxes.slice(0, 4).map(c => `<i style="background:${c}"></i>`).join('');
    label.innerHTML = `<input type="radio" name="palette" value="${key}"${i === 0 ? ' checked' : ''}>` +
      `<span><b class="swatch" style="border-color:${p.line}">${swatches}</b>${p.name}</span>`;
    paletteBox.appendChild(label);
  });

  function settings() {
    const f = new FormData(form);
    return {
      size: Number(f.get('size')),
      difficulty: f.get('difficulty'),
      palette: f.get('palette'),
      perPage: Number(f.get('perPage')),
      pages: Math.min(20, Math.max(1, Number(f.get('pages')) || 1)),
      solutions: f.get('solutions') === 'on',
    };
  }

  function updateGivensLabels() {
    const size = Number(new FormData(form).get('size'));
    document.querySelectorAll('[data-givens]').forEach(el => {
      el.textContent = `(${Sudoku.GIVENS[size][el.dataset.givens]} cases)`;
    });
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, text) {
    const node = document.createElementNS(SVG_NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Dessine une grille en SVG. Si `showSolution`, les chiffres à trouver sont ajoutés en plus clair.
  function renderGrid(game, palette, showSolution) {
    const { size, puzzle, solution } = game;
    const box = Sudoku.BOXES[size];
    const cell = 100, total = size * cell;
    const svg = el('svg', { viewBox: `-6 -6 ${total + 12} ${total + 12}`, class: 'grid', role: 'img' });
    svg.setAttribute('aria-label', `Sudoku ${size} par ${size}`);

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const b = Sudoku.boxIndex(size, r, c);
        svg.appendChild(el('rect', { x: c * cell, y: r * cell, width: cell, height: cell, fill: palette.boxes[b % palette.boxes.length] }));
      }
    }

    // Traits fins entre les cases, traits épais entre les carrés.
    for (let i = 1; i < size; i++) {
      const thickV = i % box.cols === 0, thickH = i % box.rows === 0;
      svg.appendChild(el('line', { x1: i * cell, y1: 0, x2: i * cell, y2: total, stroke: palette.line,
        'stroke-width': thickV ? 6 : 1.5, 'stroke-opacity': thickV ? 1 : 0.45 }));
      svg.appendChild(el('line', { x1: 0, y1: i * cell, x2: total, y2: i * cell, stroke: palette.line,
        'stroke-width': thickH ? 6 : 1.5, 'stroke-opacity': thickH ? 1 : 0.45 }));
    }
    svg.appendChild(el('rect', { x: 0, y: 0, width: total, height: total, rx: 14, fill: 'none', stroke: palette.line, 'stroke-width': 9 }));

    for (let i = 0; i < size * size; i++) {
      const given = puzzle[i];
      if (!given && !showSolution) continue;
      const r = Math.floor(i / size), c = i % size;
      svg.appendChild(el('text', {
        x: c * cell + cell / 2, y: r * cell + cell / 2,
        'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-size': 62, 'font-weight': given ? 600 : 400,
        fill: given ? palette.ink : palette.accent,
        class: 'digit',
      }, String(given || solution[i])));
    }
    return svg;
  }

  function stars(level) {
    return '★'.repeat(level) + '☆'.repeat(3 - level);
  }

  function makePage(s, palette, games, offset, isSolution) {
    const page = document.createElement('section');
    page.className = `page per-${s.perPage}`;
    page.style.setProperty('--line', palette.line);
    page.style.setProperty('--ink', palette.ink);
    page.style.setProperty('--accent', palette.accent);
    page.style.setProperty('--tint', palette.boxes[0]);

    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = isSolution
      ? `<h2>Solutions</h2><span class="level">${s.size} × ${s.size} · ${LEVEL_NAMES[s.difficulty]}</span>`
      : `<h2>Sudoku</h2><span class="name">Prénom : <i></i></span>` +
        `<span class="level" title="${LEVEL_NAMES[s.difficulty]}">${stars(LEVELS[s.difficulty])}</span>`;
    page.appendChild(header);

    const grids = document.createElement('div');
    grids.className = 'grids';
    games.forEach((g, i) => {
      const fig = document.createElement('figure');
      const svg = renderGrid(g, palette, isSolution);
      fig.appendChild(svg);
      const cap = document.createElement('figcaption');
      cap.textContent = `n° ${offset + i + 1}`;
      fig.appendChild(cap);
      grids.appendChild(fig);
    });
    page.appendChild(grids);

    if (!isSolution) {
      const rule = document.createElement('p');
      rule.className = 'rule';
      rule.textContent = `Place les chiffres de 1 à ${s.size} : chacun une seule fois par ligne, par colonne et par carré épais.`;
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

  // Redessine sans régénérer (utilisé quand seule la palette ou les solutions changent).
  function render() {
    const s = Object.assign({}, current.s, { palette: settings().palette, solutions: settings().solutions });
    const palette = PALETTES[s.palette];
    sheets.innerHTML = '';
    const chunks = [];
    for (let p = 0; p < s.pages; p++) chunks.push(current.games.slice(p * s.perPage, (p + 1) * s.perPage));
    chunks.forEach((games, p) => sheets.appendChild(makePage(s, palette, games, p * s.perPage, false)));
    if (s.solutions) {
      chunks.forEach((games, p) => sheets.appendChild(makePage(s, palette, games, p * s.perPage, true)));
    }
  }

  form.addEventListener('submit', e => { e.preventDefault(); generate(); });
  form.addEventListener('change', e => {
    const name = e.target.name;
    if (name === 'size') updateGivensLabels();
    if (name === 'palette' || name === 'solutions') render();
    else generate();
  });
  document.getElementById('print').addEventListener('click', () => window.print());

  updateGivensLabels();
  generate();
})();
