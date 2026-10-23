// Keep the original storage untouched as a migration backup.
export const STORAGE_KEY = 'nptel-ai-practice-v1';
export const PROGRESS_KEY = 'nptel-ai-practice-v2';

export function questionsFor(bank, week, year = '2026') {
  return bank.questions.filter(q => q.week === Number(week) && (year === 'all' || String(q.year) === String(year)))
    .sort((a, b) => b.year - a.year || a.number - b.number);
}

export function grade(question, selected) {
  if (!Array.isArray(selected) || !selected.length || new Set(selected).size !== selected.length) return false;
  return selected.length === question.correct.length && selected.every(id => question.correct.includes(id));
}

export function questionForAttempt(question, attempt) {
  if (question.previous && (Array.isArray(attempt) || attempt?.revision === question.previous.revision)) {
    return { ...question, ...question.previous, previous: undefined, savedRecap: true };
  }
  return question;
}

export function wasCorrect(question, attempt) {
  return grade(questionForAttempt(question, attempt), Array.isArray(attempt) ? attempt : attempt?.selected);
}

export function makeAttempt(question, selected, previous) {
  return {
    selected: [...selected], revision: question.revision,
    count: previous ? (previous.count || 1) + 1 : 1,
    firstCorrect: previous ? previous.firstCorrect ?? wasCorrect(question, previous) : grade(question, selected),
  };
}

export function validAnswers(bank, raw) {
  const clean = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
  for (const q of bank.questions) {
    const value = raw[q.id];
    if (!value) continue;
    const legacy = Array.isArray(value);
    const selected = legacy ? value : value.selected;
    const target = legacy ? q.previous || q : questionForAttempt(q, value);
    if (!legacy && value.revision !== target.revision) continue;
    if (!Array.isArray(selected) || !selected.length || new Set(selected).size !== selected.length) continue;
    if (target.type !== 'multiple' && selected.length !== 1) continue;
    if (!selected.every(id => target.options.some(option => option.id === id))) continue;
    clean[q.id] = {
      selected: [...selected], revision: target.revision,
      count: !legacy && Number.isSafeInteger(value.count) && value.count > 0 ? Math.min(value.count, 1000000) : 1,
      firstCorrect: !legacy && typeof value.firstCorrect === 'boolean' ? value.firstCorrect : grade(target, selected),
    };
  }
  return clean;
}

export function summarize(questions, answers) {
  const answered = questions.filter(q => Object.hasOwn(answers, q.id));
  const correct = answered.filter(q => wasCorrect(q, answers[q.id])).length;
  return { total: questions.length, answered: answered.length, correct, wrong: answered.length - correct };
}

export function filterQuestions(questions, answers, flagged, filter) {
  const flags = new Set(flagged);
  return questions.filter(q => filter === 'unanswered' ? !Object.hasOwn(answers, q.id)
    : filter === 'missed' ? Object.hasOwn(answers, q.id) && !wasCorrect(q, answers[q.id])
    : filter === 'saved' ? flags.has(q.id) : true);
}

export function routeFor(week, year, index = 0, id = null) {
  return id ? `#/week/${week}/${year}/question/${id}` : `#/week/${week}/${year}/q/${index + 1}`;
}

export function parseRoute(hash, bank) {
  const match = /^#\/week\/(\d+)\/(all|\d{4})\/(?:q\/(\d+)|question\/(w\d{2}-\d{4}-q\d{2}))$/.exec(hash);
  if (!match) return null;
  const week = Number(match[1]);
  if (![...bank.weeks, ...(bank.extraWeeks || [])].some(w => w.number === week)) return null;
  const list = questionsFor(bank, week, match[2]);
  if (!list.length) return null;
  let index;
  if (match[4]) {
    index = list.findIndex(q => q.id === match[4]);
    if (index < 0) return null;
  } else {
    // Numeric links from the first release referred only to the 530 main entries.
    const main = list.filter(q => !q.additional);
    const legacy = match[2] === 'all' && main.length ? main : list;
    const target = legacy[Math.min(Math.max(0, Number(match[3]) - 1), legacy.length - 1)];
    index = list.findIndex(q => q.id === target.id);
  }
  return { week, year: match[2], index };
}

