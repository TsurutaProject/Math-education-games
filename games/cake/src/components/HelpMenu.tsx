import { useState } from 'react'
import { cakeImages, feedbackImages, toolImages } from '../data/assets'
import { FuriganaText } from './FuriganaText'

type HelpView = 'guide' | 'hint'

interface HelpMenuProps {
  onOpenTutorial: () => void
}

export function HelpMenu({ onOpenTutorial }: HelpMenuProps) {
  const [openView, setOpenView] = useState<HelpView | null>(null)

  return (
    <>
      <section className="help-menu" aria-label="ヘルプ">
        <button type="button" onClick={() => setOpenView('guide')}>
          <FuriganaText text="操作ガイド" />
        </button>
        <button type="button" onClick={() => setOpenView('hint')}>
          ヒント
        </button>
        <button type="button" onClick={onOpenTutorial}>
          チュートリアル
        </button>
      </section>

      {openView !== null ? (
        <div className="help-overlay" role="dialog" aria-modal="true" aria-labelledby="help-title">
          <section className={`help-dialog${openView === 'guide' ? ' help-dialog--guide' : ''}`}>
            <button
              type="button"
              className="help-dialog__close"
              aria-label="閉じる"
              onClick={() => setOpenView(null)}
            >
              ×
            </button>
            <h2 id="help-title">
              <FuriganaText text={openView === 'guide' ? '操作ガイド' : 'ヒント'} />
            </h2>
            {openView === 'guide' ? (
              <div className="help-guide">
                <article className="help-guide__step">
                  <div className="help-guide__visual help-guide__visual--cut" aria-hidden="true">
                    <img src={cakeImages.shortcake} alt="" />
                    <img src={toolImages.cut} alt="" />
                    <span />
                  </div>
                  <strong>1. <FuriganaText text="切る" /></strong>
                  <p><FuriganaText text="包丁を選び、点線にそってケーキを切る。小さいピースは外側から中心まで切れば作れます。" /></p>
                </article>
                <article className="help-guide__step">
                  <div className="help-guide__visual help-guide__visual--move" aria-hidden="true">
                    <img src={toolImages.move} alt="" />
                    <span>1/2</span>
                    <b>→</b>
                    <div>トレイ</div>
                  </div>
                  <strong>2. <FuriganaText text="運ぶ" /></strong>
                  <p><FuriganaText text="トングに切りかえて、ピースをトレイへ移す。" /></p>
                </article>
                <article className="help-guide__step">
                  <div className="help-guide__visual help-guide__visual--serve" aria-hidden="true">
                    <img src={feedbackImages.happy} alt="" />
                    <div><span>1/2</span><b><FuriganaText text="販売" /></b></div>
                  </div>
                  <strong>3. <FuriganaText text="販売する" /></strong>
                  <p><FuriganaText text="合計をたしかめて、お客さんに販売する。" /></p>
                </article>
              </div>
            ) : (
              <div className="help-dialog__hints">
                <article className="hint-card hint-card--cut">
                  <div className="hint-card__visual" aria-hidden="true">
                    <span className="hint-cake-mini">
                      <i />
                      <b />
                    </span>
                  </div>
                  <div>
                    <strong><FuriganaText text="小さいピースの切り方" /></strong>
                    <p><FuriganaText text="1/4 や 1/6 は、外側から中心まで切れば作れます。ケーキ全部を切らなくてOK。" /></p>
                  </div>
                </article>
                <article className="hint-card">
                  <strong><FuriganaText text="組み合わせてもOK" /></strong>
                  <p><FuriganaText text="1/2 は 1/4 + 1/4 でも作れます。" /></p>
                  <p><FuriganaText text="3/4 は 1/2 + 1/4 でも作れます。" /></p>
                </article>
                <article className="hint-card">
                  <strong><FuriganaText text="ボーナス" /></strong>
                  <p><FuriganaText text="トッピングを切らずに出せたらボーナスです。" /></p>
                </article>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  )
}
