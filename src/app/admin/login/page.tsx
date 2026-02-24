'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/admin');
      } else {
        setError('Invalid password');
      }
    } catch {
      setError('Login failed');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Wordmark */}
        <div className="text-center mb-10">
          <p className="text-[13px] font-light text-white/20 tracking-[0.2em] uppercase mb-1">SceneIt</p>
          <h1 className="text-[28px] font-light text-white/90 tracking-tight">Admin</h1>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-11 pr-4 py-3.5 bg-white/[0.04] border border-white/[0.06] rounded-2xl text-[15px] text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/30 transition-colors duration-300"
                autoFocus
              />
            </div>
            {error && <p className="text-[13px] text-red-400/80">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-400 text-white text-[15px] font-medium rounded-2xl transition-all duration-300 disabled:opacity-30 hover:scale-[1.01] active:scale-[0.99]"
            >
              {loading ? (
                <svg className="progress-ring w-5 h-5 mx-auto" viewBox="0 0 100 100">
                  <circle className="progress-ring-circle" cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="4" />
                </svg>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
