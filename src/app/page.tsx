'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, Upload, Sparkles, Download, RotateCcw, Loader2, X, ImageIcon, Images } from 'lucide-react'
import Link from 'next/link'
import { useAnalytics } from '../hooks/useAnalytics'

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [showPromptInput, setShowPromptInput] = useState(false)
  const [optIn, setOptIn] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const { track, getSessionId, flush } = useAnalytics()

  // Load opt-in preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sceneit_opt_in')
    if (saved === 'true') setOptIn(true)
    track('page_view')
  }, [track])

  const toggleOptIn = () => {
    const next = !optIn
    setOptIn(next)
    localStorage.setItem('sceneit_opt_in', String(next))
    track(next ? 'consent_given' : 'consent_revoked')
  }

  const compressImage = useCallback((dataUrl: string, maxSizeKB: number = 1500): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        const maxDim = 2048
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)

        let quality = 0.85
        let result = canvas.toDataURL('image/jpeg', quality)
        while (result.length > maxSizeKB * 1024 * 1.37 && quality > 0.3) {
          quality -= 0.1
          result = canvas.toDataURL('image/jpeg', quality)
        }
        resolve(result)
      }
      img.src = dataUrl
    })
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, source: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    track('upload_start', { source })

    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string
      const compressed = await compressImage(dataUrl)
      setOriginalImage(compressed)
      setEnhancedImage(null)
      setError(null)
      track('upload_complete', { source, size: file.size })
    }
    reader.readAsDataURL(file)
  }, [compressImage, track])

  const handleEnhance = async (prompt?: string) => {
    if (!originalImage) return

    setIsProcessing(true)
    setError(null)
    setShowPromptInput(false)

    const styleTag = prompt || undefined
    track('enhance_start', { style_tag: styleTag, has_custom_prompt: !!customPrompt })
    if (styleTag) track('style_selected', { style: styleTag })
    if (customPrompt && !prompt) track('prompt_custom', { prompt: customPrompt })

    try {
      const response = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: originalImage,
          prompt: prompt || customPrompt || undefined,
          opt_in: optIn,
          session_id: getSessionId(),
          style_tag: styleTag || (customPrompt ? 'custom' : null),
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Enhancement failed')
      }

      setEnhancedImage(data.enhanced)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
      track('enhance_error', { error: msg })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!enhancedImage) return
    track('download')

    const link = document.createElement('a')
    link.href = enhancedImage
    link.download = `sceneit-enhanced-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleReset = () => {
    setOriginalImage(null)
    setEnhancedImage(null)
    setError(null)
    setCustomPrompt('')
    setShowPromptInput(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    flush()
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                SCENEIT
              </h1>
              <p className="text-[10px] text-white/50 uppercase tracking-widest">AI Photo Enhancement</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/gallery" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/70">
              <Images className="w-4 h-4" />
              <span className="hidden sm:inline">Gallery</span>
            </Link>
            {originalImage && (
              <button
                onClick={handleReset}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <RotateCcw className="w-5 h-5 text-white/70" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {!originalImage ? (
          /* Upload State */
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                Transform Your Photos
              </h2>
              <p className="text-white/60 text-lg max-w-md mx-auto">
                Enhance any image with AI-powered magic. Modernize interiors, upgrade exteriors, or reimagine any scene.
              </p>
            </div>

            {/* Opt-in Toggle */}
            <div className="mb-8 flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/10">
              <button
                onClick={toggleOptIn}
                className={`relative w-11 h-6 rounded-full transition-colors ${optIn ? 'bg-violet-600' : 'bg-white/20'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${optIn ? 'translate-x-5' : ''}`} />
              </button>
              <span className="text-sm text-white/60">Save my photos to help improve SceneIt</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
              {/* Camera Button */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 p-6 text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Camera className="w-12 h-12 mx-auto mb-3" />
                <div className="font-semibold text-lg">Take Photo</div>
                <div className="text-sm text-white/70">Use your camera</div>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileSelect(e, 'camera')}
                  className="hidden"
                />
              </button>

              {/* Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600 to-fuchsia-800 p-6 text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Upload className="w-12 h-12 mx-auto mb-3" />
                <div className="font-semibold text-lg">Upload</div>
                <div className="text-sm text-white/70">Choose from library</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 'upload')}
                  className="hidden"
                />
              </button>
            </div>

            {/* Features */}
            <div className="mt-16 grid grid-cols-3 gap-8 text-center max-w-lg">
              {[
                { icon: '🏠', label: 'Interiors' },
                { icon: '🌇', label: 'Exteriors' },
                { icon: '✨', label: 'Any Scene' },
              ].map((feature) => (
                <div key={feature.label} className="text-white/50">
                  <div className="text-3xl mb-2">{feature.icon}</div>
                  <div className="text-sm">{feature.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Processing/Results State */
          <div className="space-y-6">
            {/* Error */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                <X className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-200">{error}</p>
              </div>
            )}

            {/* Image Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="w-4 h-4 text-white/50" />
                  <span className="text-sm font-medium text-white/70 uppercase tracking-wide">Original</span>
                </div>
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black/30">
                  <img
                    src={originalImage}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Enhanced */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-medium text-violet-400 uppercase tracking-wide">Enhanced</span>
                </div>
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black/30">
                  {isProcessing ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Loader2 className="w-12 h-12 text-violet-400 animate-spin mb-4" />
                      <p className="text-white/60">Enhancing your image...</p>
                      <p className="text-white/40 text-sm mt-1">This may take a moment</p>
                    </div>
                  ) : enhancedImage ? (
                    <img
                      src={enhancedImage}
                      alt="Enhanced"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-white/40">Click enhance to transform</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Prompt Section */}
            {showPromptInput && !isProcessing && (
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Custom Enhancement Prompt (optional)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., Make it look like a modern luxury home, add warm lighting, make it cozy..."
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
                  rows={3}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {!enhancedImage && !isProcessing && (
                <>
                  <button
                    onClick={() => handleEnhance()}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold py-4 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Sparkles className="w-5 h-5" />
                    Enhance Photo
                  </button>
                  <button
                    onClick={() => setShowPromptInput(!showPromptInput)}
                    className="sm:w-auto flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium py-4 px-6 rounded-xl transition-colors"
                  >
                    {showPromptInput ? 'Hide Options' : 'Custom Style'}
                  </button>
                </>
              )}

              {enhancedImage && (
                <>
                  <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-4 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                  <button
                    onClick={() => {
                      setEnhancedImage(null)
                      setShowPromptInput(true)
                    }}
                    className="sm:w-auto flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium py-4 px-6 rounded-xl transition-colors"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Try Again
                  </button>
                </>
              )}
            </div>

            {/* Quick Style Buttons */}
            {!enhancedImage && !isProcessing && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-white/50 mb-3">Quick styles:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Modern luxury interior',
                    'Warm cozy lighting',
                    'Clean minimalist',
                    'Bright and airy',
                    'Professional real estate',
                  ].map((style) => (
                    <button
                      key={style}
                      onClick={() => handleEnhance(style)}
                      className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm transition-colors border border-white/10 hover:border-white/20"
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-4 text-center text-white/30 text-xs bg-gradient-to-t from-black/50 to-transparent pointer-events-none">
        Powered by AI • SCENEIT
      </footer>
    </main>
  )
}
