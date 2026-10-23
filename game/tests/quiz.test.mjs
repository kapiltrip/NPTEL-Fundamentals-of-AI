import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { questionsFor, grade, questionForAttempt, wasCorrect, makeAttempt, validAnswers, readProgress,
  summarize, filterQuestions, parseRoute, routeFor, nextUnanswered, resetAnswers,
  shuffled, createFlashRound, readFlashRound, flashQuestions, parseFlashRoute, flashRoute } from '../quiz-core.mjs';
const bank = JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url)));
const katex = createRequire(import.meta.url)('../vendor/katex/dist/katex.min.js');

test('all 549 entries cover 53 full sets and 19 verified Found additions',()=>{
  assert.equal(bank.questions.length,549);assert.equal(bank.weeks.length,12);
  assert.equal(new Set(bank.questions.map(q=>q.id)).size,549);
  const main=bank.questions.filter(q=>!q.additional),sets=new Set(main.map(q=>`${q.week}-${q.year}`));
  assert.equal(main.length,530);assert.equal(sets.size,53);
  for(const key of sets){const [week,year]=key.split('-');assert.deepEqual(questionsFor(bank,week,year).map(q=>q.number),[1,2,3,4,5,6,7,8,9,10]);}
  assert.equal(bank.questions.filter(q=>q.mode==='original').length,164);
  assert.equal(bank.questions.filter(q=>q.type==='multiple').length,3);
  assert.equal(bank.questions.filter(q=>q.additional).length,19);
  assert.equal(questionsFor(bank,0,'2023').length,10);
  assert.deepEqual(questionsFor(bank,4,'2022').map(q=>q.number),[10]);
  assert.equal(questionsFor(bank,4,'all').length,41);
});

test('the generated coverage audit matches its current public source inputs',()=>{
  const audit=JSON.parse(readFileSync(new URL('../data/coverage.json',import.meta.url)));
  assert.equal(audit.total_questions,bank.questions.length);assert.equal(audit.additional_questions,bank.additionalQuestions);
  assert.equal(audit.source_mcqs,bank.sourceMCQs);assert.equal(audit.recap_questions,bank.recapQuestions);
  for(const [path,digest] of Object.entries(audit.inputs)){
    const raw=readFileSync(new URL('../../'+path,import.meta.url));
    const content=/\.(md|json|py)$/.test(path)?raw.toString('utf8').replace(/\r\n/g,'\n'):raw;
    assert.equal(createHash('sha256').update(content).digest('hex'),digest,path);
  }
  for(const q of bank.questions)for(const path of q.images){
    const file=new URL(path.startsWith('source/')?'../../resources/screenshots/'+path.slice(7):'../'+path,import.meta.url);
    assert.ok(readFileSync(file).length>0,path);
  }
});

test('all answers, distractors, and multi-select subsets grade correctly',()=>{
  for(const q of bank.questions){
    assert.equal(q.options.length,4,q.id);assert.equal(new Set(q.options.map(o=>o.id)).size,4,q.id);
    assert.equal(new Set(q.options.map(o=>o.text)).size,4,q.id);
    assert.ok(q.prompt.length>15&&q.explanation.length>25,q.id);assert.match(q.revision,/^[a-f0-9]{16}$/);
    assert.ok(q.source.startsWith('https://'));if(!q.additional)assert.ok(q.images.length);
    assert.ok(q.correct.every(id=>q.options.some(o=>o.id===id)),q.id);
    assert.equal(grade(q,q.correct),true,q.id);assert.equal(grade(q,[...q.correct].reverse()),true,q.id);
    for(const option of q.options)assert.equal(grade(q,[option.id]),q.correct.length===1&&q.correct.includes(option.id),q.id);
    assert.equal(grade(q,[]),false);assert.equal(grade(q,[...q.correct,...q.correct]),false);
    if(q.context)assert.ok(bank.contexts[q.context],q.id);
  }
});

