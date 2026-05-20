#!/usr/bin/env node
// Fails if any argument CSS file has unbalanced { } braces.
// Mismatched braces in source CSS can survive Vite's per-style dev injection
// but corrupt the production minify-bundle, silently dropping :root variables.
// See feedback_css_orphan_brace.md.
import { readFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (files.length === 0) process.exit(0);

let bad = 0;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let inComment = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (inComment) {
      if (c === '*' && next === '/') {
        inComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === stringChar) inString = false;
      continue;
    }
    if (c === '/' && next === '*') {
      inComment = true;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      inString = true;
      stringChar = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
  }
  if (depth !== 0) {
    console.error(`${f}: unbalanced braces (depth ${depth > 0 ? '+' : ''}${depth})`);
    bad++;
  }
}
process.exit(bad === 0 ? 0 : 1);
