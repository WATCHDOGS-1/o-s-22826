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
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle();
  
  return data?.display_name || 'Anonymous';
};

export const ensureUser = async (userId: string, displayName?: string) => {
  // Upsert user to ensure existence. If displayName is provided (only during initial setup/anonymous), use it.
  // Otherwise, rely on existing DB data (username set during signup).
  const upsertData: { user_id: string; display_name?: string; username?: string } = { user_id: userId };
  
  if (displayName) {
    upsertData.display_name = displayName;
    upsertData.username = displayName;
  }
  
  const { error } = await (supabase as any)
    .from('users')
    .upsert(upsertData, { onConflict: 'user_id', ignoreDuplicates: !displayName });

  if (error) {
    console.error('Error upserting user:', error);
  }
};

export const saveStudySession = async (
  userId: string,
  roomId: string,
  minutesStudied: number
) => {
  console.log('Saving study session:', { userId, roomId, minutesStudied });
  
  // Get user's database ID
  const { data: user, error: userError } = await (supabase as any)
    .from('users')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (userError) {
    console.error('Error fetching user:', userError);
    return;
  }

  if (!user) {
    console.error('User not found:', userId);
    return;
  }

  const today = new Date().toISOString().split('T')[0];

  // Check if session already exists for today
  const { data: existingSession } = await (supabase as any)
    .from('study_sessions')
    .select('id, minutes_studied')
    .eq('user_id', user.id)
    .eq('room_id', roomId)
    .eq('date', today)
    .maybeSingle();

  if (existingSession) {
    // Update existing session
    const { error } = await (supabase as any)
      .from('study_sessions')
      .update({
        minutes_studied: minutesStudied,
        ended_at: new Date().toISOString()
      })
      .eq('id', existingSession.id);

    if (error) {
      console.error('Error updating session:', error);
    } else {
      console.log('Study session updated successfully');
    }
  } else {
    // Insert new session
    const { error } = await (supabase as any)
      .from('study_sessions')
      .insert([{
        user_id: user.id,
        room_id: roomId,
        minutes_studied: minutesStudied,
        ended_at: new Date().toISOString(),
        date: today
      }]);

    if (error) {
      console.error('Error saving session:', error);
    } else {
      console.log('Study session saved successfully');
    }
  }
  
  // Update streak
  await updateStreak(user.id);
};

export const updateStreak = async (userDbId: string) => {
  const { data: stats, error } = await (supabase as any)
    .from('user_stats')
    .select('*')
    .eq('user_id', userDbId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user stats:', error);
    return;
  }
  
  if (!stats) {
    console.log('No stats found for user:', userDbId);
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Check if user studied at least 25 minutes today
  const { data: todaySession } = await (supabase as any)
    .from('study_sessions')
    .select('minutes_studied')
    .eq('user_id', userDbId)
    .eq('date', today)
    .maybeSingle();
  
  // Only update streak if user studied at least 25 minutes
  if (!todaySession || todaySession.minutes_studied < 25) {
    console.log('User has not studied 25 minutes yet today');
    return;
  }

  const lastStudyDate = stats.last_study_date;
  let newStreak = stats.current_streak;

  if (lastStudyDate) {
    const lastDate = new Date(lastStudyDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day
      newStreak = stats.current_streak + 1;
    } else if (diffDays > 1) {
      // Streak broken
      newStreak = 1;
    }
    // If diffDays === 0, it's the same day, keep current streak
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

  if (updateError) {
    console.error('Error updating streak:', updateError);
  } else {
    console.log('Streak updated successfully:', { newStreak, longestStreak });
  }
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
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data } = await (supabase as any)
    .from('study_sessions')
    .select(`
      user_id,
      minutes_studied,
      users!inner (
        user_id,
        display_name
      )
    `)
    .gte('date', oneWeekAgo.toISOString().split('T')[0])
    .order('minutes_studied', { ascending: false });

  if (!data) return [];

  // Aggregate minutes by user
  const userTotals = data.reduce((acc: any, session: any) => {
    const userKey = session.users.user_id;
    if (!acc[userKey]) {
      acc[userKey] = {
        user_id: session.users.user_id,
        display_name: session.users.display_name || 'Anonymous',
        total_minutes: 0
      };
    }
    acc[userKey].total_minutes += session.minutes_studied;
    return acc;
  }, {});

  return Object.values(userTotals)
    .sort((a: any, b: any) => b.total_minutes - a.total_minutes)
    .slice(0, 10);
};