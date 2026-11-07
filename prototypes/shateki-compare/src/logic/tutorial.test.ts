import { describe, expect, it } from 'vitest';
import { nodeAt } from './course';
import { ALL_PROBLEMS } from './problems';
import { afterLeave, afterRestart, afterShot, loadMemory, saveMemory, TUTORIAL_KEY, TUTORIAL_REF, TUTORIAL_TARGET } from './tutorial';

function memoryStore() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
}

describe('手引き（#15）', () => {
  it('手引きの問題は 1-1（A）で、光らせる的は ＋20', () => {
    const node = nodeAt(TUTORIAL_REF)!;
    expect(node.variant).toBe('A');
    const problem = ALL_PROBLEMS.find((p) => p.id === node.problemId)!;
    expect(problem.targets.find((t) => t.id === TUTORIAL_TARGET)).toMatchObject({ op: '+', value: 20 });
  });

  it('光らせた的に当てたときだけ、つぎの手順に進む', () => {
    expect(afterShot('aim', TUTORIAL_TARGET)).toBe('changed');
    expect(afterShot('aim', 't1')).toBe('aim');
    expect(afterShot('aim', null)).toBe('aim');
    expect(afterShot('free', TUTORIAL_TARGET)).toBe('free');
  });

  it('「さいしょから」で、当てたあとの説明なら、もう一度撃たせる', () => {
    expect(afterRestart('changed')).toBe('aim');
    expect(afterRestart('free')).toBe('free');
    expect(afterRestart('goal')).toBe('goal');
  });

  it('クリアする前に 1-1 から出たらマップからやり直し、クリア後なら終わり', () => {
    expect(afterLeave('goal')).toBe('map');
    expect(afterLeave('free')).toBe('map');
    expect(afterLeave('next')).toBe('done');
    expect(afterLeave('done')).toBe('done');
  });

  it('終えたことを遊ぶ人ごとに覚え、ほかの人には覚えていない状態で返す', () => {
    const store = memoryStore();
    expect(loadMemory(store, 'p1')).toEqual({ player: 'p1', done: false, pull: [] });
    saveMemory(store, { player: 'p1', done: true, pull: ['sling'] });
    expect(loadMemory(store, 'p1')).toEqual({ player: 'p1', done: true, pull: ['sling'] });
    expect(loadMemory(store, 'p2')).toEqual({ player: 'p2', done: false, pull: [] });
  });

  it('壊れた保存や、読めないときは、覚えていない状態で続ける', () => {
    const store = memoryStore();
    store.data.set(TUTORIAL_KEY, '{');
    expect(loadMemory(store, 'p1').done).toBe(false);
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(loadMemory(broken, 'p1').done).toBe(false);
    expect(() => saveMemory(broken, { player: 'p1', done: true, pull: [] })).not.toThrow();
    expect(loadMemory(undefined, 'p1').done).toBe(false);
  });
});
