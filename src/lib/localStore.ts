export interface UserStats {
  xp: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
  matchSize: number;
}

const STORAGE_KEY = "onlyfocus_stats";

export const getStats = (): UserStats => {
  if (typeof window === 'undefined') {
    return { xp: 0, currentStreak: 0, longestStreak: 0, lastStudyDate: null, matchSize: 4 };
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing local storage stats:", e);
    }
  }
  return { xp: 0, currentStreak: 0, longestStreak: 0, lastStudyDate: null, matchSize: 4 };
};

export const saveStats = (stats: UserStats): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }
};

export const updateStatsAfterSession = (minutesStudied: number): UserStats => {
  const stats = getStats();
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
  
  saveStats(stats);
  return stats;
};

export const setMatchSize = (size: number): void => {
  const stats = getStats();
  stats.matchSize = size;
  saveStats(stats);
};