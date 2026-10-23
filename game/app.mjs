import { STORAGE_KEY, PROGRESS_KEY, questionsFor, grade, questionForAttempt, wasCorrect, makeAttempt,
  readProgress, summarize, filterQuestions, parseRoute, routeFor, nextUnanswered, resetAnswers,
  createFlashRound, parseFlashRoute, flashRoute, FLASH_DELAYS } from './quiz-core.mjs?v=4';

const root = document.getElementById('app');
let bank, progress, draft = [], storageAvailable = true, notice = null;
let advanceTimer = null, countdownTimer = null;

function stopAutoNext() {
  if (advanceTimer !== null) window.clearTimeout(advanceTimer);
  if (countdownTimer !== null) window.clearInterval(countdownTimer);
  advanceTimer = countdownTimer = null;
}

function pauseForReading() {
  if (!parseFlashRoute(location.hash, bank) || !progress.flash) return;
  stopAutoNext(); progress.flash.autoNext = false; save();
  for (const toggle of document.querySelectorAll('.auto-toggle, .mobile-auto-toggle')) {
    toggle.textContent = toggle.classList.contains('mobile-auto-toggle') ? 'Resume' : 'Resume auto next'; toggle.setAttribute('aria-pressed', 'false');
  }
  const status = document.querySelector('.auto-status');
  if (status) status.textContent = 'Paused — take your time. Next when you’re ready.';
}

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function rich(text = '') {
  const node = el('span', 'rich');
  for (const token of text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\[[^\]]+\]\(https?:\/\/[^)]+\))/g)) {
    if (token.startsWith('$') && token.endsWith('$')) {
      const display = token.startsWith('$$'), span = el('span', display ? 'display-math' : 'inline-math');
      if (window.katex) window.katex.render(token.slice(display ? 2 : 1, display ? -2 : -1), span,
        { throwOnError: false, trust: false, displayMode: display, output: 'htmlAndMathml' });
      else span.textContent = token.replace(/^\$+|\$+$/g, '');
      node.append(span);
    } else {
      const link = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/.exec(token);
      if (link) { const a = el('a', '', link[1]); a.href = link[2]; a.target = '_blank'; a.rel = 'noopener noreferrer'; node.append(a); }
      else node.append(document.createTextNode(token.replace(/\*\*/g, '')));
    }
  }
  return node;
}

function button(text, className, action) {
  const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node;
}

function save() {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); }
  catch { storageAvailable = false; }
}

function changeHash(hash, options = {}) {
  draft = [];
  if (location.hash === hash) render(options);
  else location.hash = hash;
}

function navigate(week, year = '2026', index = 0) {
  progress.review = null;
  changeHash(routeFor(week, year, index), { focusQuestion: true });
}

function ensureView(route) {
  const base = questionsFor(bank, route.week, route.year), scope = `${route.week}/${route.year}`;
  if (!progress.review || progress.review.scope !== scope) progress.review = { scope, filter: 'all', ids: base.map(q => q.id), pending: [] };
  if (progress.review.filter === 'all') progress.review.ids = base.map(q => q.id);
  const ids = new Set(progress.review.ids);
  return { base, list: base.filter(q => ids.has(q.id)), view: progress.review };
}

function goQuestion(route, base, id) {
  changeHash(routeFor(route.week, route.year, base.findIndex(q => q.id === id), id), { focusQuestion: true });
}

function setFilter(route, filter) {
  const base = questionsFor(bank, route.week, route.year);
  const list = filterQuestions(base, progress.answers, progress.flagged, filter);
  progress.review = { scope: `${route.week}/${route.year}`, filter, ids: list.map(q => q.id), pending: filter === 'missed' ? list.map(q => q.id) : [] };
  save();
  if (list.length) goQuestion(route, base, list[0].id);
  else render();
}

function submit(q, selected) {
  progress.answers[q.id] = makeAttempt(q, selected, progress.answers[q.id]);
  progress.review.pending = progress.review.pending.filter(id => id !== q.id);
  draft = []; save(); render({ focusFeedback: true });
}

function zoomFigure(node, title, opener) {
  pauseForReading();
  const dialog = el('dialog', 'figure-zoom'); dialog.setAttribute('aria-label', title); dialog.setAttribute('aria-modal', 'true');
  const bar = el('div', 'zoom-toolbar'); bar.append(el('h2', '', title));
  bar.append(button('Close ×', 'secondary', () => { if (dialog.close) dialog.close(); else dialog.remove(); }));
  dialog.append(bar, node.cloneNode(true));
  dialog.addEventListener('close', () => { dialog.remove(); opener?.focus(); });
  document.body.append(dialog);
  if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
}

function addZoom(box, node, title = 'Question diagram') {
  const opener = button('Expand diagram', 'text-button expand-diagram', () => zoomFigure(node, title, opener));
  box.append(opener); return opener;
}

