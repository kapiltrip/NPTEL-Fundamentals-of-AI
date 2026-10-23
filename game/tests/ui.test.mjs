// Exercises the actual app module without opening or controlling a browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Window } from '../.local/node_modules/happy-dom/lib/index.js';
import { STORAGE_KEY, PROGRESS_KEY, questionsFor, wasCorrect, createFlashRound, makeAttempt } from '../quiz-core.mjs';
const bank=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url)));
const katex=createRequire(import.meta.url)('../vendor/katex/dist/katex.min.js');
let serial=0;
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function setup({legacy=null,modern=null,hash='#/weeks',host='http://127.0.0.1:8765',blocked=false,width=1024,styles=false}={}){
  const window=new Window({url:host+'/game/'+hash,width,height:844});window.document.body.innerHTML='<div id="app"></div>';window.katex=katex;
  if(styles){const style=window.document.createElement('style');style.textContent=readFileSync(new URL('../styles.css',import.meta.url),'utf8');window.document.head.append(style);}
  if(legacy)window.localStorage.setItem(STORAGE_KEY,JSON.stringify(legacy));
  if(modern)window.localStorage.setItem(PROGRESS_KEY,JSON.stringify(modern));
  const storage=blocked?{getItem:()=>null,setItem:()=>{throw new Error('Storage denied');}}:window.localStorage;
  Object.assign(globalThis,{window,document:window.document,location:window.location,history:window.history,localStorage:storage});
  globalThis.fetch=async()=>({ok:true,json:async()=>bank});
  await import(`../app.mjs?test=${serial++}`);return window;
}
async function go(hash){window.location.hash=hash;await tick();}
function findButton(text){return [...document.querySelectorAll('button')].find(b=>b.textContent===text);}
function choose(id){document.querySelector(`[data-option="${id}"]`).click();}
function saved(){return JSON.parse(localStorage.getItem(PROGRESS_KEY));}
function answer(q){for(const id of q.correct)choose(id);if(q.type==='multiple')document.querySelector('.check-answer').click();}

let w=await setup();
assert.equal(document.querySelectorAll('.week-card').length,13);
assert.match(document.querySelector('.intro').textContent,/549/);
await go('#/week/1/2026/q/1');
assert.equal(document.querySelectorAll('.question-chip').length,10);assert.equal(document.querySelectorAll('.answer-option').length,4);
assert.equal(document.querySelector('.feedback'),null);assert.equal(document.querySelector('.source-image'),null);
const first=questionsFor(bank,1)[0],wrong=first.options.find(o=>!first.correct.includes(o.id)).id;
choose(wrong);assert.ok(document.querySelector('.feedback.wrong'));
assert.equal(document.querySelectorAll('.answer-option.wrong').length,1);assert.equal(document.querySelectorAll('.answer-option.correct').length,1);
assert.match(document.querySelector('.feedback').textContent,/John McCarthy/);assert.ok([...document.querySelectorAll('.answer-option')].every(b=>b.disabled));
assert.deepEqual(saved().answers[first.id].selected,[wrong]);
const source=document.querySelector('.source-screenshots');source.open=true;source.dispatchEvent(new w.Event('toggle'));
const screenshot=document.querySelector('.source-image');assert.ok(screenshot.src.includes('/game/source/'));
screenshot.dispatchEvent(new w.Event('error'));assert.equal(screenshot.hidden,true);assert.ok(document.querySelector('.image-fallback'));
source.open=false;source.open=true;source.dispatchEvent(new w.Event('toggle'));assert.equal(document.querySelectorAll('.source-image').length,first.images.length);

