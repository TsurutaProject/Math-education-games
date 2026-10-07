import { Fragment, type ReactNode } from 'react'

interface FuriganaTextProps {
  text: string
}

const readings: Array<[string, string]> = [
  ['分ケーキ', 'わけーき'],
  ['基本の分け方', 'きほんのわけかた'],
  ['分け方', 'わけかた'],
  ['獲得済み', 'かくとくずみ'],
  ['分けたい', 'わけたい'],
  ['分けよう', 'わけよう'],
  ['分けた', 'わけた'],
  ['注文どおり', 'ちゅうもんどおり'],
  ['注文通り', 'ちゅうもんどおり'],
  ['切りかえて', 'きりかえて'],
  ['切らずに', 'きらずに'],
  ['切りました', 'きりました'],
  ['切ろう', 'きろう'],
  ['切った', 'きった'],
  ['運ぼう', 'はこぼう'],
  ['近づきます', 'ちかづきます'],
  ['止まらない', 'とまらない'],
  ['足りなくても', 'たりなくても'],
  ['多すぎても', 'おおすぎても'],
  ['合わせよう', 'あわせよう'],
  ['合わせても', 'あわせても'],
  ['合わせて', 'あわせて'],
  ['合っていれば', 'あっていれば'],
  ['大丈夫', 'だいじょうぶ'],
  ['大きく', 'おおきく'],
  ['大きな', 'おおきな'],
  ['小さな', 'ちいさな'],
  ['全て', 'すべて'],
  ['お支払い', 'おしはらい'],
  ['やり直せます', 'やりなおせます'],
  ['お客さん', 'おきゃくさん'],
  ['ケーキ屋さん', 'けーきやさん'],
  ['接客', 'せっきゃく'],
  ['完成', 'かんせい'],
  ['練習', 'れんしゅう'],
  ['本番', 'ほんばん'],
  ['数えて', 'かぞえて'],
  ['準備', 'じゅんび'],
  ['順番', 'じゅんばん'],
  ['続けて', 'つづけて'],
  ['続く', 'つづく'],
  ['操作して', 'そうさして'],
  ['操作しよう', 'そうさしよう'],
  ['進み具合', 'すすみぐあい'],
  ['実績', 'じっせき'],
  ['内容', 'ないよう'],
  ['一覧', 'いちらん'],
  ['開始', 'かいし'],
  ['始める', 'はじめる'],
  ['持ちかえよう', 'もちかえよう'],
  ['光っている', 'ひかっている'],
  ['上から', 'うえから'],
  ['下まで', 'したまで'],
  ['見よう', 'みよう'],
  ['進む', 'すすむ'],
  ['進もう', 'すすもう'],
  ['押して', 'おして'],
  ['押そう', 'おそう'],
  ['運ぶ', 'はこぶ'],
  ['右', 'みぎ'],
  ['左', 'ひだり'],
  ['新しい', 'あたらしい'],
  ['登場', 'とうじょう'],
  ['新作', 'しんさく'],
  ['累計', 'るいけい'],
  ['貯金箱', 'ちょきんばこ'],
  ['獲得', 'かくとく'],
  ['達成', 'たっせい'],
  ['研究家', 'けんきゅうか'],
  ['提供', 'ていきょう'],
  ['人気', 'にんき'],
  ['増やす', 'ふやす'],
  ['増える', 'ふえる'],
  ['増えます', 'ふえます'],
  ['追加', 'ついか'],
  ['外して', 'はずして'],
  ['別の', 'べつの'],
  ['別解', 'べっかい'],
  ['異なる', 'ことなる'],
  ['試して', 'ためして'],
  ['以上', 'いじょう'],
  ['量', 'りょう'],
  ['逃します', 'のがします'],
  ['お願い', 'おねがい'],
  ['最初', 'さいしょ'],
  ['最後', 'さいご'],
  ['最終目標', 'さいしゅうもくひょう'],
  ['全部', 'ぜんぶ'],
  ['種類', 'しゅるい'],
  ['場所', 'ばしょ'],
  ['包丁', 'ほうちょう'],
  ['点線', 'てんせん'],
  ['沿って', 'そって'],
  ['通る', 'とおる'],
  ['線', 'せん'],
  ['丸い', 'まるい'],
  ['白い', 'しろい'],
  ['定番', 'ていばん'],
  ['並ぶ', 'ならぶ'],
  ['回って', 'まわって'],
  ['考える', 'かんがえる'],
  ['考えよう', 'かんがえよう'],
  ['置けます', 'おけます'],
  ['用意', 'ようい'],
  ['まな板', 'まないた'],
  ['一切れ', 'ひときれ'],
  ['二人', 'ふたり'],
  ['人', 'にん'],
  ['店', 'みせ'],
  ['組み合わせ', 'くみあわせ'],
  ['組み合わせても', 'くみあわせても'],
  ['通り', 'とおり'],
  ['操作ガイド', 'そうさがいど'],
  ['チョコレートケーキ', 'ちょこれーとけーき'],
  ['ショートケーキ', 'しょーとけーき'],
  ['作り方', 'つくりかた'],
  ['補助線', 'ほじょせん'],
  ['販売', 'はんばい'],
  ['未解放', 'みかいほう'],
  ['解放済み', 'かいほうずみ'],
  ['解放', 'かいほう'],
  ['注文', 'ちゅうもん'],
  ['発見', 'はっけん'],
  ['合計', 'ごうけい'],
  ['確かめて', 'たしかめて'],
  ['確かめよう', 'たしかめよう'],
  ['確認', 'かくにん'],
  ['安心', 'あんしん'],
  ['目標', 'もくひょう'],
  ['種類', 'しゅるい'],
  ['外側', 'そとがわ'],
  ['中心', 'ちゅうしん'],
  ['全部', 'ぜんぶ'],
  ['成功', 'せいこう'],
  ['以内', 'いない'],
  ['本', 'ほん'],
  ['大きさ', 'おおきさ'],
  ['同じ', 'おなじ'],
  ['半分', 'はんぶん'],
  ['女の子', 'おんなのこ'],
  ['男の子', 'おとこのこ'],
  ['大人', 'おとな'],
  ['分数', 'ぶんすう'],
  ['数', 'かず'],
  ['等分', 'とうぶん'],
  ['操作', 'そうさ'],
  ['売上', 'うりあげ'],
  ['必要', 'ひつよう'],
  ['作ろう', 'つくろう'],
  ['作れます', 'つくれます'],
  ['作る', 'つくる'],
  ['使って', 'つかって'],
  ['選んで', 'えらんで'],
  ['選ぶ', 'えらぶ'],
  ['選ぼう', 'えらぼう'],
  ['選択中', 'せんたくちゅう'],
  ['切り方', 'きりかた'],
  ['切りたい', 'きりたい'],
  ['切って', 'きって'],
  ['切れ', 'きれ'],
  ['切る', 'きる'],
  ['移す', 'うつす'],
  ['運び中', 'はこびちゅう'],
  ['運びたい', 'はこびたい'],
  ['守れて', 'まもれて'],
  ['選び', 'えらび'],
  ['見る', 'みる'],
  ['見て', 'みて'],
  ['見ます', 'みます'],
  ['探そう', 'さがそう'],
  ['合う', 'あう'],
  ['例', 'れい'],
  ['前へ', 'まえへ'],
  ['次へ', 'つぎへ'],
  ['次の', 'つぎの'],
  ['完了', 'かんりょう'],
  ['足す', 'たす'],
  ['戻る', 'もどる'],
  ['閉じる', 'とじる'],
  ['違う', 'ちがう'],
  ['多い', 'おおい'],
  ['少ない', 'すくない'],
  ['小さい', 'ちいさい'],
  ['少し', 'すこし'],
  ['空', 'から'],
  ['個', 'こ'],
  ['今', 'いま'],
  ['円', 'えん'],
  ['才', 'さい'],
  ['分', 'ぶん'],
]