function contextView(context) {
  const box = el('section', 'context'); box.setAttribute('aria-label', 'Question information');
  if (context.title) box.append(el('h3', '', context.title));
  if (context.caption) box.append(el('p', 'context-caption', context.caption));
  if (context.text && !context.collapsibleText) box.append(rich(context.text));
  if (context.table) {
    const wrap = el('div', 'table-wrap'), table = el('table'), head = el('thead'), hr = el('tr');
    for (const label of context.table.headers) { const th = el('th', '', label); th.scope = 'col'; hr.append(th); }
    head.append(hr); table.append(head);
    const body = el('tbody');
    for (const row of context.table.rows) { const tr = el('tr'); for (const value of row) tr.append(el('td', '', String(value))); body.append(tr); }
    table.append(body); wrap.append(table); box.append(wrap);
  }
  if (context.puzzle) {
    const grids = el('div', 'puzzles');
    for (const [label, values] of [['Start', context.puzzle.start], ['Goal', context.puzzle.goal]]) {
      const group = el('div'); group.append(el('p', 'grid-label', label));
      const grid = el('div', 'puzzle'); grid.setAttribute('role', 'img'); grid.setAttribute('aria-label', `${label}: ${values.map(v => v || 'blank').join(', ')}`);
      for (const value of values) grid.append(el('span', value ? '' : 'blank', value ? String(value) : ''));
      group.append(grid); grids.append(group);
    }
    box.append(grids);
  }
  if (context.tree) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 900 290'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Root A MAX; B and C MIN. B has MAX children D and E; C has MAX children F and G. D leaves 8,5,6; E leaves 4,10,7; F leaves 9,3,2; G leaves 6,1,5. Evaluate left to right.');
    const point = (x, y, label, parent) => {
      if (parent) { const line = document.createElementNS(svg.namespaceURI, 'line'); for (const [k, v] of Object.entries({ x1:parent[0], y1:parent[1]+15, x2:x, y2:y-15 })) line.setAttribute(k, String(v)); svg.append(line); }
      const text = document.createElementNS(svg.namespaceURI, 'text'); text.setAttribute('x', x); text.setAttribute('y', y+5); text.setAttribute('text-anchor', 'middle'); text.textContent = label; svg.append(text);
    };
    point(450,25,'A · MAX'); point(230,100,'B · MIN',[450,25]); point(670,100,'C · MIN',[450,25]);
    for (const [x,name,values,parent] of [[120,'D',[8,5,6],[230,100]],[340,'E',[4,10,7],[230,100]],[560,'F',[9,3,2],[670,100]],[780,'G',[6,1,5],[670,100]]]) {
      point(x,180,`${name} · MAX`,parent); values.forEach((v,i) => point(x+(i-1)*55,265,String(v),[x,180]));
    }
    box.append(svg); addZoom(box, svg, 'Minimax and alpha-beta tree');
  }
  if (context.image) {
    const image = el('img', 'context-image'); image.src = context.image; image.alt = context.imageAlt;
    box.append(image); addZoom(box, image, context.title || 'Question diagram');
  }
  if (context.collapsibleText && context.text) {
    const description = el('details', 'diagram-description'); description.append(el('summary', '', 'Text description and assumptions'), rich(context.text)); box.append(description);
  }
  return box;
}

function renderSidebar(route) {
  const side = el('aside', 'sidebar'), brand = el('a', 'brand', 'AI Practice'); brand.href = '#'; side.append(brand);
  side.append(el('p', 'brand-sub', 'Fundamentals of AI'));
  const flash = el('a', 'flash-link', '↻ Random flash revision'); flash.href = '#/revise/current'; side.append(flash);
  const nav = el('nav', 'week-nav'); nav.setAttribute('aria-label', 'Weeks');
  for (const week of [...bank.weeks, ...(bank.extraWeeks || [])]) {
    const list = questionsFor(bank, week.number, 'all'), s = summarize(list, progress.answers);
    const defaultYear = String(list[0].year);
    const link = el('a', `week-link ${route?.week === week.number ? 'active' : ''}`); link.href = routeFor(week.number, defaultYear);
    link.addEventListener('click', event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey) { event.preventDefault(); navigate(week.number, defaultYear); } });
    if (route?.week === week.number) link.setAttribute('aria-current', 'page');
    link.append(el('span', 'week-number', String(week.number).padStart(2,'0')));
    const label = el('span', 'week-label'); label.append(el('span', '', week.shortTitle), el('small', '', `${s.answered}/${s.total} practised`));
    link.append(label); nav.append(link);
  }
  side.append(nav, el('p', 'local-note', storageAvailable ? 'Progress saved in this browser.' : 'Storage unavailable. Progress stays in this tab.'));
  return side;
}

function renderHome(main) {
  const s = summarize(bank.questions, progress.answers);
  main.append(el('p', 'eyebrow', 'YOUR REVISION DESK'), el('h1', '', 'Choose a week'));
  main.append(el('p', 'intro', `${bank.questions.length} questions across ${bank.assignmentSets} full assignment sets, plus ${bank.additionalQuestions} verified additions. Immediate answers, with the reason behind each one.`));
  const flash = el('a', 'resume-link', '↻ Jump into random flash revision'); flash.href = '#/revise/current'; main.append(flash);
  if (progress.resume) {
    const route = parseRoute(progress.resume, bank), q = questionsFor(bank, route.week, route.year)[route.index];
    const resume = el('a', 'resume-link', `Continue Week ${String(q.week).padStart(2,'0')} · ${q.year} · Q${q.number} →`); resume.href = progress.resume;
    resume.addEventListener('click',()=>{if(progress.review&&!progress.review.ids.length)progress.review=null;}); main.append(resume);
  }
  if (s.answered || progress.flagged.length) main.append(el('p', 'overall-summary', `${s.answered}/${s.total} answered · ${s.correct} correct · ${s.wrong} missed · ${progress.flagged.length} saved for review`));
  const grid = el('div', 'week-grid');
  for (const week of [...bank.weeks, ...(bank.extraWeeks || [])]) {
    const list = questionsFor(bank, week.number, 'all'), total = summarize(list, progress.answers);
    const defaultYear = String(list[0].year);
    const card = el('a', 'week-card'); card.href = routeFor(week.number, defaultYear);
    card.addEventListener('click', event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey) { event.preventDefault(); navigate(week.number, defaultYear); } });
    card.append(el('span', 'eyebrow', `WEEK ${String(week.number).padStart(2,'0')}`), el('h2', '', week.title));
    card.append(el('p', 'muted', `${list.length} questions · ${[...new Set(list.map(q=>q.year))].join(', ')}`));
    card.append(el('span', 'card-progress', total.answered ? `${total.correct} correct · ${total.answered} answered` : `Start with ${defaultYear} →`)); grid.append(card);
  }
  main.append(grid, el('p', 'collection-note', `${bank.sourceMCQs} MCQs use source wording and choices, including all 120 from 2026. ${bank.recapQuestions} use labelled recap wording and practice choices. Public source selections are distinguished from official keys; corrections and source pages are available after answering.`));
}

