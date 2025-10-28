import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Zap, Flame, Clock } from 'lucide-react';
import FocusSession from './FocusSession';
import { getStats, setMatchSize } from '@/lib/localStore';
import LocalStats from '@/components/LocalStats';

const Index = () => {
  const [inSession, setInSession] = useState(false);
  const [matchSize, setMatchSizeState] = useState(getStats().matchSize);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  const handleStartSession = () => {
    setMatchSize(matchSize);
    setInSession(true);
  };
  
  const handleEndSession = () => {
    setInSession(false);
    setStatsRefreshKey(prev => prev + 1); // Refresh stats on return
  };

  if (inSession) {
    return <FocusSession matchSize={matchSize} onEndSession={handleEndSession} />;
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
          <LocalStats refreshKey={statsRefreshKey} />
          
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
                <span>Local XP and Streak tracking (no accounts needed).</span>
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