const sortedReadings = [...readings].sort((left, right) => right[0].length - left[0].length)

interface ReadingSegment {
  text: string
  isKanji: boolean
}

const isKanjiCharacter = (character: string): boolean => /[\u3400-\u9fff々]/.test(character)

const normalizeKana = (value: string): string =>
  Array.from(value, (character) => {
    const codePoint = character.charCodeAt(0)
    return codePoint >= 0x30a1 && codePoint <= 0x30f6
      ? String.fromCharCode(codePoint - 0x60)
      : character
  }).join('')

const splitReadingSegments = (surface: string): ReadingSegment[] => {
  const segments: ReadingSegment[] = []

  Array.from(surface).forEach((character) => {
    const isKanji = isKanjiCharacter(character)
    const currentSegment = segments.at(-1)

    if (currentSegment?.isKanji === isKanji) {
      currentSegment.text += character
      return
    }

    segments.push({ text: character, isKanji })
  })

  return segments
}

const createReadingNodes = (
  surface: string,
  pronunciation: string,
  keyPrefix: string,
): ReactNode[] => {
  const segments = splitReadingSegments(surface)

  if (!segments.some((segment) => segment.isKanji)) {
    return [<Fragment key={`${keyPrefix}-plain`}>{surface}</Fragment>]
  }

  let readingPosition = 0

  return segments.map((segment, index) => {
    if (!segment.isKanji) {
      const normalizedText = normalizeKana(segment.text)
      const literalPosition = pronunciation.indexOf(normalizedText, readingPosition)

      if (literalPosition !== -1) {
        readingPosition = literalPosition + normalizedText.length
      }

      return <Fragment key={`${keyPrefix}-text-${index}`}>{segment.text}</Fragment>
    }

    const nextLiteral = segments[index + 1]
    const normalizedLiteral = nextLiteral === undefined ? '' : normalizeKana(nextLiteral.text)
    const nextLiteralPosition = normalizedLiteral === ''
      ? pronunciation.length
      : pronunciation.indexOf(normalizedLiteral, readingPosition)
    const readingEnd = nextLiteralPosition === -1 ? pronunciation.length : nextLiteralPosition
    const rubyReading = pronunciation.slice(readingPosition, readingEnd)
    readingPosition = readingEnd

    if (rubyReading === '') {
      return <Fragment key={`${keyPrefix}-kanji-${index}`}>{segment.text}</Fragment>
    }

    return (
      <ruby key={`${keyPrefix}-ruby-${index}`}>
        {segment.text}
        <rt>{rubyReading}</rt>
      </ruby>
    )
  })
}

export function FuriganaText({ text }: FuriganaTextProps) {
  const nodes: ReactNode[] = []
  let plainText = ''
  let position = 0

  const flushPlainText = (): void => {
    if (plainText === '') {
      return
    }

    nodes.push(<Fragment key={`text-${nodes.length}`}>{plainText}</Fragment>)
    plainText = ''
  }

  while (position < text.length) {
    const reading = sortedReadings.find(([word]) => text.startsWith(word, position))

    if (reading === undefined) {
      plainText += text[position]
      position += 1
      continue
    }

    flushPlainText()
    nodes.push(...createReadingNodes(reading[0], reading[1], `reading-${position}`))
    position += reading[0].length
  }

  flushPlainText()
  return <>{nodes}</>
}