function screenshotURL(path) {
  if (!path.startsWith('source/')) return path;
  return ['127.0.0.1','localhost','[::1]'].includes(location.hostname) ? path : bank.sourceImageBase + path.slice('source/'.length);
}

function studyURL(path) {
  const [file, hash] = path.split('#');
  return 'https://github.com/kapiltrip/NPTEL-Fundamentals-of-AI/blob/main/' + file.split('/').map(encodeURIComponent).join('/') + (hash ? '#'+hash : '');
}

function sourceNotes(q) {
  const drawer = el('details', 'source-note'); drawer.append(el('summary', '', 'Source wording and answer notes'));
  drawer.append(rich(`Source recap: ${q.sourceQuestion}\nSource answer notes: ${q.sourceAnswer}`));
  const link = el('a', 'study-link', 'Read the full worked study page');
  link.href = studyURL(q.studyPage || `Week ${String(q.week).padStart(2,'0')}.md#${q.year}-q${q.number}`); link.target = '_blank'; link.rel = 'noopener noreferrer'; drawer.append(link);
  return drawer;
}

function sourceScreenshots(q) {
  const drawer = el('details', 'source-note source-screenshots');
  drawer.append(el('summary', '', q.images.length ? 'View original screenshots' : 'Open the transcribed source'));
  let loaded = false;
  drawer.addEventListener('toggle', () => {
    if (!drawer.open || loaded) return; loaded = true;
    if (!q.images.length) drawer.append(el('p', 'muted', 'No screenshot was saved for this addition. The linked source and worked notes contain the question.'));
    for (const path of q.images) {
      const img = el('img', 'source-image'); img.src = screenshotURL(path); img.alt = `Week ${q.week}, ${q.year}, source containing Q${q.number}`; img.loading = 'lazy';
      drawer.append(img); const zoom=addZoom(drawer, img, `Week ${q.week} · ${q.year} source screenshot`);
      img.addEventListener('error', () => {
        img.hidden = true; zoom.hidden = true;
        const fallback = el('a', 'image-fallback', 'Screenshot could not load here. Open the image directly.'); fallback.href = screenshotURL(path); fallback.target = '_blank'; fallback.rel = 'noopener noreferrer'; drawer.append(fallback);
      }, { once: true });
    }
    const source = el('a', 'study-link', 'Open original source'); source.href = q.source; source.target = '_blank'; source.rel = 'noopener noreferrer'; drawer.append(source);
  });
  return drawer;
}

