/*
 * converter.js — Convertisseur Python SPIKE Prime -> Word Blocks (project.json sb3).
 * Sous-ensemble supporté (API SPIKE App 3) :
 *   - imports : from hub import port, light_matrix, sound, button
 *               import motor, motor_pair, runloop, color_sensor, distance_sensor,
 *               force_sensor, motion_sensor, math, random, time
 *   - runloop.run(main()) + async def main()
 *   - motor_pair : pair / move / move_for_degrees / move_tank_for_degrees /
 *                  move_tank_for_time / move_tank / stop / set_default_velocity
 *   - motor : run / run_for_degrees / run_for_time / stop / set_velocity
 *   - hub : light_matrix.write / show_image / clear / set_pixel, light.set_color, sound.beep
 *   - capteurs : color_sensor.color/reflection, distance_sensor.distance,
 *                force_sensor.pressed/force, "X in button.pressed()"
 *   - contrôle : wait_for_seconds, wait_until, while True / cond, if / elif / else,
 *                for i in range(...) (variable compteur générée)
 *   - variables, affectations (=, +=, -=...), procédures (def + appels = "Mes blocs")
 *   - expressions : + - * / // % , comparaisons, and/or/not, random.randint, math.*
 * Alias API SPIKE 2 : MotorPair(A,B).move(amount, unit, speed) et objets Motor/Sensors.
 */
