import { useState } from 'react';
import { X, Delete } from 'lucide-react';
import { getVaultPin, setVaultPin } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface Props {
  mode: 'lock' | 'unlock' | 'set';
  onSuccess: () => void;
  onClose: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function PinModal({ mode, onSuccess, onClose }: Props) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');

  const storedPin = getVaultPin();
  const isSettingPin = mode === 'set' || (mode === 'unlock' && !storedPin);
  const title = mode === 'lock' ? 'Lock Vault' : isSettingPin ? 'Set PIN' : 'Unlock Vault';

  function handleKey(key: string) {
    if (key === '⌫') {
      if (step === 'confirm') setConfirmPin(p => p.slice(0, -1));
      else setPin(p => p.slice(0, -1));
      setError('');
      return;
    }
    if (!key) return;

    if (step === 'confirm') {
      if (confirmPin.length >= 4) return;
      const next = confirmPin + key;
      setConfirmPin(next);
      if (next.length === 4) {
        if (next === pin) {
          setVaultPin(next);
          onSuccess();
        } else {
          setError('PINs do not match. Try again.');
          setConfirmPin('');
        }
      }
    } else {
      if (pin.length >= 4) return;
      const next = pin + key;
      setPin(next);
      if (next.length === 4) {
        if (isSettingPin) {
          // Move to confirm step
          setStep('confirm');
        } else if (mode === 'lock') {
          // Just lock — no PIN check needed
          onSuccess();
        } else {
          // Unlock — verify
          if (next === storedPin) {
            onSuccess();
          } else {
            setError('Incorrect PIN. Try again.');
            setPin('');
          }
        }
      }
    }
  }

  const currentPin = step === 'confirm' ? confirmPin : pin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-3xl p-6 w-72 animate-scale-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center mb-6">
          <div className="text-3xl mb-3">{mode === 'lock' ? '🔒' : '🔓'}</div>
          <h3 className="text-foreground font-black text-lg">{title}</h3>
          {isSettingPin && (
            <p className="text-muted-foreground text-xs mt-1">
              {step === 'enter' ? 'Enter a new 4-digit PIN' : 'Confirm your PIN'}
            </p>
          )}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={cn(
                'w-3.5 h-3.5 rounded-full border-2 transition-all',
                i < currentPin.length ? 'bg-primary border-primary' : 'border-border bg-transparent'
              )}
            />
          ))}
        </div>

        {error && <p className="text-destructive text-xs text-center mb-4">{error}</p>}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((key, idx) => (
            <button
              key={idx}
              onClick={() => handleKey(key)}
              disabled={!key && key !== '0'}
              className={cn(
                'h-14 rounded-2xl font-bold text-lg transition-all active:scale-95',
                key === '⌫' ? 'text-destructive bg-muted' : key ? 'bg-muted text-foreground hover:bg-navy-elevated active:bg-primary active:text-white' : 'invisible'
              )}
            >
              {key === '⌫' ? <Delete className="w-5 h-5 mx-auto" /> : key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
