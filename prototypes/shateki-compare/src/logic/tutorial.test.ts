import { describe, expect, it } from 'vitest';
import { COURSE, nodeAt } from './course';
import { newGame, shoot } from './game';
import { layoutTargets } from './hit';
import { ALL_PROBLEMS } from './problems';
import { aimRing, ringPegs, ringPullFor, traceRing } from './ring';
import { canReach } from './solver';
import { afterLeave, afterRestart, afterShot, COACH_PLANS, coachTargets, loadMemory, saveMemory, TUTORIAL_KEY, TUTORIAL_REF, TUTORIAL_TARGET } from './tutorial';

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

  it('狙い方の手引きの問題は、その射撃タイプを初めて使う問題', () => {
    for (const shooter of ['sling', 'ring'] as const) {
      const first = COURSE.flatMap((st) => st.nodes).find((n) => n.shooter === shooter)!;
      expect(first.problemId).toBe(COACH_PLANS[shooter].problemId);
      expect(coachTargets(shooter, first.problemId)).toEqual(COACH_PLANS[shooter].targets);
    }
    expect(coachTargets('gun', 'risk-1-2')).toBeNull();
    expect(coachTargets('sling', 'risk-1-1')).toBeNull();
  });

  it('手引きで撃たせる的を当てても、まだクリアできて、クリアしきってはいない（残りを自分で選べる）', () => {
    for (const plan of Object.values(COACH_PLANS)) {
      const problem = ALL_PROBLEMS.find((p) => p.id === plan.problemId)!;
      let game = newGame(problem);
      for (const id of plan.targets) game = shoot(problem, game, id);
      expect(game.status).toBe('playing');
      expect(canReach(problem, game.calc, game.usedIds, game.shotsLeft)).toBe(true);
    }
  });

  it('パチンコの手引きの的は、動かない', () => {
    const problem = ALL_PROBLEMS.find((p) => p.id === COACH_PLANS.sling.problemId)!;
    const placed = layoutTargets(problem, { riskMode: true, sizeScale: 1, singleRow: true });
    for (const id of COACH_PLANS.sling.targets) expect(placed.find((p) => p.id === id)!.amp).toBe(0);
  });

  it('輪投げの手引きの引き方（棒の位置から逆算）で、ねらった棒に入る', () => {
    const problem = ALL_PROBLEMS.find((p) => p.id === COACH_PLANS.ring.problemId)!;
    const pegs = ringPegs(problem);
    const used: string[] = [];
    for (const id of COACH_PLANS.ring.targets) {
      const peg = pegs.find((p) => p.id === id)!;
      const pull = ringPullFor(peg);
      const shot = aimRing(pull.x, pull.y, 0.8)!;
      expect(traceRing(shot, pegs.map((p) => ({ ...p, available: !used.includes(p.id) }))).hit).toBe(id);
      used.push(id);
    }
  });
});
