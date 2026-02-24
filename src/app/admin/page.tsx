'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, BarChart3, Activity, Users, Clock, TrendingUp, AlertCircle, Monitor } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import type { AdminStats } from '../../lib/types';

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

const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#6366f1', '#818cf8'];

const tooltipStyle = {
  background: 'rgba(10,10,10,0.95)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 12,
  color: '#fff',
  fontSize: 12,
  padding: '8px 12px',
};

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
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

  if (!authed) return null;

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
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-black/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-white/[0.06] transition-colors duration-300">
              <ArrowLeft className="w-4 h-4 text-white/50" />
            </Link>
            <div>
              <h1 className="text-[15px] font-semibold text-white/90 tracking-tight">Dashboard</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('transformations', 'csv')}
              className="pill-button text-[12px] flex items-center gap-1.5"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
            <button
              onClick={() => handleExport('events', 'json')}
              className="pill-button text-[12px] flex items-center gap-1.5"
            >
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
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats.daily_counts}>
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 10 }} tickFormatter={(d: string) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Styles */}
          <div className="glass-card p-6">
            <h2 className="text-[12px] font-medium text-white/30 uppercase tracking-wider mb-5">Styles</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.popular_styles} layout="vertical">
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="style" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {stats.popular_styles.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Hours */}
          <div className="glass-card p-6">
            <h2 className="text-[12px] font-medium text-white/30 uppercase tracking-wider mb-5">Peak Hours</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.peak_hours}>
                <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 10 }} tickFormatter={(h: number) => `${h}:00`} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Processing */}
          <div className="glass-card p-6">
            <h2 className="text-[12px] font-medium text-white/30 uppercase tracking-wider mb-5">Processing Time</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.processing_distribution}>
                <XAxis dataKey="bucket" tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.15)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
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
              {stats.recent_transformations.map((t) => (
                <div key={t.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.02] transition-colors duration-300">
                  {t.enhanced_blob_url && (
                    <img src={t.enhanced_blob_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-white/50 truncate font-light">{t.style_tag || t.prompt_used || 'Default'}</p>
                    <p className="text-[11px] text-white/20">{new Date(t.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[12px] text-white/25 tabular-nums">{(t.processing_time_ms / 1000).toFixed(1)}s</p>
                    <p className="text-[11px] text-white/15">{t.opt_in ? '✓' : '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