export function readProgress(bank, modern, legacy) {
  const ids = new Set(bank.questions.map(q => q.id));
  const current = modern?.version === 2 && modern.answers && typeof modern.answers === 'object' && !Array.isArray(modern.answers);
  const progress = {
    version: 2, answers: validAnswers(bank, current ? modern.answers : legacy),
    flagged: current && Array.isArray(modern.flagged) ? [...new Set(modern.flagged.filter(id => ids.has(id)))] : [],
    resume: current && parseRoute(modern.resume, bank) ? modern.resume : '', review: null,
    flash: current ? readFlashRound(bank, modern.flash) : null,
  };
  if (current && modern.review && typeof modern.review.scope === 'string') {
    const [week, year] = modern.review.scope.split('/');
    const allowed = new Set(questionsFor(bank, week, year).map(q => q.id));
    if (allowed.size && ['all', 'unanswered', 'missed', 'saved'].includes(modern.review.filter)) {
      const reviewIds = Array.isArray(modern.review.ids) ? [...new Set(modern.review.ids.filter(id => allowed.has(id)))] : [];
      progress.review = {
        scope: modern.review.scope, filter: modern.review.filter, ids: reviewIds,
        pending: Array.isArray(modern.review.pending) ? [...new Set(modern.review.pending.filter(id => reviewIds.includes(id)))] : [],
      };
    }
  }
  return progress;
}

export function nextUnanswered(questions, answers, index) {
  for (let step = 1; step <= questions.length; step++) {
    const candidate = (index + step) % questions.length;
    if (!Object.hasOwn(answers, questions[candidate].id)) return candidate;
  }
  return Math.min(index + 1, questions.length - 1);
}

export function resetAnswers(answers, ids) {
  const next = { ...answers };
  for (const id of ids) delete next[id];
  return next;
}

export const FLASH_SCOPES = ['current', 'all', '2026', 'missed', 'saved'];
export const FLASH_DELAYS = [1, 2, 3, 6, 12];

export function shuffled(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.min(Math.max(random(), 0), .9999999999999999) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function flashQuestions(bank, scope, answers = {}, flagged = []) {
  if (scope === '2026') return bank.questions.filter(q => q.year === 2026);
  return filterQuestions(bank.questions, answers, flagged, scope);
}

export function createFlashRound(bank, scope = 'current', answers = {}, flagged = [], preferences = {}, random = Math.random) {
  const pool = flashQuestions(bank, scope, answers, flagged);
  const list = scope === 'current'
    ? [...shuffled(pool.filter(q => q.year === 2026), random), ...shuffled(pool.filter(q => q.year !== 2026), random)]
    : shuffled(pool, random);
  return { scope, ids: list.map(q => q.id), index: 0, answers: {}, seen: [], last: null, bypass: preferences.bypass === true,
    autoNext: preferences.autoNext !== false, delay: FLASH_DELAYS.includes(preferences.delay) ? preferences.delay : preferences.bypass === true ? 3 : 6, complete: false };
}

export function readFlashRound(bank, raw) {
  if (!raw || !FLASH_SCOPES.includes(raw.scope) || !Array.isArray(raw.ids)) return null;
  const allowed = new Set(flashQuestions(bank, raw.scope).map(q => q.id));
  // Missed/saved rounds are snapshots: a corrected or unstarred question stays in its round.
  if (raw.scope === 'missed' || raw.scope === 'saved') for (const q of bank.questions) allowed.add(q.id);
  const ids = [...new Set(raw.ids.filter(id => allowed.has(id)))];
  if (!ids.length && !['missed', 'saved'].includes(raw.scope)) return null;
  const allAnswers = validAnswers(bank, raw.answers);
  const answers = Object.fromEntries(ids.filter(id => allAnswers[id]).map(id => [id, allAnswers[id]]));
  const seen = [...new Set([...(Array.isArray(raw.seen) ? raw.seen.filter(id => ids.includes(id)) : []), ...Object.keys(answers)])];
  const index = Number.isSafeInteger(raw.index) ? Math.min(Math.max(raw.index, 0), Math.max(ids.length - 1, 0)) : 0;
  const bypass = raw.bypass === true;
  return { scope: raw.scope, ids, index, answers, seen, bypass, last: ids.includes(raw.last) && (answers[raw.last] || bypass && seen.includes(raw.last)) ? raw.last : null,
    autoNext: raw.autoNext !== false, delay: FLASH_DELAYS.includes(raw.delay) ? raw.delay : bypass ? 3 : 6,
    complete: raw.complete === true && ids.length > 0 && ids.every(id => bypass ? seen.includes(id) : answers[id]) };
}

export function parseFlashRoute(hash, bank) {
  if (!hash || hash === '#' || hash === '#/') return { scope: null, id: null, bypass: null };
  const cards = /^#\/cards\/(current|all|2026|missed|saved)$/.exec(hash);
  if (cards) return { scope: cards[1], id: null, bypass: true };
  const match = /^#\/revise\/(current|all|2026|missed|saved)(?:\/question\/(w\d{2}-\d{4}-q\d{2}))?$/.exec(hash);
  if (!match || (match[2] && !bank.questions.some(q => q.id === match[2] && (match[1] !== '2026' || q.year === 2026)))) return null;
  return { scope: match[1], id: match[2] || null, bypass: false };
}

export function flashRoute(scope, id = null, bypass = false) {
  return bypass ? `#/cards/${scope}` : `#/revise/${scope}${id ? '/question/' + id : ''}`;
}