// Missed questions can be retried before finishing the set, without deleting scores.
await go('#/week/1/2026/q/2');answer(questionsFor(bank,1)[1]);
document.querySelector('[data-filter="missed"]').click();await tick();
assert.equal(document.querySelectorAll('.question-chip').length,1);assert.equal(document.querySelector('.feedback'),null);
assert.deepEqual(saved().answers[first.id].selected,[wrong]);assert.equal(saved().review.pending.length,1);
answer(first);assert.ok(document.querySelector('.feedback.correct'));assert.match(document.querySelector('.question-position').textContent,/Question 1/);
assert.equal(saved().answers[first.id].count,2);assert.equal(saved().answers[first.id].firstCorrect,false);
assert.equal(document.querySelectorAll('.question-chip').length,1,'round must not disappear when an answer becomes correct');
document.querySelector('.save-question').click();assert.ok(saved().flagged.includes(first.id));
document.querySelector('[data-filter="saved"]').click();await tick();assert.equal(document.querySelectorAll('.question-chip').length,1);
document.querySelector('.save-question').click();assert.equal(saved().flagged.length,0);
assert.ok(document.querySelector('.question-card'),'unsaving must not remove the question while reading');
document.querySelector('[data-filter="saved"]').click();assert.ok(document.querySelector('.empty-review'));
findButton('Show all questions').click();await tick();
document.querySelector('[data-filter="unanswered"]').click();await tick();
assert.equal(document.querySelectorAll('.question-chip').length,8);answer(questionsFor(bank,1)[2]);
assert.match(document.querySelector('.question-position').textContent,/Question 3/);assert.equal(document.querySelectorAll('.question-chip').length,8);
findButton('Restart this set').click();await tick();assert.equal(Object.keys(saved().answers).length,0);
findButton('Undo').click();assert.equal(Object.keys(saved().answers).length,3);
const persisted=saved();await w.happyDOM.close();
w=await setup({modern:persisted});assert.ok(document.querySelector('.resume-link'));assert.equal(Object.keys(saved().answers).length,3);
await go('#/week/2/2026/q/7');assert.equal(document.querySelectorAll('.puzzle').length,2);
await go('#/week/3/2026/q/6');document.querySelector('.expand-diagram').click();assert.ok(document.querySelector('dialog[open]'));
findButton('Close ×').click();await tick();assert.equal(document.querySelector('dialog'),null);
await go('#/week/10/2026/q/6');assert.equal(document.querySelectorAll('.context tbody tr').length,8);
await go('#/week/0/all/q/1');assert.equal(document.querySelectorAll('.question-chip').length,10);
await go('#/week/4/2022/q/1');assert.match(document.querySelector('.question-position').textContent,/Question 10.*Additional/);
answer(questionsFor(bank,4,'2022')[0]);assert.ok(document.querySelector('.feedback.correct'));
const additionSource=document.querySelector('.source-screenshots');additionSource.open=true;additionSource.dispatchEvent(new w.Event('toggle'));
assert.match(additionSource.textContent,/No screenshot was saved/);await w.happyDOM.close();

// Upgraded wording never regrades a saved recap. Trying the original is explicit.
const upgraded=bank.questions.find(q=>q.id==='w01-2025-q10');
w=await setup({legacy:{[upgraded.id]:upgraded.previous.correct},hash:'#/week/1/2025/q/10'});
assert.match(document.querySelector('.question-kind').textContent,/Saved recap/);assert.ok(document.querySelector('.feedback.correct'));
assert.equal(wasCorrect(upgraded,saved().answers[upgraded.id]),true);
findButton('Try original wording').click();assert.equal(document.querySelector('.feedback'),null);
assert.equal(document.querySelectorAll('[role="checkbox"]').length,4);assert.equal(wasCorrect(upgraded,saved().answers[upgraded.id]),true);
choose('a');document.querySelector('.check-answer').click();assert.ok(document.querySelector('.feedback.wrong'));
assert.match(document.querySelector('.selection-detail').textContent,/Missing: C/);
findButton('Retry this question').click();answer(upgraded);assert.ok(document.querySelector('.feedback.correct'));
assert.equal(saved().answers[upgraded.id].firstCorrect,true);assert.equal(saved().answers[upgraded.id].count,3);await w.happyDOM.close();

// Render and answer every current entry using the real option/check handlers.
w=await setup();let checked=0;
for(const q of bank.questions){
  await go(`#/week/${q.week}/${q.year}/question/${q.id}`);
  assert.equal(document.querySelectorAll('.answer-option').length,4,q.id);
  if(!document.querySelector('.answer-option').disabled)answer(q);
  assert.ok(document.querySelector('.feedback.correct'),q.id);assert.equal(document.querySelectorAll('.katex-error').length,0,q.id);
  assert.ok(document.querySelector('.source-note'),q.id);checked++;
}
assert.equal(Object.keys(saved().answers).length,549);await w.happyDOM.close();
w=await setup({host:'https://practice.example',hash:'#/week/1/2026/q/1'});answer(first);
const hosted=document.querySelector('.source-screenshots');hosted.open=true;hosted.dispatchEvent(new w.Event('toggle'));
assert.ok(document.querySelector('.source-image').src.startsWith(bank.sourceImageBase));
window.dispatchEvent(new w.KeyboardEvent('keydown',{key:'n'}));await tick();assert.match(document.querySelector('.question-position').textContent,/Question 2/);
window.dispatchEvent(new w.KeyboardEvent('keydown',{key:'s'}));assert.equal(saved().flagged.length,1);await w.happyDOM.close();
w=await setup({blocked:true});assert.match(document.querySelector('.local-note').textContent,/Storage unavailable/);
await go('#/week/1/2026/q/1');answer(first);assert.ok(document.querySelector('.feedback.correct'));await w.happyDOM.close();
console.log(JSON.stringify({renderedAndAnswered:checked,immediateFeedback:'passed',multiSelect:'passed',legacyProgressMigration:'passed',retryPreservesScores:'passed',stableReviewRounds:'passed',savedQuestions:'passed',resume:'passed',resetUndo:'passed',sourceFallback:'passed',imageZoom:'passed',keyboard:'passed',blockedStorage:'passed',math:'passed'}));

