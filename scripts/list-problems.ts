/** 問題ごとの解き方を一覧表示する（チームで答えを確認する用）。 npm run list:problems */
import { analyzeProblem } from '../src/logic/generator';
import { formatExpression, targetLabel } from '../src/logic/ops';
import { ALL_PROBLEMS } from '../src/logic/problems';
import { distinctSolutions } from '../src/logic/solver';

for (const p of ALL_PROBLEMS) {
  const a = analyzeProblem(p);
  const targets = p.targets
    .map((t) => targetLabel(t.op, t.value) + (t.size ? `(${t.size}${t.moving ? '・動く' : ''})` : ''))
    .join('  ');
  console.log(`\n■ ${p.id}  目標 ${p.goal} / 弾 ${p.shots}  ${targets}`);
  for (const s of distinctSolutions(p).values()) {
    const tag = p.set === 'risk' ? (s.targets.every((t) => t.size === 'L' && !t.moving) ? ' ← 安全な道' : s.targets.length < p.shots ? ' ← 近道' : '') : '';
    console.log(`  ${formatExpression(s.targets)} = ${p.goal}${tag}`);
  }
  console.log(`  （${a.keys.length} 通り）`);
}
