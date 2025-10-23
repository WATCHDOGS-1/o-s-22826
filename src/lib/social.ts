import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/contexts/AuthContext";

export interface PublicProfile extends UserProfile {
  stats: {
    total_minutes: number;
    current_streak: number;
    longest_streak: number;
  };
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

export const getPublicProfile = async (username: string, currentAuthId?: string): Promise<PublicProfile | null> => {
  const { data: profile, error } = await supabase
    .from('users')
    .select('*, user_stats(*)')
    .eq('username', username)
    .single();

  if (error || !profile) {
    console.error('Error fetching public profile:', error);
    return null;
  }

  const { data: followerCount } = await supabase.rpc('count_followers', { p_user_id: profile.id });
  const { data: followingCount } = await supabase.rpc('count_following', { p_user_id: profile.id });

  let is_following = false;
  if (currentAuthId) {
    const { data: currentUser } = await supabase.from('users').select('id').eq('user_id', currentAuthId).single();
    if (currentUser) {
      const { data: follow } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', profile.id)
        .maybeSingle();
      is_following = !!follow;
    }
  }

  return {
    ...profile,
    stats: profile.user_stats[0] || { total_minutes: 0, current_streak: 0, longest_streak: 0 },
    followers_count: followerCount || 0,
    following_count: followingCount || 0,
    is_following,
  };
};

export const followUser = async (followerAuthId: string, followingDbId: string) => {
  const { data: follower } = await supabase.from('users').select('id').eq('user_id', followerAuthId).single();
  if (!follower) throw new Error("Follower not found");

  const { error } = await supabase
    .from('followers')
    .insert({ follower_id: follower.id, following_id: followingDbId });
  
  if (error) throw error;
};

export const unfollowUser = async (followerAuthId: string, followingDbId: string) => {
  const { data: follower } = await supabase.from('users').select('id').eq('user_id', followerAuthId).single();
  if (!follower) throw new Error("Follower not found");

  const { error } = await supabase
    .from('followers')
    .delete()
    .eq('follower_id', follower.id)
    .eq('following_id', followingDbId);

  if (error) throw error;
};

export const getFollowers = async (userDbId: string) => {
  const { data, error } = await supabase
    .from('followers')
    .select('users!follower_id(username, display_name)')
    .eq('following_id', userDbId);
  
  if (error) throw error;
  return data.map(item => item.users);
};

export const getFollowing = async (userDbId: string) => {
  const { data, error } = await supabase
    .from('followers')
    .select('users!following_id(username, display_name)')
    .eq('follower_id', userDbId);
  
  if (error) throw error;
  return data.map(item => item.users);
};