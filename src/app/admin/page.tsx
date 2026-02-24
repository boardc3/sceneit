'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, BarChart3, Activity, Users, Clock, TrendingUp, AlertCircle, Monitor } from 'lucide-react';
import type { AdminStats } from '../../lib/types';

const STYLE_COLORS: Record<string, string> = {
  'avant-garde': '#8b5cf6',
  'timeless-estate': '#d4a574',
  'pure-form': '#84a98c',
  'resort-living': '#e8927c',
  'urban-penthouse': '#64748b',
  'coastal-modern': '#5eadb0',
  'executive-modern': '#9ca3af',
  'default': '#6366f1',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function ProgressRing({ size = 32 }: { size?: number }) {
  return (
    <svg className="progress-ring" width={size} height={size} viewBox="0 0 100 100">
      <circle className="progress-ring-circle" cx="50" cy="50" r="45" fill="none" stroke="#6366f1" strokeWidth="3" />
    </svg>
  )
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <div className="glass-card glass-card-hover p-6 hover-lift">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-indigo-400/60" />
        <span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="text-[32px] font-light text-white tracking-tight leading-none">{value}</div>
      {sub && <div className="text-[12px] text-white/20 mt-2 font-light">{sub}</div>}
    </div>
  );
}

function getStyleColor(style: string): string {
  return STYLE_COLORS[style] || STYLE_COLORS['default'];
}

