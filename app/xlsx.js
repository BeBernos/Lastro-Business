// v9.9.11 — Excel de verdade (.xlsx) sem biblioteca: uma linha por lançamento, uma coluna por informação, valor como
// número (soma e filtra no Excel/Planilhas) e data como data. O CSV com ";" abria tudo numa coluna só no celular.
// gerarXlsx([{ nome, colunas: [{ titulo, tipo: 'texto'|'valor'|'data'|'numero', largura? }], linhas: [[...]], total? }])
// → Uint8Array. `total` (texto da 1ª coluna) acrescenta uma linha com SOMA de cada coluna de valor.
// Cabeçalho em negrito, congelado e com filtro. O zip vai sem compressão (o formato aceita; o arquivo é pequeno).

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const letra = i => { let s = ''; for (i += 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
const serialData = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? (Date.UTC(+m[1], m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000 : null; };
const ESTILO = { cab: 1, valor: 2, data: 3, totalValor: 4, totalTexto: 1, numero: 5 };

function celula(ref, v, tipo, total = false) {
  if (v == null || v === '') return '';
  if ((tipo === 'valor' || tipo === 'numero') && Number.isFinite(v)) return `<c r="${ref}" s="${total ? ESTILO.totalValor : ESTILO[tipo]}"><v>${Math.round(v * 100) / 100}</v></c>`;
  if (tipo === 'data' && serialData(v) != null) return `<c r="${ref}" s="${ESTILO.data}"><v>${serialData(v)}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${total ? ` s="${ESTILO.totalTexto}"` : ''}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
}

function planilha({ colunas, linhas, total }) {
  const n = linhas.length, ult = letra(colunas.length - 1);
  const cab = `<row r="1">${colunas.map((c, i) => `<c r="${letra(i)}1" t="inlineStr" s="${ESTILO.cab}"><is><t>${esc(c.titulo)}</t></is></c>`).join('')}</row>`;
  const corpo = linhas.map((l, r) => `<row r="${r + 2}">${colunas.map((c, i) => celula(`${letra(i)}${r + 2}`, l[i], c.tipo)).join('')}</row>`).join('');
  const rt = n + 2;
  const soma = total ? `<row r="${rt}">${colunas.map((c, i) => {
    const ref = `${letra(i)}${rt}`;
    if (i === 0) return celula(ref, total, 'texto', true);
    if (c.tipo !== 'valor') return '';
    const v = linhas.reduce((s, l) => s + (Number.isFinite(l[i]) ? l[i] : 0), 0);
    return `<c r="${ref}" s="${ESTILO.totalValor}"><f>SUM(${letra(i)}2:${letra(i)}${n + 1})</f><v>${Math.round(v * 100) / 100}</v></c>`;
  }).join('')}</row>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${colunas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.largura || (c.tipo === 'texto' ? 28 : 14)}" customWidth="1"/>`).join('')}</cols>
<sheetData>${cab}${corpo}${soma}</sheetData><autoFilter ref="A1:${ult}${n + 1}"/></worksheet>`;
}

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;R$&quot; #,##0.00;[Red]-&quot;R$&quot; #,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/><xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export function gerarXlsx(abas) {
  const nomes = abas.map((a, i) => (String(a.nome || `Aba ${i + 1}`).replace(/[[\]:*?/\\]/g, ' ').slice(0, 31)));
  const arquivos = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nomes.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': ESTILOS,
  };
  abas.forEach((a, i) => { arquivos[`xl/worksheets/sheet${i + 1}.xml`] = planilha(a); });
  return zip(arquivos);
}

// zip sem compressão (método 0): cabeçalho local + dados de cada arquivo, diretório central e o fim
const TABELA = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = b => { let c = 0xffffffff; for (const x of b) c = TABELA[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(arquivos) {
  const enc = new TextEncoder(), partes = [], central = [];
  let pos = 0;
  for (const [nome, texto] of Object.entries(arquivos)) {
    const n = enc.encode(nome), d = enc.encode(texto), crc = crc32(d);
    const cab = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [14, crc, 4], [18, d.length, 4], [22, d.length, 4], [26, n.length, 2]].forEach(([o, v, t]) => (t === 4 ? cab.setUint32(o, v, true) : cab.setUint16(o, v, true)));
    const cen = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [16, crc, 4], [20, d.length, 4], [24, d.length, 4], [28, n.length, 2], [42, pos, 4]].forEach(([o, v, t]) => (t === 4 ? cen.setUint32(o, v, true) : cen.setUint16(o, v, true)));
    partes.push(new Uint8Array(cab.buffer), n, d);
    central.push(new Uint8Array(cen.buffer), n);
    pos += 30 + n.length + d.length;
  }
  const tamCentral = central.reduce((s, b) => s + b.length, 0), qtd = Object.keys(arquivos).length;
  const fim = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [8, qtd, 2], [10, qtd, 2], [12, tamCentral, 4], [16, pos, 4]].forEach(([o, v, t]) => (t === 4 ? fim.setUint32(o, v, true) : fim.setUint16(o, v, true)));
  const tudo = [...partes, ...central, new Uint8Array(fim.buffer)];
  const out = new Uint8Array(tudo.reduce((s, b) => s + b.length, 0));
  let o = 0;
  for (const b of tudo) { out.set(b, o); o += b.length; }
  return out;
}

export const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
