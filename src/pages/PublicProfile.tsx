import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, User, Clock, Flame, Trophy, Users } from 'lucide-react';
import { getPublicProfile, followUser, unfollowUser, PublicProfile as PublicProfileType } from '@/lib/social';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<PublicProfileType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (username) {
        setLoading(true);
        const profileData = await getPublicProfile(username, currentUser?.id);
        setProfile(profileData);
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadProfile();
    }
  }, [username, currentUser, authLoading]);

  const handleFollowToggle = async () => {
    if (!currentUser || !profile) return;

    try {
      if (profile.is_following) {
        await unfollowUser(currentUser.id, profile.id);
        setProfile(p => p ? { ...p, is_following: false, followers_count: p.followers_count - 1 } : null);
        toast({ title: 'Unfollowed' });
      } else {
        await followUser(currentUser.id, profile.id);
        setProfile(p => p ? { ...p, is_following: true, followers_count: p.followers_count + 1 } : null);
        toast({ title: 'Followed' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading || authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-primary">Loading profile...</div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">User not found</h1>
        <p className="text-muted-foreground mb-8">The profile for "{username}" does not exist.</p>
        <Button onClick={() => navigate('/home')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {profile.display_name || profile.username}'s Profile
          </h1>
        </div>

        <Card className="max-w-2xl mx-auto p-8 bg-gradient-to-br from-card to-secondary border-border">
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-12 w-12 text-primary" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-3xl font-bold text-foreground">{profile.display_name}</h2>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              {profile.bio && <p className="text-foreground mt-2">{profile.bio}</p>}
              <div className="flex justify-center sm:justify-start gap-4 mt-4 text-sm">
                <span><span className="font-bold">{profile.followers_count}</span> Followers</span>
                <span><span className="font-bold">{profile.following_count}</span> Following</span>
              </div>
            </div>
            {currentUser && currentUser.id !== profile.user_id && (
              <Button onClick={handleFollowToggle} variant={profile.is_following ? 'outline' : 'default'}>
                {profile.is_following ? 'Unfollow' : 'Follow'}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-background/50 rounded-lg border">
              <Clock className="h-8 w-8 text-primary mx-auto mb-3" />
              <div className="text-3xl font-bold text-primary mb-1">{formatMinutes(profile.stats.total_minutes)}</div>
              <p className="text-sm text-muted-foreground">Total Study Time</p>
            </div>
            <div className="text-center p-6 bg-background/50 rounded-lg border">
              <Flame className="h-8 w-8 text-accent mx-auto mb-3" />
              <div className="text-3xl font-bold text-accent mb-1">{profile.stats.current_streak}</div>
              <p className="text-sm text-muted-foreground">Day Streak</p>
            </div>
            <div className="text-center p-6 bg-background/50 rounded-lg border">
              <Trophy className="h-8 w-8 text-primary mx-auto mb-3" />
              <div className="text-3xl font-bold text-primary mb-1">{profile.stats.longest_streak}</div>
              <p className="text-sm text-muted-foreground">Longest Streak</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PublicProfile;