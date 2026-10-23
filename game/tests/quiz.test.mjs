import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { questionsFor, grade, validAnswers, summarize, parseRoute, routeFor, nextUnanswered, resetAnswers } from '../quiz-core.mjs';
const bank = JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url)));
const katex = createRequire(import.meta.url)('../vendor/katex/dist/katex.min.js');

test('all 530 source questions are reachable once in 53 complete sets', () => {
  assert.equal(bank.questions.length,530); assert.equal(bank.weeks.length,12);
  assert.equal(new Set(bank.questions.map(q=>q.id)).size,530);
  const sets = new Set();
  for (const week of bank.weeks) {
    const all = questionsFor(bank,week.number,'all');
    for (const year of new Set(all.map(q=>q.year))) {
      const list = questionsFor(bank,week.number,String(year));
      assert.deepEqual(list.map(q=>q.number),[1,2,3,4,5,6,7,8,9,10]); sets.add(`${week.number}-${year}`);
    }
    assert.equal(questionsFor(bank,week.number).length,10);
  }
  assert.equal(sets.size,53);
  assert.equal(bank.questions.filter(q=>q.mode==='original').length,120);
});

test('every correct answer and every distractor is graded without double counting', () => {
  for (const q of bank.questions) {
    assert.equal(q.options.length,4,q.id); assert.equal(new Set(q.options.map(o=>o.text)).size,4,q.id);
    assert.ok(q.prompt.length>15,q.id); assert.ok(q.explanation.length>25,q.id);
    assert.ok(q.images.length>0,q.id); assert.ok(q.source.startsWith('https://'),q.id);
    assert.equal(grade(q,q.correct),true,q.id);
    for (const option of q.options) assert.equal(grade(q,[option.id]),q.correct.length===1&&q.correct.includes(option.id),q.id);
    assert.equal(grade(q,[]),false); assert.equal(grade(q,[...q.correct,...q.correct]),false);
    if(q.context) assert.ok(bank.contexts[q.context],q.id);
  }
});

test('progress, retry, invalid stored data, navigation, and set isolation', () => {
  const list=questionsFor(bank,1), q=list[0], wrong=q.options.find(o=>!q.correct.includes(o.id)).id;
  const answers=validAnswers(bank,{[q.id]:[wrong],[list[1].id]:list[1].correct,missing:['a'],[list[2].id]:['z'],[list[3].id]:['a','a']});
  assert.deepEqual(summarize(list,answers),{total:10,answered:2,correct:1,wrong:1});
  assert.equal(nextUnanswered(list,answers,0),2);
  assert.equal(summarize(questionsFor(bank,2),answers).answered,0);
  assert.equal(summarize(list,resetAnswers(answers,[q.id])).wrong,0);
  assert.equal(parseRoute('#/week/99/2026/q/1',bank),null);
  assert.equal(parseRoute('#/week/1/2001/q/1',bank),null);
  assert.equal(parseRoute('#/week/1/2026/q/999',bank).index,9);
  assert.equal(parseRoute(routeFor(1,'all',25),bank).index,25);
  assert.deepEqual(validAnswers(bank,null),{});
});

test('math in prompts, answers, explanations, and contexts is renderable offline', () => {
  let count=0;
  const texts=bank.questions.flatMap(q=>[q.prompt,q.explanation,q.sourceAnswer,...q.options.map(o=>o.text)])
    .concat(Object.values(bank.contexts).map(c=>c.text||''));
  for(const text of texts) {
    assert.equal((text.match(/\$/g)||[]).length%2,0,text);
    for(const match of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+)\$/g)) {
      katex.renderToString(match[1]||match[2],{throwOnError:true,strict:'ignore',trust:false}); count++;
    }
  }
  assert.ok(count>300,count);
});

test('shared problem inputs retain the verified arithmetic', () => {
  const puzzle=bank.contexts.puzzle.puzzle;
  assert.equal(puzzle.start.filter((v,i)=>v&&v!==puzzle.goal[i]).length,5);
  assert.equal(puzzle.start.reduce((sum,v,i)=>sum+(v?Math.abs(Math.floor(i/3)-Math.floor(puzzle.goal.indexOf(v)/3))+Math.abs(i%3-puzzle.goal.indexOf(v)%3):0),0),6);
  assert.equal(.75*(2+.5*4)+.25*(0+.5*2),3.25);
  assert.equal(.5*1000+.5*600,800);
  assert.equal(bank.contexts.data2026.table.rows.filter(r=>r[3]==='Yes').length,4);
  assert.equal(bank.contexts.data2025.table.rows.filter(r=>r[4]==='Yes').length,6);
});
