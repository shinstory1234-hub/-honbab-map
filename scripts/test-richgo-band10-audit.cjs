/* Backward-compatible test runner: validated current-rank 300 apartment audit. */
const {execFileSync}=require('node:child_process');
const path=require('node:path');
execFileSync(process.execPath,[path.join(__dirname,'test-richgo-band10-audit.mjs')],{cwd:path.resolve(__dirname,'..'),stdio:'inherit'});
