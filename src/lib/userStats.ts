import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserStats {
  xp: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
  matchSize: number;
}

const DEFAULT_STATS: UserStats = { 
  xp: 0, 
  currentStreak: 0, 
  longestStreak: 0, 
  lastStudyDate: null, 
  matchSize: 4 
};

// Helper function to fetch stats
export const getStats = async (userId: string): Promise<UserStats> => {
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means 'No rows found'
    console.error("Error fetching user stats:", error);
    toast.error("Error loading stats", { description: "Could not retrieve your progress." });
    return DEFAULT_STATS;
  }

  if (data) {
    return {
      xp: data.xp,
      currentStreak: data.current_streak,
      longestStreak: data.longest_streak,
      lastStudyDate: data.last_study_date,
      matchSize: data.match_size,
    };
  }
  
  // If no stats exist, create default stats
  await saveStats(userId, DEFAULT_STATS);
  return DEFAULT_STATS;
};

// Helper function to save/upsert stats
export const saveStats = async (userId: string, stats: UserStats): Promise<UserStats> => {
  const { error } = await supabase
    .from('user_stats')
    .upsert({
      id: userId,
      xp: stats.xp,
      current_streak: stats.currentStreak,
      longest_streak: stats.longestStreak,
      last_study_date: stats.lastStudyDate,
      match_size: stats.matchSize,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) {
    console.error("Error saving user stats:", error);
    toast.error("Error saving stats", { description: "Could not save your progress." });
    return stats;
  }
  return stats;
};

export const updateStatsAfterSession = async (userId: string, minutesStudied: number): Promise<UserStats> => {
  const stats = await getStats(userId);
  const xpGained = Math.floor(minutesStudied / 5);
  
  stats.xp += xpGained;

  const today = new Date().toISOString().split('T')[0];
  
  if (minutesStudied >= 25) {
    if (stats.lastStudyDate !== today) {
      if (stats.lastStudyDate) {
        const lastDate = new Date(stats.lastStudyDate);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          stats.currentStreak += 1;
        } else if (diffDays > 1) {
          stats.currentStreak = 1;
        }
      } else {
        stats.currentStreak = 1;
      }
      stats.lastStudyDate = today;
    }
  }
  
  stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
  
  return saveStats(userId, stats);
};

export const setMatchSize = async (userId: string, size: number): Promise<void> => {
  const stats = await getStats(userId);
  stats.matchSize = size;
  await saveStats(userId, stats);
};