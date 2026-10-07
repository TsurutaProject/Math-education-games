import { useEffect, useMemo, useRef, useState } from 'react'
import { CakeBoard } from './components/CakeBoard'
import { CakeSelector } from './components/CakeSelector'
import { CustomerQueue } from './components/CustomerQueue'
import { GameControls } from './components/GameControls'
import { GuidedTutorial, type GuidedTutorialStep } from './components/GuidedTutorial'
import { HelpMenu } from './components/HelpMenu'
import { FuriganaText } from './components/FuriganaText'
import { OrderBubble } from './components/OrderBubble'
import { ResultMessage } from './components/ResultMessage'
import { Tray } from './components/Tray'
import { TrophyShelf } from './components/TrophyShelf'
import { CakePiecePreview } from './components/CakePiecePreview'
import {
  ChapterResultModal,
  StageResultModal,
  StageSelectScreen,
  TitleScreen,
} from './components/StageFlowScreens'
import {
  cakes,
  getCakeById,
  getCakeToppings,
  getToppingLayoutCount,
} from './data/cakes'
import { orders } from './data/orders'
import { stages } from './data/stages'
import { trophies } from './data/trophies'
import { audioAssets, toolImages } from './data/assets'
import type {
  CakeKind,
  CakePieceModel,
  GameScreen,
  InteractionMode,
  Order,
  ResultState,
  StageResultSummary,
  TrophyDefinition,
  TrophyProgress,
} from './types/game'
import { createWholeCakePiece, cutCakePieces, normalizeAngle } from './utils/cakeGeometry'
import {
  addFractions,
  areFractionsEqual,
  compareFractions,
  formatFraction,
} from './utils/fraction'
import './styles/global.css'
import './styles/game.css'

const maxTrayPieces = 3
const visibleCustomerCount = 5
const getStageOrders = (stageId: string): Order[] => {
  const stage = stages.find((currentStage) => currentStage.id === stageId) ?? stages[0]

  return orders.filter((order) => stage.orderIds.includes(order.id))
}
const initialStage = stages[0]
const initialStageOrders = getStageOrders(initialStage.id)
const initialCake = getCakeById('shortcake')

const idleResult: ResultState = {
  kind: 'idle',
  title: '',
  detail: '',
}

const baseReward = 300
const toppingBonusReward = 120
const compactPieceBonusReward = 80
const recipeBonusReward = 180
const defaultCuts = 12
const tutorialStorageKey = 'fraction-cake-guided-tutorial-seen-v3'
const completedStagesStorageKey = 'cake-game:completed-stages'
const maxUnlockedStageStorageKey = 'cake-game:max-unlocked-stage'
const unlockedCakeIdsStorageKey = 'cake-game:unlocked-cakes'

const shouldShowTutorial = (): boolean => {
  try {
    return window.localStorage.getItem(tutorialStorageKey) !== 'true'
  } catch {
    return true
  }
}

const readCompletedStageIds = (): string[] => {
  try {
    const storedValue = window.localStorage.getItem(completedStagesStorageKey)
    const parsedValue: unknown = storedValue === null ? [] : JSON.parse(storedValue)

    return Array.isArray(parsedValue)
      ? parsedValue.filter((stageId): stageId is string => typeof stageId === 'string')
      : []
  } catch {
    return []
  }
}

const readMaxUnlockedStage = (): number => {
  try {
    const storedValue = Number(window.localStorage.getItem(maxUnlockedStageStorageKey))

    return Number.isInteger(storedValue) && storedValue >= 0
      ? Math.min(storedValue, stages.length - 1)
      : 0
  } catch {
    return 0
  }
}

const readUnlockedCakeIds = (): CakeKind[] => {
  try {
    const storedValue = window.localStorage.getItem(unlockedCakeIdsStorageKey)
    const parsedValue: unknown = storedValue === null ? ['shortcake'] : JSON.parse(storedValue)

    if (!Array.isArray(parsedValue)) {
      return ['shortcake']
    }

    return parsedValue.reduce<CakeKind[]>((cakeIds, cakeId) => {
      if (!cakes.some((cake) => cake.id === cakeId) || cakeIds.includes(cakeId as CakeKind)) {
        return cakeIds
      }

      return [...cakeIds, cakeId as CakeKind]
    }, ['shortcake'])
  } catch {
    return ['shortcake']
  }
}

interface DifficultyRange {
  min: number
  max: number
}

interface CarriedPieceState {
  piece: CakePieceModel
  x: number
  y: number
}

interface TrophyToast {
  id: string
  trophy: TrophyDefinition
}

interface TutorialSnapshot {
  activeStageIndex: number
  stageServedCount: number
  activeOrderId: string
  activeCakeId: CakeKind
  unlockedCakeIds: CakeKind[]
  currentCuts: number
  interactionMode: InteractionMode
  toppingLayoutIndex: number
  cutBatch: number
  boardPieces: CakePieceModel[]
  selectedPieces: CakePieceModel[]
  cutMarkAngles: number[]
  carriedPiece: CarriedPieceState | null
  result: ResultState
  currentCutDenominators: number[]
  stageCompletion: boolean
}

const getVisibleQueueOrders = (stageOrders: Order[], activeOrder: Order): Order[] => {
  const activeIndex = stageOrders.findIndex((order) => order.id === activeOrder.id)
  const startIndex = activeIndex === -1 ? 0 : activeIndex

  return Array.from(
    { length: Math.min(visibleCustomerCount, stageOrders.length) },
    (_, index) => stageOrders[(startIndex + index) % stageOrders.length],
  )
}

const getCutAngleKey = (angle: number): string => normalizeAngle(angle).toFixed(3)

const mergeCutMarkAngles = (currentAngles: number[], nextAngles: number[]): number[] => {
  const angleMap = new Map<string, number>()

  ;[...currentAngles, ...nextAngles].forEach((angle) => {
    const normalizedAngle = normalizeAngle(angle)
    angleMap.set(getCutAngleKey(normalizedAngle), normalizedAngle)
  })

  return Array.from(angleMap.values()).sort((left, right) => left - right)
}

