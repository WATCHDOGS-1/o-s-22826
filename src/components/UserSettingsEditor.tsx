import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserSettings {
  daily_goal_minutes: number;
  weekly_goal_minutes: number;
  monthly_goal_minutes: number;
  pomodoro_work_minutes: number;
  pomodoro_break_minutes: number;
  streak_maintenance_minutes: number;
}

interface UserSettingsEditorProps {
  userId: string; // This is the auth user id
}

const UserSettingsEditor = ({ userId }: UserSettingsEditorProps) => {
  const [settings, setSettings] = useState<Partial<UserSettings>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (userError || !user) {
        console.error('Error fetching user for settings:', userError);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setSettings(data);
      } else if (error && error.code !== 'PGRST116') { // Ignore 'no rows found'
        console.error('Error fetching settings:', error);
      }
      setLoading(false);
    };

    fetchSettings();
  }, [userId]);

  const handleSave = async () => {
    const { data: user } = await supabase.from('users').select('id').eq('user_id', userId).single();
    if (!user) return;

    const { error } = await supabase
      .from('user_settings')
      .upsert({ ...settings, user_id: user.id }, { onConflict: 'user_id' });

    if (error) {
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
    } else {
      toast({ title: 'Settings Saved', description: 'Your changes have been saved.' });
    }
  };

  const handleChange = (key: keyof UserSettings, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setSettings(prev => ({ ...prev, [key]: numValue }));
    }
  };

  if (loading) {
    return <Card className="p-6 text-center">Loading settings...</Card>;
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Settings className="h-4 w-4" /> General Settings
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pomodoro_work">Pomodoro Work (min)</Label>
            <Input
              id="pomodoro_work"
              type="number"
              value={settings.pomodoro_work_minutes || 25}
              onChange={e => handleChange('pomodoro_work_minutes', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="pomodoro_break">Pomodoro Break (min)</Label>
            <Input
              id="pomodoro_break"
              type="number"
              value={settings.pomodoro_break_minutes || 5}
              onChange={e => handleChange('pomodoro_break_minutes', e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="streak_maintenance">Streak Goal (min/day)</Label>
          <Input
            id="streak_maintenance"
            type="number"
            value={settings.streak_maintenance_minutes || 25}
            onChange={e => handleChange('streak_maintenance_minutes', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="daily_goal">Daily Goal (min)</Label>
            <Input
              id="daily_goal"
              type="number"
              value={settings.daily_goal_minutes || 120}
              onChange={e => handleChange('daily_goal_minutes', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="weekly_goal">Weekly Goal (min)</Label>
            <Input
              id="weekly_goal"
              type="number"
              value={settings.weekly_goal_minutes || 840}
              onChange={e => handleChange('weekly_goal_minutes', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="monthly_goal">Monthly Goal (min)</Label>
            <Input
              id="monthly_goal"
              type="number"
              value={settings.monthly_goal_minutes || 3600}
              onChange={e => handleChange('monthly_goal_minutes', e.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleSave}>Save Settings</Button>
      </div>
    </Card>
  );
};

export default UserSettingsEditor;