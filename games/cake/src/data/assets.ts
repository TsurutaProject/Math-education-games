import cutSe from './cake-assets/sounds/cut.mp3'
import failureSe from './cake-assets/sounds/false.mp3'
import trophySe from './cake-assets/sounds/trophy.mp3'
import clearSe from './cake-assets/sounds/clear-clap.mp3'
import buttonSe from './cake-assets/sounds/button.mp3'
import resetSe from './cake-assets/sounds/reset.mp3'
import moveSe from './cake-assets/sounds/move-to-tray.mp3'
import retrySe from './cake-assets/sounds/retry.mp3'
import bananaImage from './cake-assets/banana.png'
import chocolateCakeImage from './cake-assets/cake-chocolate.png'
import whippedCakeImage from './cake-assets/cake-shortcake.png'
import strawberryImage from './cake-assets/strawberry-side.png'
import whippedCreamImage from './cake-assets/whipped-cream-1.png'
import dissatisfiedFaceImage from './cake-assets/face-dissatisfied.png'
import knifeImage from './cake-assets/knife.png'
import speechBubbleImage from './cake-assets/speech-bubble.png'
import happyFaceImage from './cake-assets/face-happy.png'
import normalFaceImage from './cake-assets/face-normal.png'
import tongsImage from './cake-assets/tongs.png'
import cakeBgmAudio from './cake-assets/cake-bgm.mp3'
import cubeCustomerImage from './cake-assets/customer-cube.png'
import orangeCustomerImage from './cake-assets/customer-orange.png'
import penguinCustomerImage from './cake-assets/customer-penguin.png'
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

export const soundEffects = { button: buttonSe, reset: resetSe, move: moveSe, retry: retrySe, cut: cutSe, failure: failureSe, trophy: trophySe, clear: clearSe } as const
