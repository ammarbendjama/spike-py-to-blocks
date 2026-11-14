/*
 * blocksview.js — Rendu visuel des blocs (style Scratch) a partir de l'arbre logique
 * produit par Py2Blocks.convertProgram (result.stacks).
 */
(function (root) {
  'use strict';

  const LABELS = root.Py2Blocks ? root.Py2Blocks.LABELS : (typeof require !== 'undefined' ? require('./converter.js').LABELS : {});
  const CATS = root.Py2Blocks ? root.Py2Blocks.CATS : {};
  const catOf = root.Py2Blocks ? root.Py2Blocks.catOf : function () { return 'other'; };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function menuLabel(field, value) {
    if (field === 'PAIR') return value.replace('+', ' + ');
    if (/^[\w]+: -?\d+$/.test(value)) return value.split(':')[0];
    return value;
  }

  function renderInput(inp) {
    if (!inp) return '';
    switch (inp.k) {
      case 'num':
        return '<span class="fld">' + esc(inp.v) + '</span>';
      case 'text':
        return '<span class="fld">' + esc(inp.v) + '</span>';
      case 'var':
        return '<span class="fld">' + esc(inp.name) + '</span>';
      case 'bool':
      case 'rep': {
        const n = inp.node;
        const label = LABELS[n.op] || n.op;
        const cat = catOf(n.op);
        const inner = fillLabel(label, n);
        return '<span class="reporter-inline ' + (inp.k === 'bool' ? 'bool ' : '') + 'cat-' + cat + '">' + inner + '</span>';
      }
      case 'colorfield': {
        const colors = { '0': '#000', '1': '#d9d', '2': '#a0a', '3': '#00f', '4': '#0af', '5': '#0dd', '6': '#0a0', '7': '#ff0', '8': '#f80', '9': '#f00', '10': '#fff' };
        return '<span class="fld" style="background:' + (colors[inp.v] || '#ccc') + ';color:' + (inp.v === '10' || inp.v === '7' ? '#000' : '#fff') + '">●</span>';
      }
      case 'matrixfield': {
        const name = inp.v.split(':')[0];
        return '<span class="fld menu">' + esc(name) + '</span>';
      }
      case 'notefield':
        return '<span class="fld menu">♪ ' + esc(inp.v) + '</span>';
      case 'proto':
        return '';
      default:
        return '';
    }
  }

  function fillLabel(label, n) {
    return label.replace(/\{(\w+)\}/g, function (_, name) {
      if (n.fields[name] !== undefined) return '<span class="fld menu">' + esc(menuLabel(name, n.fields[name])) + '</span>';
      if (n.inputs[name]) return renderInput(n.inputs[name]);
      if (name === 'custom_block' && n.inputs.custom_block) return esc(n.inputs.custom_block.node.fields.NAME || '');
      if (name === 'NAME' && n.mutation) {
        const names = JSON.parse(n.mutation.argumentnames || '[]');
        return esc(n.fields.NAME || '') + '(' + names.map(function (x) { return '<span class="fld">' + esc(x) + '</span>'; }).join(', ') + ')';
      }
      return '';
    });
  }

  function renderBlock(n) {
    const cat = catOf(n.op);
    const label = LABELS[n.op] || n.op;
    const isHat = /^(flipperevents_when|event_when|procedures_definition)/.test(n.op);
    const isCap = n.op === 'flippercontrol_stop' || n.op === 'flippermove_stopMove' || n.op === 'flippermotor_motorStop';
    let html = '<div class="blk cat-' + cat + (isHat ? ' hat' : '') + (isCap ? ' cap' : '') + '">';
    html += '<span class="notch"></span>';
    if (n.op === 'procedures_definition') {
      html += 'définir <span class="fld">' + esc(n.inputs.custom_block.node.fields.NAME || '') + '</span>';
    } else {
      html += fillLabel(label, n);
    }
    html += '</div>';
    if (n.subs && n.subs.length) {
      html += '<div class="cbody cat-' + cat + '">' + n.subs.map(renderBlock).join('<div class="stack-sep"></div>') + '</div>';
      if (n.op === 'control_if_else') {
        html += '<div class="blk cat-' + cat + '"><span class="notch"></span>sinon</div>';
        html += '<div class="cbody cat-' + cat + '">' + (n.subs2.length ? n.subs2.map(renderBlock).join('<div class="stack-sep"></div>') : '') + '</div>';
      }
      html += '<div class="ctail cat-' + cat + '"></div>';
    }
    return html;
  }

  function render(stacks) {
    return stacks.map(function (stack) {
      return '<div class="stack">' + stack.map(renderBlock).join('<div class="stack-sep"></div>') + '</div>';
    }).join('');
  }

  const BlocksView = { render: render };
  if (typeof module !== 'undefined' && module.exports) module.exports = BlocksView;
  else root.BlocksView = BlocksView;
})(typeof window !== 'undefined' ? window : globalThis);