function renderPractice(main, route) {
  const week = [...bank.weeks, ...(bank.extraWeeks || [])].find(w=>w.number===route.week), { base, list, view } = ensureView(route);
  const overall = summarize(base, progress.answers);
  main.append(el('p', 'eyebrow', `WEEK ${String(route.week).padStart(2,'0')}`), el('h1', '', week.title));
  const years = el('nav', 'year-tabs'); years.setAttribute('aria-label', 'Question year');
  for (const year of [...new Set(questionsFor(bank,route.week,'all').map(q=>String(q.year))), 'all']) {
    const count = questionsFor(bank,route.week,year).length;
    const tab = button(year==='all' ? `All years · ${count}` : count===10 ? year : `${year} · ${count}`, `year-tab ${route.year===year?'active':''}`, ()=>navigate(route.week,year));
    tab.setAttribute('aria-pressed',String(route.year===year)); years.append(tab);
  }
  main.append(years);
  const summary = el('div','set-summary'); summary.append(el('p','',`${overall.correct} / ${overall.total} correct`),el('p','muted',`${overall.answered} answered`)); main.append(summary);
  const meter = el('progress','progress'); meter.max=overall.total; meter.value=overall.answered; meter.setAttribute('aria-label','Questions answered in this year selection'); main.append(meter);
  const filters = el('nav','review-filters'); filters.setAttribute('aria-label','Review filters');
  for (const [key,label] of [['all','All'],['unanswered','Unanswered'],['missed','Missed'],['saved','Saved']]) {
    const count=filterQuestions(base,progress.answers,progress.flagged,key).length;
    const control=button(`${label} · ${count}`,`review-filter ${view.filter===key?'active':''}`,()=>setFilter(route,key));
    control.dataset.filter=key; control.setAttribute('aria-pressed',String(view.filter===key));filters.append(control);
  }
  main.append(filters);
  if (!list.length) {
    const empty=el('section','empty-review'); empty.append(el('h2','',view.filter==='saved'?'No saved questions here':view.filter==='missed'?'No missed questions here':'No unanswered questions here'));
    empty.append(el('p','muted',view.filter==='saved'?'Use “Save for review” on any question to keep it here.':'Choose another filter or continue with the complete set.'),button('Show all questions','primary',()=>setFilter(route,'all')));main.append(empty);return;
  }
  let canonical=base[route.index], index=list.findIndex(q=>q.id===canonical.id);
  if(index<0){canonical=list[0];index=0;history.replaceState(null,'',routeFor(route.week,route.year,base.findIndex(q=>q.id===canonical.id),canonical.id));}
  const pending=view.pending.includes(canonical.id), attempt=pending?null:progress.answers[canonical.id];
  const q=attempt?questionForAttempt(canonical,attempt):canonical, selected=attempt?.selected, attempted=!!attempt;
  progress.resume=routeFor(route.week,route.year,base.findIndex(item=>item.id===canonical.id),canonical.id);
  if(view.filter!=='all')main.append(el('p','review-caption',`${list.length} questions in this review round${view.pending.length?` · ${view.pending.length} left to retry`:''}. ${view.filter==='missed'?'Previous results stay saved until you answer again.':'Questions stay in the round while you read the feedback.'}`));
  const numbers=el('nav','question-nav');numbers.setAttribute('aria-label','Questions in this round');
  list.forEach((item,i)=>{
    const record=view.pending.includes(item.id)?null:progress.answers[item.id], status=record?(wasCorrect(item,record)?'correct':'wrong'):'';
    const chip=button(String(route.year==='all'?i+1:item.number),`question-chip ${status} ${i===index?'current':''}`,()=>goQuestion(route,base,item.id));
    chip.setAttribute('aria-label',`${item.year}, question ${item.number}, ${status||'unanswered'}`);if(i===index)chip.setAttribute('aria-current','step');numbers.append(chip);
  });main.append(numbers);
  const card=el('section','question-card'), meta=el('div','question-meta');
  meta.append(el('span','question-position',`${q.year} · Question ${q.number}${q.additional?' · Additional question':''}`),el('span','question-kind',q.savedRecap?'Saved recap attempt':q.mode==='original'?'Source MCQ':'Recap practice'));card.append(meta);
  const prompt=el('h2','question-prompt');prompt.tabIndex=-1;prompt.append(rich(q.prompt));card.append(prompt);
  const flagged=progress.flagged.includes(q.id);
  const flag=button(flagged?'★ Saved for review':'☆ Save for review','save-question text-button',()=>{
    progress.flagged=flagged?progress.flagged.filter(id=>id!==q.id):[...progress.flagged,q.id];save();render({focusFlag:true});
  });flag.setAttribute('aria-pressed',String(flagged));card.append(flag);
  if(q.context)card.append(contextView(bank.contexts[q.context]));
  if(q.note&&attempted)card.append(el('p','question-note',q.note));
  if(q.savedRecap)card.append(el('p','saved-version-note','Your earlier recap attempt and its score are preserved. The original choices are now available through “Try original wording” below.'));
  const options=el('div','answer-options');options.setAttribute('role',q.type==='multiple'?'group':'radiogroup');options.setAttribute('aria-label','Answer choices');
  if(q.type==='multiple')card.append(el('p','multi-hint','Select every correct option, then check your answer.'));
  for(const option of q.options){
    const chosen=(selected||draft).includes(option.id), correct=q.correct.includes(option.id);
    const choice=button('',`answer-option ${chosen?'chosen':''} ${attempted&&correct?'correct':''} ${attempted&&chosen&&!correct?'wrong':''}`,()=>{
      if(attempted)return;
      if(q.type==='multiple'){draft=draft.includes(option.id)?draft.filter(id=>id!==option.id):[...draft,option.id];render({focusOption:option.id});}
      else submit(canonical,[option.id]);
    });
    choice.dataset.option=option.id;choice.setAttribute('role',q.type==='multiple'?'checkbox':'radio');choice.setAttribute('aria-checked',String(chosen));choice.disabled=attempted;
    choice.append(el('span','option-letter',option.id.toUpperCase()),rich(option.text));
    if(attempted&&correct)choice.append(el('span','option-status','✓ Correct'));else if(attempted&&chosen)choice.append(el('span','option-status','× Your choice'));options.append(choice);
  }card.append(options);
  if(q.type==='multiple'&&!attempted){const check=button('Check answer','primary check-answer',()=>submit(canonical,draft));check.disabled=!draft.length;card.append(check);}
  if(attempted){
    const correct=wasCorrect(canonical,attempt), feedback=el('section',`feedback ${correct?'correct':'wrong'}`);feedback.setAttribute('aria-live','polite');
    const heading=el('h3','',correct?'✓ Correct':'× Not quite');heading.tabIndex=-1;feedback.append(heading);
    if(!correct){const line=el('p','correct-answer','Correct answer: ');line.append(rich(q.options.filter(o=>q.correct.includes(o.id)).map(o=>`${o.id.toUpperCase()}. ${o.text}`).join(' · ')));feedback.append(line);}
    if(!correct&&q.type==='multiple'){
      const missed=q.options.filter(o=>q.correct.includes(o.id)&&!selected.includes(o.id));
      const extra=q.options.filter(o=>selected.includes(o.id)&&!q.correct.includes(o.id));
      if(missed.length)feedback.append(el('p','selection-detail','Missing: '+missed.map(o=>o.id.toUpperCase()+'. '+o.text).join(' · ')));
      if(extra.length)feedback.append(el('p','selection-detail','Remove: '+extra.map(o=>o.id.toUpperCase()+'. '+o.text).join(' · ')));
    }
    feedback.append(rich(q.explanation),sourceNotes(q),sourceScreenshots(q));card.append(feedback);
    card.append(button(q.savedRecap?'Try original wording':'Retry this question','secondary retry-question',()=>{if(!view.pending.includes(canonical.id))view.pending.push(canonical.id);draft=[];save();render({focusQuestion:true});}));
  }else card.append(el('p','answer-hint',q.type==='multiple'?'Check your selection when you have chosen every correct option.':'Choose an option for an immediate answer and explanation.'));
  main.append(card);
  const navAnswers={...progress.answers};for(const id of view.pending)delete navAnswers[id];
  const visible=summarize(list,navAnswers),controls=el('div','question-controls');
  const prev=button('← Previous','secondary',()=>goQuestion(route,base,list[index-1].id));prev.disabled=index===0;prev.dataset.navigation='previous';
  const next=button(visible.answered===visible.total?'Next question →':'Next unanswered →','primary',()=>goQuestion(route,base,list[nextUnanswered(list,navAnswers,index)].id));
  next.disabled=visible.answered===visible.total&&index===list.length-1;next.dataset.navigation='next';controls.append(prev,next);main.append(controls);
  if(visible.answered===visible.total){
    const finish=el('section','finish');finish.append(el('h2','',view.filter==='all'?'Set complete':'Review round complete'),el('p','',`${visible.correct} correct · ${visible.wrong} to revisit`));
    if(visible.wrong)finish.append(button(`Retry ${visible.wrong} missed`,'primary',()=>setFilter(route,'missed')));
    if(route.week<12)finish.append(button('Next week →','secondary',()=>navigate(route.week+1)));main.append(finish);
  }
  const footer=el('div','practice-footer');
  footer.append(button('Restart this set','text-button',()=>{
    const previous=Object.fromEntries(base.filter(item=>progress.answers[item.id]).map(item=>[item.id,progress.answers[item.id]]));
    progress.answers=resetAnswers(progress.answers,base.map(item=>item.id));progress.review=null;draft=[];
    notice={text:'This set was restarted.',undo:()=>{progress.answers={...previous,...progress.answers};notice=null;save();render();}};
    save();changeHash(routeFor(route.week,route.year),{focusQuestion:true});
  }));
  footer.append(el('span','muted',q.year===2026?'2026 keys checked against the enrolled course.':q.mode==='original'?'Source wording retained; key qualifications are in the explanation.':'Recap wording and practice choices; original evidence is available after answering.'));main.append(footer);
  main.append(el('p','keyboard-hint','Keys: 1–4 answer · N next · P previous · S save for review'));
}