const getDifficultyRange = (servedCount: number, comboCount: number): DifficultyRange => {
  if (comboCount >= 5) {
    return { min: 4, max: 4 }
  }

  if (comboCount >= 3) {
    return { min: 3, max: 4 }
  }

  if (servedCount < 2) {
    return { min: 1, max: 1 }
  }

  if (servedCount < 5) {
    return { min: 1, max: 2 }
  }

  if (servedCount < 8) {
    return { min: 2, max: 3 }
  }

  return { min: 3, max: 4 }
}

const getOrderPool = (
  stageOrders: Order[],
  unlockedCakeIds: CakeKind[],
  servedCount: number,
  comboCount: number,
): Order[] => {
  const difficultyRange = getDifficultyRange(servedCount, comboCount)

  return stageOrders.filter(
    (order) =>
      unlockedCakeIds.includes(order.cakeKind) &&
      order.difficulty >= difficultyRange.min &&
      order.difficulty <= difficultyRange.max,
  )
}

const selectNextOrderId = (
  stageOrders: Order[],
  unlockedCakeIds: CakeKind[],
  servedCount: number,
  comboCount: number,
  blockedOrderId?: string,
  blockedCustomerName?: Order['customerName'],
): string => {
  const pool = getOrderPool(stageOrders, unlockedCakeIds, servedCount, comboCount)
  const unlockedFallbackPool = stageOrders.filter((order) => unlockedCakeIds.includes(order.cakeKind))
  const basePool = pool.length > 0 ? pool : unlockedFallbackPool

  if (basePool.length === 0) {
    return initialStageOrders[0].id
  }

  const customerChangedPool = blockedCustomerName === undefined
    ? basePool
    : basePool.filter((order) => order.customerName !== blockedCustomerName)
  const availablePool = customerChangedPool.length > 0 ? customerChangedPool : basePool
  let offset = 0

  while (offset < availablePool.length) {
    const order = availablePool[(servedCount + comboCount + offset) % availablePool.length]

    if (availablePool.length === 1 || order.id !== blockedOrderId) {
      return order.id
    }

    offset += 1
  }

  return availablePool[0].id
}

const formatRecipe = (recipePieces: Order['recipePieces']): string =>
  recipePieces?.map((fraction) => formatFraction(fraction)).join(' + ') ?? ''

const matchesRecipe = (pieces: CakePieceModel[], recipePieces: Order['recipePieces']): boolean => {
  if (recipePieces === undefined || pieces.length !== recipePieces.length) {
    return false
  }

  const pieceFractions = pieces.map((piece) => formatFraction(piece.fraction)).sort()
  const recipeFractions = recipePieces.map((fraction) => formatFraction(fraction)).sort()

  return pieceFractions.every((fraction, index) => fraction === recipeFractions[index])
}

const getNextToppingLayoutIndex = (cakeId: CakeKind, currentIndex: number): number => {
  const layoutCount = getToppingLayoutCount(cakeId)

  if (layoutCount <= 1) {
    return 0
  }

  return (currentIndex + 1 + Math.floor(Math.random() * (layoutCount - 1))) % layoutCount
}

const addUniqueValue = <Value extends string | number>(values: Value[], value: Value): Value[] =>
  values.includes(value) ? values : [...values, value]

const getPieceCombinationKey = (pieces: CakePieceModel[]): string =>
  pieces.map((piece) => formatFraction(piece.fraction)).sort().join('+')

const getUnlockedTrophyIds = (progress: TrophyProgress): string[] =>
  trophies
    .filter((trophy) => progress[trophy.metric] >= trophy.target)
    .map((trophy) => trophy.id)

const getStageCakeIds = (stageIndex: number, purchasedCakeIds: CakeKind[]): CakeKind[] =>
  stageIndex < 2 ? ['shortcake'] : purchasedCakeIds

const getStageCakes = (stageIndex: number): typeof cakes =>
  stageIndex < 2 ? cakes.filter((cake) => cake.id === 'shortcake') : cakes

