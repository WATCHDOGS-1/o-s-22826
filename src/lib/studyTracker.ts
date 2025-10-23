import { supabase } from "@/integrations/supabase/client";

export interface UserStats {
  total_minutes: number;
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
}

export const getDisplayUsername = async (userId: string): Promise<string> => {
  const { data } = await (supabase as any)
    .from('users')
    .select('display_name, username')
    .eq('user_id', userId)
    .maybeSingle();
  
  return data?.display_name || data?.username || 'Anonymous';
};

export const ensureUser = async (userId: string) => {
  const upsertData: { user_id: string } = { user_id: userId };
  
  const { error } = await (supabase as any)
    .from('users')
    .upsert(upsertData, { onConflict: 'user_id', ignoreDuplicates: true });

  if (error) {
    console.error('Error upserting user:', error);
  }
};

export const saveStudySession = async (
  userId: string,
  roomId: string,
  minutesStudied: number
) => {
  const { data: user, error: userError } = await (supabase as any)
    .from('users')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (userError || !user) {
    console.error('User not found for saving session:', userId);
    return;
  }

  const today = new Date().toISOString().split('T')[0];

  const { data: existingSession } = await (supabase as any)
    .from('study_sessions')
    .select('id, minutes_studied')
    .eq('user_id', user.id)
    .eq('room_id', roomId)
    .eq('date', today)
    .maybeSingle();

  if (existingSession) {
    const { error } = await (supabase as any)
      .from('study_sessions')
      .update({
        minutes_studied: minutesStudied,
        ended_at: new Date().toISOString()
      })
      .eq('id', existingSession.id);

    if (error) console.error('Error updating session:', error);
  } else {
    const { error } = await (supabase as any)
      .from('study_sessions')
      .insert([{
        user_id: user.id,
        room_id: roomId,
        minutes_studied: minutesStudied,
        ended_at: new Date().toISOString(),
        date: today
      }]);

    if (error) console.error('Error saving session:', error);
  }
  
  await updateStreak(user.id);
};

export const updateStreak = async (userDbId: string) => {
  const { data: stats, error: statsError } = await (supabase as any)
    .from('user_stats')
    .select('*')
    .eq('user_id', userDbId)
    .maybeSingle();

  if (statsError) {
    console.error('Error fetching user stats:', statsError);
    return;
  }
  
  if (!stats) {
    console.log('No stats found for user:', userDbId);
    return;
  }

  const { data: settings } = await (supabase as any)
    .from('user_settings')
    .select('streak_maintenance_minutes')
    .eq('user_id', userDbId)
    .single();

  const streakGoal = settings?.streak_maintenance_minutes || 25;

  const today = new Date().toISOString().split('T')[0];
  
  const { data: todaySession } = await (supabase as any)
    .from('study_sessions')
    .select('minutes_studied')
    .eq('user_id', userDbId)
    .eq('date', today)
    .maybeSingle();
  
  if (!todaySession || todaySession.minutes_studied < streakGoal) {
    return;
  }

  const lastStudyDate = stats.last_study_date;
  let newStreak = stats.current_streak;

  if (lastStudyDate) {
    const lastDate = new Date(lastStudyDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak = stats.current_streak + 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }

  const longestStreak = Math.max(stats.longest_streak || 0, newStreak);

  const { error: updateError } = await (supabase as any)
    .from('user_stats')
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_study_date: today,
    })
    .eq('user_id', userDbId);

  if (updateError) console.error('Error updating streak:', updateError);
};

export const getUserStats = async (userId: string): Promise<UserStats | null> => {
  const { data: user } = await (supabase as any)
    .from('users')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!user) return null;

  const { data: stats } = await (supabase as any)
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!stats) {
    return {
      total_minutes: 0,
      current_streak: 0,
      longest_streak: 0,
      last_study_date: null
    };
  }

  return stats;
};

export const getWeeklyLeaderboard = async () => {
  const { data, error } = await supabase.rpc('get_weekly_leaderboard');
  if (error) {
    console.error("Error fetching weekly leaderboard", error);
    return [];
  }
  return data;
};