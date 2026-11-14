/*
 * zip.js — ZIP (méthode "stored") + MD5 en JS pur, sans dépendance.
 * Sert à fabriquer les fichiers .llsp3 (manifest.json + scratch.sb3 + icon.svg)
 * directement dans le navigateur.
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- CRC32
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // ---------------------------------------------------------------- MD5
  function md5(bytes) {
    function toHex(n) {
      let s = '';
      for (let i = 0; i < 4; i++) s += ((n >> (i * 8)) & 0xFF).toString(16).padStart(2, '0');
      return s;
    }
    function add(a, b) { return (a + b) & 0xFFFFFFFF; }
    function rol(n, c) { return ((n << c) | (n >>> (32 - c))) & 0xFFFFFFFF; }
    function cmn(q, a, b, x, s, t) { return add(rol(add(add(a, q), add(x, t)), s), b); }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }

    const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
      4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
      6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
    const K = new Int32Array(64);
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);

    const len = bytes.length;
    const withPad = new Uint8Array((((len + 8) >> 6) + 1) * 64);
    withPad.set(bytes);
    withPad[len] = 0x80;
    const bitLen = len * 8;
    const dv = new DataView(withPad.buffer);
    dv.setUint32(withPad.length - 8, bitLen >>> 0, true);
    dv.setUint32(withPad.length - 4, Math.floor(bitLen / 4294967296), true);

    let a0 = 0x67452301, b0 = 0xEFCDAB89, c0 = 0x98BADCFE, d0 = 0x10325476;
    const M = new Int32Array(16);
    for (let off = 0; off < withPad.length; off += 64) {
      for (let i = 0; i < 16; i++) M[i] = dv.getInt32(off + i * 4, true);
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let res;
        if (i < 16) res = ff(A, B, C, D, M[i], S[i], K[i]);
        else if (i < 32) res = gg(A, D, B, C, M[(5 * i + 1) % 16], S[i], K[i]);
        else if (i < 48) res = hh(A, C, D, B, M[(3 * i + 5) % 16], S[i], K[i]);
        else res = ii(A, D, C, B, M[(7 * i) % 16], S[i], K[i]);
        A = D; D = C; C = B; B = res;
      }
      a0 = add(a0, A); b0 = add(b0, B); c0 = add(c0, C); d0 = add(d0, D);
    }
    return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
  }

  // ---------------------------------------------------------------- ZIP
  function makeZip(files) {
    // files: [{ name, data(Uint8Array) }] — méthode "stored" (pas de compression)
    const enc = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;

    const u16 = (v) => new Uint8Array([v & 0xFF, (v >> 8) & 0xFF]);
    const u32 = (v) => new Uint8Array([v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >>> 24) & 0xFF]);

    for (const f of files) {
      const nameBytes = enc.encode(f.name);
      const data = f.data;
      const crc = crc32(data);

      const local = new Uint8Array(30 + nameBytes.length);
      local.set(u32(0x04034b50), 0);
      local.set(u16(20), 4);          // version
      local.set(u16(0x0800), 6);      // UTF-8 flag
      local.set(u16(0), 8);           // stored
      local.set(u16(0), 10);          // time
      local.set(u16(0x2100), 12);     // date (2000-01-01-ish)
      local.set(u32(crc), 14);
      local.set(u32(data.length), 18);
      local.set(u32(data.length), 22);
      local.set(u16(nameBytes.length), 26);
      local.set(u16(0), 28);
      local.set(nameBytes, 30);
      chunks.push(local, data);

      const cen = new Uint8Array(46 + nameBytes.length);
      cen.set(u32(0x02014b50), 0);
      cen.set(u16(20), 4);
      cen.set(u16(20), 6);
      cen.set(u16(0x0800), 8);
      cen.set(u16(0), 10);
      cen.set(u16(0), 12);
      cen.set(u16(0x2100), 14);
      cen.set(u32(crc), 16);
      cen.set(u32(data.length), 20);
      cen.set(u32(data.length), 24);
      cen.set(u16(nameBytes.length), 28);
      cen.set(u16(0), 30); // extra
      cen.set(u16(0), 32); // comment
      cen.set(u16(0), 34); // disk
      cen.set(u16(0), 36); // int attrs
      cen.set(u32(0), 38); // ext attrs
      cen.set(u32(offset), 42);
      cen.set(nameBytes, 46);
      central.push(cen);

      offset += local.length + data.length;
    }

    const centralSize = central.reduce((s, c) => s + c.length, 0);
    const eocd = new Uint8Array(22);
    eocd.set(u32(0x06054b50), 0);
    eocd.set(u16(0), 4);
    eocd.set(u16(0), 6);
    eocd.set(u16(files.length), 8);
    eocd.set(u16(files.length), 10);
    eocd.set(u32(centralSize), 12);
    eocd.set(u32(offset), 16);
    eocd.set(u16(0), 20);

    const all = [...chunks, ...central, eocd];
    const total = all.reduce((s, c) => s + c.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const c of all) { out.set(c, pos); pos += c.length; }
    return out;
  }

  function buildLlsp3(projectJson, svgString, programName) {
    const enc = new TextEncoder();
    const svgBytes = enc.encode(svgString);
    const hash = md5(svgBytes);
    const assetName = hash + '.svg';

    const sb3Project = {
      targets: [{
        isStage: true,
        name: 'Stage',
        variables: {},
        lists: {},
        broadcasts: {},
        blocks: {},
        comments: {},
        currentCostume: 0,
        costumes: [{
          name: 'backdrop1',
          bitmapResolution: 1,
          dataFormat: 'svg',
          assetId: hash,
          md5ext: assetName,
          rotationCenterX: 240,
          rotationCenterY: 180
        }],
        sounds: [],
        volume: 100,
        layerOrder: 0,
        tempo: 60,
        videoTransparency: 50,
        videoState: 'on',
        textToSpeechLanguage: null
      }],
      monitors: [],
      extensions: [],
      meta: { semver: '3.0.0', vm: '0.2.0', agent: 'Py2Blocks SPIKE converter' }
    };
    // fusionne les variables / blocs générés dans la cible
    const gen = typeof projectJson === 'string' ? JSON.parse(projectJson) : projectJson;
    const target = sb3Project.targets[0];
    Object.assign(target.variables, gen.variables || {});
    Object.assign(target.lists, gen.lists || {});
    Object.assign(target.broadcasts, gen.broadcasts || {});
    Object.assign(target.blocks, gen.blocks || {});

    const sb3Json = enc.encode(JSON.stringify(sb3Project));
    const sb3Zip = makeZip([
      { name: 'project.json', data: sb3Json },
      { name: assetName, data: svgBytes }
    ]);

    const manifest = {
      type: 'word-blocks',
      platformVersion: '3.2.3',
      program: {
        name: programName || 'Projet Py2Blocks',
        description: 'Converti depuis Python par Py2Blocks',
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };

    return makeZip([
      { name: 'manifest.json', data: enc.encode(JSON.stringify(manifest, null, 2)) },
      { name: 'scratch.sb3', data: sb3Zip }
    ]);
  }

  const Py2Zip = { crc32, md5, makeZip, buildLlsp3 };
  if (typeof module !== 'undefined' && module.exports) module.exports = Py2Zip;
  else root.Py2Zip = Py2Zip;
})(typeof window !== 'undefined' ? window : globalThis);
