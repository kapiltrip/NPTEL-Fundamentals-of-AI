export const STORAGE_KEY = 'nptel-ai-practice-v1';

export function questionsFor(bank, week, year = '2026') {
  return bank.questions.filter(q => q.week === Number(week) && (year === 'all' || String(q.year) === String(year)))
    .sort((a, b) => b.year - a.year || a.number - b.number);
}

export function grade(question, selected) {
  if (!Array.isArray(selected) || !selected.length || new Set(selected).size !== selected.length) return false;
  return selected.length === question.correct.length && selected.every(id => question.correct.includes(id));
}

export function validAnswers(bank, raw) {
  const clean = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
  for (const q of bank.questions) {
    const value = raw[q.id];
    if (!Array.isArray(value) || !value.length || new Set(value).size !== value.length) continue;
    if (q.type !== 'multiple' && value.length !== 1) continue;
    if (value.every(id => q.options.some(option => option.id === id))) clean[q.id] = [...value];
  }
  return clean;
}

export function summarize(questions, answers) {
  const answered = questions.filter(q => Object.hasOwn(answers, q.id));
  const correct = answered.filter(q => grade(q, answers[q.id])).length;
  return { total: questions.length, answered: answered.length, correct, wrong: answered.length - correct };
}

export function routeFor(week, year, index = 0) {
  return `#/week/${week}/${year}/q/${index + 1}`;
}

export function parseRoute(hash, bank) {
  const match = /^#\/week\/(\d+)\/(all|\d{4})\/q\/(\d+)$/.exec(hash);
  if (!match) return null;
  const week = Number(match[1]);
  if (!bank.weeks.some(w => w.number === week)) return null;
  const list = questionsFor(bank, week, match[2]);
  if (!list.length) return null;
  return { week, year: match[2], index: Math.min(Math.max(0, Number(match[3]) - 1), list.length - 1) };
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