const FLASH_LABELS = { current: 'Shuffled · 2026 first, then older', all: 'Mix all years', '2026': '2026 assignments only', missed: 'Retry missed questions', saved: 'Saved questions' };

function startFlash(scope, fresh = false, bypass = progress.flash?.bypass || false) {
  if (fresh || !progress.flash || progress.flash.scope !== scope || progress.flash.bypass !== bypass) {
    const preferences = { ...progress.flash, bypass };
    if (!!progress.flash?.bypass !== bypass) { preferences.autoNext = true; preferences.delay = bypass ? 3 : 6; }
    progress.flash = createFlashRound(bank, scope, progress.answers, progress.flagged, preferences);
  }
  draft = []; save(); changeHash(flashRoute(scope, null, bypass), { focusQuestion: true });
}

function stepFlash(direction = 1) {
  stopAutoNext();
  const round = progress.flash, current = round.ids[round.index];
  if (round.answers[current] || round.bypass) round.last = current;
  if (direction < 0) { round.index = Math.max(0, round.index - 1); round.autoNext = false; }
  else {
    let pending = -1;
    for (let step = 1; step <= round.ids.length; step++) {
      const index = (round.index + step) % round.ids.length;
      if (!(round.bypass ? round.seen.includes(round.ids[index]) : round.answers[round.ids[index]])) { pending = index; break; }
    }
    if (pending >= 0) round.index = pending; else round.complete = true;
  }
  draft = []; save(); render({ focusQuestion: true });
}

function submitFlash(q, selected) {
  const round = progress.flash;
  if (round.bypass || round.answers[q.id] || !selected.length) return;
  const attempt = makeAttempt(q, selected, progress.answers[q.id]);
  progress.answers[q.id] = attempt; round.answers[q.id] = attempt; round.last = q.id;
  if (!round.seen.includes(q.id)) round.seen.push(q.id);
  draft = []; save(); render({ focusFeedback: true });
}

