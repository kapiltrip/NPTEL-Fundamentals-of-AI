import { STORAGE_KEY, questionsFor, grade, validAnswers, summarize, parseRoute, routeFor, nextUnanswered, resetAnswers } from './quiz-core.mjs';

const root = document.getElementById('app');
let bank, answers = {}, draft = [], retryIds = null, activeScope = null;
let storageAvailable = true;

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function rich(text = '') {
  const node = el('div', 'rich');
  const tokens = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\[[^\]]+\]\(https?:\/\/[^)]+\))/g);
  for (const token of tokens) {
    if (token.startsWith('$') && token.endsWith('$')) {
      const display = token.startsWith('$$');
      const span = el('span', display ? 'display-math' : 'inline-math');
      if (window.katex) {
        window.katex.render(token.slice(display ? 2 : 1, display ? -2 : -1), span,
          { throwOnError: false, trust: false, displayMode: display, output: 'htmlAndMathml' });
      } else span.textContent = token.replace(/^\$+|\$+$/g, '');
      node.append(span);
    } else {
      const link = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/.exec(token);
      if (link) {
        const a = el('a', '', link[1]); a.href = link[2]; a.target = '_blank'; a.rel = 'noopener noreferrer'; node.append(a);
      } else node.append(document.createTextNode(token.replace(/\*\*/g, '')));
    }
  }
  return node;
}

function button(text, className, action) {
  const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node;
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(answers)); }
  catch { storageAvailable = false; }
}

function navigate(week, year = '2026', index = 0) {
  retryIds = null; draft = [];
  const hash = routeFor(week, year, index);
  if (location.hash === hash) render(); else location.hash = hash;
}

function contextView(context) {
  const box = el('section', 'context');
  box.setAttribute('aria-label', 'Question information');
  if (context.title) box.append(el('h3', '', context.title));
  if (context.text) box.append(rich(context.text));
  if (context.table) {
    const wrap = el('div', 'table-wrap'), table = el('table');
    const head = el('thead'), hr = el('tr');
    for (const label of context.table.headers) hr.append(el('th', '', label));
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
    svg.setAttribute('aria-label', 'Root A MAX; B and C MIN. B has MAX children D and E; C has MAX children F and G. D leaves 8,5,6. E leaves 4,10,7. F leaves 9,3,2. G leaves 6,1,5. Children evaluated left to right.');
    const point = (x, y, label, parent) => {
      if (parent) { const l = document.createElementNS(svg.namespaceURI, 'line'); for (const [k, v] of Object.entries({ x1: parent[0], y1: parent[1] + 15, x2: x, y2: y - 15 })) l.setAttribute(k, String(v)); svg.append(l); }
      const t = document.createElementNS(svg.namespaceURI, 'text'); t.setAttribute('x', x); t.setAttribute('y', y + 5); t.setAttribute('text-anchor', 'middle'); t.textContent = label; svg.append(t);
    };
    point(450, 25, 'A · MAX'); point(230, 100, 'B · MIN', [450,25]); point(670, 100, 'C · MIN', [450,25]);
    for (const [x, name, values, parent] of [[120,'D',[8,5,6],[230,100]],[340,'E',[4,10,7],[230,100]],[560,'F',[9,3,2],[670,100]],[780,'G',[6,1,5],[670,100]]]) {
      point(x, 180, `${name} · MAX`, parent);
      values.forEach((v, i) => point(x + (i - 1) * 55, 265, String(v), [x,180]));
    }
    box.append(svg);
  }
  if (context.image) {
    const image = el('img', 'context-image'); image.src = context.image; image.alt = context.imageAlt; box.append(image);
  }
  return box;
}