function App() {
  const [screen, setScreen] = useState<GameScreen>('title')
  const [guidedTutorialStep, setGuidedTutorialStep] = useState<GuidedTutorialStep | null>(null)
  const [activeStageIndex, setActiveStageIndex] = useState(0)
  const [stageServedCount, setStageServedCount] = useState(0)
  const [servedCount, setServedCount] = useState(0)
  const [activeOrderId, setActiveOrderId] = useState(initialStageOrders[0].id)
  const [activeCakeId, setActiveCakeId] = useState<CakeKind>('shortcake')
  const [unlockedCakeIds, setUnlockedCakeIds] = useState<CakeKind[]>(readUnlockedCakeIds)
  const [currentCuts, setCurrentCuts] = useState(defaultCuts)
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('cut')
  const [toppingLayoutIndex, setToppingLayoutIndex] = useState(0)
  const [cutBatch, setCutBatch] = useState(0)
  const [boardPieces, setBoardPieces] = useState<CakePieceModel[]>([
    createWholeCakePiece(initialCake),
  ])
  const [selectedPieces, setSelectedPieces] = useState<CakePieceModel[]>([])
  const [cutMarkAngles, setCutMarkAngles] = useState<number[]>([])
  const [carriedPiece, setCarriedPiece] = useState<CarriedPieceState | null>(null)
  const [result, setResult] = useState<ResultState>(idleResult)
  const [money, setMoney] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [stageEarned, setStageEarned] = useState(0)
  const [stageBestCombo, setStageBestCombo] = useState(0)
  const [highestUnlockedCakeCount, setHighestUnlockedCakeCount] = useState(() => readUnlockedCakeIds().length)
  const [cleanServes, setCleanServes] = useState(0)
  const [recipeServes, setRecipeServes] = useState(0)
  const [twelfthPieceServes, setTwelfthPieceServes] = useState(0)
  const [allToppingsCutServes, setAllToppingsCutServes] = useState(0)
  const [halfRecipeSignatures, setHalfRecipeSignatures] = useState<string[]>([])
  const [threeQuarterRecipeSignatures, setThreeQuarterRecipeSignatures] = useState<string[]>([])
  const [threePieceServes, setThreePieceServes] = useState(0)
  const [servedFractionKeys, setServedFractionKeys] = useState<string[]>([])
  const [usedCutDenominators, setUsedCutDenominators] = useState<number[]>([])
  const [currentCutDenominators, setCurrentCutDenominators] = useState<number[]>([])
  const [trophyToasts, setTrophyToasts] = useState<TrophyToast[]>([])
  const [completedStageIds, setCompletedStageIds] = useState<string[]>(readCompletedStageIds)
  const [maxUnlockedStage, setMaxUnlockedStage] = useState(readMaxUnlockedStage)
  const [stageResultSummary, setStageResultSummary] = useState<StageResultSummary | null>(null)
  const [isSoundEnabled, setIsSoundEnabled] = useState(false)
  const stageCompletionRef = useRef(false)
  const tutorialSnapshotRef = useRef<TutorialSnapshot | null>(null)
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null)
  const [hasExplainedCombo, setHasExplainedCombo] = useState(false)
  const [hasExplainedTrophies, setHasExplainedTrophies] = useState(false)

  const activeStage = stages[activeStageIndex] ?? stages[0]
  const stageOrders = useMemo(() => getStageOrders(activeStage.id), [activeStage.id])
  const activeCake = getCakeById(activeCakeId)
  const activeToppings = useMemo(
    () => getCakeToppings(activeCake, toppingLayoutIndex),
    [activeCake, toppingLayoutIndex],
  )
  const tutorialExampleOrder = guidedTutorialStep === null
    ? undefined
    : orders.find((order) => order.id === 'half')
  const activeOrder = tutorialExampleOrder ?? stageOrders.find((order) => order.id === activeOrderId) ?? stageOrders[0]
  const stageAvailableCakeIds = useMemo(() => {
    const stageCakeIds = getStageCakeIds(activeStageIndex, unlockedCakeIds)

    return activeStage.requiredUnlockedCakeId === undefined
      ? stageCakeIds
      : addUniqueValue(stageCakeIds, activeStage.requiredUnlockedCakeId)
  }, [activeStage.requiredUnlockedCakeId, activeStageIndex, unlockedCakeIds])
  const visibleCakes = useMemo(() => getStageCakes(activeStageIndex), [activeStageIndex])
  const visibleQueueOrders = useMemo(
    () => tutorialExampleOrder === undefined ? getVisibleQueueOrders(stageOrders, activeOrder) : [tutorialExampleOrder],
    [activeOrder, stageOrders, tutorialExampleOrder],
  )
  const trophyProgress: TrophyProgress = {
    servedCount,
    bestCombo,
    totalEarned,
    cleanServes,
    recipeServes,
    unlockedCakeCount: highestUnlockedCakeCount,
    twelfthPieceServes,
    allToppingsCutServes,
    halfRecipeVariations: halfRecipeSignatures.length,
    threeQuarterRecipeVariations: threeQuarterRecipeSignatures.length,
    threePieceServes,
    distinctFractionsServed: servedFractionKeys.length,
    distinctCutDenominators: usedCutDenominators.length,
  }
  const unlockedTrophyIds = getUnlockedTrophyIds(trophyProgress)

  useEffect(() => {
    try {
      window.localStorage.setItem(completedStagesStorageKey, JSON.stringify(completedStageIds))
    } catch {
      // Progress remains available for this session when browser storage is unavailable.
    }
  }, [completedStageIds])

  useEffect(() => {
    try {
      window.localStorage.setItem(maxUnlockedStageStorageKey, String(maxUnlockedStage))
    } catch {
      // Progress remains available for this session when browser storage is unavailable.
    }
  }, [maxUnlockedStage])

  useEffect(() => {
    try {
      window.localStorage.setItem(unlockedCakeIdsStorageKey, JSON.stringify(unlockedCakeIds))
    } catch {
      // Cake unlocks remain available for this session when browser storage is unavailable.
    }
  }, [unlockedCakeIds])

  useEffect(() => {
    const audio = bgmAudioRef.current

    if (audio === null) {
      return
    }

    audio.volume = 0.32

    if (!isSoundEnabled) {
      audio.pause()
      return
    }

    const playPromise = audio.play()

    if (playPromise !== undefined) {
      playPromise.catch(() => {
        setIsSoundEnabled(false)
      })
    }
  }, [isSoundEnabled])

  useEffect(() => {
    const updateViewportBottom = (): void => {
      const visualViewport = window.visualViewport
      const viewportBottom = visualViewport == null
        ? window.innerHeight
        : visualViewport.offsetTop + visualViewport.height

      document.documentElement.style.setProperty('--app-viewport-bottom', `${viewportBottom}px`)
    }

    updateViewportBottom()
    window.addEventListener('resize', updateViewportBottom)
    window.visualViewport?.addEventListener('resize', updateViewportBottom)
    window.visualViewport?.addEventListener('scroll', updateViewportBottom)

    return () => {
      window.removeEventListener('resize', updateViewportBottom)
      window.visualViewport?.removeEventListener('resize', updateViewportBottom)
      window.visualViewport?.removeEventListener('scroll', updateViewportBottom)
    }
  }, [])

  const showTrophyToasts = (unlockedTrophies: TrophyDefinition[]): void => {
    if (unlockedTrophies.length === 0) {
      return
    }

    const unlockedAt = Date.now()

    setTrophyToasts((currentToasts) => [
      ...currentToasts,
      ...unlockedTrophies.map((trophy) => ({
        id: `${unlockedAt}-${trophy.id}`,
        trophy,
      })),
    ])

    unlockedTrophies.forEach((trophy, index) => {
      const toastId = `${unlockedAt}-${trophy.id}`

      window.setTimeout(() => {
        setTrophyToasts((currentToasts) =>
          currentToasts.filter((toast) => toast.id !== toastId),
        )
      }, 4600 + index * 180)
    })
  }

  const rememberTutorialCompletion = (): void => {
    try {
      window.localStorage.setItem(tutorialStorageKey, 'true')
    } catch {
      // The tutorial still closes when browser storage is unavailable.
    }
  }

  const skipGuidedTutorial = (): void => {
    const tutorialSnapshot = tutorialSnapshotRef.current

    if (tutorialSnapshot !== null) {
      restoreTutorialSnapshot(tutorialSnapshot)
    } else {
      setCurrentCuts(defaultCuts)
    }
    setGuidedTutorialStep(null)
    rememberTutorialCompletion()
  }

  const openGuidedTutorial = (): void => {
    if (screen !== 'playing') {
      return
    }

    tutorialSnapshotRef.current = {
      activeStageIndex,
      stageServedCount,
      activeOrderId,
      activeCakeId,
      unlockedCakeIds,
      currentCuts,
      interactionMode,
      toppingLayoutIndex,
      cutBatch,
      boardPieces,
      selectedPieces,
      cutMarkAngles,
      carriedPiece,
      result,
      currentCutDenominators,
      stageCompletion: stageCompletionRef.current,
    }
    setActiveCakeId('shortcake')
    setCurrentCuts(2)
    setInteractionMode('cut')
    setToppingLayoutIndex(0)
    setCutBatch(0)
    setBoardPieces([createWholeCakePiece(initialCake)])
    setSelectedPieces([])
    setCutMarkAngles([])
    setCarriedPiece(null)
    setCurrentCutDenominators([])
    setGuidedTutorialStep('intro')
    setResult(idleResult)
  }

  const cutToppingIds = useMemo(
    () =>
      Array.from(
        new Set([...boardPieces, ...selectedPieces].flatMap((piece) => piece.cutToppingIds)),
      ),
    [boardPieces, selectedPieces],
  )
  const total = addFractions(selectedPieces.map((piece) => piece.fraction))
  const canServeCurrentTray =
    activeOrder.cakeKind === activeCake.id &&
    selectedPieces.length > 0 &&
    areFractionsEqual(total, activeOrder.target)
  const isFinalStage = activeStageIndex === stages.length - 1
  const stageProgressValue = stageServedCount
  const stageProgressTarget = activeStage.targetServes
  const stageProgressRatio = Math.min(stageProgressValue / stageProgressTarget, 1)
  const isStageGoalComplete = stageProgressValue >= stageProgressTarget

  const resetBoardState = (cakeId: CakeKind): void => {
    const cake = getCakeById(cakeId)

    setSelectedPieces([])
    setBoardPieces([createWholeCakePiece(cake)])
    setCutMarkAngles([])
    setCurrentCutDenominators([])
    setCarriedPiece(null)
    setInteractionMode('cut')
  }

  const startStage = (stageIndex: number): void => {
    const stage = stages[stageIndex] ?? stages[0]
    const stageUnlockedCakeIds = stage.requiredUnlockedCakeId === undefined
      ? getStageCakeIds(stageIndex, unlockedCakeIds)
      : addUniqueValue(getStageCakeIds(stageIndex, unlockedCakeIds), stage.requiredUnlockedCakeId)
    const showTutorial = stageIndex === 0 && shouldShowTutorial()
    const firstOrderId = showTutorial
      ? 'half'
      : selectNextOrderId(getStageOrders(stage.id), stageUnlockedCakeIds, servedCount, 0)

    stageCompletionRef.current = false
    setActiveStageIndex(stageIndex)
    setStageServedCount(0)
    setActiveOrderId(firstOrderId)
    setActiveCakeId('shortcake')
    if (
      stage.requiredUnlockedCakeId !== undefined &&
      !unlockedCakeIds.includes(stage.requiredUnlockedCakeId)
    ) {
      setUnlockedCakeIds((currentCakeIds) =>
        addUniqueValue(currentCakeIds, stage.requiredUnlockedCakeId as CakeKind),
      )
    }
    setCurrentCuts(showTutorial ? 2 : defaultCuts)
    setInteractionMode('cut')
    setToppingLayoutIndex(0)
    setCutBatch(0)
    setBoardPieces([createWholeCakePiece(initialCake)])
    setSelectedPieces([])
    setCutMarkAngles([])
    setCarriedPiece(null)
    setResult(idleResult)
    setCombo(0)
    setStageEarned(0)
    setStageBestCombo(0)
    setCurrentCutDenominators([])
    setTrophyToasts([])
    setHasExplainedCombo(false)
    setHasExplainedTrophies(false)
    setStageResultSummary(null)
    setGuidedTutorialStep(showTutorial ? 'intro' : null)
    setScreen('playing')
  }

  const completeStage = (
    served: number,
    earned: number,
    stageBestCombo: number,
  ): void => {
    if (stageCompletionRef.current) {
      return
    }

    stageCompletionRef.current = true
    const nextStageIndex = activeStageIndex + 1
    const unlockedNextStage = nextStageIndex < stages.length && maxUnlockedStage < nextStageIndex

    setCompletedStageIds((currentStageIds) => addUniqueValue(currentStageIds, activeStage.id))
    setMaxUnlockedStage((currentMax) => Math.max(currentMax, Math.min(nextStageIndex, stages.length - 1)))
    setStageResultSummary({
      stageIndex: activeStageIndex,
      servedCount: served,
      earnedMoney: earned,
      bestCombo: stageBestCombo,
      unlockedNextStage,
    })
    setResult(idleResult)
    setCarriedPiece(null)
    setTrophyToasts([])
    setScreen('stageResult')
  }

  const clearTray = (): void => {
    if (screen !== 'playing') {
      return
    }

    resetBoardState(activeCake.id)
    setResult(idleResult)
  }

  const resetCakeBoard = (cakeId: CakeKind): void => {
    resetBoardState(cakeId)
    setResult(idleResult)
  }

  const restoreTutorialSnapshot = (tutorialSnapshot: TutorialSnapshot): void => {
    setActiveStageIndex(tutorialSnapshot.activeStageIndex)
    setStageServedCount(tutorialSnapshot.stageServedCount)
    setActiveOrderId(tutorialSnapshot.activeOrderId)
    setActiveCakeId(tutorialSnapshot.activeCakeId)
    setUnlockedCakeIds(tutorialSnapshot.unlockedCakeIds)
    setCurrentCuts(tutorialSnapshot.currentCuts)
    setInteractionMode(tutorialSnapshot.interactionMode)
    setToppingLayoutIndex(tutorialSnapshot.toppingLayoutIndex)
    setCutBatch(tutorialSnapshot.cutBatch)
    setBoardPieces(tutorialSnapshot.boardPieces)
    setSelectedPieces(tutorialSnapshot.selectedPieces)
    setCutMarkAngles(tutorialSnapshot.cutMarkAngles)
    setCarriedPiece(tutorialSnapshot.carriedPiece)
    setCurrentCutDenominators(tutorialSnapshot.currentCutDenominators)
    setResult(tutorialSnapshot.result)
    stageCompletionRef.current = tutorialSnapshot.stageCompletion
    tutorialSnapshotRef.current = null
  }

  const advanceGuidedTutorial = (): void => {
    if (guidedTutorialStep === 'intro') {
      setGuidedTutorialStep('order')
      return
    }

    if (guidedTutorialStep === 'order') {
      setGuidedTutorialStep('topping')
      return
    }

    if (guidedTutorialStep === 'topping') {
      setGuidedTutorialStep('cut')
      return
    }

    if (guidedTutorialStep === 'combo') {
      setGuidedTutorialStep('trophy')
      return
    }

    if (guidedTutorialStep === 'trophy') {
      const tutorialSnapshot = tutorialSnapshotRef.current

      if (tutorialSnapshot !== null) {
        restoreTutorialSnapshot(tutorialSnapshot)
      } else {
        setCurrentCuts(defaultCuts)
      }
      setGuidedTutorialStep(null)
      rememberTutorialCompletion()
    }
  }

  const handleCutCake = (cuts: number, cutAngles: number[]): void => {
    if (screen !== 'playing') {
      return
    }

    const nextBatch = cutBatch + 1
    const nextBoardPieces = cutCakePieces(boardPieces, cutAngles, activeToppings, nextBatch, activeCake)
    const hasCutPieces = nextBoardPieces.length > 1

    setCutBatch(nextBatch)
    setCutMarkAngles((currentAngles) => mergeCutMarkAngles(currentAngles, cutAngles))
    setCurrentCutDenominators((currentDenominators) =>
      addUniqueValue(currentDenominators, cuts),
    )
    setBoardPieces(nextBoardPieces)
    setResult(idleResult)
    if (guidedTutorialStep === 'cut' && hasCutPieces) {
      setGuidedTutorialStep('move-mode')
    }
  }

  const handleChangeInteractionMode = (mode: InteractionMode): void => {
    if (screen !== 'playing') {
      return
    }

    if (guidedTutorialStep === 'move-mode' && mode !== 'move') {
      return
    }

    setInteractionMode(mode)
    if (mode === 'cut' && guidedTutorialStep === null) {
      setCurrentCuts(defaultCuts)
    }
    if (guidedTutorialStep === 'move-mode' && mode === 'move') {
      setGuidedTutorialStep('move-piece')
    }
  }

  const handleCarryPieceChange = (
    piece: CakePieceModel,
    position: { x: number; y: number } | null,
  ): void => {
    if (screen !== 'playing') {
      return
    }

    setCarriedPiece(
      position === null
        ? null
        : {
            x: position.x,
            y: position.y,
            piece,
          },
    )
  }

  const handleSelectCake = (cakeId: CakeKind): void => {
    if (screen !== 'playing') {
      return
    }

    if (!visibleCakes.some((cake) => cake.id === cakeId)) {
      return
    }

    setActiveCakeId(cakeId)
    resetCakeBoard(cakeId)
  }

  const handleBuyCake = (cakeId: CakeKind): void => {
    if (screen !== 'playing') {
      return
    }

    const cake = getCakeById(cakeId)

    if (
      !visibleCakes.some((visibleCake) => visibleCake.id === cakeId) ||
      unlockedCakeIds.includes(cakeId) ||
      money < cake.price
    ) {
      return
    }

    const nextUnlockedCakeIds = [...unlockedCakeIds, cakeId]
    const nextProgress: TrophyProgress = {
      ...trophyProgress,
      unlockedCakeCount: Math.max(highestUnlockedCakeCount, nextUnlockedCakeIds.length),
    }
    const currentUnlockedTrophyIds = new Set(unlockedTrophyIds)
    const nextUnlockedTrophyIds = new Set(getUnlockedTrophyIds(nextProgress))
    const newlyUnlockedTrophies = trophies.filter(
      (trophy) =>
        nextUnlockedTrophyIds.has(trophy.id) &&
        !currentUnlockedTrophyIds.has(trophy.id),
    )

    setMoney((currentMoney) => currentMoney - cake.price)
    setUnlockedCakeIds(nextUnlockedCakeIds)
    setHighestUnlockedCakeCount((currentCount) => Math.max(currentCount, nextUnlockedCakeIds.length))
    showTrophyToasts(newlyUnlockedTrophies)
    const shouldCompleteStageAfterUnlock =
      stageServedCount >= activeStage.targetServes &&
      stages[activeStageIndex + 1]?.requiredUnlockedCakeId === cakeId

    if (shouldCompleteStageAfterUnlock) {
      completeStage(stageServedCount, stageEarned, stageBestCombo)
      return
    }

    setResult({
      kind: 'bonus',
      title: `${cake.name}を解放しました`,
      detail: newlyUnlockedTrophies.length > 0
          ? 'トロフィーも獲得しました。次から注文に登場します。'
          : '今のお客さんはそのまま。次から注文に登場します。',
    })
  }

  const handleMovePieceToTray = (piece: CakePieceModel): void => {
    if (screen !== 'playing') {
      return
    }

    setResult(idleResult)

    if (!boardPieces.some((currentPiece) => currentPiece.id === piece.id)) {
      return
    }

    if (selectedPieces.length >= maxTrayPieces) {
      setResult({
        kind: 'try-again',
        title: 'トレイは3ピースまでです',
        detail: '1つ戻してから試してね。',
      })
      return
    }

    setBoardPieces((currentPieces) =>
      currentPieces.filter((currentPiece) => currentPiece.id !== piece.id),
    )
    setSelectedPieces((currentPieces) => {
      if (
        currentPieces.some((currentPiece) => currentPiece.id === piece.id) ||
        currentPieces.length >= maxTrayPieces
      ) {
        return currentPieces
      }

      return [...currentPieces, piece]
    })
    if (guidedTutorialStep === 'move-piece') {
      setGuidedTutorialStep('serve')
    }
  }

  const handleReturnPieceToBoard = (piece: CakePieceModel): void => {
    if (screen !== 'playing') {
      return
    }

    setResult(idleResult)
    setSelectedPieces((currentPieces) =>
      currentPieces.filter((currentPiece) => currentPiece.id !== piece.id),
    )

    setBoardPieces((currentPieces) =>
      currentPieces.some((currentPiece) => currentPiece.id === piece.id)
        ? currentPieces
        : [...currentPieces, piece].sort((left, right) => left.startAngle - right.startAngle),
    )
  }

  const handleMovePieceToTrayById = (pieceId: string): void => {
    const piece = boardPieces.find((currentPiece) => currentPiece.id === pieceId)

    if (piece !== undefined) {
      handleMovePieceToTray(piece)
    }
  }

  const handleServe = (allowRecipeMismatch = false): void => {
    if (screen !== 'playing') {
      return
    }

    if (activeOrder.cakeKind !== activeCake.id) {
      setResult({
        kind: 'try-again',
        title: 'ケーキを確認してね',
        detail: `${getCakeById(activeOrder.cakeKind).name}の注文です。`,
      })
      if (guidedTutorialStep === null) {
        setCombo(0)
      }
      return
    }

    if (selectedPieces.length === 0) {
      setResult({
        kind: 'try-again',
        title: 'トレイが空だよ',
        detail: 'ピースをのせてね。',
      })
      return
    }

    if (areFractionsEqual(total, activeOrder.target)) {
      const recipeMatched = matchesRecipe(selectedPieces, activeOrder.recipePieces)
      const pieceCountMatched =
        activeOrder.perfectPieceCount !== undefined &&
        selectedPieces.length === activeOrder.perfectPieceCount
      const hasPerfectEvaluation = recipeMatched || pieceCountMatched

      if (
        activeOrder.recipePieces !== undefined &&
        !recipeMatched &&
        !allowRecipeMismatch
      ) {
        setResult({
          kind: 'warning',
          title: '量はぴったり！',
          detail: `${formatRecipe(activeOrder.recipePieces)} なら+${recipeBonusReward}円。このまま販売しますか？`,
          primaryLabel: 'このまま販売',
          secondaryLabel: '作り直す',
        })
        return
      }

      if (guidedTutorialStep === 'serve') {
        const nextOrderId = selectNextOrderId(
          stageOrders,
          stageAvailableCakeIds,
          servedCount,
          combo,
          activeOrder.id,
          activeOrder.customerName,
        )

        setActiveOrderId(nextOrderId)
        setToppingLayoutIndex((currentIndex) =>
          getNextToppingLayoutIndex(activeCake.id, currentIndex),
        )
        resetBoardState(activeCake.id)
        setGuidedTutorialStep('combo')
        setResult(idleResult)
        return
      }

      const cutToppingIds = new Set(selectedPieces.flatMap((piece) => piece.cutToppingIds))
      const cutToppingLabels = activeToppings
        .filter((topping) => cutToppingIds.has(topping.id))
        .map((topping) => topping.label)
      const allToppingsCut = activeToppings.every((topping) => cutToppingIds.has(topping.id))
      const nextCombo = combo + 1
      const comboReward = Math.max(0, nextCombo - 1) * 50
      const compactPieceReward = selectedPieces.length <= 2 ? compactPieceBonusReward : 0
      const toppingReward = cutToppingLabels.length === 0 ? toppingBonusReward : 0
      const recipeReward = hasPerfectEvaluation ? recipeBonusReward : 0
      const earnedMoney =
        baseReward + comboReward + compactPieceReward + toppingReward + recipeReward
      const nextServedCount = servedCount + 1
      const nextStageServedCount = stageServedCount + 1
      const nextStageCandidate = stages[activeStageIndex + 1]
      const hasMetStageGoal = nextStageServedCount >= activeStage.targetServes
      const isNextStageLocked =
        hasMetStageGoal &&
        nextStageCandidate?.requiredUnlockedCakeId !== undefined &&
        !stageAvailableCakeIds.includes(nextStageCandidate.requiredUnlockedCakeId)
      const nextCleanServes = cleanServes + (cutToppingLabels.length === 0 ? 1 : 0)
      const nextRecipeServes = recipeServes + (recipeMatched ? 1 : 0)
      const combinationKey = getPieceCombinationKey(selectedPieces)
      const nextHalfRecipeSignatures = areFractionsEqual(
        activeOrder.target,
        { numerator: 1, denominator: 2 },
      )
        ? addUniqueValue(halfRecipeSignatures, combinationKey)
        : halfRecipeSignatures
      const nextThreeQuarterRecipeSignatures = areFractionsEqual(
        activeOrder.target,
        { numerator: 3, denominator: 4 },
      )
        ? addUniqueValue(threeQuarterRecipeSignatures, combinationKey)
        : threeQuarterRecipeSignatures
      const nextTwelfthPieceServes = twelfthPieceServes + (
        selectedPieces.some((piece) =>
          areFractionsEqual(piece.fraction, { numerator: 1, denominator: 12 }),
        ) ? 1 : 0
      )
      const nextAllToppingsCutServes = allToppingsCutServes + (allToppingsCut ? 1 : 0)
      const nextThreePieceServes = threePieceServes + (selectedPieces.length === 3 ? 1 : 0)
      const nextServedFractionKeys = addUniqueValue(
        servedFractionKeys,
        formatFraction(activeOrder.target),
      )
      const nextUsedCutDenominators = currentCutDenominators.reduce<number[]>(
        (denominators, denominator) => addUniqueValue(denominators, denominator),
        usedCutDenominators,
      )
      const nextOrderId = selectNextOrderId(
        stageOrders,
        stageAvailableCakeIds,
        nextServedCount,
        nextCombo,
        activeOrder.id,
        activeOrder.customerName,
      )
      const nextProgress: TrophyProgress = {
        servedCount: nextServedCount,
        bestCombo: Math.max(bestCombo, nextCombo),
        totalEarned: totalEarned + earnedMoney,
        cleanServes: nextCleanServes,
        recipeServes: nextRecipeServes,
        unlockedCakeCount: highestUnlockedCakeCount,
        twelfthPieceServes: nextTwelfthPieceServes,
        allToppingsCutServes: nextAllToppingsCutServes,
        halfRecipeVariations: nextHalfRecipeSignatures.length,
        threeQuarterRecipeVariations: nextThreeQuarterRecipeSignatures.length,
        threePieceServes: nextThreePieceServes,
        distinctFractionsServed: nextServedFractionKeys.length,
        distinctCutDenominators: nextUsedCutDenominators.length,
      }
      const currentUnlockedTrophyIds = new Set(unlockedTrophyIds)
      const nextUnlockedTrophyIds = new Set(getUnlockedTrophyIds(nextProgress))
      const hasStageCleared =
        !stageCompletionRef.current && hasMetStageGoal && !isNextStageLocked
      const newlyUnlockedTrophies = trophies.filter(
        (trophy) =>
          nextUnlockedTrophyIds.has(trophy.id) &&
          !currentUnlockedTrophyIds.has(trophy.id),
      )
      const resultHighlights: string[] = []

      if (pieceCountMatched) {
        resultHighlights.push(`${activeOrder.perfectPieceCount}ピースで最高評価！`)
      }

      if (!hasExplainedCombo) {
        resultHighlights.push('コンボ開始！続けて成功すると売上ボーナスが増えるよ。')
        setHasExplainedCombo(true)
      }

      if (!hasExplainedTrophies && newlyUnlockedTrophies.length > 0) {
        resultHighlights.push(
          `トロフィーを${newlyUnlockedTrophies.length}個獲得！左の「一覧」で見られるよ。`,
        )
        setHasExplainedTrophies(true)
      }

      if (newlyUnlockedTrophies.length > 0) {
        showTrophyToasts(newlyUnlockedTrophies)
      }

      setCombo(nextCombo)
      setBestCombo((currentBestCombo) => Math.max(currentBestCombo, nextCombo))
      setMoney((currentMoney) => currentMoney + earnedMoney)
      setTotalEarned((currentTotalEarned) => currentTotalEarned + earnedMoney)
      setStageEarned((currentStageEarned) => currentStageEarned + earnedMoney)
      setStageBestCombo((currentBest) => Math.max(currentBest, nextCombo))
      setServedCount(nextServedCount)
      setCleanServes(nextCleanServes)
      setRecipeServes(nextRecipeServes)
      setTwelfthPieceServes(nextTwelfthPieceServes)
      setAllToppingsCutServes(nextAllToppingsCutServes)
      setHalfRecipeSignatures(nextHalfRecipeSignatures)
      setThreeQuarterRecipeSignatures(nextThreeQuarterRecipeSignatures)
      setThreePieceServes(nextThreePieceServes)
      setServedFractionKeys(nextServedFractionKeys)
      setUsedCutDenominators(nextUsedCutDenominators)
      setStageServedCount(Math.min(nextStageServedCount, activeStage.targetServes))
      setActiveOrderId(nextOrderId)
      setToppingLayoutIndex((currentIndex) =>
        getNextToppingLayoutIndex(activeCake.id, currentIndex),
      )
      resetBoardState(activeCake.id)

      if (hasStageCleared) {
        completeStage(
          nextStageServedCount,
          stageEarned + earnedMoney,
          Math.max(stageBestCombo, nextCombo),
        )
        return
      }

      if (cutToppingLabels.length === 0) {
        setResult({
          kind: 'bonus',
          title: isNextStageLocked ? 'チョコケーキを解放しよう' : 'ありがとう！',
          detail: isNextStageLocked
              ? `${nextStageCandidate.title}へ進むには、チョコレートケーキの解放が必要です。`
              : hasPerfectEvaluation ? '最高評価の作り方だね！' : 'きれいに切れているね！',
          earnedMoney,
          combo: nextCombo,
          highlights: resultHighlights,
          primaryLabel: '次へ',
        })
        return
      }

      setResult({
        kind: 'success',
        title: isNextStageLocked ? 'チョコケーキを解放しよう' : 'ありがとう！',
        detail: isNextStageLocked
            ? `${nextStageCandidate.title}へ進むには、チョコレートケーキの解放が必要です。`
            : 'ぴったりの量だね。',
        earnedMoney,
        combo: nextCombo,
        highlights: resultHighlights,
        primaryLabel: '次へ',
      })
      return
    }

    const comparison = compareFractions(total, activeOrder.target)
    setResult(
      comparison < 0
        ? {
            kind: 'try-again',
            title: 'もう少しほしいな',
            detail: `今 ${formatFraction(total)} ／ 注文 ${formatFraction(activeOrder.target)}`,
          }
        : {
            kind: 'try-again',
            title: '少し多いみたい',
            detail: `今 ${formatFraction(total)} ／ 注文 ${formatFraction(activeOrder.target)}`,
          },
    )
    if (guidedTutorialStep === null) {
      setCombo(0)
    }
  }

  const showStageSelect = (): void => {
    setGuidedTutorialStep(null)
    setResult(idleResult)
    setCarriedPiece(null)
    setStageResultSummary(null)
    setScreen('stageSelect')
  }

  const continuePlayingStage = (): void => {
    setStageResultSummary(null)
    setResult(idleResult)
    setScreen('playing')
  }

  const handleSelectStage = (stageIndex: number): void => {
    if (stageIndex > maxUnlockedStage) {
      return
    }

    startStage(stageIndex)
  }

  const toggleSound = (): void => {
    setIsSoundEnabled((currentValue) => !currentValue)
  }

  const soundControl = (
    <>
      <audio ref={bgmAudioRef} src={audioAssets.cakeBgm} loop preload="auto" />
      <button
        type="button"
        className={`sound-toggle${isSoundEnabled ? ' is-on' : ''}`}
        onClick={toggleSound}
        aria-pressed={isSoundEnabled}
      >
        <span aria-hidden="true">♪</span>
        {isSoundEnabled ? '音 ON' : '音 OFF'}
      </button>
    </>
  )

  if (screen === 'title') {
    return (
      <>
        {soundControl}
        <TitleScreen onStart={() => setScreen('stageSelect')} />
      </>
    )
  }

  if (screen === 'stageSelect') {
    return (
      <>
        {soundControl}
        <StageSelectScreen
          stages={stages}
          maxUnlockedStage={maxUnlockedStage}
          completedStageIds={completedStageIds}
          onSelectStage={handleSelectStage}
          onBackToTitle={() => setScreen('title')}
        />
      </>
    )
  }

  if (screen === 'chapterResult') {
    return (
      <>
        {soundControl}
        <ChapterResultModal
          stages={stages}
          onSelectStage={showStageSelect}
          onRestart={() => startStage(0)}
        />
      </>
    )
  }

  const mainClassName = [
    'game-shell',
    screen === 'stageResult' ? 'is-stage-finished' : '',
    carriedPiece === null ? '' : 'is-carrying-piece',
    guidedTutorialStep === null ? '' : `is-guided guided-step-${guidedTutorialStep}`,
  ].filter(Boolean).join(' ')

  return (
    <>
      {soundControl}
      <main className={mainClassName}>
      <header className="game-header">
        <div>
          <div className="game-title-row">
            <h1><FuriganaText text="分ケーキ" /></h1>
            <span className="stage-eyebrow">
              <FuriganaText text={`ステージ${activeStageIndex + 1}「${activeStage.title}」`} />
            </span>
            <button
              type="button"
              className="button button--secondary stage-select-return"
              onClick={showStageSelect}
            >
              ステージ一覧
            </button>
          </div>
        </div>
      </header>

      <div className="game-layout">
        <div className="left-panel">
          <CustomerQueue
            orders={visibleQueueOrders}
            activeOrderId={activeOrder.id}
          />
          <TrophyShelf
            trophies={trophies}
            unlockedTrophyIds={unlockedTrophyIds}
            progress={trophyProgress}
          />
        </div>

        <section className="play-area">
          <OrderBubble order={activeOrder} cake={getCakeById(activeOrder.cakeKind)} />
          <CakeSelector
            cakes={visibleCakes}
            activeCakeId={activeCake.id}
            unlockedCakeIds={stageAvailableCakeIds}
            money={money}
            onSelectCake={handleSelectCake}
            onBuyCake={handleBuyCake}
          />
          <CakeBoard
            key={`${activeOrder.id}-${activeCake.id}-${toppingLayoutIndex}`}
            pieces={boardPieces}
            cake={activeCake}
            toppings={activeToppings}
            cutToppingIds={cutToppingIds}
            cutMarkAngles={cutMarkAngles}
            isTrayFull={selectedPieces.length >= maxTrayPieces}
            isCarryingPiece={carriedPiece !== null}
            interactionMode={interactionMode}
            currentCuts={currentCuts}
            showCuttingGuide={guidedTutorialStep !== 'topping'}
            onCutCake={handleCutCake}
            onMovePieceToTray={handleMovePieceToTray}
            onCarryPieceChange={handleCarryPieceChange}
          />
        </section>

        <aside className="side-panel">
          <HelpMenu onOpenTutorial={openGuidedTutorial} />
          <dl className="score-board" aria-label="スコア">
            <div className="score-card score-card--sales">
              <dt><FuriganaText text="売上" /></dt>
              <dd>{money.toLocaleString()}<FuriganaText text="円" /></dd>
            </div>
            <div className={`score-card score-card--combo${combo > 0 ? ' is-active' : ''}${combo >= 5 ? ' is-hot' : ''}`}>
              <dt>コンボ</dt>
              <dd key={combo} className="combo-value">
                <span>{combo}</span>
                <small>COMBO</small>
              </dd>
              <span className="combo-candles" aria-hidden="true">
                {Array.from({ length: Math.min(combo, 5) }, (_, index) => (
                  <i key={index} />
                ))}
              </span>
            </div>
          </dl>
          {screen === 'playing' ? (
            <ResultMessage
              result={result}
              onDismiss={() => setResult(idleResult)}
              onConfirm={() => handleServe(true)}
            />
          ) : null}
          <Tray
            selectedPieces={selectedPieces}
            total={total}
            maxPieces={maxTrayPieces}
            cakeImageUrl={activeCake.imageUrl}
            toppings={activeToppings}
            onRemovePiece={handleReturnPieceToBoard}
            onDropPiece={handleMovePieceToTrayById}
          />
          <GameControls
            interactionMode={interactionMode}
            canServe={canServeCurrentTray}
            onChangeInteractionMode={handleChangeInteractionMode}
            onServe={handleServe}
            onClear={clearTray}
          />
        </aside>
      </div>
      <aside className="status-dock" aria-label="現在の表">
        <section
          className={isStageGoalComplete ? 'stage-card is-complete' : 'stage-card'}
          aria-label="ステージ目標"
        >
          <div className="stage-card__header">
            <small><FuriganaText text="今の目標" /></small>
            <span>{isStageGoalComplete ? '達成！' : `${stageProgressValue}/${stageProgressTarget}`}</span>
          </div>
          <strong><FuriganaText text={activeStage.goal} /></strong>
          <div className="stage-card__meter" aria-hidden="true">
            <span style={{ width: `${stageProgressRatio * 100}%` }} />
          </div>
        </section>
      </aside>
      {carriedPiece !== null ? (
        <>
          <img
            className="tool-cursor tool-cursor--move tool-cursor--carrying"
            src={toolImages.move}
            alt=""
            aria-hidden="true"
            style={{ left: carriedPiece.x, top: carriedPiece.y }}
          />
          <div
            className="carry-badge"
            style={{ left: carriedPiece.x, top: carriedPiece.y }}
            aria-live="polite"
          >
            <CakePiecePreview piece={carriedPiece.piece} imageUrl={activeCake.imageUrl} toppings={activeToppings} />
            <span><FuriganaText text="運び中" /></span>
          </div>
        </>
      ) : null}
      <div className="trophy-toast-region" aria-live="polite" aria-atomic="false">
        {trophyToasts.map((toast) => (
          <aside key={toast.id} className="trophy-toast">
            <span className="trophy-toast__icon" aria-hidden="true">★</span>
            <div>
              <strong><FuriganaText text="トロフィー獲得" /></strong>
              <p><FuriganaText text={toast.trophy.title} /></p>
            </div>
          </aside>
        ))}
      </div>
      {screen === 'playing' ? (
        <GuidedTutorial
          step={guidedTutorialStep}
          onAdvance={advanceGuidedTutorial}
          onSkip={skipGuidedTutorial}
        />
      ) : null}
      {screen === 'stageResult' && stageResultSummary !== null ? (
        <StageResultModal
          stage={activeStage}
          summary={stageResultSummary}
          isFinalStage={isFinalStage}
          onReplay={continuePlayingStage}
          onSelectStage={showStageSelect}
          onNextStage={() => {
            if (isFinalStage) {
              setStageResultSummary(null)
              setScreen('chapterResult')
              return
            }

            startStage(activeStageIndex + 1)
          }}
        />
      ) : null}
      </main>
    </>
  )
}

export default App
