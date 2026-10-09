import bananaImage from './ケーキアセット/バナナ.png'
import chocolateCakeImage from './ケーキアセット/ケーキ（チョコ）.png'
import whippedCakeImage from './ケーキアセット/ケーキ（ホイップ）.png'
import strawberryImage from './ケーキアセット/横いちご.png'
import whippedCreamImage from './ケーキアセット/ホイップ1.png'
import dissatisfiedFaceImage from './ケーキアセット/不満.png'
import knifeImage from './ケーキアセット/ナイフ.png'
import speechBubbleImage from './ケーキアセット/吹き出し.png'
import happyFaceImage from './ケーキアセット/嬉しい.png'
import normalFaceImage from './ケーキアセット/普通.png'
import tongsImage from './ケーキアセット/トング.png'
import cakeBgmAudio from './ケーキアセット/仮ケーキ.mp3'
import cubeCustomerImage from './ケーキアセット/客（きゅーぶ）.png'
import orangeCustomerImage from './ケーキアセット/客（おれんじ）.png'
import penguinCustomerImage from './ケーキアセット/客（ペンギン）.png'
import type { CustomerKind, ToppingKind } from '../types/game'

export const customerImages: Record<CustomerKind, string> = {
  おれんじ: orangeCustomerImage,
  きゅーぶ: cubeCustomerImage,
  ペンギン: penguinCustomerImage,
}

export const cakeImages = {
  shortcake: whippedCakeImage,
  chocolate: chocolateCakeImage,
} as const

export const toppingImages: Record<ToppingKind, string> = {
  strawberry: strawberryImage,
  banana: bananaImage,
  cream: whippedCreamImage,
}

export const toolImages = {
  cut: knifeImage,
  move: tongsImage,
} as const

export const feedbackImages = {
  dissatisfied: dissatisfiedFaceImage,
  normal: normalFaceImage,
  happy: happyFaceImage,
  speechBubble: speechBubbleImage,
} as const

export const audioAssets = {
  cakeBgm: cakeBgmAudio,
} as const