function flashFeedback(canonical, attempt, previous = false, revealOnly = false) {
  const q = revealOnly ? canonical : questionForAttempt(canonical, attempt), correct = revealOnly || wasCorrect(canonical, attempt);
  const feedback = el('section', `feedback ${correct ? 'correct' : 'wrong'}${previous ? ' previous-feedback' : ''}${revealOnly ? ' bypass-answer' : ''}`);
  feedback.setAttribute('aria-live', previous ? 'off' : 'polite');
  if (previous) {
    feedback.append(el('p', 'eyebrow', 'LAST ANSWER'));
    const meta = el('p', 'muted', `${q.year} · Week ${q.week} · Q${q.number}`); feedback.append(meta);
  }
  const heading = el('h3', '', revealOnly ? 'Answer to remember' : correct ? '✓ Correct' : '× Not quite'); heading.tabIndex = -1;
  if (previous) feedback.append(heading);
  else { const bar = el('div', 'feedback-heading'); bar.append(heading, button('Pause & read', 'text-button pause-reading', pauseForReading)); feedback.append(bar); }
  if (previous) { const prompt = el('p', 'previous-prompt'); prompt.append(rich(q.prompt)); feedback.append(prompt); }
  const answer = el('p', 'correct-answer', 'Correct answer: ');
  answer.append(rich(q.options.filter(o => q.correct.includes(o.id)).map(o => `${o.id.toUpperCase()}. ${o.text}`).join(' · '))); feedback.append(answer);
  if (revealOnly && q.context) feedback.append(contextView(bank.contexts[q.context]));
  if (!correct && q.type === 'multiple') {
    const missing = q.options.filter(o => q.correct.includes(o.id) && !attempt.selected.includes(o.id));
    const extra = q.options.filter(o => attempt.selected.includes(o.id) && !q.correct.includes(o.id));
    if (missing.length) feedback.append(el('p', 'selection-detail', 'Missing: ' + missing.map(o => o.id.toUpperCase()).join(', ')));
    if (extra.length) feedback.append(el('p', 'selection-detail', 'Remove: ' + extra.map(o => o.id.toUpperCase()).join(', ')));
  }
  if (previous && q.context) {
    const context = el('details', 'previous-context'); context.append(el('summary', '', 'Show question information'), contextView(bank.contexts[q.context])); feedback.append(context);
  }
  feedback.append(rich(q.explanation));
  if (revealOnly && q.note) feedback.append(el('p', 'question-note', q.note));
  feedback.append(sourceNotes(q), sourceScreenshots(q));
  return feedback;
}

function scheduleAutoNext(round, q, attempt) {
  const status = document.querySelector('.auto-status');
  if (!attempt && !round.bypass) { status.textContent = 'Choose an answer. Feedback appears immediately.'; return; }
  if (!round.autoNext || document.visibilityState === 'hidden') {
    status.textContent = 'Paused — take your time. Next when you’re ready.'; return;
  }
  const due = Date.now() + round.delay * 1000;
  const update = () => {
    const message = `Next ${round.bypass ? 'card' : 'question'} in ${Math.max(1, Math.ceil((due - Date.now()) / 1000))}s · Pause to read longer`;
    if (status.textContent !== message) status.textContent = message;
  };
  update(); countdownTimer = window.setInterval(update, 250);
  advanceTimer = window.setTimeout(() => {
    if (parseFlashRoute(location.hash, bank) && progress.flash === round && round.ids[round.index] === q.id && !document.querySelector('dialog[open]')) stepFlash();
  }, round.delay * 1000);
}

