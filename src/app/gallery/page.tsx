'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, ChevronLeft, ChevronRight, ArrowLeft, Images } from 'lucide-react';
import Link from 'next/link';
import type { Transformation, GalleryResponse } from '../../lib/types';
import { useAnalytics } from '../../hooks/useAnalytics';

const STYLE_COLORS: Record<string, string> = {
  'avant-garde': '#8b5cf6',
  'timeless-estate': '#d4a574',
  'pure-form': '#84a98c',
  'resort-living': '#e8927c',
  'urban-penthouse': '#64748b',
  'coastal-modern': '#5eadb0',
  'executive-modern': '#9ca3af',
};

const STYLE_NAMES: Record<string, string> = {
  'avant-garde': 'Avant-Garde',
  'timeless-estate': 'Timeless Estate',
  'pure-form': 'Pure Form',
  'resort-living': 'Resort Living',
  'urban-penthouse': 'Urban Penthouse',
  'coastal-modern': 'Coastal Modern',
  'executive-modern': 'Executive Modern',
};

function ProgressRing({ size = 32 }: { size?: number }) {
  return (
    <svg className="progress-ring" width={size} height={size} viewBox="0 0 100 100">
      <circle className="progress-ring-circle" cx="50" cy="50" r="45" fill="none" stroke="#6366f1" strokeWidth="3" />
    </svg>
  )
}

const STYLES = ['All', ...Object.keys(STYLE_NAMES)];

export default function GalleryPage() {
  const [data, setData] = useState<GalleryResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [style, setStyle] = useState('');
  const [selected, setSelected] = useState<Transformation | null>(null);
  const [loading, setLoading] = useState(true);
  const { track } = useAnalytics();

  const fetchGallery = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: '12' });
    if (search) params.set('search', search);
    if (style) params.set('style', style);
    try {
      const res = await fetch(`/api/gallery?${params}`);
      const json = await res.json();
      setData(json);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search, style]);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);
  useEffect(() => { track('gallery_view'); }, [track]);

  const totalPages = data ? Math.ceil(data.total / data.per_page) : 0;

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 header-glass border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-white/[0.06] transition-colors duration-300">
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </Link>
          <h1 className="text-[15px] font-semibold text-white/90 tracking-tight">Gallery</h1>
        </div>
      </header>

      <div className="pt-14 max-w-6xl mx-auto px-6">
        {/* Search + Filter Pills */}
        <div className="py-8 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-11 pr-4 py-3 bg-white/[0.04] border border-white/[0.06] rounded-full text-[14px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors duration-300"
            />
          </div>

          {/* Style pills with accent colors */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {STYLES.map((s) => {
              const val = s === 'All' ? '' : s;
              const active = style === val;
              const color = STYLE_COLORS[s] || '#6366f1';
              return (
                <button
                  key={s}
                  onClick={() => { setStyle(val); setPage(1); }}
                  className="pill-button whitespace-nowrap text-[13px] transition-all duration-300"
                  style={active ? {
                    backgroundColor: `${color}20`,
                    borderColor: `${color}60`,
                    color: color,
                  } : undefined}
                >
                  {STYLE_NAMES[s] || s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-32">
            <ProgressRing size={40} />
          </div>
        ) : data && data.transformations.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.transformations.map((t, i) => {
                const styleColor = t.style_key ? STYLE_COLORS[t.style_key] : undefined;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className="group glass-card glass-card-hover overflow-hidden text-left hover-lift animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms`, opacity: 0 }}
                  >
                    <div className="grid grid-cols-2 gap-[1px] bg-white/[0.04]">
                      <img src={t.original_blob_url} alt="Original" className="w-full aspect-[4/3] object-cover transition-all duration-500 group-hover:brightness-110" />
                      <img src={t.enhanced_blob_url} alt="Enhanced" className="w-full aspect-[4/3] object-cover transition-all duration-500 group-hover:brightness-110 group-hover:scale-[1.02]" />
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <p className="text-[12px] text-white/30 font-light">{new Date(t.created_at).toLocaleDateString()}</p>
                      {t.style_key && (
                        <span
                          className="inline-block px-3 py-1 text-[11px] font-medium rounded-full border"
                          style={{
                            backgroundColor: `${styleColor}15`,
                            borderColor: `${styleColor}30`,
                            color: `${styleColor}cc`,
                          }}
                        >
                          {t.style_name || STYLE_NAMES[t.style_key] || t.style_key}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-6 py-12">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2.5 rounded-full glass-card glass-card-hover disabled:opacity-20 transition-all duration-300"
                >
                  <ChevronLeft className="w-4 h-4 text-white/60" />
                </button>
                <span className="text-[13px] text-white/30 font-light tabular-nums">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2.5 rounded-full glass-card glass-card-hover disabled:opacity-20 transition-all duration-300"
                >
                  <ChevronRight className="w-4 h-4 text-white/60" />
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-full border border-white/[0.06] flex items-center justify-center mb-6">
              <Images className="w-7 h-7 text-white/15" />
            </div>
            <p className="text-[17px] font-light text-white/40">No transformations yet</p>
            <p className="text-[13px] text-white/20 mt-2 max-w-xs">
              Opt in to save your transformations and they&apos;ll appear here.
            </p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="glass-card max-w-5xl w-full max-h-[90vh] overflow-auto"
            style={{ background: 'rgba(10,10,10,0.9)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/[0.06]">
              <div>
                <h3 className="text-[15px] font-medium text-white/80">Before & After</h3>
                <p className="text-[12px] text-white/25 mt-0.5">{new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-full hover:bg-white/[0.06] transition-colors duration-300">
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-white/[0.04] m-6 rounded-xl overflow-hidden">
              <div className="bg-black/60 p-1">
                <img src={selected.original_blob_url} alt="Original" className="w-full rounded-lg" />
              </div>
              <div className="bg-black/60 p-1">
                <img src={selected.enhanced_blob_url} alt="Enhanced" className="w-full rounded-lg" />
              </div>
            </div>
            {selected.style_key && (
              <div className="px-6 pb-6">
                <span
                  className="inline-block px-3 py-1 text-[12px] font-medium rounded-full border"
                  style={{
                    backgroundColor: `${STYLE_COLORS[selected.style_key] || '#6366f1'}15`,
                    borderColor: `${STYLE_COLORS[selected.style_key] || '#6366f1'}30`,
                    color: `${STYLE_COLORS[selected.style_key] || '#6366f1'}cc`,
                  }}
                >
                  {selected.style_name || STYLE_NAMES[selected.style_key] || selected.style_key}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