test('all 530 earlier attempts migrate without losing or regrading an answer',()=>{
  const old={};
  for(const q of bank.questions.filter(q=>!q.additional))old[q.id]=[...(q.previous||q).correct];
  const progress=readProgress(bank,null,old);
  assert.equal(Object.keys(progress.answers).length,530);
  assert.deepEqual(summarize(bank.questions,progress.answers),{total:549,answered:530,correct:530,wrong:0});
  for(const q of bank.questions.filter(q=>q.previous)){
    assert.equal(questionForAttempt(q,progress.answers[q.id]).savedRecap,true,q.id);
    assert.equal(wasCorrect(q,progress.answers[q.id]),true,q.id);
    const wrong=(q.previous.options.find(o=>!q.previous.correct.includes(o.id))).id;
    const record=validAnswers(bank,{[q.id]:[wrong]})[q.id];assert.equal(wasCorrect(q,record),false,q.id);
    const retried=makeAttempt(q,q.correct,record);assert.equal(retried.firstCorrect,false);assert.equal(retried.count,2);assert.equal(wasCorrect(q,retried),true);
  }
});

test('invalid storage is rejected; resets, flags, review queues and resume survive round trips',()=>{
  const list=questionsFor(bank,1),q=list[0],wrong=q.options.find(o=>!q.correct.includes(o.id)).id;
  const answers=validAnswers(bank,{[q.id]:[wrong],[list[1].id]:list[1].correct,missing:['a'],[list[2].id]:['z'],[list[3].id]:['a','a']});
  assert.deepEqual(summarize(list,answers),{total:10,answered:2,correct:1,wrong:1});
  assert.equal(nextUnanswered(list,answers,0),2);assert.equal(summarize(questionsFor(bank,2),answers).answered,0);
  assert.equal(filterQuestions(list,answers,[],'missed')[0].id,q.id);
  assert.equal(filterQuestions(list,answers,[list[5].id],'saved')[0].id,list[5].id);
  assert.equal(filterQuestions(list,answers,[],'unanswered').length,8);
  const modern={version:2,answers,flagged:[q.id,'unknown',q.id],resume:routeFor(1,'2026',0,q.id),review:{scope:'1/2026',filter:'missed',ids:[q.id,'unknown'],pending:[q.id,'unknown']}};
  const restored=readProgress(bank,JSON.parse(JSON.stringify(modern)),{});
  assert.deepEqual(restored.flagged,[q.id]);assert.deepEqual(restored.review.pending,[q.id]);
  assert.deepEqual(restored.answers,answers);assert.ok(restored.resume.includes(q.id));
  const reset=readProgress(bank,{version:2,answers:resetAnswers(answers,list.map(q=>q.id))},answers);
  assert.equal(Object.keys(reset.answers).length,0,'old backup must not resurrect explicitly reset attempts');
  assert.deepEqual(validAnswers(bank,null),{});
  assert.equal(Object.keys(validAnswers(bank,{[q.id]:{selected:['a'],revision:'unknown'}})).length,0);
});

test('stable links resolve source identities; old numeric links retain their meaning',()=>{
  assert.equal(parseRoute('#/week/99/2026/q/1',bank),null);
  assert.equal(parseRoute('#/week/1/2001/q/1',bank),null);
  assert.equal(parseRoute('#/week/1/2026/q/999',bank).index,9);
  const source=questionsFor(bank,4,'all').find(q=>q.year===2019&&q.number===1);
  const old=parseRoute('#/week/4/all/q/31',bank);
  assert.equal(questionsFor(bank,4,'all')[old.index].id,source.id);
  const stable=parseRoute(routeFor(4,'all',0,source.id),bank);
  assert.equal(questionsFor(bank,4,'all')[stable.index].id,source.id);
  assert.equal(parseRoute('#/week/4/2026/question/w04-2022-q10',bank),null);
  assert.equal(parseRoute('#/week/0/all/q/1',bank).index,0,'an additions-only week also supports All years');
});

