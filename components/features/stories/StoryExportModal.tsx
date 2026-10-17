'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, X } from 'lucide-react'
import type { StoryCategory, StoryFamily } from '@/lib/stories/types'

const Spinner = () => (
  <div className="flex justify-center py-10">
    <Loader2 className="h-5 w-5 animate-spin text-[#8F8FA3]" />
  </div>
)

const StoryExport = dynamic(() => import('./StoryExport'), { ssr: false, loading: Spinner })

type Episode = { number: number; body: string }

interface StoryExportModalProps {
  storyId: string
  title: string
  category: StoryCategory
  family: StoryFamily
  isPremium: boolean
  onClose: () => void
}

export default function StoryExportModal({ storyId, title, category, family, isPremium, onClose }: StoryExportModalProps) {
  const [episodes, setEpisodes] = useState<Episode[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    let active = true
    fetch(`/api/public/stories/${storyId}`)
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as { episodes?: Episode[]; error?: string } | null
        if (!response.ok || !data?.episodes?.length) throw new Error(data?.error || 'Unable to load this story.')
        if (active) setEpisodes(data.episodes)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load this story.')
      })
    return () => { active = false }
  }, [storyId])

  return (
    <div className="fixed inset-0 z-[1300] flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Export this story"
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-[#23232E] bg-[#12121A] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[#F2F2F6] sm:max-w-lg sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-medium">Export this story</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-[#5C5C6E] hover:text-[#F2F2F6]">
            <X className="h-4 w-4" />
          </button>
        </div>
        {error ? (
          <p className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>
        ) : episodes ? (
          <StoryExport storyId={storyId} title={title} category={category} family={family} episodes={episodes} isPremium={isPremium} compact />
        ) : (
          <Spinner />
        )}
      </div>
    </div>
  )
}