// Flash mode is the default entry point, without a week-selection screen.
w=await setup({hash:''});
assert.equal(document.querySelector('.sidebar'),null);assert.equal(document.querySelector('.week-grid'),null);
assert.equal(document.querySelectorAll('.answer-option').length,4);assert.equal(saved().flash.ids.length,549);
assert.ok(saved().flash.ids.slice(0,120).every(id=>bank.questions.find(q=>q.id===id).year===2026));
const flashId=()=>document.querySelector('.flash-current .question-card').dataset.question;
const initial=flashId(),current=bank.questions.find(q=>q.id===initial),badChoice=current.options.find(o=>!current.correct.includes(o.id)).id;
const realSet=w.setTimeout.bind(w),realClear=w.clearTimeout.bind(w),timers=new Map();let timerId=10000;
w.setTimeout=(fn,delay,...args)=>{if([3000,6000,12000].includes(delay)){const id=timerId++;timers.set(id,{fn,delay});return id;}return realSet(fn,delay,...args);};
w.clearTimeout=id=>{timers.delete(id);realClear(id);};
choose(badChoice);assert.ok(document.querySelector('.flash-current .feedback.wrong'));
assert.equal(timers.size,1);assert.equal([...timers.values()][0].delay,6000);
assert.match(document.querySelector('.auto-status').textContent,/Next question in 6s/);
assert.equal(saved().flash.answers[initial].count,1);choose(badChoice);assert.equal(saved().flash.answers[initial].count,1);
[...timers.values()][0].fn();assert.notEqual(flashId(),initial);assert.equal(timers.size,0);
assert.equal(document.querySelector('.flash-current .feedback'),null);assert.ok(document.querySelector('.last-answer .feedback.wrong'));
assert.ok(document.querySelector('.last-answer .correct-answer'));assert.match(document.querySelector('.last-answer').textContent,/LAST ANSWER/);
const secondId=flashId(),second=bank.questions.find(q=>q.id===secondId);answer(second);
assert.ok(document.querySelector('.flash-current .feedback.correct'));assert.equal(timers.size,1);
findButton('Pause & read').click();assert.equal(timers.size,0);assert.equal(saved().flash.autoNext,false);
assert.match(document.querySelector('.auto-status').textContent,/Paused/);
findButton('Resume auto next').click();assert.equal(timers.size,1);
const notes=document.querySelector('.flash-current .source-note');notes.open=true;notes.dispatchEvent(new w.Event('toggle'));
assert.equal(timers.size,0,'opening worked notes pauses automatic movement');assert.equal(saved().flash.autoNext,false);
findButton('Resume auto next').click();assert.equal(timers.size,1);
await go('#/weeks');assert.equal(timers.size,0,'leaving flash mode cancels its timer');assert.equal(document.querySelectorAll('.week-card').length,13);
await go('#/revise/current');assert.equal(flashId(),secondId);assert.equal(saved().flash.autoNext,true);
document.querySelector('.auto-toggle').click();const flashSaved=saved();await w.happyDOM.close();
w=await setup({hash:'',modern:flashSaved});assert.equal(flashId(),secondId);assert.equal(saved().flash.autoNext,false);
assert.equal(saved().answers[initial].firstCorrect,false);assert.equal(Object.keys(saved().flash.answers).length,2);
const beforeShuffle=Object.keys(saved().answers).length;
findButton('Start a new shuffle').click();assert.equal(Object.keys(saved().answers).length,beforeShuffle);assert.equal(Object.keys(saved().flash.answers).length,0);
const pool=document.querySelector('.flash-scope');pool.value='all';pool.dispatchEvent(new w.Event('change'));await tick();
assert.equal(saved().flash.scope,'all');assert.equal(new Set(saved().flash.ids).size,549);await w.happyDOM.close();