(function (root) {
  'use strict';

  // ================================================================ utilitaires
  const COLOR_NAMES = { BLACK: '0', MAGENTA: '1', PURPLE: '2', BLUE: '3', AZURE: '4',
    TURQUOISE: '5', GREEN: '6', YELLOW: '7', ORANGE: '8', RED: '9', WHITE: '10' };
  const CATS = {
    events: '#f5c402', control: '#ffab19', motors: '#0090f5', movement: '#ff4ccd',
    light: '#9a5cff', sound: '#cf63cf', sensors: '#38c1ff', operators: '#59c059',
    variables: '#ff8c1a', lists: '#ff661a', myblocks: '#ff6680', other: '#8c8c8c'
  };
  function catOf(op) {
    if (/^(flipperevents|event)_/.test(op)) return 'events';
    if (/^(flippercontrol|control)_/.test(op)) return 'control';
    if (/^flipper(more)?motor_/.test(op)) return 'motors';
    if (/^flipper(more)?move_/.test(op)) return 'movement';
    if (/^flipperlight_/.test(op)) return 'light';
    if (/^(flippersound|flippermusic|sound)_/.test(op)) return 'sound';
    if (/^flipper(more)?sensors_/.test(op)) return 'sensors';
    if (/^(flipperoperator|operator)_/.test(op)) return 'operators';
    if (/^data_.*list/.test(op)) return 'lists';
    if (/^data_/.test(op)) return 'variables';
    if (/^(procedures|argument)_/.test(op)) return 'myblocks';
    return 'other';
  }

  // Libellés français (comme l'application SPIKE FR) pour l'aperçu. {X} = champ.
  const LABELS = {
    flipperevents_whenProgramStarts: 'quand le programme démarre',
    control_wait: 'attendre {DURATION} secondes',
    control_wait_until: 'attendre jusqu’à {CONDITION}',
    control_forever: 'répéter indéfiniment',
    control_repeat_until: 'répéter jusqu’à {CONDITION}',
    control_repeat: 'répéter {TIMES} fois',
    control_if: 'si {CONDITION} alors',
    control_if_else: 'si {CONDITION} alors',
    flippercontrol_stop: 'arrêter {STOP_OPTION}',
    data_setvariableto: 'mettre {VARIABLE} à {VALUE}',
    data_changevariableby: 'ajouter {VALUE} à {VARIABLE}',
    data_variable: '{VARIABLE}',
    procedures_definition: 'définir {custom_block}',
    procedures_call: '{NAME}',
    flippermove_setMovementPair: 'régler les moteurs de déplacement sur {PAIR}',
    flippermove_move: 'déplacer {DIRECTION} pour {VALUE} {UNIT}',
    flippermove_steer: 'déplacer {STEERING} pour {VALUE} {UNIT}',
    flippermove_startMove: 'commencer à déplacer {DIRECTION}',
    flippermove_stopMove: 'arrêter le déplacement',
    flippermove_movementSpeed: 'régler la vitesse de déplacement à {SPEED} %',
    flippermoremove_moveDistanceAtSpeed: 'déplacer pour {DISTANCE} {UNIT} à {LEFT} {RIGHT} % vitesse',
    flippermoremove_startDualSpeed: 'commencer à déplacer à {LEFT} {RIGHT} % vitesse',
    flippermotor_motorTurnForDirection: '{PORT} tourner {DIRECTION} pour {VALUE} {UNIT}',
    flippermotor_motorStartDirection: '{PORT} démarrer le moteur {DIRECTION}',
    flippermotor_motorStop: '{PORT} arrêter le moteur',
    flippermotor_motorSetSpeed: '{PORT} régler la vitesse à {SPEED} %',
    flippermoremotor_motorTurnForSpeed: '{PORT} tourner pendant {VALUE} {UNIT} à {SPEED} % de vitesse',
    flipperlight_lightDisplayText: 'écrire {TEXT}',
    flipperlight_lightDisplayImageOn: 'allumer {MATRIX}',
    flipperlight_lightDisplayOff: 'éteindre les pixels',
    flipperlight_lightDisplaySetPixel: 'régler le pixel {X} , {Y} à {BRIGHTNESS} %',
    flipperlight_centerButtonLight: 'régler la lumière du bouton central sur {COLOR}',
    flippersound_beepForTime: 'bip {NOTE} pendant {DURATION} secondes',
    flippersensors_color: '{PORT} couleur',
    flippersensors_isColor: '{PORT} est de couleur {VALUE} ?',
    flippersensors_reflectivity: '{PORT} lumière réfléchie',
    flippersensors_isReflectivity: '{PORT} réflexion {COMPARATOR} {VALUE} % ?',
    flippersensors_distance: '{PORT} distance en {UNIT}',
    flippersensors_isDistance: '{PORT} est {COMPARATOR} {VALUE} {UNIT} ?',
    flippersensors_force: '{PORT} pression en {UNIT}',
    flippersensors_isPressed: '{PORT} est {OPTION} ?',
    flippersensors_buttonIsPressed: 'le bouton {BUTTON} est {EVENT} ?',
    flippersensors_resetTimer: 'réinitialiser le minuteur',
    operator_add: '{NUM1} + {NUM2}',
    operator_subtract: '{NUM1} − {NUM2}',
    operator_multiply: '{NUM1} × {NUM2}',
    operator_divide: '{NUM1} ÷ {NUM2}',
    operator_mod: '{NUM1} mod {NUM2}',
    operator_round: 'arrondi de {NUM}',
    operator_random: 'nombre aléatoire entre {FROM} et {TO}',
    operator_gt: '{OPERAND1} > {OPERAND2}',
    operator_lt: '{OPERAND1} < {OPERAND2}',
    operator_equals: '{OPERAND1} = {OPERAND2}',
    operator_and: '{OPERAND1} et {OPERAND2}',
    operator_or: '{OPERAND1} ou {OPERAND2}',
    operator_not: 'non {OPERAND}',
    operator_mathop: '{OPERATOR} de {NUM}'
  };

  // Icônes matrice 5x5 (valeurs de menu "nom: motif")
  const ICONS = {
    happy: '00000:09090:00000:90009:09990',
    heart: '99099:99099:99099:09990:00900',
    angry: '90009:09090:00000:09990:90009',
    sad: '00000:09090:00000:09990:90009',
    sleepy: '00000:09990:00000:09090:00000',
    surprised: '09090:00000:09090:00900:00900',
    flabbergasted: '09090:09090:00000:00900:00900',
    love: '09090:99099:99099:09990:00900'
  };
  const ICON_INDEX = ['angry', 'happy', 'sad', 'sleepy', 'surprised', 'flabbergasted',
    'love', 'heart', 'angry', 'happy'];

  const CMP_FIELD = { '==': '=', '!=': '=', '<': '<', '>': '>', '<=': '<', '>=': '>' };
  const CMP_NEG = { '==': '=', '!=': '=', '<': '>', '>': '<', '<=': '>=', '>=': '<=' };

  function fmtNum(n) {
    if (!isFinite(n)) return '0';
    if (Number.isInteger(n)) return String(n);
    return String(Math.round(n * 10000) / 10000);
  }
  function portLetter(e) {
    if (!e) return null;
    if (e.type === 'attr' && e.obj.type === 'name' && e.obj.name === 'port') return e.name.toUpperCase();
    return null;
  }
  function colorValue(e) {
    if (e && e.type === 'attr' && e.obj.type === 'name' && e.obj.name === 'color' && COLOR_NAMES[e.name.toUpperCase()]) return COLOR_NAMES[e.name.toUpperCase()];
    if (e && e.type === 'num') return String(Math.max(0, Math.min(10, Math.round(e.v))));
    return null;
  }

  // ================================================================ tokenizer
  function tokenize(line) {
    const toks = []; let i = 0;
    while (i < line.length) {
      const c = line[i];
      if (c === ' ' || c === '\t') { i++; continue; }
      if (c === '#') break;
      if (c === '"' || c === "'") {
        let j = i + 1, s = '';
        while (j < line.length && line[j] !== c) {
          if (line[j] === '\\' && j + 1 < line.length) {
            const e = line[j + 1];
            s += e === 'n' ? '\n' : e === 't' ? '\t' : e;
            j += 2;
          } else { s += line[j]; j++; }
        }
        toks.push({ t: 'str', v: s }); i = j + 1; continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(line[i + 1] || ''))) {
        let j = i;
        while (j < line.length && /[0-9._]/.test(line[j])) j++;
        const raw = line.slice(i, j).replace(/_/g, '');
        toks.push({ t: 'num', v: parseFloat(raw) }); i = j; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        let j = i;
        while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
        toks.push({ t: 'name', v: line.slice(i, j) }); i = j; continue;
      }
      const two = line.substr(i, 2);
      if (['**', '//', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%='].includes(two)) {
        toks.push({ t: 'op', v: two }); i += 2; continue;
      }
      toks.push({ t: 'op', v: c }); i++;
    }
    return toks;
  }

  // ================================================================ parseur d'expressions
  function ExprParser(toks) {
    let pos = 0;
    const peek = () => toks[pos];
    const next = () => toks[pos++];
    const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;
    const eat = (v) => { if (isOp(v)) { pos++; return true; } return false; };
    const expect = (v) => { if (!eat(v)) throw new Error('attendu : ' + v); };

    function parseExpr() { return parseOr(); }
    function parseOr() {
      let l = parseAnd();
      while (peek() && peek().t === 'name' && peek().v === 'or') { next(); l = { type: 'bin', op: 'or', l, r: parseAnd() }; }
      return l;
    }
    function parseAnd() {
      let l = parseNot();
      while (peek() && peek().t === 'name' && peek().v === 'and') { next(); l = { type: 'bin', op: 'and', l, r: parseNot() }; }
      return l;
    }
    function parseNot() {
      if (peek() && peek().t === 'name' && peek().v === 'not') { next(); return { type: 'unary', op: 'not', e: parseNot() }; }
      return parseCmp();
    }
    function parseCmp() {
      let l = parseAdd();
      const CMP = ['==', '!=', '<', '>', '<=', '>='];
      while (peek() && ((peek().t === 'op' && CMP.includes(peek().v)) || (peek().t === 'name' && peek().v === 'in'))) {
        const op = next().v;
        const r = parseAdd();
        l = op === 'in' ? { type: 'in', item: l, container: r } : { type: 'bin', op, l, r };
      }
      return l;
    }
    function parseAdd() {
      let l = parseMul();
      while (isOp('+') || isOp('-')) { const op = next().v; l = { type: 'bin', op, l, r: parseMul() }; }
      return l;
    }
    function parseMul() {
      let l = parseUnary();
      while (isOp('*') || isOp('/') || isOp('//') || isOp('%')) { const op = next().v; l = { type: 'bin', op, l, r: parseUnary() }; }
      return l;
    }
    function parseUnary() {
      if (isOp('-')) { next(); return { type: 'unary', op: '-', e: parseUnary() }; }
      if (isOp('+')) { next(); return parseUnary(); }
      return parsePow();
    }
    function parsePow() {
      let l = parsePostfix();
      if (isOp('**')) { next(); return { type: 'bin', op: '**', l, r: parseUnary() }; }
      return l;
    }
    function parsePostfix() {
      let e = parseAtom();
      for (;;) {
        if (isOp('(')) {
          next();
          const args = [], kwargs = {};
          while (!isOp(')')) {
            if (peek() && peek().t === 'name' && toks[pos + 1] && toks[pos + 1].t === 'op' && toks[pos + 1].v === '=') {
              const k = next().v; pos++;
              kwargs[k] = parseExpr();
            } else args.push(parseExpr());
            if (!eat(',')) break;
          }
          expect(')');
          e = { type: 'call', func: e, args, kwargs };
        } else if (isOp('.')) {
          next();
          const n = next();
          e = { type: 'attr', obj: e, name: n && n.t === 'name' ? n.v : '' };
        } else if (isOp('[')) {
          next();
          const idx = parseExpr();
          expect(']');
          e = { type: 'index', obj: e, idx };
        } else break;
      }
      return e;
    }
    function parseAtom() {
      const tk = next();
      if (!tk) throw new Error('expression incomplète');
      if (tk.t === 'num') return { type: 'num', v: tk.v };
      if (tk.t === 'str') return { type: 'str', v: tk.v };
      if (tk.t === 'name') {
        if (tk.v === 'True') return { type: 'bool', v: true };
        if (tk.v === 'False') return { type: 'bool', v: false };
        if (tk.v === 'None') return { type: 'none' };
        return { type: 'name', name: tk.v };
      }
      if (tk.t === 'op' && tk.v === '(') { const e = parseExpr(); expect(')'); return e; }
      if (tk.t === 'op' && tk.v === '[') {
        const items = [];
        while (!isOp(']')) { items.push(parseExpr()); if (!eat(',')) break; }
        expect(']');
        return { type: 'list', items };
      }
      throw new Error('jeton inattendu : ' + (tk.v != null ? tk.v : tk.t));
    }
    return { parseExpr };
  }

  function parseExprLine(text) {
    return ExprParser(tokenize(text)).parseExpr();
  }

  // ================================================================ parseur de programme
  function parseProgram(src) {
    const lines = src.split(/\r?\n/);
    const rootStack = [];
    const stack = [{ indent: -1, children: rootStack }];
    const warnings = [];

    for (let ln = 0; ln < lines.length; ln++) {
      const rawLine = lines[ln];
      const noIndent = rawLine.replace(/^[\t ]*/, '');
      if (!noIndent.trim() || noIndent.trim().startsWith('#')) continue;
      const indent = rawLine.match(/^[\t ]*/)[0].replace(/\t/g, '    ').length;
      const lineNo = ln + 1;

      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
      const parent = stack[stack.length - 1];

      const text = noIndent.trim();
      const m = text.match(/^(async\s+def|def|if|elif|else|while|for|try|except|finally|with|class)\b[\s\S]*?:\s*(#.*)?$/) || (text === 'else:' ? ['else:', 'else'] : null);

      if (m) {
        const kw = m[1];
        const stmt = { line: lineNo, indent, children: [], srcText: text };
        const inner = text.replace(/:#.*$/, '').replace(/:$/, '').trim();
        if (kw === 'else') stmt.type = 'else';
        else if (kw === 'elif') { stmt.type = 'if'; stmt.isElif = true; stmt.cond = inner.replace(/^elif\b/, '').trim(); }
        else if (kw === 'if') { stmt.type = 'if'; stmt.cond = inner.replace(/^if\b/, '').trim(); }
        else if (kw === 'while') { stmt.type = 'while'; stmt.cond = inner.replace(/^while\b/, '').trim(); }
        else if (kw === 'for') {
          const fm = inner.replace(/^for\b/, '').match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s+in\s+range\s*\((.*)\)\s*$/);
          if (fm) { stmt.type = 'for'; stmt.var = fm[1]; stmt.rangeArgs = fm[2].trim(); }
          else { stmt.type = 'for-unsupported'; warnings.push('ligne ' + lineNo + ' : boucle for non-range ignorée'); }
        }
        else if (kw === 'async def' || kw === 'def') {
          const dm = inner.replace(/^(async\s+)?def\b/, '').match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)\s*$/);
          if (dm) { stmt.type = 'def'; stmt.name = dm[1]; const a = dm[2].trim(); stmt.args = a ? a.split(',').map((x) => x.trim().split(/[:=]/)[0].trim()) : []; }
          else { stmt.type = 'unsupported'; warnings.push('ligne ' + lineNo + ' : définition illisible ignorée'); }
        }
        else { stmt.type = 'unsupported'; warnings.push('ligne ' + lineNo + ' : "' + kw + '" ignoré'); }
        parent.children.push(stmt);
        stack.push(stmt);
        continue;
      }

      if (/^(import|from)\b/.test(text) || /^runloop\.run\s*\(/.test(text)) {
        parent.children.push({ line: lineNo, type: 'noop', text });
        continue;
      }

      parent.children.push({ line: lineNo, type: 'stmt', text });
    }
    return { root: rootStack, warnings };
  }

  function groupChains(stmts, warnings) {
    const out = [];
    for (let i = 0; i < stmts.length; i++) {
      const s = stmts[i];
      if (s.type === 'if' && !s.isElif) {
        const chain = { type: 'ifchain', line: s.line, cond: s.cond, children: s.children, elifs: [], elseBody: null };
        let j = i + 1;
        while (j < stmts.length && ((stmts[j].type === 'if' && stmts[j].isElif) || stmts[j].type === 'else')) {
          if (stmts[j].type === 'else') chain.elseBody = stmts[j].children;
          else chain.elifs.push(stmts[j]);
          j++;
        }
        out.push(chain);
        i = j - 1;
        continue;
      }
      if (s.type === 'if' || s.type === 'else') { warnings.push('ligne ' + s.line + ' : elif/else orphelin ignoré'); continue; }
      if (s.type === 'noop') continue;
      out.push(s);
    }
    for (const s of out) {
      if (s.type === 'while' || s.type === 'for' || s.type === 'def' || s.type === 'ifchain') {
        if (s.children) s.children = groupChains(s.children, warnings);
        if (s.elifs) for (const e of s.elifs) e.children = groupChains(e.children, warnings);
        if (s.elseBody) s.elseBody = groupChains(s.elseBody, warnings);
      }
    }
    return out;
  }

  // ================================================================ générateur de blocs

  root.Py2Core = { tokenize, ExprParser, parseExprLine, parseProgram, groupChains,
    COLOR_NAMES, CATS, catOf, LABELS, ICONS, ICON_INDEX, CMP_FIELD, CMP_NEG,
    fmtNum, portLetter, colorValue };
})(typeof window !== 'undefined' ? window : globalThis);