function renderFlash(main, route) {
  let automatic = null;
  main.addEventListener('toggle', event => { if (event.target.open) pauseForReading(); }, true);
  const scope = route.scope || progress.flash?.scope || 'current';
  const bypass = route.bypass ?? progress.flash?.bypass ?? false;
  if (!progress.flash || progress.flash.scope !== scope || progress.flash.bypass !== bypass) {
    const preferences = { ...progress.flash, bypass };
    if (!!progress.flash?.bypass !== bypass) { preferences.autoNext = true; preferences.delay = bypass ? 3 : 6; }
    progress.flash = createFlashRound(bank, scope, progress.answers, progress.flagged, preferences);
  }
  const round = progress.flash;
  if (route.id) { const index = round.ids.indexOf(route.id); if (index >= 0) { round.index = index; round.complete = false; } }
  // Position lives in saved state; the address keeps a simple entry point for this feed.
  if (location.hash !== flashRoute(scope, null, bypass)) history.replaceState(null, '', flashRoute(scope, null, bypass));
  const header = el('header', 'flash-header'), brand = el('a', 'brand', 'AI Practice'); brand.href = '#/revise/current';
  const browse = el('a', 'browse-weeks', 'Browse by week'); browse.href = '#/weeks'; header.append(brand, browse); main.append(header);
  const title = el('div', 'flash-title'); title.append(el('p', 'eyebrow', bypass ? 'BYPASS · ANSWERS SHOWN' : 'RANDOM REVISION'), el('h1', '', bypass ? 'Quick answer cards' : 'One question at a time'));
  const tools = el('div', 'flash-tools'), scopeLabel = el('label', 'flash-select-label', 'Question pool'), select = el('select', 'flash-scope');
  for (const [value, label] of Object.entries(FLASH_LABELS)) { const option = el('option', '', label); option.value = value; option.selected = scope === value; select.append(option); }
  select.setAttribute('aria-label', 'Question pool'); select.addEventListener('change', () => startFlash(select.value, true)); scopeLabel.append(select);
  const bypassButton = button(bypass ? 'Bypass ON · answers shown' : 'Bypass · show answers', `secondary bypass-toggle ${bypass ? 'active' : ''}`, () => startFlash(scope, true, !bypass));
  bypassButton.setAttribute('aria-pressed', String(bypass)); tools.append(bypassButton);
  const toggle = button(round.autoNext ? 'Pause auto next' : 'Resume auto next', 'secondary auto-toggle', () => { round.autoNext = !round.autoNext; save(); render(); });
  toggle.setAttribute('aria-pressed', String(round.autoNext)); tools.append(toggle);
  const speedLabel = el('label', 'flash-select-label', 'Reading time'), speed = el('select', 'flash-speed');
  for (const seconds of FLASH_DELAYS) { const option = el('option', '', `${seconds} second${seconds === 1 ? '' : 's'}`); option.value = seconds; option.selected = round.delay === seconds; speed.append(option); }
  speed.setAttribute('aria-label', 'Seconds before the next question'); speed.addEventListener('change', () => { round.delay = Number(speed.value); save(); render(); }); speedLabel.append(speed);
  const settings = el('details', 'flash-settings'), fields = el('div', 'settings-fields'); settings.append(el('summary', '', 'Settings')); fields.append(scopeLabel, speedLabel); settings.append(fields); tools.append(settings);
  title.append(tools); main.append(title);
  const lookup = new Map(bank.questions.map(q => [q.id, q])), list = round.ids.map(id => lookup.get(id));
  if (bypass && list.length && !round.complete && !round.seen.includes(round.ids[round.index])) round.seen.push(round.ids[round.index]);
  const stats = summarize(list, round.answers), summary = el('div', 'flash-summary');
  summary.append(el('span', 'flash-position', round.complete ? 'Round complete' : `${round.ids.length ? round.index + 1 : 0} / ${round.ids.length} in this shuffle`), el('span', 'flash-score', bypass ? `${round.seen.length} shown · quiz scores unchanged` : `${stats.correct} correct · ${stats.wrong} missed · ${stats.answered} answered`)); main.append(summary);
  const meter = el('progress', 'progress'); meter.max = Math.max(stats.total, 1); meter.value = bypass ? round.seen.length : stats.answered; meter.setAttribute('aria-label', bypass ? 'Answer cards shown in this shuffle' : 'Questions answered in this shuffle'); main.append(meter);
  if (!list.length || round.complete) {
    const empty = el('section', 'flash-complete empty-review');
    empty.append(el('h2', '', round.complete ? 'You finished this shuffle' : scope === 'missed' ? 'No missed questions yet' : 'No saved questions yet'));
    empty.append(el('p', '', round.complete ? bypass ? `All ${round.ids.length} answer cards shown. Your quiz scores are unchanged.` : `${stats.correct} correct out of ${stats.total}. Your previous results are saved.` : scope === 'missed' ? 'Missed answers will be available here after you practise.' : 'Star any question to keep it for later.'));
    if (!bypass && stats.wrong) empty.append(button(`Retry ${stats.wrong} missed`, 'primary flash-retry-missed', () => {
      const missed = list.filter(q => round.answers[q.id] && !wasCorrect(q, round.answers[q.id]));
      const next = createFlashRound({ ...bank, questions: missed }, 'all', {}, [], round); next.scope = 'missed'; progress.flash = next; save(); changeHash(flashRoute('missed'));
    }));
    empty.append(button('New shuffle · all questions', 'secondary', () => startFlash('current', true))); main.append(empty);
  } else {
    const canonical = list[round.index], attempt = bypass ? null : round.answers[canonical.id], attempted = !!attempt, revealed = bypass || attempted;
    const q = attempt ? questionForAttempt(canonical, attempt) : canonical;
    const grid = el('div', 'flash-grid'), current = el('div', 'flash-current'), card = el('section', 'question-card'); card.dataset.question = q.id;
    const meta = el('div', 'question-meta'); meta.append(el('span', 'question-position', `${q.year} · Week ${q.week} · Q${q.number}`), el('span', 'question-kind', q.savedRecap ? 'Saved recap attempt' : q.mode === 'original' ? 'Source MCQ' : 'Recap practice')); card.append(meta);
    const prompt = el('h2', 'question-prompt'); prompt.tabIndex = -1; prompt.append(rich(q.prompt)); card.append(prompt);
    if (bypass) card.append(flashFeedback(q, null, false, true));
    const flagged = progress.flagged.includes(q.id), flag = button(flagged ? '★ Saved for review' : '☆ Save for review', 'save-question text-button', () => {
      progress.flagged = flagged ? progress.flagged.filter(id => id !== q.id) : [...progress.flagged, q.id]; save(); render({ focusFlag: true });
    }); flag.setAttribute('aria-pressed', String(flagged)); card.append(flag);
    if (q.context && !bypass) card.append(contextView(bank.contexts[q.context]));
    if (q.note && attempted) card.append(el('p', 'question-note', q.note));
    if (q.type === 'multiple' && !bypass) card.append(el('p', 'multi-hint', 'Select every correct option, then check your answer.'));
    const choices = el('div', 'answer-options'); choices.setAttribute('role', q.type === 'multiple' ? 'group' : 'radiogroup'); choices.setAttribute('aria-label', 'Answer choices');
    for (const option of q.options) {
      const chosen = (attempt?.selected || draft).includes(option.id), correct = q.correct.includes(option.id);
      const choice = button('', `answer-option ${chosen ? 'chosen' : ''} ${revealed && correct ? 'correct' : ''} ${attempted && chosen && !correct ? 'wrong' : ''}`, () => {
        if (revealed) return;
        if (q.type === 'multiple') { draft = draft.includes(option.id) ? draft.filter(id => id !== option.id) : [...draft, option.id]; render({ focusOption: option.id }); }
        else submitFlash(q, [option.id]);
      });
      choice.dataset.option = option.id; choice.setAttribute('role', q.type === 'multiple' ? 'checkbox' : 'radio'); choice.setAttribute('aria-checked', String(chosen)); choice.disabled = revealed;
      choice.append(el('span', 'option-letter', option.id.toUpperCase()), rich(option.text));
      if (revealed && correct) choice.append(el('span', 'option-status', '✓ Correct')); else if (attempted && chosen) choice.append(el('span', 'option-status', '× Your choice')); choices.append(choice);
    }
    if (bypass) { const allOptions = el('details', 'bypass-options'); allOptions.append(el('summary', '', 'Show all four options'), choices); card.append(allOptions); }
    else card.append(choices);
    if (q.type === 'multiple' && !revealed) { const check = button('Check answer', 'primary check-answer', () => submitFlash(q, draft)); check.disabled = !draft.length; card.append(check); }
    if (attempted) card.append(flashFeedback(q, attempt));
    const status = el('p', 'auto-status'); status.setAttribute('role', 'status'); card.append(status); current.append(card);
    const controls = el('div', 'question-controls flash-controls');
    const prev = button('← Previous', 'secondary', () => stepFlash(-1)); prev.disabled = round.index === 0; prev.dataset.navigation = 'previous';
    const mobilePause = button(round.autoNext ? 'Pause' : 'Resume', 'secondary mobile-auto-toggle', () => { round.autoNext = !round.autoNext; save(); render(); });
    mobilePause.setAttribute('aria-label', 'Pause or resume automatic next questions'); mobilePause.setAttribute('aria-pressed', String(round.autoNext));
    const next = button(bypass ? 'Next card →' : attempted ? 'Next question →' : 'Skip for now →', 'primary', () => stepFlash()); next.dataset.navigation = 'next'; controls.append(prev, mobilePause, next); current.append(controls); grid.append(current);
    if (!bypass && round.last && round.last !== q.id && round.answers[round.last]) {
      const last = el('aside', 'last-answer'); last.setAttribute('aria-label', 'Previous answer and explanation'); last.append(flashFeedback(lookup.get(round.last), round.answers[round.last], true)); grid.append(last); grid.classList.add('has-last-answer');
    }
    main.append(grid); automatic = { round, q, attempt };
  }
  const footer = el('footer', 'flash-footer');
  footer.append(button('Start a new shuffle', 'text-button', () => startFlash(scope, true)), el('p', 'local-note', storageAvailable ? 'Progress saved in this browser. Earlier results stay saved when you start a shuffle.' : 'Storage unavailable. Progress stays in this tab.'));
  footer.append(el('p', 'keyboard-hint', 'Keys: 1–4 answer · N next · P previous · A pause/resume · S save'));
  if (scope === 'current') footer.append(el('p', 'muted', 'All 2026 questions first, shuffled across weeks. Older questions follow in random order. No repeats within the shuffle.'));
  main.append(footer);
  return automatic;
}

