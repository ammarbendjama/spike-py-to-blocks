/*
 * app.js — Interface : editeur, conversion, apercu, telechargement .llsp3.
 */
(function () {
  'use strict';

  const editor = document.getElementById('editor');
  const lineNumbers = document.getElementById('line-numbers');
  const examplesSel = document.getElementById('examples');
  const btnConvert = document.getElementById('btn-convert');
  const btnDownload = document.getElementById('btn-download');
  const btnCopyJson = document.getElementById('btn-copyjson');
  const blocksArea = document.getElementById('blocks-area');
  const warningsEl = document.getElementById('warnings');
  const blockCountEl = document.getElementById('block-count');
  const toast = document.getElementById('toast');

  let lastResult = null;

  // ---- exemples
  Object.keys(window.Examples).forEach(function (key) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = window.Examples[key].name;
    examplesSel.appendChild(opt);
  });
  examplesSel.addEventListener('change', function () {
    if (examplesSel.value && window.Examples[examplesSel.value]) {
      editor.value = window.Examples[examplesSel.value].code;
      updateLineNumbers();
      convert();
    }
  });

  // ---- editeur
  function updateLineNumbers() {
    const lines = editor.value.split('\n').length;
    let s = '';
    for (let i = 1; i <= lines; i++) s += i + '\n';
    lineNumbers.textContent = s;
  }
  editor.addEventListener('input', updateLineNumbers);
  editor.addEventListener('scroll', function () {
    lineNumbers.scrollTop = editor.scrollTop;
  });
  editor.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart, end = editor.selectionEnd;
      editor.value = editor.value.slice(0, start) + '    ' + editor.value.slice(end);
      editor.selectionStart = editor.selectionEnd = start + 4;
      updateLineNumbers();
    }
  });

  // ---- conversion
  function convert() {
    warningsEl.innerHTML = '';
    try {
      const res = window.Py2Blocks.convertProgram(editor.value);
      lastResult = res;
      if (!res.stacks.length || res.blockCount === 0) {
        blocksArea.innerHTML = '<div class="placeholder"><p>Aucun bloc genere.<br><span class="sub">Le code doit contenir <code>async def main():</code> avec des instructions, ou des instructions au niveau racine.</span></p>';
        blockCountEl.textContent = '';
        btnDownload.disabled = true;
        btnCopyJson.disabled = true;
        return;
      }
      blocksArea.innerHTML = window.BlocksView.render(res.stacks);
      blockCountEl.textContent = res.blockCount + ' bloc' + (res.blockCount > 1 ? 's' : '') + ' genere' + (res.blockCount > 1 ? 's' : '');
      btnDownload.disabled = false;
      btnCopyJson.disabled = false;
      showWarnings(res.warnings);
    } catch (e) {
      blocksArea.innerHTML = '<div class="placeholder"><p style="color:#ff6b6b">Erreur de conversion : ' + e.message + '</p></div>';
      btnDownload.disabled = true;
      btnCopyJson.disabled = true;
    }
  }

  function showWarnings(warnings) {
    warningsEl.innerHTML = warnings.map(function (w) {
      return '<div class="w">⚠️ ' + w + '</div>';
    }).join('');
  }

  // ---- telechargement .llsp3
  function download() {
    if (!lastResult) return;
    try {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360">' +
        '<rect width="480" height="360" fill="#f6c50f"/>' +
        '<rect x="150" y="120" width="180" height="120" rx="16" fill="#0090f5"/>' +
        '<circle cx="210" cy="180" r="28" fill="#fff"/>' +
        '<circle cx="270" cy="180" r="28" fill="#fff"/>' +
        '</svg>';
      const bytes = window.Py2Zip.buildLlsp3(lastResult, svg, 'Projet Py2Blocks');
      const blob = new Blob([bytes], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'projet_py2blocks.llsp3';
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Fichier .llsp3 téléchargé — importez-le dans SPIKE (projet Blocs)');
    } catch (e) {
      showToast('Erreur : ' + e.message, true);
    }
  }

  function copyJson() {
    if (!lastResult) return;
    const full = {
      targets: [{
        isStage: true, name: 'Stage',
        variables: lastResult.variables, lists: lastResult.lists,
        broadcasts: {}, blocks: lastResult.blocks, comments: {},
        currentCostume: 0,
        costumes: [{ name: 'backdrop1', bitmapResolution: 1, dataFormat: 'svg', assetId: 'x', md5ext: 'x.svg', rotationCenterX: 240, rotationCenterY: 180 }],
        sounds: [], volume: 100, layerOrder: 0, tempo: 60,
        videoTransparency: 50, videoState: 'on', textToSpeechLanguage: null
      }],
      monitors: [], extensions: [],
      meta: { semver: '3.0.0', vm: '0.2.0', agent: 'Py2Blocks' }
    };
    navigator.clipboard.writeText(JSON.stringify(full, null, 2)).then(function () {
      showToast('project.json copié dans le presse-papiers');
    }, function () {
      showToast('Copie impossible', true);
    });
  }

  let toastTimer = null;
  function showToast(msg, isErr) {
    toast.textContent = msg;
    toast.className = 'show' + (isErr ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.className = ''; }, 3200);
  }

  btnConvert.addEventListener('click', convert);
  btnDownload.addEventListener('click', download);
  btnCopyJson.addEventListener('click', copyJson);
  editor.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') convert();
  });

  // ---- init : exemple par defaut
  editor.value = window.Examples['bonjour'].code;
  updateLineNumbers();
  convert();
})();
