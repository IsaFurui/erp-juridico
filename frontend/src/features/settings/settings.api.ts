import { usersApi } from '../../lib/api'
import type { UpdateProfilePayload, User } from '../../lib/api'

export function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  return usersApi.updateProfile(payload)
}

/**
 * Lê o arquivo, reduz para no máximo `max`px no maior lado e devolve um data
 * URL JPEG — pequeno o bastante para caber numa coluna de texto do banco.
 */
export function resizeImageToDataUrl(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode'))
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('ctx'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