// Skips return at the end; completed answers do not repeat in the forward feed.
const pair=questionsFor(bank,1).slice(0,2),round=createFlashRound(bank,'all',{},[],{autoNext:false});round.ids=pair.map(q=>q.id);
w=await setup({hash:'#/revise/all',modern:{version:2,answers:{},flash:round}});
findButton('Skip for now →').click();assert.equal(flashId(),pair[1].id);answer(pair[1]);findButton('Next question →').click();
assert.equal(flashId(),pair[0].id);answer(pair[0]);findButton('Next question →').click();
assert.ok(document.querySelector('.flash-complete'));assert.match(document.querySelector('.flash-complete').textContent,/2 correct out of 2/);
assert.equal(saved().flash.complete,true);await w.happyDOM.close();

// Multiple-select and retained old wording also work in the flash presentation.
const multi=bank.questions.find(q=>q.id==='w11-2023-q02'),multiRound=createFlashRound(bank,'all',{},[],{autoNext:false});multiRound.ids=[multi.id];
w=await setup({hash:'#/revise/all',modern:{version:2,answers:{},flash:multiRound}});
choose('b');assert.equal(document.querySelector('.flash-current .feedback'),null);document.querySelector('.check-answer').click();
assert.ok(document.querySelector('.flash-current .feedback.wrong'));assert.match(document.querySelector('.selection-detail').textContent,/C, D/);
findButton('Next question →').click();assert.ok(document.querySelector('.flash-retry-missed'));findButton('Retry 1 missed').click();await tick();
assert.equal(document.querySelector('.flash-current .feedback'),null);answer(multi);assert.ok(document.querySelector('.flash-current .feedback.correct'));
assert.equal(saved().answers[multi.id].count,2);assert.equal(saved().answers[multi.id].firstCorrect,false);await w.happyDOM.close();
const retained=createFlashRound(bank,'all',{},[],{autoNext:false});retained.ids=[upgraded.id];retained.answers[upgraded.id]=makeAttempt(upgraded.previous,upgraded.previous.correct);
w=await setup({hash:'#/revise/all',modern:{version:2,answers:retained.answers,flash:retained}});
assert.match(document.querySelector('.question-kind').textContent,/Saved recap/);assert.ok(document.querySelector('.flash-current .feedback.correct'));
assert.equal(document.querySelectorAll('[role="checkbox"]').length,0);await w.happyDOM.close();
console.log(JSON.stringify({defaultFlash:'passed',randomPool:'passed',autoAdvance:'passed',noDuplicateSubmission:'passed',pause:'passed',sourceReadingPause:'passed',navigationCancelsTimers:'passed',resumeFlash:'passed',shufflePreservesScores:'passed',skippedQuestionsReturn:'passed',noForwardRepeats:'passed',flashMultiSelect:'passed',flashRecapMigration:'passed'}));

// Bypass works from a shareable mobile URL, with answers shown before any click.
const existingAnswers={[first.id]:makeAttempt(first,[wrong])};
w=await setup({hash:'#/cards/all',modern:{version:2,answers:existingAnswers}});
assert.equal(saved().flash.bypass,true);assert.equal(saved().flash.delay,3);assert.equal(saved().flash.ids.length,549);
assert.equal(document.querySelector('.bypass-toggle').getAttribute('aria-pressed'),'true');
assert.ok(document.querySelector('.bypass-answer'));assert.match(document.querySelector('.bypass-answer h3').textContent,/Answer to remember/);
assert.equal(document.querySelector('.bypass-options').open,false);assert.equal(document.querySelector('.flash-settings').open,false);
assert.equal(document.querySelector('.flash-current .check-answer'),null);assert.equal(Object.keys(saved().flash.answers).length,0);
assert.deepEqual(saved().answers,existingAnswers);assert.equal(saved().flash.seen.length,1);
assert.ok(document.querySelector('.mobile-auto-toggle'));assert.deepEqual([...document.querySelector('.flash-speed').options].map(o=>o.value),['1','2','3','6','12']);
// Capture the real app's next-card timer without waiting or controlling a browser.
const bypassSet=w.setTimeout.bind(w),bypassClear=w.clearTimeout.bind(w),cardTimers=new Map();let cardTimerId=20000;
w.setTimeout=(fn,delay,...args)=>{if([1000,2000,3000,6000,12000].includes(delay)){const id=cardTimerId++;cardTimers.set(id,{fn,delay});return id;}return bypassSet(fn,delay,...args);};
w.clearTimeout=id=>{cardTimers.delete(id);bypassClear(id);};
document.querySelector('.auto-toggle').click();document.querySelector('.auto-toggle').click();
assert.equal(cardTimers.size,1);assert.equal([...cardTimers.values()][0].delay,3000);
const shownFirst=flashId();[...cardTimers.values()][0].fn();assert.notEqual(flashId(),shownFirst);
assert.ok(document.querySelector('.bypass-answer'));assert.equal(cardTimers.size,1);assert.equal(saved().flash.seen.length,2);
assert.deepEqual(saved().answers,existingAnswers);assert.equal(Object.keys(saved().flash.answers).length,0);
const speed=document.querySelector('.flash-speed');speed.value='1';speed.dispatchEvent(new w.Event('change'));
assert.equal([...cardTimers.values()][0].delay,1000);assert.match(document.querySelector('.auto-status').textContent,/Next card in 1s/);
document.querySelector('.mobile-auto-toggle').click();assert.equal(cardTimers.size,0);assert.equal(saved().flash.autoNext,false);
const savedCards=saved(),savedCardId=flashId();await w.happyDOM.close();
w=await setup({hash:'#/cards/all',modern:savedCards});assert.equal(flashId(),savedCardId);assert.equal(saved().flash.autoNext,false);assert.equal(saved().flash.delay,1);
document.querySelector('.bypass-toggle').click();await tick();assert.equal(saved().flash.bypass,false);
assert.equal(document.querySelector('.flash-current .feedback'),null);assert.equal(document.querySelector('.bypass-options'),null);assert.deepEqual(saved().answers,existingAnswers);
document.querySelector('.bypass-toggle').click();await tick();assert.equal(saved().flash.bypass,true);assert.ok(document.querySelector('.bypass-answer'));assert.deepEqual(saved().answers,existingAnswers);
document.querySelector('.auto-toggle').click();await w.happyDOM.close();

