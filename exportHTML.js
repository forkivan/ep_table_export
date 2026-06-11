'use strict';
const Changeset = require('ep_etherpad-lite/static/js/Changeset');

let _activeTblId = null;
let _pendingBreaks = 0; // empty lines buffered (set to '') waiting to see what comes next

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
  const isEmpty = !context.text || !context.text.trim();

  if (!meta) {
    if (_activeTblId) {
      // Close open table; drop trailing empty line if this line is blank
      context.lineContent = isEmpty ? '</tbody></table>' : '</tbody></table>' + context.lineContent;
      _activeTblId = null;
      _pendingBreaks = 0;
    } else if (isEmpty) {
      // Buffer silently — we'll decide later whether to emit or discard
      context.lineContent = '';
      _pendingBreaks++;
    } else {
      // Real content: flush buffered empty lines before it
      if (_pendingBreaks > 0) {
        context.lineContent = '<br>'.repeat(_pendingBreaks) + context.lineContent;
      }
      _pendingBreaks = 0;
    }
    return;
  }

  // Table row: discard any buffered empty lines (they were blank lines before this table)
  _pendingBreaks = 0;

  const { tblId, columnWidths } = meta;
  const cells = (context.text || '').split('␟');

  // Skip empty table rows (placeholder rows with no content)
  if (cells.every((c) => !c.trim())) {
    if (tblId !== _activeTblId) {
      // Even if empty, we still need to open the table so subsequent rows attach to it
      _activeTblId = tblId;
      let colgroup = '';
      if (columnWidths && columnWidths.length) {
        colgroup = '<colgroup>' + columnWidths.map((w) => `<col style="width:${w}%">`).join('') + '</colgroup>';
      }
      context.lineContent = `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%">${colgroup}<tbody>`;
    } else {
      context.lineContent = '';
    }
    return;
  }

  const tds = cells.map((cell) => `<td>${_escapeHtml(cell)}</td>`).join('');
  const rowHtml = `<tr>${tds}</tr>`;

  if (tblId !== _activeTblId) {
    const closeTag = _activeTblId ? '</tbody></table>' : '';
    _activeTblId = tblId;

    let colgroup = '';
    if (columnWidths && columnWidths.length) {
      colgroup = '<colgroup>' + columnWidths.map((w) => `<col style="width:${w}%">`).join('') + '</colgroup>';
    }

    context.lineContent = `${closeTag}<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%">${colgroup}<tbody>${rowHtml}`;
  } else {
    context.lineContent = rowHtml;
  }
};

exports.stylesForExport = (hook, padId, cb) => {
  cb('table { border-collapse: collapse; width: 100%; margin: 8px 0; } td { border: 1px solid #ccc; padding: 4px 8px; vertical-align: top; }');
};