function render(options={}){
  if(!bank)return;
  stopAutoNext();
  const route=parseRoute(location.hash,bank),flash=parseFlashRoute(location.hash,bank),layout=el('div',flash?'flash-layout':'layout');
  if(!flash)layout.append(renderSidebar(route));
  const main=el('main',flash?'flash-main':'main');main.id='main';main.tabIndex=-1;
  if(notice){const bar=el('div','notice');bar.setAttribute('role','status');bar.append(el('span','',notice.text));if(notice.undo)bar.append(button('Undo','text-button',notice.undo));main.append(bar);}
  let automatic;
  if(flash)automatic=renderFlash(main,flash);else if(route)renderPractice(main,route);else renderHome(main);
  layout.append(main);root.replaceChildren(layout);save();
  if(automatic)scheduleAutoNext(automatic.round,automatic.q,automatic.attempt);
  document.title=flash?(progress.flash?.bypass?'Quick answer cards · AI Practice':'Flash revision · AI Practice'):route?`Week ${String(route.week).padStart(2,'0')} · AI Practice`:'AI Practice · Fundamentals of AI';
  const target=options.focusFeedback?document.querySelector('.feedback h3'):options.focusOption?document.querySelector(`[data-option="${options.focusOption}"]`):options.focusFlag?document.querySelector('.save-question'):options.focusQuestion?document.querySelector('.question-prompt'):null;
  target?.focus({preventScroll:true});
  if(options.focusQuestion&&target?.scrollIntoView)target.scrollIntoView({block:'start',behavior:'instant'});
  if(flash&&options.focusFeedback&&target?.scrollIntoView)target.scrollIntoView({block:'nearest',behavior:'instant'});
}

document.querySelector('.skip-link')?.addEventListener('click',event=>{event.preventDefault();document.getElementById('main')?.focus();});
window.addEventListener('hashchange',()=>{draft=[];render({focusQuestion:true});});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stopAutoNext();else if(bank&&parseFlashRoute(location.hash,bank))render();});
window.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||event.target.isContentEditable||document.querySelector('dialog[open]'))return;
  let target;
  if(['1','2','3','4'].includes(event.key))target=document.querySelectorAll('.answer-option')[Number(event.key)-1];
  else if(event.key.toLowerCase()==='n')target=document.querySelector('[data-navigation="next"]');
  else if(event.key.toLowerCase()==='p')target=document.querySelector('[data-navigation="previous"]');
  else if(event.key.toLowerCase()==='s')target=document.querySelector('.save-question');
  else if(event.key.toLowerCase()==='a')target=document.querySelector('.auto-toggle');
  if(target&&!target.disabled){event.preventDefault();target.click();}
});

async function boot(){
  try{
    const response=await fetch(new URL('./data/questions.json?v=4',import.meta.url));
    if(!response.ok)throw new Error(`Question data returned HTTP ${response.status}.`);
    bank=await response.json();
    if(bank.schemaVersion!==2||bank.weeks.length!==12||bank.questions.some(q=>q.options.length!==4||!q.revision||!q.correct.length))throw new Error('Question data is incomplete. Reload to get the matching version.');
    let modern,legacy;
    try{modern=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'null');}catch{}
    try{legacy=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch{}
    progress=readProgress(bank,modern,legacy);save();render();
  }catch(error){
    const main=el('main','loading');main.id='main';main.append(el('h1','','The questions could not load'),el('p','','Reload the questions to try again.'),el('p','muted',error.message),button('Reload questions','primary',boot));root.replaceChildren(main);
  }
}
await boot();