function renderSidebar(route) {
  const side = el('aside', 'sidebar');
  const brand = el('a', 'brand', 'AI Practice'); brand.href = '#'; side.append(brand);
  side.append(el('p', 'brand-sub', 'Fundamentals of AI'));
  const nav = el('nav', 'week-nav'); nav.setAttribute('aria-label', 'Weeks');
  for (const week of bank.weeks) {
    const list = questionsFor(bank, week.number, 'all'), summary = summarize(list, answers);
    const link = el('a', `week-link ${route?.week === week.number ? 'active' : ''}`);
    link.href = routeFor(week.number, '2026');
    if (route?.week === week.number) link.setAttribute('aria-current', 'page');
    link.append(el('span', 'week-number', String(week.number).padStart(2, '0')));
    const label = el('span', 'week-label'); label.append(el('span', '', week.shortTitle), el('small', '', `${summary.answered}/${summary.total} practised`));
    link.append(label); nav.append(link);
  }
  side.append(nav);
  side.append(el('p', 'local-note', storageAvailable ? 'Progress saved in this browser.' : 'Storage unavailable. Progress stays in this tab.'));
  return side;
}

function renderHome(main) {
  main.append(el('p', 'eyebrow', 'YOUR REVISION DESK'), el('h1', '', 'Choose a week'));
  main.append(el('p', 'intro', `${bank.questions.length} questions across ${bank.assignmentSets} assignment sets. Answer, check, and understand the reason immediately.`));
  const grid = el('div', 'week-grid');
  for (const week of bank.weeks) {
    const list = questionsFor(bank, week.number, 'all'), s = summarize(list, answers);
    const card = el('a', 'week-card'); card.href = routeFor(week.number, '2026');
    card.append(el('span', 'eyebrow', `WEEK ${String(week.number).padStart(2,'0')}`), el('h2', '', week.title));
    card.append(el('p', 'muted', `${list.length} questions · ${[...new Set(list.map(q=>q.year))].join(', ')}`));
    card.append(el('span', 'card-progress', s.answered ? `${s.correct} correct · ${s.answered} answered` : 'Start with 2026 →'));
    grid.append(card);
  }
  main.append(grid);
  main.append(el('p', 'collection-note', '2026 uses the original MCQs. Earlier years use source-linked recap questions with practice choices. Any changed wording or source-key issue is explained after you answer.'));
}

