# ep_table_export

**HTML and DOCX export support for [ep_data_tables](https://www.npmjs.com/package/ep_data_tables).**

By default, `ep_data_tables` does not export tables to HTML or DOCX. This plugin adds proper `<table>` rendering in all Etherpad exports.

## Requirements

- `ep_data_tables` must be installed

## Installation

Via the Etherpad admin panel — search for `ep_table_export`.

Or from the command line:

```
pnpm run plugins i ep_table_export
```

## How it works

`ep_data_tables` stores each table row as a separate Etherpad line with a `tbljson` attribute containing table metadata (table ID, row index, column widths). Cells within a row are separated by the Unicode delimiter `␟`.

This plugin hooks into `getLineHTMLForExport`, detects table rows, and emits proper `<table><tbody><tr><td>` HTML. Column widths are preserved if set by the user.

## Credits

- Ivan Forkaliuk
