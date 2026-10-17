import { NextRequest, NextResponse } from 'next/server'
import { getStoryPage, STORY_REVALIDATE_SECONDS } from '@/lib/stories/server'
import { sanitizeUuid } from '@/lib/security/input-sanitization'

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const storyId = sanitizeUuid(id)
  if (!storyId) return NextResponse.json({ error: 'Invalid story.' }, { status: 400 })

  try {
    const story = await getStoryPage(storyId)
    if (!story) return NextResponse.json({ error: 'Story not found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    return NextResponse.json(
      { episodes: story.episodes.map(({ number, body }) => ({ number, body })) },
      { headers: { 'Cache-Control': `public, s-maxage=${STORY_REVALIDATE_SECONDS}, stale-while-revalidate=600` } }
    )
  } catch {
    return NextResponse.json({ error: 'Unable to load story.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
