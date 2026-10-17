import { encode } from 'uqr'

export const QR_QUIET_ZONE = 4

export function withQrSource(link: string): string {
  try {
    const url = new URL(link, typeof window === 'undefined' ? 'https://whisprspace.com' : window.location.origin)
    url.searchParams.set('src', 'qr')
    return url.toString()
  } catch {
    return link
  }
}

export interface QrMatrix {
  size: number
  path: string
  modules: boolean[][]
}

export function buildQrMatrix(value: string): QrMatrix {
  const { data } = encode(value, { ecc: 'M', border: 0 })
  const size = data.length
  let path = ''
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (data[y][x]) path += `M${x} ${y}h1v1h-1z`
    }
  }
  return { size, path, modules: data }
}

export function renderQrPng(matrix: QrMatrix, targetPx = 1200): Promise<Blob> {
  const total = matrix.size + QR_QUIET_ZONE * 2
  const scale = Math.max(4, Math.floor(targetPx / total))
  const canvas = document.createElement('canvas')
  canvas.width = total * scale
  canvas.height = total * scale
  const context = canvas.getContext('2d')
  if (!context) return Promise.reject(new Error('Unable to draw the QR code.'))
  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#0A0A10'
  matrix.modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) context.fillRect((x + QR_QUIET_ZONE) * scale, (y + QR_QUIET_ZONE) * scale, scale, scale)
    })
  })
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Unable to create the image.'))), 'image/png')
  })
}
