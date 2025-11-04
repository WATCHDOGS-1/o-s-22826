import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Camera, ArrowLeft, Loader2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        navigate('/auth');
      }
    });
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single();

    if (data) {
      setUsername(data.username);
      setAvatarUrl(data.avatar_url);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user!.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user!.id);

      if (updateError) throw updateError;

      setAvatarUrl(data.publicUrl);
      toast({
        title: "Success",
        description: "Avatar updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const updateProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', user!.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" style={{ top: '20%', left: '10%' }} />
        <div className="absolute w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ bottom: '20%', right: '10%', animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate('/study')}
          className="mb-8 hover:text-primary transition-colors"
        >
          <ArrowLeft className="mr-2" /> Back to Study Room
        </Button>

        <div className="max-w-2xl mx-auto glass p-8 rounded-2xl glow animate-slide-up">
          <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-primary bg-clip-text text-transparent">
            Your Profile
          </h1>

          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary glow-strong">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-primary flex items-center justify-center text-4xl font-bold">
                    {username[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="animate-spin text-white" size={32} />
                ) : (
                  <Camera className="text-white" size={32} />
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                disabled={uploading}
                className="hidden"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="glass border-primary/50 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input
                value={user.email}
                disabled
                className="glass opacity-50"
              />
            </div>

            <Button
              onClick={updateProfile}
              className="w-full bg-gradient-primary hover:opacity-90 transition-all glow text-white font-semibold"
            >
              Update Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;