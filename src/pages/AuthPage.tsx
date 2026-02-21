import { useState } from 'react';
import { Plane, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { registerUser, loginUser, setSession } from '@/lib/storage';
import type { User } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  onAuthenticated: (user: User) => void;
}

export default function AuthPage({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    setTimeout(() => {
      if (mode === 'signup') {
        if (!name.trim()) { setError('Please enter your name.'); setLoading(false); return; }
        const user = registerUser(name, email, password);
        if (!user) { setError('An account with this email already exists.'); setLoading(false); return; }
        setSession(user);
        onAuthenticated(user);
      } else {
        const user = loginUser(email, password);
        if (!user) { setError('Incorrect email or password.'); setLoading(false); return; }
        setSession(user);
        onAuthenticated(user);
      }
      setLoading(false);
    }, 300);
  }

  function switchMode() {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError('');
  }

  return (
    <div className="flex items-center justify-center h-full px-5 overflow-y-auto">
      <div className="w-full max-w-mobile animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ boxShadow: '0 8px 32px hsl(16 90% 60% / 0.45)' }}>
            <Plane className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-foreground font-black text-3xl tracking-tight">WanderVault</h1>
          <p className="text-muted-foreground text-sm mt-1">Your travel companion</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-6">
          {/* Tab switcher */}
          <div className="flex bg-muted rounded-2xl p-1 mb-6">
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all',
                  mode === m
                    ? 'bg-primary text-white shadow'
                    : 'text-muted-foreground'
                )}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-1.5 block">Your Name</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Alex"
                  autoComplete="name"
                  className="bg-muted border-border h-11"
                />
              </div>
            )}

            <div>
              <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-1.5 block">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="bg-muted border-border h-11"
              />
            </div>

            <div>
              <Label className="text-foreground/70 text-xs uppercase tracking-wider mb-1.5 block">Password</Label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="bg-muted border-border h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-destructive text-sm font-medium text-center bg-destructive/10 rounded-xl py-2 px-3">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl font-bold text-base border-0 gradient-hero text-white mt-2"
            >
              {loading ? '...' : (
                <span className="flex items-center gap-2">
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-5">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={switchMode} className="text-primary font-bold">
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-6">
          Your data is stored locally on this device.
        </p>
      </div>
    </div>
  );
}
