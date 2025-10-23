import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User, Clock, Flame, Trophy, Users, Settings, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getUserStats } from '@/lib/studyTracker';
import { getFollowers, getFollowing } from '@/lib/social';
import ProgressStats from '@/components/ProgressStats';
import UserSettingsEditor from '@/components/UserSettingsEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState({ total_minutes: 0, current_streak: 0, longest_streak: 0 });
  const [followers, setFollowers] = useState<{ username: string, display_name: string }[]>([]);
  const [following, setFollowing] = useState<{ username: string, display_name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setEditDisplayName(profile.display_name || '');
      setEditBio(profile.bio || '');
    }
  }, [profile]);

  useEffect(() => {
    const loadData = async () => {
      if (user && profile) {
        setLoading(true);
        const [userStats, userFollowers, userFollowing] = await Promise.all([
          getUserStats(user.id),
          getFollowers(profile.id),
          getFollowing(profile.id)
        ]);
        if (userStats) setStats(userStats);
        setFollowers(userFollowers as any);
        setFollowing(userFollowing as any);
        setLoading(false);
      }
    };
    loadData();
  }, [user, profile]);

  const handleProfileUpdate = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('users')
      .update({ display_name: editDisplayName, bio: editBio })
      .eq('user_id', user.id);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
    } else {
      toast({ title: 'Profile Updated', description: 'Your changes have been saved.' });
    }
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (authLoading || loading || !user || !profile) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-primary">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">My Profile</h1>
        </div>

        <Tabs defaultValue="stats" className="max-w-2xl mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stats">Stats & Progress</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats" className="mt-6 space-y-8">
            <Card className="p-8 bg-gradient-to-br from-card to-secondary border-border">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{profile.display_name}</h2>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-background/50 rounded-lg border"><Clock className="h-7 w-7 text-primary mx-auto mb-2" /><div className="text-2xl font-bold">{formatMinutes(stats.total_minutes)}</div><p className="text-xs text-muted-foreground">Total Time</p></div>
                <div className="text-center p-4 bg-background/50 rounded-lg border"><Flame className="h-7 w-7 text-accent mx-auto mb-2" /><div className="text-2xl font-bold">{stats.current_streak}</div><p className="text-xs text-muted-foreground">Day Streak</p></div>
                <div className="text-center p-4 bg-background/50 rounded-lg border"><Trophy className="h-7 w-7 text-primary mx-auto mb-2" /><div className="text-2xl font-bold">{stats.longest_streak}</div><p className="text-xs text-muted-foreground">Longest Streak</p></div>
              </div>
            </Card>
            <ProgressStats userId={user.id} />
          </TabsContent>

          <TabsContent value="social" className="mt-6 space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">{followers.length} Followers</h3>
              <div className="space-y-2">
                {followers.map(f => <Link to={`/profile/${f.username}`} key={f.username} className="block p-2 bg-secondary rounded hover:bg-secondary/80">{f.display_name || f.username}</Link>)}
              </div>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-4">{following.length} Following</h3>
              <div className="space-y-2">
                {following.map(f => <Link to={`/profile/${f.username}`} key={f.username} className="block p-2 bg-secondary rounded hover:bg-secondary/80">{f.display_name || f.username}</Link>)}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6 space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Edit className="h-4 w-4" /> Edit Public Profile</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input id="displayName" value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Tell us about yourself..." />
                </div>
                <Button onClick={handleProfileUpdate}>Save Profile</Button>
              </div>
            </Card>
            <UserSettingsEditor userId={user.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;