test('all current and retained explanations and choices typeset offline',()=>{
  let count=0;
  const versions=bank.questions.flatMap(q=>q.previous?[q,q.previous]:[q]);
  const texts=versions.flatMap(q=>[q.prompt,q.explanation,q.sourceAnswer,...q.options.map(o=>o.text)])
    .concat(Object.values(bank.contexts).map(c=>c.text||''));
  for(const text of texts){
    assert.equal((text.match(/\$/g)||[]).length%2,0,text);
    for(const match of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+)\$/g)){
      katex.renderToString(match[1]||match[2],{throwOnError:true,strict:'ignore',trust:false});count++;
    }
  }
  assert.ok(count>300,count);
});

test('problem inputs retain the independently checked arithmetic',()=>{
  const p=bank.contexts.puzzle.puzzle;
  assert.equal(p.start.filter((v,i)=>v&&v!==p.goal[i]).length,5);
  assert.equal(p.start.reduce((s,v,i)=>s+(v?Math.abs(Math.floor(i/3)-Math.floor(p.goal.indexOf(v)/3))+Math.abs(i%3-p.goal.indexOf(v)%3):0),0),6);
  assert.equal(.75*(2+.5*4)+.25*(0+.5*2),3.25);
  assert.equal(.5*1000+.5*600,800);
  assert.equal(bank.contexts.data2026.table.rows.filter(r=>r[3]==='Yes').length,4);
  assert.equal(bank.contexts.data2025.table.rows.filter(r=>r[4]==='Yes').length,6);
  assert.equal((4+13-1)/52,4/13);
  assert.equal(Math.round((.36+.47-.22)*100),61);
  assert.equal((114*86-48**2)/625,12);
  assert.equal((5/95)*(4/94),2/893);
});

test('flash rounds shuffle without replacement, preserve current-year priority and support every source',()=>{
  const original=[1,2,3,4], mixed=shuffled(original,()=>0);
  assert.deepEqual(original,[1,2,3,4]);assert.notDeepEqual(mixed,original);assert.deepEqual([...mixed].sort(),original);
  const round=createFlashRound(bank,'current',{},[],{},()=>.15), byId=new Map(bank.questions.map(q=>[q.id,q]));
  assert.equal(round.ids.length,549);assert.equal(new Set(round.ids).size,549);
  assert.ok(round.ids.slice(0,120).every(id=>byId.get(id).year===2026));assert.ok(round.ids.slice(120).every(id=>byId.get(id).year!==2026));
  assert.notDeepEqual(round.ids.slice(0,120),bank.questions.filter(q=>q.year===2026).map(q=>q.id));
  assert.equal(createFlashRound(bank,'2026').ids.length,120);
  const q=bank.questions[0],wrong=q.options.find(o=>!q.correct.includes(o.id)).id,answers={[q.id]:makeAttempt(q,[wrong])};
  assert.deepEqual(flashQuestions(bank,'missed',answers).map(q=>q.id),[q.id]);
  assert.deepEqual(createFlashRound(bank,'saved',answers,[q.id]).ids,[q.id]);
  assert.equal(createFlashRound(bank,'all').ids.length,549);
  assert.deepEqual(parseFlashRoute('',bank),{scope:null,id:null});assert.equal(parseFlashRoute('#/weeks',bank),null);
  assert.equal(parseFlashRoute(flashRoute('all',q.id),bank).id,q.id);
  assert.equal(parseFlashRoute('#/revise/2026/question/w00-2023-q01',bank),null);
  const snapshot=createFlashRound(bank,'missed',answers);snapshot.answers[q.id]=makeAttempt(q,q.correct);snapshot.last=q.id;snapshot.autoNext=false;
  assert.deepEqual(readFlashRound(bank,JSON.parse(JSON.stringify(snapshot))),snapshot,'a corrected question remains in the missed snapshot');
  const persisted=readProgress(bank,{version:2,answers,flash:snapshot},null);assert.deepEqual(persisted.flash,snapshot);
  const bad=readFlashRound(bank,{...round,ids:[round.ids[0],round.ids[0],'unknown'],index:999,answers:{[q.id]:answers[q.id]},delay:-1});
  assert.equal(bad.ids.length,1);assert.equal(bad.index,0);assert.equal(bad.delay,6);
  assert.equal(readFlashRound(bank,{scope:'unknown',ids:[]}),null);
  assert.equal(readFlashRound(bank,{scope:'current',ids:[]}),null);
});
