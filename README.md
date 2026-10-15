# Sudoku pour enfants

Générateur de sudoku colorés à imprimer, pensé pour les enfants.

- **Tailles** : 4 × 4, 6 × 6, 9 × 9
- **Difficulté** : définie par le nombre de cases remplies au départ
  | Taille | Facile | Moyen | Difficile |
  |---|---|---|---|
  | 4 × 4 | 10 | 8 | 6 |
  | 6 × 6 | 24 | 18 | 14 |
  | 9 × 9 | 46 | 38 | 30 |
- **Palettes** : Arc-en-ciel, Océan, Forêt, Bonbon
- **Mise en page** : 1, 2, 4 ou 6 grilles par page A4, plusieurs pages, solutions en option

Chaque grille a **une solution unique** : le générateur part d'une grille complète aléatoire, puis retire des cases une par une en vérifiant à chaque fois (avec un solveur) qu'il reste une seule solution.

## Utilisation

Ouvrir `index.html` dans un navigateur, ou la page GitHub Pages du dépôt. Aucune dépendance, aucun build.

## Publication sur GitHub Pages

Dans le dépôt : **Settings → Pages → Build and deployment → Source : Deploy from a branch**, choisir la branche et le dossier `/ (root)`.
