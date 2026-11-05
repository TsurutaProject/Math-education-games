import { Fragment } from 'react'
import type { RubySegment } from '../data/games'

interface RubyTextProps {
  segments: RubySegment[]
}

/** ふりがな付きの文字列を表示する。ふりがなに対応していない環境では「射的(しゃてき)」の形になる。 */
export function RubyText({ segments }: RubyTextProps) {
  return (
    <>
      {segments.map((segment, index) =>
        typeof segment === 'string' ? (
          <Fragment key={index}>{segment}</Fragment>
        ) : (
          <ruby key={index}>
            {segment.base}
            <rp>(</rp>
            <rt>{segment.rt}</rt>
            <rp>)</rp>
          </ruby>
        ),
      )}
    </>
  )
}