function SimpleBarChart({ data, labelKey, valueKey, colorFn, formatLabel }: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  colorFn?: (item: Record<string, unknown>) => string;
  formatLabel?: (val: unknown) => string;
}) {
  if (!data.length) return <p className="text-[13px] text-white/15">No data yet</p>;
  const maxVal = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);
  return (
    <div className="space-y-2">
      {data.map((item, i) => {
        const val = Number(item[valueKey]) || 0;
        const pct = (val / maxVal) * 100;
        const label = formatLabel ? formatLabel(item[labelKey]) : String(item[labelKey]);
        const color = colorFn ? colorFn(item) : '#6366f1';
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[11px] text-white/30 w-20 truncate text-right flex-shrink-0">{label}</span>
            <div className="flex-1 h-5 bg-white/[0.03] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }}
              />
            </div>
            <span className="text-[11px] text-white/40 w-8 tabular-nums flex-shrink-0">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

type RecentTransformation = AdminStats['recent_transformations'][number];

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [selected, setSelected] = useState<RecentTransformation | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/auth').then(r => r.json()).then(d => {
      if (!d.authenticated) {
        router.push('/admin/login');
      } else {
        setAuthed(true);
        fetch('/api/admin/stats').then(r => r.json()).then(setStats).finally(() => setLoading(false));
      }
    });
  }, [router]);

  const handleExport = (type: string, format: string) => {
    window.open(`/api/admin/export?type=${type}&format=${format}`, '_blank');
  };

  if (!authed) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <ProgressRing size={48} />
    </main>
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <ProgressRing size={40} />
      </main>
    );
  }

  if (!stats) return null;

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 header-glass border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-white/[0.06] transition-colors duration-300">
              <ArrowLeft className="w-4 h-4 text-white/50" />
            </Link>
            <h1 className="text-[15px] font-semibold text-white/90 tracking-tight">Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleExport('transformations', 'csv')} className="pill-button text-[12px] flex items-center gap-1.5">
              <Download className="w-3 h-3" /> CSV
            </button>
            <button onClick={() => handleExport('events', 'json')} className="pill-button text-[12px] flex items-center gap-1.5">
              <Download className="w-3 h-3" /> JSON
            </button>
          </div>
        </div>
      </header>

      <div className="pt-14 max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 animate-fade-in">
          <StatCard icon={BarChart3} label="Total" value={stats.total_transformations} />
          <StatCard icon={Activity} label="Today" value={stats.today_count} sub={`${stats.week_count} this week`} />
          <StatCard icon={TrendingUp} label="Month" value={stats.month_count} />
          <StatCard icon={Clock} label="Avg Time" value={`${(stats.avg_processing_time_ms / 1000).toFixed(1)}s`} />
          <StatCard icon={Users} label="Opt-in" value={`${stats.opt_in_rate}%`} sub={formatBytes(stats.total_storage_bytes)} />
        </div>

        {/* Funnel */}
        <div className="glass-card p-6 animate-fade-in animate-fade-in-delay-1">
          <h2 className="text-[12px] font-medium text-white/30 uppercase tracking-wider mb-5">Conversion Funnel</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Views', value: stats.funnel.page_views },
              { label: 'Uploads', value: stats.funnel.uploads },
              { label: 'Enhances', value: stats.funnel.enhances },
              { label: 'Downloads', value: stats.funnel.downloads },
            ].map((step, i) => {
              const prev = i === 0 ? step.value : [stats.funnel.page_views, stats.funnel.uploads, stats.funnel.enhances, stats.funnel.downloads][i - 1];
              const rate = prev > 0 ? Math.round((step.value / prev) * 100) : 0;
              return (
                <div key={step.label} className="text-center">
                  <div className="text-[36px] font-light text-white tracking-tight leading-none mb-2">{step.value}</div>
                  <div className="text-[11px] text-white/30 uppercase tracking-wider">{step.label}</div>
                  {i > 0 && <div className="text-[11px] text-indigo-400/50 mt-1">{rate}%</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily */}
          <div className="glass-card p-6">
            <h2 className="text-[12px] font-medium text-white/30 uppercase tracking-wider mb-5">Daily (30d)</h2>
            <SimpleBarChart
              data={stats.daily_counts}
              labelKey="date"
              valueKey="count"
              formatLabel={(d) => {
                try { return new Date(String(d)).toLocaleDateString('en', { month: 'short', day: 'numeric' }); }
                catch { return String(d); }
              }}
            />
          </div>

          {/* Styles */}
          <div className="glass-card p-6">
            <h2 className="text-[12px] font-medium text-white/30 uppercase tracking-wider mb-5">Styles</h2>
            <SimpleBarChart
              data={stats.popular_styles}
              labelKey="style"
              valueKey="count"
              colorFn={(item) => getStyleColor(String(item.style))}
            />
          </div>

          {/* Peak Hours */}
          <div className="glass-card p-6">
            <h2 className="text-[12px] font-medium text-white/30 uppercase tracking-wider mb-5">Peak Hours</h2>
            <SimpleBarChart
              data={stats.peak_hours}
              labelKey="hour"
              valueKey="count"
              formatLabel={(h) => `${h}:00`}
            />
          </div>

          {/* Processing Time */}
          <div className="glass-card p-6">
            <h2 className="text-[12px] font-medium text-white/30 uppercase tracking-wider mb-5">Processing Time</h2>
            <SimpleBarChart
              data={stats.processing_distribution}
              labelKey="bucket"
              valueKey="count"
              colorFn={() => '#818cf8'}
            />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Attribution */}
          <div className="glass-card p-6">
            <h2 className="text-[12px] font-medium text-white/30 uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" /> Attribution
            </h2>
            <div className="space-y-3">
              {stats.attribution.length === 0 ? (
                <p className="text-[13px] text-white/15">No data yet</p>
              ) : stats.attribution.map((a, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-[13px] text-white/40 truncate font-light">{a.source}</span>
                  <span className="text-[13px] font-medium text-indigo-400/60 tabular-nums">{a.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Devices */}
          <div className="glass-card p-6">
            <h2 className="text-[12px] font-medium text-white/30 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5" /> Devices
            </h2>
            <div className="space-y-3">
              {stats.device_breakdown.length === 0 ? (
                <p className="text-[13px] text-white/15">No data yet</p>
              ) : stats.device_breakdown.map((d, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-[13px] text-white/40 capitalize font-light">{d.device}</span>
                  <span className="text-[13px] font-medium text-indigo-400/60 tabular-nums">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error Rate */}
          <div className="glass-card p-6">
            <h2 className="text-[12px] font-medium text-white/30 uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" /> Error Rate
            </h2>
            <div className="text-[48px] font-light text-white tracking-tight leading-none">{stats.error_rate.toFixed(1)}%</div>
            <p className="text-[12px] text-white/15 mt-3 font-light">Of all enhance attempts</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6">
          <h2 className="text-[12px] font-medium text-white/30 uppercase tracking-wider mb-5">Recent</h2>
          {stats.recent_transformations.length === 0 ? (
            <p className="text-[13px] text-white/15">No transformations yet</p>
          ) : (
            <div className="space-y-2">
              {stats.recent_transformations.map((t) => {
                const color = t.style_key ? getStyleColor(t.style_key) : '#6366f1';
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.04] transition-colors duration-300 cursor-pointer text-left"
                  >
                    {t.enhanced_blob_url && (
                      <img src={t.enhanced_blob_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] text-white/50 truncate font-light">{t.style_name || t.prompt_used || 'Default'}</p>
                        {t.style_key && (
                          <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        )}
                      </div>
                      <p className="text-[11px] text-white/20">{new Date(t.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[12px] text-white/25 tabular-nums">{(t.processing_time_ms / 1000).toFixed(1)}s</p>
                      <p className="text-[11px] text-white/15">{t.opt_in ? '✓' : '—'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Before/After Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col"
          onClick={() => setSelected(null)}
        >
          {/* Close bar */}
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-white/50">{selected.style_name || selected.prompt_used || 'Default Modernize'}</span>
              <span className="text-[11px] text-white/20">•</span>
              <span className="text-[11px] text-white/20">{new Date(selected.created_at).toLocaleString()}</span>
              <span className="text-[11px] text-white/20">•</span>
              <span className="text-[11px] text-white/20">{(selected.processing_time_ms / 1000).toFixed(1)}s</span>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <span className="text-white/60 text-lg">✕</span>
            </button>
          </div>

          {/* Images */}
          <div
            className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-white/[0.04] mx-4 mb-4 rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Original */}
            <div className="relative bg-black/60 flex items-center justify-center">
              <div className="absolute top-4 left-4 z-10">
                <span className="px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider text-white/40 bg-black/40 backdrop-blur-xl border border-white/[0.06]">
                  Original
                </span>
              </div>
              {selected.original_blob_url ? (
                <img src={selected.original_blob_url} alt="Original" className="w-full h-full object-contain max-h-[80vh]" />
              ) : (
                <p className="text-white/20 text-[13px]">No original saved</p>
              )}
            </div>

            {/* Enhanced */}
            <div className="relative bg-black/60 flex items-center justify-center">
              <div className="absolute top-4 left-4 z-10">
                <span className="px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider text-indigo-400/80 bg-black/40 backdrop-blur-xl border border-indigo-500/20">
                  Modernized
                </span>
              </div>
              {selected.enhanced_blob_url ? (
                <img src={selected.enhanced_blob_url} alt="Modernized" className="w-full h-full object-contain max-h-[80vh]" />
              ) : (
                <p className="text-white/20 text-[13px]">No enhanced saved</p>
              )}
            </div>
          </div>

          {/* Details bar */}
          <div className="flex items-center justify-center gap-6 px-6 pb-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-[11px] text-white/20">Session: {selected.session_id?.slice(0, 8)}…</span>
            <span className="text-[11px] text-white/20">Original: {formatBytes(selected.original_size_bytes || 0)}</span>
            <span className="text-[11px] text-white/20">Enhanced: {formatBytes(selected.enhanced_size_bytes || 0)}</span>
            <span className="text-[11px] text-white/20">Device: {selected.user_agent?.includes('iPhone') ? 'iPhone' : selected.user_agent?.includes('Android') ? 'Android' : 'Desktop'}</span>
          </div>
        </div>
      )}
    </main>
  );
}
