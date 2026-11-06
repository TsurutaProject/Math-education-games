/**
 * プラットフォームのホーム画面の URL（#49）。タイトルを押すとここにもどる。
 * 公開するときは射的が /shateki/ に置かれる（scripts/build-all.sh）ので、1つ上（../）がホーム。
 * 開発中に別のポートで動かしているホームへつなぐときは、.env.local に次のように書く。
 *   VITE_PLATFORM_URL=http://localhost:5173/
 */
const fromEnv: unknown = import.meta.env.VITE_PLATFORM_URL;
export const PLATFORM_URL: string = typeof fromEnv === 'string' && fromEnv !== '' ? fromEnv : '../';
