'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Download, Loader2, X } from 'lucide-react'
import { QR_QUIET_ZONE, buildQrMatrix, renderQrPng, withQrSource } from '@/lib/share/qr'

interface QrCodeSheetProps {
  link: string
  title?: string
  fileName?: string
  onClose: () => void
}

const displayLink = (link: string) => link.replace(/^https?:\/\//, '').replace(/\/$/, '')

export default function QrCodeSheet({ link, title = 'Scan to open', fileName = 'whisprspace-qr', onClose }: QrCodeSheetProps) {
  const matrix = useMemo(() => buildQrMatrix(withQrSource(link)), [link])
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const viewBox = matrix.size + QR_QUIET_ZONE * 2

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!copied) return
    const timeoutId = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [copied])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      setError('Couldn’t copy the link. Long-press it to copy instead.')
    }
  }

  const download = async () => {
    if (downloading) return
    setDownloading(true)
    setError(null)
    try {
      const blob = await renderQrPng(matrix)
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `${fileName}.png`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to download the QR code.')
    } finally {
      setDownloading(false)
    }
  }

  if (typeof window === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full rounded-t-2xl border border-[#23232E] bg-[#12121A] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[#F2F2F6] sm:max-w-sm sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-[#5C5C6E] hover:text-[#F2F2F6]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-[#8F8FA3]">Point a phone camera at the code to open the link.</p>

        <div className="mx-auto mt-4 w-full max-w-[280px] rounded-2xl bg-white p-2 shadow-lg">
          <svg
            viewBox={`${-QR_QUIET_ZONE} ${-QR_QUIET_ZONE} ${viewBox} ${viewBox}`}
            className="block h-auto w-full"
            shapeRendering="crispEdges"
            role="img"
            aria-label={`QR code for ${displayLink(link)}`}
          >
            <rect x={-QR_QUIET_ZONE} y={-QR_QUIET_ZONE} width={viewBox} height={viewBox} fill="#FFFFFF" />
            <path d={matrix.path} fill="#0A0A10" />
          </svg>
        </div>

        <p className="mt-3 break-all text-center text-xs text-[#8F8FA3]">{displayLink(link)}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={download}
            disabled={downloading}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#F97316] text-sm font-medium text-white disabled:opacity-50"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#2A2A38] text-sm text-[#E6E6EC] hover:border-[#8B5CF6]/45"
          >
            {copied ? <Check className="h-4 w-4 text-[#5DCAA5]" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
        {error && <p className="mt-2 text-center text-xs text-red-300">{error}</p>}
      </div>
    </div>,
    document.body
  )
}
