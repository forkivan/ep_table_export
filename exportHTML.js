'use strict';
const Changeset = require('ep_etherpad-lite/static/js/Changeset');

// Module-level: track which table (tblId) is currently open across sequential line calls
let _activeTblId = null;
let _justClosedTable = false;

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

exports.getLineHTMLForExport = (hook, context) => {
  const meta = _getTbljson(context.attribLine, context.apool);

  if (!meta) {
    if (_activeTblId) {
      // Close open table, then skip this line if it's just an empty <br>
      context.lineContent = '</tbody></table>' + context.lineContent;
      _activeTblId = null;
      _justClosedTable = true;
    } else if (_justClosedTable && (context.lineContent === '<br>' || context.lineContent === '')) {
      // Skip empty lines right after a table
      context.lineContent = '';
    } else {
      _justClosedTable = false;
    }
    return;
  }

  const { tblId, columnWidths } = meta;
  const cells = (context.text || '').split('␟');
  const tds = cells.map((cell) => `<td>${_escapeHtml(cell)}</td>`).join('');
  const rowHtml = `<tr>${tds}</tr>`;

  if (tblId !== _activeTblId) {
    // Close previous table if any, open new one
    const closeTag = _activeTblId ? '</tbody></table>' : '';
    _activeTblId = tblId;
    _justClosedTable = false;

    let colgroup = '';
    if (columnWidths && columnWidths.length) {
      colgroup = '<colgroup>' + columnWidths.map((w) => `<col style="width:${w}%">`).join('') + '</colgroup>';
    }

    context.lineContent = `${closeTag}<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%">${colgroup}<tbody>${rowHtml}`;
  } else {
    // Continuation row of same table
    context.lineContent = rowHtml;
  }
};

exports.stylesForExport = (hook, padId, cb) => {
  cb('table { border-collapse: collapse; width: 100%; margin: 8px 0; } td { border: 1px solid #ccc; padding: 4px 8px; vertical-align: top; }');
};
