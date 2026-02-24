'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowLeft, Download, BarChart3, Activity, Users, Clock, TrendingUp, AlertCircle, Monitor } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import type { AdminStats } from '../../lib/types';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-violet-400" />
        <span className="text-xs text-white/50 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
    </div>
  );
}

const COLORS = ['#8b5cf6', '#d946ef', '#a78bfa', '#c084fc', '#e879f9', '#7c3aed', '#a855f7'];

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
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!stats) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-white/70" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Admin Dashboard</h1>
                <p className="text-[10px] text-white/50 uppercase tracking-widest">SceneIt Analytics</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleExport('transformations', 'csv')} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-white/70 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button onClick={() => handleExport('events', 'json')} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-white/70 transition-colors">
              <Download className="w-3.5 h-3.5" /> Events JSON
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard icon={BarChart3} label="Total" value={stats.total_transformations} />
          <StatCard icon={Activity} label="Today" value={stats.today_count} sub={`${stats.week_count} this week`} />
          <StatCard icon={TrendingUp} label="This Month" value={stats.month_count} />
          <StatCard icon={Clock} label="Avg Time" value={`${(stats.avg_processing_time_ms / 1000).toFixed(1)}s`} />
          <StatCard icon={Users} label="Opt-in Rate" value={`${stats.opt_in_rate}%`} sub={formatBytes(stats.total_storage_bytes) + ' stored'} />
        </div>

        {/* Funnel */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-4">Conversion Funnel</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Page Views', value: stats.funnel.page_views, color: 'from-blue-500 to-blue-600' },
              { label: 'Uploads', value: stats.funnel.uploads, color: 'from-violet-500 to-violet-600' },
              { label: 'Enhances', value: stats.funnel.enhances, color: 'from-fuchsia-500 to-fuchsia-600' },
              { label: 'Downloads', value: stats.funnel.downloads, color: 'from-emerald-500 to-emerald-600' },
            ].map((step, i) => {
              const prev = i === 0 ? step.value : [stats.funnel.page_views, stats.funnel.uploads, stats.funnel.enhances, stats.funnel.downloads][i - 1];
              const rate = prev > 0 ? Math.round((step.value / prev) * 100) : 0;
              return (
                <div key={step.label} className="text-center">
                  <div className={`bg-gradient-to-r ${step.color} rounded-xl py-4 px-2 mb-2`}>
                    <div className="text-2xl font-bold text-white">{step.value}</div>
                  </div>
                  <div className="text-xs text-white/50">{step.label}</div>
                  {i > 0 && <div className="text-xs text-white/30 mt-0.5">{rate}% conv.</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily Transformations */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-4">Daily Transformations (30d)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.daily_counts}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={(d: string) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Popular Styles */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-4">Popular Styles</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.popular_styles} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <YAxis type="category" dataKey="style" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} width={120} />
                <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {stats.popular_styles.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Peak Hours */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-4">Peak Usage Hours</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.peak_hours}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={(h: number) => `${h}:00`} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="count" fill="#d946ef" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Processing Time Distribution */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-4">Processing Time</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.processing_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="bucket" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                <Bar dataKey="count" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attribution & Devices Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Attribution */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Attribution
            </h2>
            <div className="space-y-3">
              {stats.attribution.length === 0 ? (
                <p className="text-white/30 text-sm">No data yet</p>
              ) : stats.attribution.map((a, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm text-white/70 truncate">{a.source}</span>
                  <span className="text-sm font-mono text-violet-400">{a.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Monitor className="w-4 h-4" /> Devices
            </h2>
            <div className="space-y-3">
              {stats.device_breakdown.length === 0 ? (
                <p className="text-white/30 text-sm">No data yet</p>
              ) : stats.device_breakdown.map((d, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm text-white/70 capitalize">{d.device}</span>
                  <span className="text-sm font-mono text-violet-400">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error Rate */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Error Rate
            </h2>
            <div className="text-4xl font-bold text-white">{stats.error_rate.toFixed(1)}%</div>
            <p className="text-xs text-white/40 mt-2">Of all enhance attempts</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-4">Recent Transformations</h2>
          {stats.recent_transformations.length === 0 ? (
            <p className="text-white/30 text-sm">No transformations yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recent_transformations.map((t) => (
                <div key={t.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
                  {t.enhanced_blob_url && (
                    <img src={t.enhanced_blob_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 truncate">{t.style_tag || t.prompt_used || 'Default style'}</p>
                    <p className="text-xs text-white/40">{new Date(t.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-white/50">{(t.processing_time_ms / 1000).toFixed(1)}s</p>
                    <p className="text-xs text-white/30">{t.opt_in ? '✓ opt-in' : 'no opt-in'}</p>
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