function renderPractice(main, route) {
  const week = bank.weeks.find(w => w.number === route.week);
  let list = questionsFor(bank, route.week, route.year);
  if (retryIds) list = list.filter(q => retryIds.includes(q.id));
  if (!list.length) { retryIds = null; list = questionsFor(bank, route.week, route.year); }
  route.index = Math.min(route.index, list.length - 1);
  const q = list[route.index], s = summarize(list, answers);
  main.append(el('p', 'eyebrow', `WEEK ${String(route.week).padStart(2,'0')}`), el('h1', '', week.title));
  const years = el('nav', 'year-tabs'); years.setAttribute('aria-label', 'Question year');
  const available = [...new Set(questionsFor(bank, route.week, 'all').map(item => item.year))];
  for (const year of [...available.map(String), 'all']) {
    const total = questionsFor(bank, route.week, year).length;
    const tab = button(year === 'all' ? `All years · ${total}` : year, `year-tab ${route.year === year ? 'active' : ''}`, () => navigate(route.week, year));
    tab.setAttribute('aria-pressed', String(route.year === year)); years.append(tab);
  }
  main.append(years);
  const summary = el('div', 'set-summary');
  summary.append(el('p', '', `${s.correct} / ${s.total} correct`), el('p', 'muted', `${s.answered} answered${retryIds ? ' · missed questions' : ''}`));
  main.append(summary);
  const progress = el('progress', 'progress'); progress.max = s.total; progress.value = s.answered; progress.setAttribute('aria-label', 'Questions answered'); main.append(progress);
  const numbers = el('nav', 'question-nav'); numbers.setAttribute('aria-label', 'Questions in this set');
  list.forEach((item, index) => {
    const attempted = Object.hasOwn(answers, item.id), status = attempted ? grade(item, answers[item.id]) ? 'correct' : 'wrong' : '';
    const chip = button(String(index + 1), `question-chip ${status} ${index === route.index ? 'current' : ''}`, () => {
      draft = []; location.hash = routeFor(route.week, route.year, index); render();
    });
    chip.setAttribute('aria-label', `${item.year}, question ${item.number}${status ? `, ${status}` : ', unanswered'}`);
    if (index === route.index) chip.setAttribute('aria-current', 'step'); numbers.append(chip);
  });
  main.append(numbers);
  const card = el('section', 'question-card');
  const meta = el('div', 'question-meta');
  meta.append(el('span', 'question-position', `${q.year} · Question ${q.number}`), el('span', 'question-kind', q.mode === 'original' ? 'Source MCQ' : 'Recap practice'));
  card.append(meta);
  const prompt = el('h2', 'question-prompt'); prompt.append(rich(q.prompt)); card.append(prompt);
  if (q.context) card.append(contextView(bank.contexts[q.context]));
  if (q.note) card.append(el('p', 'question-note', q.note));
  const selected = answers[q.id], attempted = !!selected;
  const options = el('div', 'answer-options'); options.setAttribute('role', q.type === 'multiple' ? 'group' : 'radiogroup'); options.setAttribute('aria-label', 'Answer choices');
  if (q.type === 'multiple') card.append(el('p', 'muted', 'Select every correct option, then check your answer.'));
  for (const option of q.options) {
    const chosen = (selected || draft).includes(option.id), correct = q.correct.includes(option.id);
    const optionButton = button('', `answer-option ${chosen ? 'chosen' : ''} ${attempted && correct ? 'correct' : ''} ${attempted && chosen && !correct ? 'wrong' : ''}`, () => {
      if (attempted) return;
      if (q.type === 'multiple') {
        draft = draft.includes(option.id) ? draft.filter(id => id !== option.id) : [...draft, option.id]; render(); return;
      }
      answers[q.id] = [option.id]; save(); draft = []; render();
    });
    optionButton.dataset.option = option.id; optionButton.setAttribute('role', q.type === 'multiple' ? 'checkbox' : 'radio');
    optionButton.setAttribute('aria-checked', String(chosen)); optionButton.disabled = attempted;
    optionButton.append(el('span', 'option-letter', option.id.toUpperCase()), rich(option.text));
    if (attempted && correct) optionButton.append(el('span', 'option-status', '✓ Correct'));
    else if (attempted && chosen) optionButton.append(el('span', 'option-status', '× Your choice'));
    options.append(optionButton);
  }
  card.append(options);
  if (q.type === 'multiple' && !attempted) {
    const check = button('Check answer', 'primary', () => { answers[q.id] = [...draft]; draft = []; save(); render(); });
    check.disabled = !draft.length; card.append(check);
  }
  if (attempted) {
    const right = grade(q, selected), feedback = el('section', `feedback ${right ? 'correct' : 'wrong'}`);
    feedback.setAttribute('aria-live', 'polite'); feedback.setAttribute('aria-atomic', 'true');
    feedback.append(el('h3', '', right ? '✓ Correct' : '× Not quite'));
    if (!right) {
      const correctLine = el('p', 'correct-answer', 'Correct answer: ');
      correctLine.append(rich(q.options.filter(o => q.correct.includes(o.id)).map(o => `${o.id.toUpperCase()}. ${o.text}`).join(' · '))); feedback.append(correctLine);
    }
    feedback.append(rich(q.explanation));
    if (q.mode !== 'original') {
      const detail = el('details', 'source-note'), summary = el('summary', '', 'Source wording and answer notes');
      detail.append(summary, el('p', 'muted', 'This is a recap question with practice choices; its option letters can differ from the source.'));
      detail.append(rich(`Source recap: ${q.sourceQuestion}\nSource answer notes: ${q.sourceAnswer}`)); feedback.append(detail);
    }
    const source = el('details', 'source-note'); source.append(el('summary', '', 'View original screenshot'));
    source.addEventListener('toggle', () => {
      if (!source.open || source.querySelector('img')) return;
      for (const image of q.images) {
        const img = el('img', 'source-image');
        img.src = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname) ? image : bank.sourceImageBase + image.slice('source/'.length);
        img.alt = `Week ${q.week}, ${q.year}, source containing question ${q.number}`; img.loading = 'lazy'; source.append(img);
      }
      const a = el('a', '', 'Open source'); a.href = q.source; a.target = '_blank'; a.rel = 'noopener noreferrer'; source.append(a);
    });
    feedback.append(source); card.append(feedback);
  } else card.append(el('p', 'answer-hint', 'Choose an option for an immediate answer and explanation.'));
  main.append(card);
  const controls = el('div', 'question-controls');
  const prev = button('← Previous', 'secondary', () => { draft = []; location.hash = routeFor(route.week, route.year, route.index - 1); }); prev.disabled = route.index === 0;
  const next = button(s.answered === s.total ? 'Next question →' : 'Next unanswered →', 'primary', () => {
    draft = []; location.hash = routeFor(route.week, route.year, nextUnanswered(list, answers, route.index));
  });
  next.disabled = s.answered === s.total && route.index === list.length - 1;
  controls.append(prev, next); main.append(controls);
  if (s.answered === s.total) {
    const finish = el('section', 'finish'); finish.append(el('h2', '', 'Set complete'), el('p', '', `${s.correct} correct · ${s.wrong} to revisit`));
    if (s.wrong) finish.append(button(`Retry ${s.wrong} missed`, 'primary', () => {
      retryIds = list.filter(item => !grade(item, answers[item.id])).map(item => item.id);
      answers = resetAnswers(answers, retryIds); save(); draft = []; location.hash = routeFor(route.week, route.year); render();
    }));
    if (route.week < 12) finish.append(button('Next week →', 'secondary', () => navigate(route.week + 1)));
    main.append(finish);
  }
  const footer = el('div', 'practice-footer');
  footer.append(button('Restart this set', 'text-button', () => {
    answers = resetAnswers(answers, list.map(item => item.id)); save(); draft = []; retryIds = null; location.hash = routeFor(route.week, route.year); render();
  }));
  footer.append(el('span', 'muted', q.mode === 'original' ? '2026 answer keys were checked against the enrolled course.' : 'Recap wording and practice choices; original evidence is available after answering.'));
  main.append(footer);
}

