import { describe, expect, it } from 'vitest';
import { createGlowTracker, HINT_GLOW_MS } from './HintGlow';

describe('ヒントの光る時間（#57）', () => {
  const setup = () => {
    let t = 0;
    const glowing = createGlowTracker(() => t);
    return { glowing, at: (ms: number) => { t = ms; } };
  };

  it('ヒントの的だけ光る。ヒントがなければ光らない', () => {
    const { glowing } = setup();
    expect(glowing({ seq: 1, targetId: 'a' }, 'a')).toBe(true);
    expect(glowing({ seq: 1, targetId: 'a' }, 'b')).toBe(false);
    expect(glowing(null, 'a')).toBe(false);
  });

  it('見えたときから 3 秒だけ光る', () => {
    const { glowing, at } = setup();
    const hint = { seq: 1, targetId: 'a' };
    at(1000);
    expect(glowing(hint, 'a')).toBe(true);
    at(1000 + HINT_GLOW_MS - 1);
    expect(glowing(hint, 'a')).toBe(true);
    at(1000 + HINT_GLOW_MS);
    expect(glowing(hint, 'a')).toBe(false);
  });

  it('D・E：見えていない間は聞かれないので、出てきたときから 3 秒数える。一度光り終えたら、また出てきても光らない', () => {
    const { glowing, at } = setup();
    const hint = { seq: 1, targetId: 'a' };
    // ヒントを押したのは 0 秒。的が流れてきて見えたのは 5 秒
    at(5000);
    expect(glowing(hint, 'a')).toBe(true);
    at(7000);
    expect(glowing(hint, 'a')).toBe(true);
    at(20000);
    expect(glowing(hint, 'a')).toBe(false);
  });

  it('もう一度ヒントを押すと（seq が変わると）、また 3 秒光る', () => {
    const { glowing, at } = setup();
    at(0);
    glowing({ seq: 1, targetId: 'a' }, 'a');
    at(10000);
    expect(glowing({ seq: 1, targetId: 'a' }, 'a')).toBe(false);
    expect(glowing({ seq: 2, targetId: 'a' }, 'a')).toBe(true);
  });
});
