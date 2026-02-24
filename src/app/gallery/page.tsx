'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Search, X, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Transformation, GalleryResponse } from '../../lib/types';
import { useAnalytics } from '../../hooks/useAnalytics';

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
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Gallery</h1>
              <p className="text-[10px] text-white/50 uppercase tracking-widest">Community Transformations</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search styles or prompts..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <select
            value={style}
            onChange={(e) => { setStyle(e.target.value); setPage(1); }}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/70 focus:outline-none focus:border-violet-500/50"
          >
            <option value="">All styles</option>
            <option value="Modern luxury interior">Modern luxury interior</option>
            <option value="Warm cozy lighting">Warm cozy lighting</option>
            <option value="Clean minimalist">Clean minimalist</option>
            <option value="Bright and airy">Bright and airy</option>
            <option value="Professional real estate">Professional real estate</option>
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data && data.transformations.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.transformations.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className="group bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:border-violet-500/30 transition-colors text-left"
                >
                  <div className="grid grid-cols-2 gap-0.5">
                    <img src={t.original_blob_url} alt="Original" className="w-full aspect-[4/3] object-cover" />
                    <img src={t.enhanced_blob_url} alt="Enhanced" className="w-full aspect-[4/3] object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-white/50">{new Date(t.created_at).toLocaleDateString()}</p>
                    {t.style_tag && <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-violet-500/20 text-violet-300 rounded-full">{t.style_tag}</span>}
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white/70" />
                </button>
                <span className="text-white/50 text-sm">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-white/70" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-white/40">
            <p className="text-lg">No transformations yet</p>
            <p className="text-sm mt-2">Opt in to save your transformations and they&apos;ll appear here!</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <div>
                <h3 className="text-white font-semibold">Before &amp; After</h3>
                <p className="text-xs text-white/50">{new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <div>
                <p className="text-xs text-white/50 mb-2 uppercase tracking-wide">Original</p>
                <img src={selected.original_blob_url} alt="Original" className="w-full rounded-xl" />
              </div>
              <div>
                <p className="text-xs text-violet-400 mb-2 uppercase tracking-wide">Enhanced</p>
                <img src={selected.enhanced_blob_url} alt="Enhanced" className="w-full rounded-xl" />
              </div>
            </div>
            {selected.style_tag && (
              <div className="px-4 pb-4">
                <span className="inline-block px-3 py-1 text-sm bg-violet-500/20 text-violet-300 rounded-full">{selected.style_tag}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
