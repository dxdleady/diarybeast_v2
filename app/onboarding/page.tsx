'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useRouter } from 'next/navigation';
import { AsciiPet } from '@/components/AsciiPet';

const AGE_GROUPS = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+'];

const DIARY_GOALS = [
  {
    id: 'self-reflection',
    label: 'Self-reflection & Personal Growth',
    emoji: '🌱',
    description: 'Understand yourself better and grow as a person',
  },
  {
    id: 'mental-health',
    label: 'Mental Health & Emotional Wellness',
    emoji: '🧠',
    description: 'Track your mood and improve emotional well-being',
  },
  {
    id: 'creativity',
    label: 'Creativity & Self-Expression',
    emoji: '🎨',
    description: 'Express yourself creatively through writing',
  },
  {
    id: 'goal-tracking',
    label: 'Goal Tracking & Productivity',
    emoji: '🎯',
    description: 'Monitor progress towards your goals',
  },
  {
    id: 'memory-keeping',
    label: 'Memory Keeping & Life Documentation',
    emoji: '📸',
    description: 'Preserve memories and document your journey',
  },
  {
    id: 'stress-relief',
    label: 'Stress Relief & Mindfulness',
    emoji: '🧘',
    description: 'Find peace and reduce stress through reflection',
  },
  {
    id: 'gratitude',
    label: 'Gratitude & Positive Thinking',
    emoji: '✨',
    description: 'Cultivate gratitude and focus on the positive',
  },
];

