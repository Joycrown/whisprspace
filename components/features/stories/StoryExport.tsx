'use client'

import { useMemo, useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import type { AspectRatio } from '@/lib/prompts/carousel-layout'
import { INSTAGRAM_CAROUSEL_LIMIT, chunkStoryText, pickSlideHook } from '@/lib/stories/slide-layout'
import type { StoryCategory, StoryFamily } from '@/lib/stories/types'
import StorySlide, { type StorySlideData } from './StorySlide'

const ratioOptions: Array<{ value: AspectRatio; label: string; detail: string }> = [
  { value: 'square', label: '1:1', detail: 'Feed' },
  { value: 'portrait', label: '4:5', detail: 'Carousel' },
  { value: 'story', label: '9:16', detail: 'Story / TikTok' },
]

interface StoryExportProps {
  storyId: string
  title: string
  category: StoryCategory
  family: StoryFamily
  episodes: Array<{ number: number; body: string }>
  isPremium: boolean
  compact?: boolean
}

export default function StoryExport({ storyId, title, category, family, episodes, isPremium, compact = false }: StoryExportProps) {
  const isSeries = episodes.length > 1
  const [ratio, setRatio] = useState<AspectRatio>('portrait')
  const [episodeNumber, setEpisodeNumber] = useState(episodes[episodes.length - 1]?.number ?? 1)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const slideRefs = useRef<Array<HTMLDivElement | null>>([])
  const busy = progress !== null

  const slides = useMemo<StorySlideData[]>(() => {
    const episode = episodes.find((item) => item.number === episodeNumber) ?? episodes[0]
    if (!episode) return []
    const chunks = chunkStoryText(episode.body)
    return [
      { kind: 'cover', episodeNumber: isSeries ? episode.number : null },
      ...chunks.map((text, index) => ({ kind: 'body' as const, text, index: index + 1, total: chunks.length })),
      {
        kind: 'cta',
        hook: pickSlideHook(`${storyId}:${episode.number}`),
        eyebrow: isSeries ? 'Read every episode on WhisprSpace' : 'Join the discussion on WhisprSpace',
      },
    ]
  }, [episodeNumber, episodes, isSeries, storyId])

  const download = async () => {
    if (!slides.length || busy) return
    setProgress(0)
    setError(null)
    try {
      const { toBlob } = await import('html-to-image')
      for (let index = 0; index < slides.length; index += 1) {
        setProgress(index + 1)
        const node = slideRefs.current[index]
        if (!node) continue
        const blob = await toBlob(node, { pixelRatio: 2, cacheBust: true, backgroundColor: '#0A0A10' })
        if (!blob) throw new Error(`Slide ${index + 1} could not be rendered. Please try again.`)
        const objectUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = `whisprspace-story-${storyId.slice(0, 8)}-${String(index + 1).padStart(2, '0')}.png`
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
        if (index < slides.length - 1) await new Promise((resolve) => setTimeout(resolve, 350))
      }
      import('posthog-js').then(({ default: posthog }) => posthog.capture('story_export_generated', { story_id: storyId, ratio, slides: slides.length, episode: episodeNumber, tier: isPremium ? 'premium' : 'free' })).catch(() => {})
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to export right now.')
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5 rounded-2xl border border-[#23232E] bg-[#12121A] p-5'}>
      {!compact && (
        <div>
          <h2 className="text-base font-medium">Share it on your own pages</h2>
          <p className="mt-1 text-sm text-[#8F8FA3]">Download your story as ready-to-post slides.</p>
        </div>
      )}
      {isSeries && (
        <select
          value={episodeNumber}
          onChange={(event) => setEpisodeNumber(Number(event.target.value))}
          disabled={busy}
          aria-label="Episode to export"
          className="h-10 w-full rounded-xl border border-[#2A2A38] bg-[#0A0A10] px-3 text-sm text-[#F2F2F6]"
        >
          {episodes.map((item) => (
            <option key={item.number} value={item.number}>Episode {item.number}</option>
          ))}
        </select>
      )}
      <div className="grid grid-cols-3 gap-2">
        {ratioOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRatio(option.value)}
            disabled={busy}
            className={`rounded-xl border py-2.5 text-center transition-colors ${ratio === option.value ? 'border-[#8B5CF6]/70 bg-[#8B5CF6]/15 text-white' : 'border-[#2A2A38] text-[#8F8FA3]'}`}
          >
            <span className="block text-sm font-medium">{option.label}</span>
            <span className="mt-0.5 block text-[11px]">{option.detail}</span>
          </button>
        ))}
      </div>
      <button
        onClick={download}
        disabled={!slides.length || busy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#F97316] text-sm font-medium text-white disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {busy ? `Saving slide ${progress} of ${slides.length}…` : `Download ${slides.length} slides`}
      </button>
      {error ? (
        <p className="text-center text-xs text-[#F09595]">{error}</p>
      ) : (
        <p className="text-center text-xs text-[#5C5C6E]">
          Your browser may ask to allow multiple downloads.
          {slides.length > INSTAGRAM_CAROUSEL_LIMIT && ` Instagram carousels hold up to ${INSTAGRAM_CAROUSEL_LIMIT} slides, so post longer stories in parts.`}
        </p>
      )}
      <div className="pointer-events-none fixed -left-[3000px] top-0" aria-hidden>
        {slides.map((slide, index) => (
          <StorySlide key={`${slide.kind}-${index}`} ref={(node) => { slideRefs.current[index] = node }} slide={slide} ratio={ratio} title={title} category={category} family={family} />
        ))}
      </div>
    </div>
  )
}
