/*
 * Générateur de sudoku : grilles complètes aléatoires, puis retrait de cases
 * tant que la solution reste unique.
 * Fonctionne dans le navigateur (window.Sudoku) et sous Node (module.exports).
 */
(function (root) {
  'use strict';

  // Dimensions des carrés selon la taille de la grille.
  const BOXES = {
    4: { rows: 2, cols: 2 },
    6: { rows: 2, cols: 3 },
    9: { rows: 3, cols: 3 },
  };

  // Nombre de cases remplies au départ, par taille et par difficulté.
  const GIVENS = {
    4: { facile: 10, moyen: 8, difficile: 6 },
    6: { facile: 24, moyen: 18, difficile: 14 },
    9: { facile: 46, moyen: 38, difficile: 30 },
  };

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function boxIndex(size, r, c) {
    const b = BOXES[size];
    return Math.floor(r / b.rows) * (size / b.cols) + Math.floor(c / b.cols);
  }

  function popcount(x) {
    let n = 0;
    while (x) { x &= x - 1; n++; }
    return n;
  }

  // Prépare les masques de chiffres utilisés. Renvoie null si la grille est contradictoire.
  function buildMasks(grid, size) {
    const rows = new Array(size).fill(0);
    const cols = new Array(size).fill(0);
    const boxes = new Array(size).fill(0);
    for (let i = 0; i < size * size; i++) {
      const v = grid[i];
      if (!v) continue;
      const r = Math.floor(i / size), c = i % size, b = boxIndex(size, r, c);
      const bit = 1 << v;
      if ((rows[r] | cols[c] | boxes[b]) & bit) return null;
      rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
    }
    return { rows, cols, boxes };
  }

  /*
   * Résout la grille par retour arrière (case la plus contrainte d'abord).
   * Compte les solutions jusqu'à `limit`. Si `randomize`, essaie les chiffres
   * dans un ordre aléatoire et laisse la première solution trouvée dans `grid`.
   */
  function solve(grid, size, limit, randomize) {
    const m = buildMasks(grid, size);
    if (!m) return 0;
    const full = ((1 << (size + 1)) - 1) & ~1;
    const digits = [];
    for (let d = 1; d <= size; d++) digits.push(d);
    let count = 0;

    function step() {
      let best = -1, bestMask = 0, bestCount = size + 1;
      for (let i = 0; i < size * size; i++) {
        if (grid[i]) continue;
        const r = Math.floor(i / size), c = i % size, b = boxIndex(size, r, c);
        const mask = full & ~(m.rows[r] | m.cols[c] | m.boxes[b]);
        const n = popcount(mask);
        if (n === 0) return false;
        if (n < bestCount) {
          best = i; bestMask = mask; bestCount = n;
          if (n === 1) break;
        }
      }
      if (best === -1) {
        count++;
        return count >= limit;
      }
      const r = Math.floor(best / size), c = best % size, b = boxIndex(size, r, c);
      const order = randomize ? shuffle(digits.slice()) : digits;
      for (const d of order) {
        const bit = 1 << d;
        if (!(bestMask & bit)) continue;
        grid[best] = d;
        m.rows[r] |= bit; m.cols[c] |= bit; m.boxes[b] |= bit;
        if (step()) return true;
        m.rows[r] &= ~bit; m.cols[c] &= ~bit; m.boxes[b] &= ~bit;
      }
      grid[best] = 0;
      return false;
    }

    step();
    return count;
  }

  function countSolutions(grid, size, limit) {
    return solve(grid.slice(), size, limit || 2, false);
  }

  function randomSolution(size) {
    const grid = new Array(size * size).fill(0);
    solve(grid, size, 1, true);
    return grid;
  }

  // Retire des cases au hasard tant que la solution reste unique, jusqu'à `target` cases remplies.
  function carve(solution, size, target) {
    const puzzle = solution.slice();
    let filled = size * size;
    for (const i of shuffle([...puzzle.keys()])) {
      if (filled <= target) break;
      const v = puzzle[i];
      puzzle[i] = 0;
      if (countSolutions(puzzle, size, 2) === 1) filled--;
      else puzzle[i] = v;
    }
    return { puzzle, filled };
  }

  function generate(size, difficulty) {
    if (!BOXES[size]) throw new Error('Taille non prise en charge : ' + size);
    const target = GIVENS[size][difficulty];
    if (target === undefined) throw new Error('Difficulté inconnue : ' + difficulty);
    let best = null;
    // Le retrait aléatoire peut parfois bloquer au-dessus de la cible : on réessaie.
    for (let attempt = 0; attempt < 20; attempt++) {
      const solution = randomSolution(size);
      const { puzzle, filled } = carve(solution, size, target);
      if (!best || filled < best.filled) best = { size, puzzle, solution, filled };
      if (filled <= target) break;
    }
    return best;
  }

  // Vérifie qu'une grille complète respecte les règles.
  function isValidSolution(grid, size) {
    return grid.length === size * size && grid.every(v => v >= 1 && v <= size) && buildMasks(grid, size) !== null;
  }

  const api = { BOXES, GIVENS, generate, countSolutions, isValidSolution, boxIndex };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Sudoku = api;
})(typeof window !== 'undefined' ? window : this);
