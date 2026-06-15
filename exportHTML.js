'use strict';
const Changeset = require('ep_etherpad-lite/static/js/Changeset');

// Etherpad appends a <br> after every line's content during export. For table
// rows that <br> lands between </tr> and <tr> inside the <table>, which is
// invalid HTML — the browser "foster parents" it OUT, in front of the table,
// producing a big empty gap between the heading and the table.
//
// Fix: end every table line with an open HTML comment "<!--" and start the next
// table line (or the table-closing line) with "-->". The <br> that Etherpad
// inserts between them is swallowed inside "<!--<br>-->": invisible, valid
// anywhere, never foster-parented. The visible rows stay clean <tr><td>..</td></tr>.

let _activeTblId = null;
let _commentOpen = false;

function _getTbljson(attribLine, apool) {
  if (!attribLine) return null;
  const opIter = Changeset.opIterator(attribLine);
  while (opIter.hasNext()) {
    const op = opIter.next();
    const val = Changeset.opAttributeValue(op, 'tbljson', apool);
    if (val) {
      try { return JSON.parse(val); } catch (e) { return null; }
    }
  }
  return null;
}

function _escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _tableOpen(columnWidths) {
  let colgroup = '';
  if (columnWidths && columnWidths.length) {
    colgroup = '<colgroup>' + columnWidths.map((w) => `<col style="width:${w}%">`).join('') + '</colgroup>';
  }
  return `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%">${colgroup}<tbody>`;
}

exports.getLineHTMLForExport = (hook, context) => {
  const meta = _getTbljson(context.attribLine, context.apool);

  // Non-table line: close the table if one is open, then behave normally.
  if (!meta) {
    if (_activeTblId) {
      const prefix = _commentOpen ? '-->' : '';
      const isEmpty = !context.text || !context.text.trim();
      const original = isEmpty ? '' : (context.lineContent || '');
      context.lineContent = `${prefix}</tbody></table>${original}`;
      _activeTblId = null;
      _commentOpen = false;
    }
    return;
  }

  const { tblId, columnWidths } = meta;
  const cells = (context.text || '').split('␟');
  const isEmptyRow = cells.every((c) => !c.trim());

  const prefix = _commentOpen ? '-->' : '';
  let visible = '';

  if (tblId !== _activeTblId) {
    // Close a previous table if one table is immediately followed by another.
    if (_activeTblId) visible += '</tbody></table>';
    visible += _tableOpen(columnWidths);
    _activeTblId = tblId;
  }

  // Empty placeholder rows (e.g. " ␟ ␟ ") contribute nothing visible, but we
  // still emit the comment wrapper so their stray <br> is swallowed too.
  if (!isEmptyRow) {
    const tds = cells.map((cell) => `<td>${_escapeHtml(cell)}</td>`).join('');
    visible += `<tr>${tds}</tr>`;
  }

  context.lineContent = `${prefix}${visible}<!--`;
  _commentOpen = true;
};

exports.stylesForExport = (hook, padId, cb) => {
  cb('table { border-collapse: collapse; width: 100%; margin: 8px 0; } td { border: 1px solid #ccc; padding: 4px 8px; vertical-align: top; }');
};
