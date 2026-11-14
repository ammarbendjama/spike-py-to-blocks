# Py → Blocs SPIKE Prime

Application web (100 % locale, aucune dépendance, aucun serveur) qui convertit du
**Python LEGO SPIKE Prime** (API SPIKE App 3) en **Blocs Word LEGO SPIKE Prime**,
et génère un fichier `.llsp3` importable dans l'application SPIKE
(https://spike.legoeducation.com/prime/project).

## Utilisation

1. Ouvrir `index.html` dans un navigateur (double-clic suffit, tout est local).
2. Saisir ou coller le code Python dans l'éditeur de gauche (ou choisir un exemple).
3. Cliquer **Convertir** (ou `Ctrl+Entrée`) : l'aperçu des blocs s'affiche à droite.
4. Cliquer **Télécharger .llsp3** puis, dans l'application SPIKE :
   créer un projet **Blocs** → menu **Fichier** → **Importer** → sélectionner le fichier.
5. Le bouton **Copier project.json** copie le JSON Scratch 3 brut (debug).

## Ce qui est converti

| Python | Blocs |
|---|---|
| `light_matrix.write("Hi!")`, `show_image`, `set_pixel`, `clear` | Matrice 5×5 (icônes et texte) |
| `motor_pair.pair(...)` | « démarrer à déplacer » (appariement moteurs) |
| `motor_pair.move_for_degrees(amount, velocity, rotation=…)` | « avancer/reculer », « tourner » |
| `motor.run_for_degrees / run_for_time / set_stop_action` | Blocs moteur port A–F |
| `wait_for_seconds`, `wait_until` | « attendre », « attendre jusqu'à » |
| `while True:` | bloc « répéter indéfiniment » |
| `while cond:` | « répéter jusqu'à » (condition inversée) |
| `for i in range(n):` | variable + « répéter n fois » |
| `if / elif / else` | « si … sinon si … sinon » |
| `def f(a, b):` + appels | « définir » / « appeler » Mes blocs |
| `break`, `return` | « arrêter ce bloc » |
| capteurs : couleur, distance, force, boutons, minuteur | blocs booléens/capteurs |
| opérateurs : `+ - * / // %`, comparaisons, `and/or/not`, `random` | blocs opérateurs |
| variables, affectations, `+=` | blocs variables |

## Non converti (avertissement affiché)

- `print()` (aucun bloc équivalent dans SPIKE)
- classes, `try/except`, `for` sur autre chose que `range`, dictionnaires/listes avancées
- appels de bibliothèques inconnues

Chaque élément ignoré produit un avertissement visible sous l'aperçu ; le reste du
programme est quand même converti.

## Hypothèses sur le format `.llsp3`

Un `.llsp3` est un ZIP contenant `manifest.json` et `scratch.sb3` (lui-même un ZIP
avec `project.json` + une image SVG). Les blocs Word sont stockés sous forme d'opcodes
(`flippermove_move`, `flippersensors_isDistance`, …) avec des champs de menu au format
texte (`"forward: 1"`, `"left: -40"`, `"cm"`, `"A"`…). Le format des champs de menu a
été reconstitué par rétro-ingénierie : si l'application SPIKE refuse un fichier,
les valeurs de menu sont le premier point à vérifier.

## Fichiers

- `index.html` / `style.css` — interface (éditeur + aperçu de blocs)
- `js/converter.js` — parseur Python → arbre de blocs → sérialisation sb3
- `js/zip.js` — écriture ZIP + MD5 (pour construire le `.llsp3`)
- `js/blocksview.js` — rendu HTML des blocs (étiquettes en français)
- `js/examples.js` — exemples prêts à convertir
- `js/app.js` — câblage de l'interface

## Limitations connues

- L'aperçu est une reconstitution stylisée, pas le rendu exact de SPIKE.
- Les vitesses Python (°/s) sont converties en % de bloc (÷10) : 300 °/s → 30 %.
- Les distances en mm sont converties en cm (÷10).
