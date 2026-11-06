import { describe, expect, it } from 'vitest';
import { ALL_PROBLEMS } from './problems';
import { aimRing, encircledPeg, PEG_HEIGHT, PEG_RADIUS, projectRing, RING_FROM, RING_INNER, RING_TUBE, ringContactAt, ringPegs, ringPlanPoint, ringPoint, traceRing, type RingThrow } from './ring';
const shot: RingThrow = { x: 0, y: 900, duration: 1, pull: 100 };
// 的の中央の高さを下降する時刻。前後も含めて本体へ接触しないかはtraceRingが判定する。
const tMiddle = ((1040 - RING_FROM.z) + Math.sqrt((1040 - RING_FROM.z) ** 2 + 4 * 1040 * (RING_FROM.z - PEG_HEIGHT))) / 2080;
function aimAt(x: number, y: number) {
  const u = (1 - Math.exp(-3 * tMiddle)) / (1 - Math.exp(-3));
  return aimRing(-(x - RING_FROM.x * (1 - u)) / u / 5, (y - RING_FROM.y * (1 - u)) / u / 8)!;
}
describe('輪投げの3次元接触', () => {
  it('奥の物体は縮小され、高い輪と床の影は別の場所に映る', () => {
    const near = projectRing({ x: 0, y: 100, z: 0 });
    const far = projectRing({ x: 0, y: 860, z: 0 });
    expect(far.scale).toBeLessThan(near.scale);
    expect(far.y).toBeLessThan(near.y);
    expect(projectRing({ x: 0, y: 100, z: 180 }).y).toBeLessThan(near.y);
  });
  it('輪の穴を通っている札・棒には接触しない', () => {
    expect(ringContactAt({ x: 0, y: 0, z: PEG_HEIGHT }, [{ id: 'p', x: 0, y: 0 }])).toBeNull();
    expect(ringContactAt({ x: 0, y: 0, z: 50 }, [{ id: 'p', x: 0, y: 0 }])).toBeNull();
  });
  it('札と棒はそれぞれ高さ・厚みを持ち、輪の縁との接触を区別する', () => {
    const pegs = [{ id: 'p', x: 0, y: 0 }];
    expect(ringContactAt({ x: 66, y: 0, z: PEG_HEIGHT }, pegs)?.kind).toBe('sign');
    expect(ringContactAt({ x: 66, y: 0, z: 50 }, pegs)?.kind).toBe('pole');
    expect(ringContactAt({ x: 66, y: 0, z: PEG_HEIGHT + PEG_RADIUS + RING_TUBE + 2 }, pegs)).toBeNull();
  });
  it('札の上から穴を通し、棒を囲んで床へ落ちた時だけ成功する', () => {
    const pegs = [{ id: 'p', x: 150, y: 480 }];
    const plan = traceRing(aimAt(150, 480), pegs);
    expect(plan.hit).toBe('p');
    expect(plan.contacts.filter((c) => c.kind !== 'floor')).toHaveLength(0);
    expect(plan.landing.z).toBe(RING_TUBE);
    // 自動的に棒の中心へ吸着しない。
    expect(Math.hypot(plan.landing.x - 150, plan.landing.y - 480)).toBeGreaterThan(1);
  });
  it('札に当たってはじかれても、落ちたときに棒を囲んでいれば成功する', () => {
    const aim = aimAt(150, 480);
    const pegs = [{ id: 'edge', x: 150 + RING_INNER - 12, y: 480 }];
    const plan = traceRing(aim, pegs);
    expect(plan.contacts.some((c) => c.kind === 'sign')).toBe(true);
    expect(plan.hit).toBe('edge');
    expect(encircledPeg(plan.landing, pegs)?.id).toBe('edge');
  });
  it('入ったかどうかは、落ちた場所で棒を囲んでいるかだけで決まる', () => {
    const pegs = [{ id: 'p', x: 0, y: 480 }];
    let hits = 0;
    let misses = 0;
    for (let x = -120; x <= 120; x += 15) {
      for (let y = 380; y <= 580; y += 25) {
        const plan = traceRing(aimAt(x, y), pegs);
        expect(plan.hit, `${x},${y}`).toBe(encircledPeg(plan.landing, pegs)?.id ?? null);
        if (plan.hit) hits++; else misses++;
      }
    }
    expect(hits).toBeGreaterThan(0);
    expect(misses).toBeGreaterThan(0);
  });
  it('すでに入った的にも衝突するが、同じ演算を再度加算しない', () => {
    const plan = traceRing(aimAt(150, 480), [{ id: 'old', x: 150, y: 480, available: false }]);
    expect(plan.hit).toBeNull();
    expect(plan.repeat).toBe('old');
    const edge = traceRing(aimAt(150, 480), [{ id: 'old', x: 200, y: 480, available: false }]);
    expect(edge.contacts.some((c) => c.id === 'old' && c.kind === 'sign')).toBe(true);
  });
  it('高速の投射でも札に接触し、接触位置から速度を変えてはじかれる', () => {
    const aimed = aimAt(150, 860);
    const peg = { id: 'edge', x: 200, y: 860 };
    const plan = traceRing(aimed, [peg]);
    expect(plan.contacts.some((c) => c.kind === 'sign')).toBe(true);
    const contact = plan.contacts.find((c) => c.kind === 'sign')!;
    const later = ringPlanPoint(plan, Math.min(contact.t + .05, plan.endTime));
    const unobstructed = ringPoint(aimed, Math.min(contact.t + .05, plan.endTime));
    expect(Math.hypot(later.x - unobstructed.x, later.y - unobstructed.y, later.z - unobstructed.z)).toBeGreaterThan(1);
  });
  it('札の下まで飛んだ輪は棒の側面に接触し、棒を横からすり抜けない', () => {
    const peg = { id: 'pole-side', x: 66, y: 940 };
    const plan = traceRing(shot, [peg]);
    expect(plan.hit).toBeNull();
    expect(plan.contacts.some((c) => c.kind === 'pole')).toBe(true);
    expect(plan.contacts.some((c) => c.kind === 'sign')).toBe(false);
  });
  it('現在の全問題で、手前の的も含めて飛行中の衝突を調べた上で全的へ入れられる', () => {
    for (const problem of ALL_PROBLEMS.filter((p) => p.set !== 'lane')) {
      const pegs = ringPegs(problem);
      for (const peg of pegs) {
        const aimed = aimAt(peg.x, peg.y);
        expect(aimed).not.toBeNull();
        expect(traceRing(aimed, pegs).hit, `${problem.id}:${peg.id}`).toBe(peg.id);
      }
    }
  });
  it('予測と実投は同じ計画を再生し、描画フレームが飛んでも結果を変えない', () => {
    const plan = traceRing(shot, []);
    expect(ringPlanPoint(plan, plan.endTime + 1)).toEqual(plan.landing);
    expect(traceRing({ ...shot, duration: .3 }, []).landing).toEqual(plan.landing);
    expect(traceRing({ ...shot, duration: 1.6 }, []).landing).toEqual(plan.landing);
  });
});
