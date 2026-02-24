'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, Upload, Sparkles, Download, RotateCcw, X, ImageIcon, Images, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { useAnalytics } from '../hooks/useAnalytics'

function ProgressRing() {
  return (
    <svg className="progress-ring w-16 h-16" viewBox="0 0 100 100">
      <circle
        className="progress-ring-circle"
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke="#6366f1"
        strokeWidth="3"
      />
    </svg>
  )
}

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
      if (!response.ok) throw new Error(data.error || 'Enhancement failed')
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

  const styles = [
    'Modern luxury interior',
    'Warm cozy lighting',
    'Clean minimalist',
    'Bright and airy',
    'Professional real estate',
  ]

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-black/80 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-[15px] font-semibold text-white/90 tracking-tight">
            SCENEIT
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/gallery"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-medium text-white/60 hover:text-white/90 transition-colors duration-300"
            >
              <Images className="w-3.5 h-3.5" />
              Gallery
            </Link>
            {originalImage && (
              <button
                onClick={handleReset}
                className="p-2 rounded-full hover:bg-white/[0.06] transition-colors duration-300"
              >
                <RotateCcw className="w-4 h-4 text-white/50" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="pt-14">
        {!originalImage ? (
          /* ─── Upload State ─── */
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-6">
            {/* Wordmark */}
            <div className="text-center mb-16 animate-fade-in">
              <h1 className="text-[clamp(3rem,8vw,6rem)] font-light text-white tracking-[0.15em] leading-none">
                SCENEIT
              </h1>
              <p className="mt-4 text-[17px] font-light text-white/40 max-w-md mx-auto leading-relaxed">
                AI-powered photo enhancement.
                <br />
                Transform any scene in seconds.
              </p>
            </div>

            {/* Drop Zone */}
            <div
              className="animate-fade-in animate-fade-in-delay-1 w-full max-w-lg"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file && file.type.startsWith('image/')) {
                  const input = fileInputRef.current
                  if (input) {
                    const dt = new DataTransfer()
                    dt.items.add(file)
                    input.files = dt.files
                    input.dispatchEvent(new Event('change', { bubbles: true }))
                  }
                }
              }}
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                className="group w-full glass-card glass-card-hover hover-lift p-16 flex flex-col items-center gap-4 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full border border-white/[0.08] flex items-center justify-center group-hover:border-white/20 transition-colors duration-300">
                  <ArrowUpRight className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors duration-300" />
                </div>
                <div className="text-center">
                  <p className="text-[15px] font-medium text-white/70">Drop your photo</p>
                  <p className="text-[13px] text-white/30 mt-1">or click to browse</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 'upload')}
                  className="hidden"
                />
              </button>

              {/* Camera secondary */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-full text-[13px] font-medium text-white/30 hover:text-white/60 transition-colors duration-300"
              >
                <Camera className="w-4 h-4" />
                Use camera
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileSelect(e, 'camera')}
                  className="hidden"
                />
              </button>
            </div>

            {/* Opt-in */}
            <div className="animate-fade-in animate-fade-in-delay-2 mt-12 flex items-center gap-3">
              <button
                onClick={toggleOptIn}
                className="apple-toggle"
                data-checked={optIn}
                style={{ backgroundColor: optIn ? '#6366f1' : 'rgba(255,255,255,0.1)' }}
                aria-label="Opt in to save photos"
              />
              <span className="text-[13px] text-white/30">Save photos to improve SceneIt</span>
            </div>
          </div>
        ) : (
          /* ─── Processing / Results ─── */
          <div className="min-h-[calc(100vh-56px)] flex flex-col">
            {/* Error */}
            {error && (
              <div className="mx-6 mt-6 glass-card px-5 py-4 flex items-center gap-3 border-red-500/20">
                <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-[14px] text-red-300/80">{error}</p>
              </div>
            )}

            {/* Image Comparison — full bleed */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-white/[0.04] mt-6 mx-6 rounded-2xl overflow-hidden">
              {/* Original */}
              <div className="relative bg-black/60">
                <div className="absolute top-4 left-4 z-10">
                  <span className="px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider text-white/40 bg-black/40 backdrop-blur-xl border border-white/[0.06]">
                    Original
                  </span>
                </div>
                <div className="aspect-[4/3] flex items-center justify-center">
                  <img
                    src={originalImage}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Enhanced */}
              <div className="relative bg-black/60">
                <div className="absolute top-4 left-4 z-10">
                  <span className="px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider text-indigo-400/80 bg-black/40 backdrop-blur-xl border border-indigo-500/20">
                    Enhanced
                  </span>
                </div>
                <div className="aspect-[4/3] flex items-center justify-center">
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-4">
                      <ProgressRing />
                      <p className="text-[13px] text-white/30">Enhancing…</p>
                    </div>
                  ) : enhancedImage ? (
                    <img
                      src={enhancedImage}
                      alt="Enhanced"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <p className="text-[13px] text-white/20">Choose a style to enhance</p>
                  )}
                </div>
              </div>
            </div>

            {/* Floating Control Bar */}
            <div className="sticky bottom-0 z-40 p-6">
              <div className="max-w-3xl mx-auto glass-card px-6 py-4 flex flex-col gap-4" style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(40px)' }}>
                {/* Custom prompt */}
                {showPromptInput && !isProcessing && (
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Describe your vision…"
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 text-[14px] text-white placeholder-white/20 resize-none focus:outline-none focus:border-indigo-500/30 transition-colors duration-300"
                    rows={2}
                  />
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 justify-center flex-wrap">
                  {!enhancedImage && !isProcessing && (
                    <>
                      <button
                        onClick={() => handleEnhance()}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white text-[14px] font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Sparkles className="w-4 h-4" />
                        Enhance
                      </button>
                      <button
                        onClick={() => setShowPromptInput(!showPromptInput)}
                        className="pill-button"
                      >
                        {showPromptInput ? 'Hide' : 'Custom'}
                      </button>
                    </>
                  )}
                  {enhancedImage && (
                    <>
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/90 text-black text-[14px] font-medium transition-all duration-300 hover:bg-white hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => {
                          setEnhancedImage(null)
                          setShowPromptInput(true)
                        }}
                        className="pill-button"
                      >
                        <RotateCcw className="w-3.5 h-3.5 inline mr-1.5" />
                        Try Again
                      </button>
                    </>
                  )}
                </div>

                {/* Quick Styles */}
                {!enhancedImage && !isProcessing && (
                  <div className="flex gap-2 overflow-x-auto pb-1 justify-center flex-wrap">
                    {styles.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleEnhance(s)}
                        className="pill-button whitespace-nowrap text-[13px]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