// Every card is reached exactly once, including multi-select and image questions.
const deck=createFlashRound(bank,'all',existingAnswers,[],{bypass:true,autoNext:false});
w=await setup({hash:'#/cards/all',modern:{version:2,answers:existingAnswers,flash:deck}});
const shown=new Set();
for(let i=0;i<bank.questions.length;i++){
  const id=flashId(),q=bank.questions.find(item=>item.id===id);assert.ok(!shown.has(id),id);shown.add(id);
  const feedback=document.querySelector('.flash-current .bypass-answer');assert.ok(feedback,id);
  for(const option of q.options.filter(o=>q.correct.includes(o.id)))assert.ok(feedback.textContent.includes(option.id.toUpperCase()+'. '),id);
  assert.equal(document.querySelectorAll('.katex-error').length,0,id);
  assert.equal(Object.keys(saved().flash.answers).length,0,id);
  assert.deepEqual(saved().answers,existingAnswers,id);
  findButton('Next card →').click();
}
assert.equal(shown.size,549);assert.equal(saved().flash.seen.length,549);assert.equal(saved().flash.complete,true);
assert.match(document.querySelector('.flash-complete').textContent,/All 549 answer cards shown/);assert.deepEqual(saved().answers,existingAnswers);
await w.happyDOM.close();
console.log(JSON.stringify({bypassCardsShown:shown.size,answerRevealedImmediately:'passed',bypassAutomaticNext:'passed',fastOneSecondMode:'passed',mobilePauseControl:'passed',bypassResume:'passed',switchQuizAndBypass:'passed',scoresUnchanged:'passed',completeDeckWithoutRepeats:'passed'}));

// Check the responsive CSS in small phone viewports without opening a browser.
const phoneDeck=createFlashRound(bank,'all',{},[],{bypass:true,autoNext:false});phoneDeck.ids=[multi.id];
for(const width of [320,360,390,430]){
  w=await setup({hash:'#/cards/all',modern:{version:2,answers:{},flash:phoneDeck},width,styles:true});
  assert.equal(window.innerWidth,width);assert.equal(window.getComputedStyle(document.querySelector('.flash-controls')).position,'fixed');
  assert.equal(window.getComputedStyle(document.querySelector('.mobile-auto-toggle')).display,'block');
  assert.equal(window.getComputedStyle(document.querySelector('.flash-tools .auto-toggle')).display,'none');
  assert.equal(window.getComputedStyle(document.querySelector('.bypass-toggle')).minHeight,'44px');
  assert.equal(window.getComputedStyle(document.querySelector('.bypass-answer .correct-answer')).fontSize,'17px');
  assert.equal(window.getComputedStyle(document.querySelector('.question-prompt')).fontSize,'20px');
  assert.equal(document.querySelector('.bypass-options').open,false);await w.happyDOM.close();
}
assert.match(readFileSync(new URL('../index.html',import.meta.url),'utf8'),/name="viewport" content="width=device-width, initial-scale=1"/);
console.log(JSON.stringify({responsiveCSSWidths:[320,360,390,430],fixedMobileControls:'passed',readableAnswerSize:'passed',viewportMeta:'passed',visualBrowserCheck:'not performed'}));
