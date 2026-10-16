import assert from 'node:assert/strict';
import { test } from 'node:test';
import plugin, { parsePs } from '../index.js';
import { fakeContext } from './fake.js';

const WT = '/Users/x/work/b/api/.claude/worktrees/bridge-cse_01';
const session = { id: '6a7802e0-1fdb-5b42-97c0-58f0601c2628', account: 'b', env: 'api', cwd: WT };
const stop = plugin.actions.find((a) => a.id === 'stop');

function setup(ps, { killWorks = true, dryRun = false } = {}) {
  let alive = true;
  return fakeContext({
    dryRun,
    services: async () => [{ environment: 'api', account: 'b', label: 'com.devhost.rc.b.api', enabled: true, running: true, pid: 100 }],
    rules: [
      ['ps -axo', { stdout: ps }],
      ['lsof -a -p 200', { stdout: `p200\nn${WT}\n` }],
      ['lsof -a -p 201', { stdout: 'p201\nn/Users/x/work/b/api/.claude/worktrees/other\n' }],
      ['lsof -a -p 300', { stdout: `p300\nn${WT}\n` }],
      ['kill -TERM', () => { if (killWorks) alive = false; return {}; }],
      ['kill -KILL', () => { alive = false; return {}; }],
      ['kill -0', () => ({ code: alive ? 0 : 1 })],
    ],
  });
}

test("stops only the Remote Control service's child working in the session's directory", async () => {
  // 200: the session; 201: another session of the service; 300: the Claude app's, same directory.
  const { ctx, calls } = setup(' 200 100 400000 /usr/local/bin/claude --print --session-id cse_01\n 201 100 300000 /usr/local/bin/claude --print --session-id cse_02\n 300 999 500000 /Applications/Claude.app/claude\n');
  const r = await stop.run(ctx, { session });
  assert.equal(r.summary, 'stopped session 6a7802e0 (pid 200, 391 MB freed)');
  assert.deepEqual(calls.filter((l) => /^kill -(TERM|KILL)/.test(l)), ['kill -TERM 200']);
});

test('SIGKILL when it does not end; nothing when there is no such process; a dry run only plans', async () => {
  const stubborn = setup(' 200 100 1024 /usr/local/bin/claude --print\n', { killWorks: false });
  assert.match((await stop.run(stubborn.ctx, { session })).summary, /with SIGKILL/);
  const none = setup(' 300 999 1024 /Applications/Claude.app/claude\n');
  assert.match((await stop.run(none.ctx, { session })).summary, /has no process of a devhost Remote Control service/);
  assert.equal(none.calls.some((l) => l.startsWith('kill -')), false);
  const dry = setup(' 200 100 2048 /usr/local/bin/claude --print\n', { dryRun: true });
  assert.equal((await stop.run(dry.ctx, { session })).summary, 'would stop session 6a7802e0 (pid 200, 2 MB)');
  assert.equal(dry.calls.some((l) => l.startsWith('kill -')), false);
  assert.deepEqual(parsePs('  12   1 2048 /bin/zsh -l\nbad line\n'), [{ pid: 12, ppid: 1, rssKb: 2048, command: '/bin/zsh -l' }]);
});
