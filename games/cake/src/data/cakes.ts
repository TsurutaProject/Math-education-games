import type { CakeDefinition, CakeKind, Topping } from '../types/game'
import { cakeImages } from './assets'

const toppingAngleLayouts: Record<CakeKind, number[][]> = {
  shortcake: [
    [90, 30, 240],
    [0, 150, 270],
    [120, 210, 330],
    [330, 60, 180],
  ],
  chocolate: [
    [90, 120, 0],
    [30, 150, 270],
    [60, 240, 330],
    [120, 0, 240],
  ],
}

export const cakes: CakeDefinition[] = [
  {
    id: 'shortcake',
    name: 'ショートケーキ',
    price: 0,
    description: 'イチゴとクリームのケーキ。',
    imageUrl: cakeImages.shortcake,
    baseColor: '#fff4df',
    crustColor: '#d49a63',
    centerColor: '#fff0b2',
    guideColor: '#8d6a52',
    palette: ['#fff4df', '#ffe9cf', '#fff8e8', '#ffd8c2', '#fff1dc', '#ffe2c7'],
    toppings: [
      {
        id: 'short-strawberry-top',
        kind: 'strawberry',
        label: 'イチゴ',
        angle: 90,
        radius: 66,
      },
      {
        id: 'short-banana-right',
        kind: 'banana',
        label: 'バナナ',
        angle: 30,
        radius: 82,
      },
      {
        id: 'short-cream-left',
        kind: 'cream',
        label: 'クリーム',
        angle: 240,
        radius: 70,
      },
    ],
  },
  {
    id: 'chocolate',
    name: 'チョコレートケーキ',
    price: 3000,
    description: 'カカオクリームのチョコケーキ。',
    imageUrl: cakeImages.chocolate,
    baseColor: '#6f3f2f',
    crustColor: '#3b2119',
    centerColor: '#c88954',
    guideColor: '#fff0b2',
    palette: ['#6f3f2f', '#7d4a36', '#5f3528', '#815039', '#6a3b2c', '#8b5740'],
    toppings: [
      {
        id: 'choco-strawberry-upper',
        kind: 'strawberry',
        label: 'イチゴ',
        angle: 90,
        radius: 72,
      },
      {
        id: 'choco-cream-lower',
        kind: 'cream',
        label: 'クリーム',
        angle: 120,
        radius: 78,
      },
      {
        id: 'choco-banana-left',
        kind: 'banana',
        label: 'バナナ',
        angle: 0,
        radius: 72,
      },
    ],
  },
]

export const getCakeById = (cakeId: CakeDefinition['id']): CakeDefinition =>
  cakes.find((cake) => cake.id === cakeId) ?? cakes[0]

export const getToppingLayoutCount = (cakeId: CakeKind): number =>
  toppingAngleLayouts[cakeId].length

export const getCakeToppings = (
  cake: CakeDefinition,
  layoutIndex: number,
): Topping[] => {
  const layouts = toppingAngleLayouts[cake.id]
  const layout = layouts[((layoutIndex % layouts.length) + layouts.length) % layouts.length]

  return cake.toppings.map((topping, index) => ({
    ...topping,
    angle: layout[index] ?? topping.angle,
  }))
}
