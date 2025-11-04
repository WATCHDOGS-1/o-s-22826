import { supabase } from '@/integrations/supabase/client';
import { showEncouragement, showError } from './toast';
import { format, isToday, isYesterday, parseISO } from 'date-fns';

export interface UserStats {
  id: string;
  xp: number;
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null; // ISO date string
  match_size: number;
  updated_at: string | null;
}

// Helper function to initialize stats if they don't exist
async function initializeUserStats(userId: string): Promise<UserStats> {
  const { data, error } = await supabase
    .from('user_stats')
    .insert({ id: userId, xp: 0, current_streak: 0, longest_streak: 0, match_size: 4 })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to initialize user stats: ${error.message}`);
  }
  return data as UserStats;
}

export async function fetchUserStats(userId: string): Promise<UserStats> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code === 'PGRST116') { // No rows found
    return initializeUserStats(userId);
  } else if (error) {
    showError("Failed to load focus stats.");
    throw new Error(`Error fetching user stats: ${error.message}`);
  }
  return data as UserStats;
}

export async function updateFocusTime(userId: string, durationSeconds: number) {
  if (durationSeconds < 60) {
    showEncouragement("Session too short to count towards stats, but great effort!");
    return;
  }

  try {
    const currentStats = await fetchUserStats(userId);
    
    // Calculate XP (1 XP per minute)
    const minutesFocused = Math.floor(durationSeconds / 60);
    const newXp = currentStats.xp + minutesFocused;

    // Streak calculation
    let newCurrentStreak = currentStats.current_streak;
    let newLongestStreak = currentStats.longest_streak;
    const today = format(new Date(), 'yyyy-MM-dd');
    let lastStudyDate = currentStats.last_study_date ? parseISO(currentStats.last_study_date) : null;

    if (!lastStudyDate || isYesterday(lastStudyDate)) {
      // If last study was yesterday or never, increment streak
      newCurrentStreak += 1;
      if (newCurrentStreak > newLongestStreak) {
        newLongestStreak = newCurrentStreak;
      }
      showEncouragement(`Streak maintained! You are now on a ${newCurrentStreak} day streak!`);
    } else if (isToday(lastStudyDate)) {
      // Already studied today, streak remains the same
    } else {
      // Streak broken (more than one day ago)
      newCurrentStreak = 1;
      showEncouragement("New streak started! Keep the momentum going!");
    }

    const { error } = await supabase
      .from('user_stats')
      .update({
        xp: newXp,
        current_streak: newCurrentStreak,
        longest_streak: newLongestStreak,
        last_study_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      showError("Failed to update focus stats.");
      console.error("Error updating stats:", error);
    } else {
      showEncouragement(`+${minutesFocused} minutes focused! Total XP: ${newXp}`);
    }

  } catch (e) {
    console.error("Update focus time failed:", e);
    showError("An error occurred while saving your focus time.");
  }
}

export async function fetchLeaderboard() {
  // For a simple implementation, we fetch the top 10 users by XP.
  
  const { data, error } = await supabase
    .from('user_stats')
    .select(`
      xp, 
      current_streak, 
      profiles (first_name, last_name, avatar_url)
    `)
    .order('xp', { ascending: false })
    .limit(10);

  if (error) {
    showError("Failed to load leaderboard.");
    console.error("Error fetching leaderboard:", error);
    return [];
  }

  return data.map((item, index) => ({
    rank: index + 1,
    xp: item.xp,
    streak: item.current_streak,
    name: item.profiles ? `${item.profiles.first_name || 'Focus'} ${item.profiles.last_name || 'User'}` : 'Anonymous',
    avatar_url: item.profiles?.avatar_url,
  }));
}