export default function Onboarding() {
  const currentAccount = useCurrentAccount();
  const address = currentAccount?.address;
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedAnimal, setSelectedAnimal] = useState<'cat' | 'dog' | null>(null);
  const [petName, setPetName] = useState('');
  const [userName, setUserName] = useState('');
  const [userAge, setUserAge] = useState('');
  const [diaryGoal, setDiaryGoal] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch user's randomly assigned animal
  useEffect(() => {
    if (!address) {
      router.push('/');
      return;
    }

    async function fetchUser() {
      try {
        const res = await fetch(`/api/user/${address}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedAnimal(data.selectedAnimal);
        }
      } catch (error) {
        console.error('Failed to fetch user');
      }
    }

    fetchUser();
  }, [address, router]);

  async function handleComplete() {
    if (!address) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/user/${address}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petName,
          userName,
          userAge,
          diaryGoal,
          onboardingCompleted: true,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save');
      }

      router.push('/diary');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const getAnimalName = () => {
    return selectedAnimal === 'cat' ? 'Cat' : 'Dog';
  };

  const canProceed = () => {
    if (step === 1) return petName.trim().length > 0;
    if (step === 2) return userName.trim().length > 0;
    if (step === 3) return userAge.length > 0;
    if (step === 4) return diaryGoal.length > 0;
    return false;
  };

  if (!selectedAnimal) {
    return (
      <div className="min-h-screen bg-bg-dark text-primary flex items-center justify-center">
        <div className="text-primary/60 font-mono">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark text-primary flex items-center justify-center p-4 pb-40">
      <div className="max-w-2xl w-full">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all font-mono ${
                  s === step
                    ? 'bg-primary text-bg-dark scale-110 shadow-glow-cyan'
                    : s < step
                      ? 'bg-success text-bg-dark shadow-glow-green'
                      : 'bg-bg-lcd text-primary/40 border border-primary/20'
                }`}
              >
                {s < step ? '✓' : s}
              </div>
            ))}
          </div>
          <div className="w-full bg-bg-lcd/50 border border-primary/20 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Name your pet */}
        {step === 1 && (
          <div className="text-center animate-fade-in">
            <div className="mb-6 scale-150 transform">
              <AsciiPet animal={selectedAnimal} state="idle" />
            </div>
            <h1 className="text-4xl font-display font-bold mb-4 text-primary drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">
              Meet Your Companion!
            </h1>
            <p className="text-primary/70 mb-8 font-mono">
              A {getAnimalName().toLowerCase()} has chosen to join you on your journaling journey.
              <br />
              What would you like to name them?
            </p>
            <div className="flex flex-col items-center gap-4">
              <input
                type="text"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="Enter your pet's name..."
                className="w-full max-w-md px-6 py-4 bg-bg-card border-2 border-primary/20 rounded-xl text-primary text-center text-xl focus:border-primary focus:outline-none font-mono placeholder-primary/40"
                maxLength={20}
              />
              <button
                onClick={() => setStep(2)}
                disabled={!canProceed()}
                className="px-12 py-4 btn-primary rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono"
              >
                [NEXT]
              </button>
            </div>
          </div>
        )}

        {/* Step 2: User's name */}
        {step === 2 && (
          <div className="text-center animate-fade-in">
            <div className="text-6xl mb-6">👋</div>
            <h1 className="text-4xl font-display font-bold mb-4 text-primary drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">
              Nice to Meet You!
            </h1>
            <p className="text-primary/70 mb-8 font-mono">
              {petName} wants to know who their new friend is.
              <br />
              What should they call you?
            </p>
            <div className="flex flex-col items-center gap-4">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name..."
                className="w-full max-w-md px-6 py-4 bg-bg-card border-2 border-primary/20 rounded-xl text-primary text-center text-xl focus:border-primary focus:outline-none font-mono placeholder-primary/40"
                maxLength={30}
              />
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setStep(1)}
                  className="px-8 py-4 bg-bg-lcd/50 border border-primary/20 hover:bg-primary/10 hover:border-primary/40 rounded-xl font-semibold transition-colors font-mono text-primary"
                >
                  [BACK]
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canProceed()}
                  className="px-12 py-4 btn-primary rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono"
                >
                  [NEXT]
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Age */}
        {step === 3 && (
          <div className="text-center animate-fade-in">
            <div className="text-6xl mb-6">🎂</div>
            <h1 className="text-4xl font-display font-bold mb-4 text-primary drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">
              How Old Are You?
            </h1>
            <p className="text-primary/70 mb-8 font-mono">
              This helps us personalize your experience
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {AGE_GROUPS.map((age) => (
                <button
                  key={age}
                  onClick={() => setUserAge(age)}
                  className={`p-6 border-2 rounded-xl transition-all hover:scale-105 font-mono ${
                    userAge === age
                      ? 'border-primary bg-primary/10 shadow-glow-cyan'
                      : 'border-primary/20 hover:border-primary/40 bg-bg-card'
                  }`}
                >
                  <div className="text-2xl font-bold text-primary">{age}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setStep(2)}
                className="px-8 py-4 bg-bg-lcd/50 border border-primary/20 hover:bg-primary/10 hover:border-primary/40 rounded-xl font-semibold transition-colors font-mono text-primary"
              >
                [BACK]
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!canProceed()}
                className="px-12 py-4 btn-primary rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono"
              >
                [NEXT]
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Diary goal */}
        {step === 4 && (
          <div className="text-center animate-fade-in">
            <div className="text-6xl mb-6">🎯</div>
            <h1 className="text-4xl font-display font-bold mb-4 text-primary drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">
              What&apos;s Your Goal?
            </h1>
            <p className="text-primary/70 mb-8 font-mono">
              Why do you want to keep a diary? Choose your main goal.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
              {DIARY_GOALS.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => setDiaryGoal(goal.id)}
                  className={`p-4 border-2 rounded-xl transition-all hover:scale-105 ${
                    diaryGoal === goal.id
                      ? 'border-primary bg-primary/10 shadow-glow-cyan'
                      : 'border-primary/20 hover:border-primary/40 bg-bg-card'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{goal.emoji}</div>
                    <div className="flex-1">
                      <div className="font-semibold mb-1 text-primary font-mono">{goal.label}</div>
                      <div className="text-xs text-primary/60 font-mono">{goal.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setStep(3)}
                className="px-8 py-4 bg-bg-lcd/50 border border-primary/20 hover:bg-primary/10 hover:border-primary/40 rounded-xl font-semibold transition-colors font-mono text-primary"
              >
                [BACK]
              </button>
              <button
                onClick={handleComplete}
                disabled={!canProceed() || saving}
                className="px-12 py-4 bg-success border-0 hover:bg-success/90 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono text-bg-dark shadow-glow-green"
              >
                {saving ? '[SAVING...]' : '[START YOUR JOURNEY! 🚀]'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
