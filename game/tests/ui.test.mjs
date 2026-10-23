// Run after installing happy-dom@20.0.2 in game/.local/node_modules.
// This tests the actual app module without opening or controlling a browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Window } from '../.local/node_modules/happy-dom/lib/index.js';
import { STORAGE_KEY, questionsFor } from '../quiz-core.mjs';
const bank=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url)));
const window=new Window({url:'http://127.0.0.1:8765/game/'});
window.document.body.innerHTML='<div id="app"></div>';
window.katex=createRequire(import.meta.url)('../vendor/katex/dist/katex.min.js');
Object.assign(globalThis,{window,document:window.document,location:window.location,localStorage:window.localStorage});
globalThis.fetch=async()=>({ok:true,json:async()=>bank});
await import('../app.mjs');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function go(hash) { window.location.hash=hash; await tick(); }
function choose(id) { document.querySelector(`[data-option="${id}"]`).click(); }

assert.equal(document.querySelectorAll('.week-card').length,12);
assert.match(document.querySelector('h1').textContent,/Choose a week/);
await go('#/week/1/2026/q/1');
assert.equal(document.querySelectorAll('.question-chip').length,10);
assert.equal(document.querySelectorAll('.answer-option').length,4);
assert.equal(document.querySelector('.feedback'),null);
assert.equal(document.querySelector('.source-image'),null);
const first=questionsFor(bank,1)[0], wrong=first.options.find(o=>!first.correct.includes(o.id)).id;
choose(wrong);
assert.ok(document.querySelector('.feedback.wrong'));
assert.equal(document.querySelectorAll('.answer-option.wrong').length,1);
assert.equal(document.querySelectorAll('.answer-option.correct').length,1);
assert.match(document.querySelector('.feedback').textContent,/John McCarthy/);
assert.ok([...document.querySelectorAll('.answer-option')].every(node=>node.disabled));
const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)); assert.deepEqual(saved[first.id],[wrong]);
const source=document.querySelector('details'); source.open=true; source.dispatchEvent(new window.Event('toggle'));
assert.ok(document.querySelector('.source-image').src.includes('/game/source/'));

// Finish a set with one error; only that question should be retried.
for(let index=1;index<10;index++) {
  await go(`#/week/1/2026/q/${index+1}`); choose(questionsFor(bank,1)[index].correct[0]);
}
assert.match(document.querySelector('.finish').textContent,/9 correct/);
const retry=[...document.querySelectorAll('button')].find(b=>b.textContent==='Retry 1 missed'); retry.click(); await tick();
assert.equal(document.querySelectorAll('.question-chip').length,1);
assert.equal(document.querySelector('.feedback'),null);
choose(first.correct[0]); assert.ok(document.querySelector('.feedback.correct'));
await go('#/week/1/all/q/1'); assert.equal(document.querySelectorAll('.question-chip').length,60);
await go('#/week/2/2026/q/7'); assert.equal(document.querySelectorAll('.puzzle').length,2);
await go('#/week/3/2026/q/6'); assert.ok(document.querySelector('.context svg')||document.querySelector('.context img'));
await go('#/week/10/2026/q/6'); assert.equal(document.querySelectorAll('.context tbody tr').length,8);
await go('#/week/11/2024/q/8'); assert.match(document.querySelector('.question-kind').textContent,/Recap/);
const regression=bank.questions.find(q=>q.id==='w11-2024-q08');choose(regression.correct[0]);
assert.match(document.querySelector('.feedback').textContent,/not invariably cause overfitting/);

// Render and answer every bank entry through the actual option click handler.
let checked=0;
for(const q of bank.questions) {
  await go(`#/week/${q.week}/${q.year}/q/${q.number}`);
  const buttons=[...document.querySelectorAll('.answer-option')];
  assert.equal(buttons.length,4,q.id);
  if(!buttons[0].disabled) choose(q.correct[0]);
  assert.ok(document.querySelector('.feedback'),q.id);
  assert.equal(document.querySelectorAll('.katex-error').length,0,q.id);
  assert.ok(document.querySelector('.source-note'),q.id); checked++;
}
await go('#/week/99/2026/q/1');assert.equal(document.querySelectorAll('.week-card').length,12);
// Reload the actual module to verify persisted attempts, then test keyboard input.
await import('../app.mjs?reload-check');
await go('#/week/1/2026/q/1');assert.ok(document.querySelector('.feedback.correct'));
const restart=[...document.querySelectorAll('button')].find(b=>b.textContent==='Restart this set');restart.click();await tick();
assert.equal(document.querySelector('.feedback'),null);
window.dispatchEvent(new window.KeyboardEvent('keydown',{key:String('abcd'.indexOf(first.correct[0])+1)}));
assert.ok(document.querySelector('.feedback.correct'));
// The hosted version uses the existing public screenshot URLs rather than a local server.
window.location.href='https://practice.example/#/week/1/2026/q/1';await tick();
const hostedSource=document.querySelector('details');hostedSource.open=true;hostedSource.dispatchEvent(new window.Event('toggle'));
assert.ok(document.querySelector('.source-image').src.startsWith(bank.sourceImageBase));
console.log(JSON.stringify({renderedAndAnswered:checked,wrongFeedback:'passed',correctFeedback:'passed',setNavigation:'passed',retryMissed:'passed',allYears:'passed',savedProgress:'passed',sourceSpoilersHidden:'passed',offlineMath:'passed'}));
await window.happyDOM.close();
