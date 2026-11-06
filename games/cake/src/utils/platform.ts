/**
 * プラットフォームのホーム画面の URL（#49）。ゲームのタイトルを押すとここにもどる。
 * 公開するときは分ケーキが /cake/ に置かれる（scripts/build-all.sh）ので、1つ上（../）がホーム。
 * 開発中に別のポートで動かしているホームへつなぐときは、.env.local に次のように書く。
 *   VITE_PLATFORM_URL=http://localhost:5173/
 *
 * ゲームは GameViewport の iframe の中で動くので、リンクは target="_top" で画面全体を移す。
 */
const fromEnv: unknown = import.meta.env.VITE_PLATFORM_URL
export const PLATFORM_URL: string = typeof fromEnv === 'string' && fromEnv !== '' ? fromEnv : '../'
