// Run against the local dev server: node tests/scenario.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const invalidated = [];
const actions = {};
const compiled = ts.transpileModule(fs.readFileSync('src/app/actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
new Function('require', 'exports', compiled)(name => {
  if (name === '@/lib/prisma') return { prisma: db };
  if (name === 'next/cache') return { revalidatePath: path => invalidated.push(path) };
  throw new Error(name);
}, actions);
const base = 'http://127.0.0.1:3000';
let taskId;
function form(values) { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; }
async function post(path, data) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return { status: response.status, data: await response.json() };
}
(async () => {
  const rawDraft = 'Scenario ' + Date.now();
  const questions = await post('/api/clarify', { rawDraft });
  assert.equal(questions.status, 200);
  assert.ok(['stub', 'openai', 'nvidia'].includes(questions.data.source));
  assert.ok(questions.data.questions.length >= 3);
  const answers = Object.fromEntries(questions.data.questions.map(q => [q.field, 'Answer for ' + q.field]));
  const built = await post('/api/build-card', { rawDraft, answers });
  assert.equal(built.status, 200);
  const card = built.data.card;
  assert.equal((await post('/api/tasks', { ...card, title: '  ' })).status, 400);
  assert.equal((await post('/api/tasks', { ...card, rawDraft: '  ' })).status, 400);
  const published = await post('/api/tasks', card);
  assert.equal(published.status, 201);
  assert.equal(published.data.redirectTo, '/catalog');
  taskId = published.data.id;
  const task = await db.businessTask.findUniqueOrThrow({ where: { id: taskId } });
  assert.equal(task.confirmed, true);
  assert.equal(task.score, card.score);
  assert.equal(task.status, card.status);
  for (const missing of ['idea', 'plan']) {
    const bad = { taskId, teamName: 'Test', idea: 'Idea', plan: 'Plan', [missing]: '  ' };
    assert.ok((await actions.createProposal({ error: null }, form(bad))).error);
  }
  for (const teamName of ['Scenario team A', 'Scenario team B']) {
    const result = await actions.createProposal({ error: null }, form({ taskId, teamName, idea: 'Idea', plan: 'Plan' }));
    assert.deepEqual(result, { error: null, success: true });
  }
  const proposals = await db.proposal.findMany({ where: { taskId }, orderBy: { teamName: 'asc' } });
  assert.equal(proposals.length, 2);
  assert.ok((await actions.chooseProposal({ error: null }, form({ taskId: 'other-task', proposalId: proposals[0].id }))).error);
  for (const selected of proposals) {
    assert.deepEqual(await actions.chooseProposal({ error: null }, form({ taskId, proposalId: selected.id })), { error: null, success: true });
    const current = await db.proposal.findMany({ where: { taskId } });
    assert.equal(current.filter(p => p.status === 'accepted').length, 1);
    assert.equal(current.find(p => p.id === selected.id).status, 'accepted');
    assert.equal(current.find(p => p.id !== selected.id).status, 'rejected');
  }
  const catalog = await fetch(base + '/catalog');
  assert.equal(catalog.status, 200);
  const html = await catalog.text();
  assert.ok(html.includes('Scenario team A'));
  assert.ok(html.includes('Scenario team B'));
  assert.ok(html.includes('Выбрано бизнесом'));
  assert.ok(invalidated.includes('/catalog'));
  assert.ok(invalidated.includes('/catalog/' + taskId));
  console.log('PASS: draft -> questions -> card -> rating -> publication -> catalog -> proposals -> business selection/reselection');
  console.log('PASS: required fields, wrong-task selection, single accepted proposal, revalidation paths');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (taskId) {
    await db.proposal.deleteMany({ where: { taskId } });
    await db.businessTask.delete({ where: { id: taskId } });
  }
  await db.$disconnect();
});