function render() {
  if (!bank) return;
  const route = parseRoute(location.hash, bank);
  const scope = route ? `${route.week}/${route.year}` : null;
  if (activeScope !== scope) retryIds = null;
  activeScope = scope;
  root.replaceChildren(); const layout = el('div', 'layout'); layout.append(renderSidebar(route));
  const main = el('main', 'main'); main.id = 'main';
  if (route) renderPractice(main, route); else renderHome(main);
  layout.append(main); root.append(layout);
  document.title = route ? `Week ${String(route.week).padStart(2,'0')} · AI Practice` : 'AI Practice · Fundamentals of AI';
}

window.addEventListener('hashchange', () => { draft = []; render(); });
window.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
  if (['1','2','3','4'].includes(event.key)) {
    const choice = document.querySelectorAll('.answer-option')[Number(event.key)-1];
    if (choice && !choice.disabled) { event.preventDefault(); choice.click(); }
  }
});

try {
  const response = await fetch(new URL('./data/questions.json', import.meta.url));
  if (!response.ok) throw new Error(`Question data returned HTTP ${response.status}.`);
  bank = await response.json();
  try { answers = validAnswers(bank, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
  catch { answers = {}; storageAvailable = false; }
  render();
} catch (error) {
  const main = el('main', 'loading'); main.id = 'main';
  main.append(el('h1', '', 'The questions could not load'), el('p', '', 'Start game/server.py, then open http://127.0.0.1:8765/game/.'), el('p', 'muted', error.message)); root.replaceChildren(main);
}
