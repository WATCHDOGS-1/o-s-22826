import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Zap, Flame, Clock, Loader2, AlertTriangle } from 'lucide-react';
import FocusSession from './FocusSession';
import { getStats, setMatchSize, UserStats } from '@/lib/userStats';
import LocalStats from '@/components/LocalStats';
import { useUser } from '@/hooks/useUser';
import { IS_SIGNALING_CONFIGURED } from '@/lib/signaling';

const Index = () => {
  const { userId, isLoading: isAuthLoading } = useUser();
  const [inSession, setInSession] = useState(false);
  const [matchSize, setMatchSizeState] = useState(4);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  const loadInitialStats = useCallback(async (id: string) => {
    setIsStatsLoading(true);
    const stats: UserStats = await getStats(id);
    
    // Default to match size 1 if signaling is not configured, otherwise use saved size
    const initialMatchSize = IS_SIGNALING_CONFIGURED ? stats.matchSize : 1;
    
    setMatchSizeState(initialMatchSize);
    setIsStatsLoading(false);
  }, []);

  useEffect(() => {
    if (userId) {
      loadInitialStats(userId);
    }
  }, [userId, loadInitialStats]);

  const handleStartSession = async () => {
    if (!userId) return;
    
    if (!IS_SIGNALING_CONFIGURED && matchSize > 1) {
        // Prevent starting multi-peer session if signaling is not configured
        setMatchSizeState(1);
        return;
    }
    
    await setMatchSize(userId, matchSize);
    setInSession(true);
  };
  
  const handleEndSession = () => {
    setInSession(false);
    setStatsRefreshKey(prev => prev + 1); // Refresh stats on return
  };

  if (isAuthLoading || isStatsLoading || !userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Loading User Profile...
        </h1>
        <p className="text-muted-foreground">
          Signing you in anonymously to save your progress.
        </p>
      </div>
    );
  }

  if (inSession) {
    return <FocusSession matchSize={matchSize} onEndSession={handleEndSession} userId={userId} />;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <header className="text-center mb-12 pt-8">
          <h1 className="text-6xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
            OnlyFocus
          </h1>
          <p className="text-xl text-muted-foreground italic">
            Random minds. Shared silence. Pure focus.
          </p>
        </header>
        
        {/* Signaling Warning */}
        {!IS_SIGNALING_CONFIGURED && (
            <Card className="p-4 bg-destructive/20 border-destructive text-destructive-foreground mb-6 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 mt-1 flex-shrink-0" />
                <div>
                    <h3 className="font-semibold">Signaling Server Not Configured</h3>
                    <p className="text-sm">
                        Multi-peer sessions (Match Size 2 or 4) require an external signaling server. 
                        Please update the URL in `src/lib/signaling.ts` to enable P2P matching. 
                        Currently defaulting to Solo Mode (Match Size 1).
                    </p>
                </div>
            </Card>
        )}

        {/* Main Action Card */}
        <Card className="p-8 bg-gradient-to-br from-card to-secondary border-border shadow-glow/30 mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            Find Focus Partners
          </h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              How many people do you want to study with? (Including yourself)
            </label>
            <div className="flex justify-center gap-4">
              {[1, 2, 4].map((size) => (
                <Button
                  key={size}
                  variant={matchSize === size ? "default" : "outline"}
                  onClick={() => setMatchSizeState(size)}
                  className="flex-1 h-12 text-lg"
                  disabled={!IS_SIGNALING_CONFIGURED && size > 1}
                >
                  {size} {size === 1 ? 'Solo' : 'Peers'}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleStartSession}
            className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 transition-all"
          >
            Start Focus Session {matchSize > 1 ? `(Match Size: ${matchSize})` : '(Solo Mode)'}
          </Button>
        </Card>

        {/* Stats and Features */}
        <div className="grid md:grid-cols-2 gap-6">
          <LocalStats refreshKey={statsRefreshKey} userId={userId} />
          
          <Card className="p-6 bg-card border-border shadow-card">
            <h3 className="font-semibold text-foreground mb-4">Core Features</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <span>Instant, anonymous matchmaking (2-4 peers).</span>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-accent" />
                <span>Shared Pomodoro timer synced via P2P.</span>
              </li>
              <li className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-primary" />
                <span>Persistent XP and Streak tracking (via Supabase).</span>
              </li>
              <li className="flex items-center gap-3">
                <Flame className="h-5 w-5 text-accent" />
                <span>Zero backend load using WebRTC mesh.</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;