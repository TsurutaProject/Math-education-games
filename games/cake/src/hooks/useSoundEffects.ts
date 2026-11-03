import { useCallback, useEffect, useRef } from 'react'
import { soundEffects } from '../data/assets'

type SoundEffect = keyof typeof soundEffects

export function useSoundEffects(enabled: boolean) {
  const players = useRef<Partial<Record<SoundEffect, HTMLAudioElement>>>({})
  const play = useCallback((name: SoundEffect) => {
    if (!enabled) return
    const audio = players.current[name] ?? new Audio(soundEffects[name])
    players.current[name] = audio
    audio.volume = 0.55
    audio.currentTime = 0
    void audio.play().catch(() => { /* Audio may be blocked by browser settings. */ })
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const activePlayers = players.current
    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const control = target.closest('button, summary')
      if (!control || control.matches(':disabled, [aria-disabled="true"], .sound-toggle')) return
      const sound = control.getAttribute('data-se')
      if (sound === 'none') return
      play(sound === 'retry' ? 'retry' : 'button')
    }
    // Read the control before React updates or removes it after the click.
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      for (const audio of Object.values(activePlayers)) {
        audio.pause()
        audio.currentTime = 0
      }
    }
  }, [enabled, play])

  return play
}
