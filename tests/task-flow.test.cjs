const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Compile the server helpers in memory; no network, database or extra test dependency.
require.extensions['.ts'] = (module, filename) => {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  module._compile(source, filename);
};
const { askAI } = require('../src/lib/ai.ts');
const { clarifyTask, buildTaskCard } = require('../src/lib/task-ai.ts');
const { taskFields, stubQuestions, readPublishCard, readDraft, readAnswers } = require('../src/lib/task-card.ts');
const originalFetch = global.fetch;
const originalTimer = global.setTimeout;
const originalKeys = [process.env.OPENAI_API_KEY, process.env.NVIDIA_API_KEY];
afterEach(() => {
  global.fetch = originalFetch;
  global.setTimeout = originalTimer;
  ['OPENAI_API_KEY', 'NVIDIA_API_KEY'].forEach((key, index) => {
    if (originalKeys[index] === undefined) delete process.env[key];
    else process.env[key] = originalKeys[index];
  });
});
const response = text => Response.json({ choices: [{ message: { content: text }, finish_reason: 'stop' }] });
function keys(openai = '', nvidia = '') { process.env.OPENAI_API_KEY = openai; process.env.NVIDIA_API_KEY = nvidia; }

test('no keys: offline questions and card preserve draft and answers', async () => {
  keys();
  global.fetch = () => { throw new Error('Network must not be used'); };
  const draft = 'Нужно автоматизировать заявки';
  const clarified = await clarifyTask(draft);
  assert.equal(clarified.source, 'stub');
  assert.ok(clarified.questions.length >= 3 && clarified.questions.length <= 4);
  assert.ok(clarified.questions.every(q => taskFields.includes(q.field)));
  const built = await buildTaskCard(draft, { contact: 'Связь по почте', expectedResult: 'Прототип' });
  assert.equal(built.card.rawDraft, draft);
  assert.equal(built.card.contact, 'Связь по почте');
  assert.equal(built.card.expectedResult, 'Прототип');
  assert.equal(built.card.constraints, null);
  assert.notDeepEqual(stubQuestions(''), stubQuestions('Данные в Excel, сейчас вручную'));
});

test('OpenAI success uses requested model and messages, skips NVIDIA', async () => {
  keys('test-openai', 'test-nvidia');
  let calls = 0;
  global.fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'gpt-4o-mini');
    assert.deepEqual(body.messages, [{ role: 'system', content: 'System' }, { role: 'user', content: 'User' }]);
    assert.ok(options.signal instanceof AbortSignal);
    return response('answer');
  };
  assert.deepEqual(await askAI('System', 'User'), { text: 'answer', source: 'openai' });
  assert.equal(calls, 1);
});

test('HTTP failure falls back to NVIDIA with its key and model', async () => {
  keys('test-openai', 'test-nvidia');
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push(url);
    if (calls.length === 1) return new Response('', { status: 429 });
    assert.equal(options.headers.Authorization, 'Bearer test-nvidia');
    assert.equal(JSON.parse(options.body).model, 'meta/llama-3.1-8b-instruct');
    return response('nvidia answer');
  };
  assert.equal((await askAI('s', 'u')).source, 'nvidia');
  assert.deepEqual(calls, ['https://api.openai.com/v1/chat/completions', 'https://integrate.api.nvidia.com/v1/chat/completions']);
});

test('NVIDIA works when OpenAI key is absent', async () => {
  keys('', 'test-nvidia');
  global.fetch = async url => { assert.ok(url.includes('nvidia')); return response('ok'); };
  assert.equal((await askAI('s', 'u')).source, 'nvidia');
});

test('8-second timeout aborts each provider and returns null', async () => {
  keys('test-openai', 'test-nvidia');
  let aborted = 0;
  global.setTimeout = (callback, delay) => { assert.equal(delay, 8000); return originalTimer(callback, 5); };
  global.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => { aborted++; reject(new Error('Aborted')); }, { once: true });
  });
  assert.equal(await askAI('s', 'u'), null);
  assert.equal(aborted, 2);
});

test('invalid JSON and invalid question schemas return visible error and usable defaults', async () => {
  keys('test-openai');
  for (const invalid of ['not JSON', '{}', '{"questions":[{"field":"unknown","question":"?"}]}']) {
    global.fetch = async () => response(invalid);
    const result = await clarifyTask('Черновик');
    assert.equal(result.source, 'stub');
    assert.ok(result.error);
    assert.equal(result.questions.length, 4);
    const built = await buildTaskCard('Черновик', { users: 'Менеджеры' });
    assert.ok(built.error);
    assert.equal(built.card.users, 'Менеджеры');
  }
});

test('valid AI card cannot replace original draft or set database metadata', async () => {
  keys('test-openai');
  global.fetch = async () => response(JSON.stringify({ ...Object.fromEntries(taskFields.map(field => [field, null])), title: 'Название', rawDraft: 'changed', score: 999, confirmed: true, id: 'untrusted', status: 'priority' }));
  const { card, source } = await buildTaskCard('Original', {});
  assert.equal(source, 'openai');
  assert.equal(card.rawDraft, 'Original');
  assert.equal(card.id, null);
  assert.equal(card.confirmed, false);
  assert.equal(card.score, 0);
  card.title = 'Правка пользователя';
  card.contact = 'Контакт';
  const saved = readPublishCard(card);
  assert.equal(saved.title, 'Правка пользователя');
  assert.equal(saved.contact, 'Контакт');
  assert.equal(saved.confirmed, true);
  assert.equal(saved.id, undefined);
  assert.equal(readPublishCard({ ...card, score: -1 }).score, 10);
  assert.equal(readPublishCard({ ...card, status: 'priority' }).status, 'draft');
});

test('invalid request values are rejected before provider calls', () => {
  for (const value of [null, {}, { rawDraft: ' ' }, { rawDraft: 42 }, { rawDraft: 'x'.repeat(20001) }]) assert.throws(() => readDraft(value));
  assert.throws(() => readAnswers({ arbitrary: 'value' }));
  assert.throws(() => readAnswers({ context: {} }));
});

test('rating covers all 128 field combinations, whitespace and exact weights', () => {
  const { calculateScore, getStatus } = require('../src/lib/rating.ts');
  const weights = [20, 20, 15, 15, 10, 10, 10];
  for (let mask = 0; mask < 128; mask++) {
    const task = Object.fromEntries(taskFields.map((field, index) => [field, mask & (1 << index) ? ' text ' : index % 2 ? ' \n\t ' : null]));
    const expected = weights.reduce((sum, weight, index) => sum + (mask & (1 << index) ? weight : 0), 0);
    const rating = calculateScore(task);
    assert.equal(rating.score, expected);
    assert.equal(Object.values(rating.breakdown).reduce((a, b) => a + b), expected);
    assert.equal(rating.missing.length, 7 - taskFields.filter((_, index) => mask & (1 << index)).length);
    assert.equal(readPublishCard({ ...task, title: 'Task', rawDraft: 'Draft', score: 999, status: 'bad' }).score, expected);
  }
  for (const [score, status] of [[0, 'draft'], [39, 'draft'], [40, 'working'], [69, 'working'], [70, 'ready'], [89, 'ready'], [90, 'priority'], [100, 'priority']]) assert.equal(getStatus(score), status);
  const empty = calculateScore(Object.fromEntries(taskFields.map(field => [field, null])));
  assert.deepEqual(empty.missing, ['Контекст и потребность', 'Данные и материалы', 'Ожидаемый результат', 'Критерии успеха', 'Ограничения', 'Пользователи', 'Контакт и формат связи']);
});
