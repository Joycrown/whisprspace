'use client'

import { Children, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface EpisodeCarouselProps {
  storyId: string
  episodeNumbers: number[]
  children: React.ReactNode
}

const EPISODE_HASH = /^#episode-(\d+)$/
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export default function EpisodeCarousel({ storyId, episodeNumbers, children }: EpisodeCarouselProps) {
  const slides = Children.toArray(children)
  const total = slides.length
  const storageKey = `whs_story_episode:${storyId}`

  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<Array<HTMLDivElement | null>>([])
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const activeRef = useRef(0)
  const frameRef = useRef<number | null>(null)
  const targetRef = useRef<number | null>(null)
  const targetTimerRef = useRef<number | null>(null)
  const [active, setActive] = useState(0)
  const [height, setHeight] = useState<number | null>(null)
  const [ready, setReady] = useState(false)

  const scrollTrackTo = useCallback((index: number, smooth: boolean) => {
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: index * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  useIsomorphicLayoutEffect(() => {
    const fromHash = window.location.hash.match(EPISODE_HASH)
    let stored: number | null = null
    try {
      stored = Number(localStorage.getItem(storageKey)) || null
    } catch {}
    const wanted = fromHash ? Number(fromHash[1]) : stored
    const index = wanted ? episodeNumbers.indexOf(wanted) : -1
    if (index > 0) {
      activeRef.current = index
      setActive(index)
      scrollTrackTo(index, false)
    }
    setReady(true)
  }, [episodeNumbers, scrollTrackTo, storageKey])

  useEffect(() => {
    if (!ready) return
    const episodeNumber = episodeNumbers[active]
    try {
      localStorage.setItem(storageKey, String(episodeNumber))
    } catch {}
    const hash = window.location.hash
    if (!hash || EPISODE_HASH.test(hash)) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#episode-${episodeNumber}`)
    }
    tabRefs.current[active]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [active, ready, episodeNumbers, storageKey])

  useEffect(() => {
    const slide = slideRefs.current[active]
    if (!slide) return
    const measure = () => setHeight(slide.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(slide)
    return () => observer.disconnect()
  }, [active])

  useEffect(() => {
    const onResize = () => scrollTrackTo(activeRef.current, false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [scrollTrackTo])

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    if (targetTimerRef.current !== null) window.clearTimeout(targetTimerRef.current)
  }, [])

  const releaseTarget = () => {
    targetRef.current = null
    if (targetTimerRef.current !== null) {
      window.clearTimeout(targetTimerRef.current)
      targetTimerRef.current = null
    }
  }

  const onScroll = () => {
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const track = trackRef.current
      if (!track || !track.clientWidth) return
      const index = Math.min(total - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth)))
      if (targetRef.current !== null) {
        if (index === targetRef.current) releaseTarget()
        return
      }
      if (index !== activeRef.current) {
        activeRef.current = index
        setActive(index)
      }
    })
  }

  const goTo = (index: number) => {
    if (index < 0 || index >= total) return
    activeRef.current = index
    setActive(index)
    releaseTarget()
    targetRef.current = index
    targetTimerRef.current = window.setTimeout(releaseTarget, 1000)
    scrollTrackTo(index, true)
    const root = rootRef.current
    if (root && root.getBoundingClientRect().top < 0) {
      root.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      goTo(active + 1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goTo(active - 1)
    }
  }

  const arrow = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#2A2A38] text-[#8F8FA3] transition-colors hover:border-[#8B5CF6]/45 hover:text-[#F2F2F6] disabled:opacity-30 disabled:hover:border-[#2A2A38] disabled:hover:text-[#8F8FA3]'

  return (
    <div ref={rootRef} className="scroll-mt-4" onKeyDown={onKeyDown}>
      <div className="sticky top-0 z-10 -mx-4 mb-5 border-b border-[#1C1C26] bg-[#0A0A10]/95 px-4 py-2.5 backdrop-blur md:-mx-5 md:px-5 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Previous episode" className={arrow}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div role="tablist" aria-label="Episodes" className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto scrollbar-hide">
            {episodeNumbers.map((number, index) => (
              <button
                key={number}
                ref={(node) => { tabRefs.current[index] = node }}
                type="button"
                role="tab"
                aria-selected={index === active}
                onClick={() => goTo(index)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  index === active
                    ? 'bg-gradient-to-r from-[#8B5CF6] to-[#F97316] text-white'
                    : 'border border-[#2A2A38] text-[#8F8FA3] hover:border-[#8B5CF6]/45 hover:text-[#F2F2F6]'
                }`}
              >
                Ep {number}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => goTo(active + 1)} disabled={active === total - 1} aria-label="Next episode" className={arrow}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-[#5C5C6E]">
          Episode {episodeNumbers[active]} of {total}
          <span className="md:hidden"> · Swipe to switch episodes</span>
        </p>
      </div>

      <div
        ref={trackRef}
        onScroll={onScroll}
        onPointerDown={releaseTarget}
        onWheel={releaseTarget}
        className="flex snap-x snap-mandatory items-start overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-hide transition-[height] duration-200"
        style={height ? { height } : undefined}
      >
        {slides.map((slide, index) => (
          <div
            key={episodeNumbers[index]}
            ref={(node) => { slideRefs.current[index] = node }}
            role="tabpanel"
            aria-label={`Episode ${episodeNumbers[index]} of ${total}`}
            aria-hidden={index !== active}
            className="w-full min-w-full shrink-0 snap-start snap-always"
          >
            {slide}
            <div className="mt-8 flex items-center justify-between gap-3">
              {index > 0 ? (
                <button
                  type="button"
                  tabIndex={index === active ? 0 : -1}
                  onClick={() => goTo(index - 1)}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#2A2A38] px-3 py-2 text-xs text-[#8F8FA3] hover:border-[#8B5CF6]/45 hover:text-[#F2F2F6]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Episode {episodeNumbers[index - 1]}
                </button>
              ) : <span />}
              {index < total - 1 && (
                <button
                  type="button"
                  tabIndex={index === active ? 0 : -1}
                  onClick={() => goTo(index + 1)}
                  className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#F97316] px-4 py-2 text-xs font-medium text-white"
                >
                  Next: Episode {episodeNumbers[index + 1]}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
