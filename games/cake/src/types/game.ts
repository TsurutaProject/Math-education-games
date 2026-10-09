export interface Fraction {
  numerator: number
  denominator: number
}

export type CakeKind = 'shortcake' | 'chocolate'

export type CustomerKind = 'おれんじ' | 'きゅーぶ' | 'ペンギン'

export interface CakePieceModel {
  id: string
  fraction: Fraction
  cutDenominator: number
  startAngle: number
  endAngle: number
  color: string
  cutToppingIds: string[]
  pendingCutAngles: number[]
}

export type ToppingKind = 'strawberry' | 'banana' | 'cream'

export interface Topping {
  id: string
  kind: ToppingKind
  label: string
  angle: number
  radius: number
}

export interface CakeDefinition {
  id: CakeKind
  name: string
  price: number
  description: string
  imageUrl: string
  baseColor: string
  crustColor: string
  centerColor: string
  guideColor: string
  palette: string[]
  toppings: Topping[]
}

export interface Order {
  id: string
  customerName: CustomerKind
  age: number
  gender: 'girl' | 'boy' | 'adult'
  cakeKind: CakeKind
  target: Fraction
  message: string
  difficulty: number
  recipePieces?: Fraction[]
  perfectPieceCount?: number
}

export interface Stage {
  id: string
  title: string
  description: string
  goal: string
  targetServes: number
  requiredUnlockedCakeId?: CakeKind
  allowedCuts: number[]
  orderIds: string[]
}

export type GameScreen = 'title' | 'stageSelect' | 'playing' | 'stageResult' | 'chapterResult'

export interface StageResultSummary {
  stageIndex: number
  servedCount: number
  earnedMoney: number
  bestCombo: number
  unlockedNextStage: boolean
}

export type TrophyMetric =
  | 'servedCount'
  | 'bestCombo'
  | 'totalEarned'
  | 'cleanServes'
  | 'recipeServes'
  | 'unlockedCakeCount'
  | 'twelfthPieceServes'
  | 'allToppingsCutServes'
  | 'halfRecipeVariations'
  | 'threeQuarterRecipeVariations'
  | 'threePieceServes'
  | 'distinctFractionsServed'
  | 'distinctCutDenominators'

export interface TrophyDefinition {
  id: string
  title: string
  description: string
  metric: TrophyMetric
  target: number
}

export type TrophyProgress = Record<TrophyMetric, number>

export type ResultKind = 'idle' | 'success' | 'bonus' | 'try-again' | 'warning'

export type InteractionMode = 'cut' | 'move'

export interface ResultState {
  kind: ResultKind
  title: string
  detail: string
  celebration?: 'stage-clear' | 'final-clear'
  primaryLabel?: string
  secondaryLabel?: string
  combo?: number
  earnedMoney?: number
  highlights?: string[]
}
