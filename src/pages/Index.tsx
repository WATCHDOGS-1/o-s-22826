import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BookOpen, Users, Trophy, Clock } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  const handleJoinClick = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-7xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-6 animate-fade-in">
            OnlyFocus
          </h1>
          <p className="text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Focus together. Study smarter. Build streaks.
          </p>
          <Button
            onClick={handleJoinClick}
            size="lg"
            className="h-14 px-12 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
          >
            Join Now
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="p-8 bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-all hover:shadow-lg">
            <Users className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-lg text-foreground mb-3 text-center">Live Webcam Rooms</h3>
            <p className="text-sm text-muted-foreground text-center">
              Study together in real-time with live video cameras for accountability and motivation in virtual coworking spaces
            </p>
          </Card>

          <Card className="p-8 bg-card/50 backdrop-blur border-border hover:border-accent/50 transition-all hover:shadow-lg">
            <Clock className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="font-semibold text-lg text-foreground mb-3 text-center">Pomodoro Timer</h3>
            <p className="text-sm text-muted-foreground text-center">
              Track every study session with built-in focus timer. Your progress persists even when you refresh the page
            </p>
          </Card>

          <Card className="p-8 bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-all hover:shadow-lg">
            <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-lg text-foreground mb-3 text-center">Daily Study Streaks</h3>
            <p className="text-sm text-muted-foreground text-center">
              Build consistency by studying 25+ minutes daily. Track your longest streak and stay motivated with habit building
            </p>
          </Card>

          <Card className="p-8 bg-card/50 backdrop-blur border-border hover:border-accent/50 transition-all hover:shadow-lg">
            <Trophy className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="font-semibold text-lg text-foreground mb-3 text-center">Global Leaderboard</h3>
            <p className="text-sm text-muted-foreground text-center">
              Compete with students worldwide. See top performers by total study time and current streak length
            </p>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to boost your productivity?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of students focusing together
          </p>
          <Button
            onClick={handleJoinClick}
            size="lg"
            variant="outline"
            className="h-12 px-10 text-base font-semibold"
          >
            Get Started Free
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
