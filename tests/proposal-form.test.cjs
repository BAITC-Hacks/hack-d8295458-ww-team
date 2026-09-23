const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function loadAction(create) {
  const invalidated = [];
  const compiled = ts.transpileModule(fs.readFileSync('src/app/actions.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)(name => {
    if (name === 'next/cache') return { revalidatePath: path => invalidated.push(path) };
    if (name === '@/lib/prisma') return { prisma: { proposal: { create } } };
    throw new Error('Unexpected dependency: ' + name);
  }, exports);
  return { action: exports.createProposal, invalidated };
}

function data(overrides = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ taskId: 'task', teamName: 'Team', idea: 'Idea', plan: 'Plan', ...overrides })) form.set(key, value);
  return form;
}

test('proposal action always returns error state on validation and database failures', async () => {
  let calls = 0;
  const { action } = loadAction(async () => { calls++; throw new Error('Database unavailable'); });
  for (const form of [data({ teamName: '' }), data({ idea: 'a'.repeat(10001) }), data({ link: 'javascript:alert(1)' }), data()]) {
    const result = await action(undefined, form);
    assert.equal(typeof result.error, 'string');
    assert.ok(result.error.length);
    assert.ok(!result.success);
  }
  assert.equal(calls, 1);
});

test('successful proposal returns an explicit state after failure and on repeated submission', async () => {
  let writes = 0;
  const { action, invalidated } = loadAction(async () => { writes++; return { id: 'proposal' }; });
  let state = await action({ error: null }, data({ plan: '' }));
  state = await action(state, data());
  assert.deepEqual(state, { error: null, success: true });
  state = await action(state, data());
  assert.deepEqual(state, { error: null, success: true });
  assert.equal(writes, 2);
  assert.deepEqual(invalidated, ['/catalog', '/admin', '/catalog/task', '/catalog', '/admin', '/catalog/task']);
});
