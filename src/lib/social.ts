import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type UserRow = Tables<'users'>;
type FriendRequestRow = Tables<'friend_requests'>;

export interface UserProfile {
  id: string; // DB ID
  user_id: string; // Auth ID
  username: string;
}

export interface FriendRequest {
  id: string;
  from_user: UserProfile;
  to_user: UserProfile;
  status: FriendRequestRow['status'];
  created_at: string;
}

export const searchUsers = async (query: string, currentUserId: string): Promise<UserProfile[]> => {
  if (!query || query.length < 3) return [];

  const { data, error } = await (supabase as any)
    .from('users')
    .select('id, user_id, username')
    .ilike('username', `%${query}%`)
    .neq('user_id', currentUserId)
    .limit(10);

  if (error) {
    console.error('Error searching users:', error);
    return [];
  }

  // Map data to UserProfile, ensuring display_name is removed
  return data.map(u => ({
    id: u.id,
    user_id: u.user_id,
    username: u.username,
  })) as UserProfile[];
};

export const sendFriendRequest = async (fromUserId: string, toUserId: string) => {
  // Get DB IDs for both users
  const { data: fromUser } = await (supabase as any).from('users').select('id').eq('user_id', fromUserId).single();
  const { data: toUser } = await (supabase as any).from('users').select('id').eq('user_id', toUserId).single();

  if (!fromUser || !toUser) throw new Error('User not found.');

  // Check if request already exists (pending or accepted)
  const { data: existingRequest } = await (supabase as any)
    .from('friend_requests')
    .select('id, status')
    .or(`and(from_user_id.eq.${fromUser.id},to_user_id.eq.${toUser.id}),and(from_user_id.eq.${toUser.id},to_user_id.eq.${fromUser.id})`)
    .in('status', ['PENDING', 'ACCEPTED'])
    .maybeSingle();

  if (existingRequest) {
    if (existingRequest.status === 'PENDING') {
      throw new Error('Friend request already pending.');
    }
    if (existingRequest.status === 'ACCEPTED') {
      throw new Error('You are already friends.');
    }
  }

  const { error } = await (supabase as any)
    .from('friend_requests')
    .insert({
      from_user_id: fromUser.id,
      to_user_id: toUser.id,
      status: 'PENDING'
    });

  if (error) throw error;
};

export const getPendingRequests = async (currentUserId: string): Promise<FriendRequest[]> => {
  const { data: currentUser } = await (supabase as any).from('users').select('id').eq('user_id', currentUserId).single();
  if (!currentUser) return [];

  const { data, error } = await (supabase as any)
    .from('friend_requests')
    .select(`
      id, created_at, status,
      from_user_id ( id, user_id, username ),
      to_user_id ( id, user_id, username )
    `)
    .eq('to_user_id', currentUser.id)
    .eq('status', 'PENDING');

  if (error) {
    console.error('Error fetching pending requests:', error);
    return [];
  }

  return data.map((req: any) => ({
    id: req.id,
    created_at: req.created_at,
    status: req.status,
    from_user: req.from_user_id,
    to_user: req.to_user_id,
  }));
};

export const handleFriendRequest = async (requestId: string, action: 'ACCEPT' | 'REJECT', currentUserId: string) => {
  const { data: request, error: fetchError } = await (supabase as any)
    .from('friend_requests')
    .select('id, from_user_id, to_user_id')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) throw new Error('Request not found.');

  // 1. Update request status
  await (supabase as any)
    .from('friend_requests')
    .update({ status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED' })
    .eq('id', requestId);

  if (action === 'ACCEPT') {
    // 2. Create friendship entry (ensure user1_id < user2_id for uniqueness)
    const user1_id = request.from_user_id < request.to_user_id ? request.from_user_id : request.to_user_id;
    const user2_id = request.from_user_id < request.to_user_id ? request.to_user_id : request.from_user_id;

    const { error: friendError } = await (supabase as any)
      .from('friends')
      .insert({ user1_id, user2_id });

    if (friendError) throw friendError;
  }
};

export const getFriends = async (currentUserId: string): Promise<UserProfile[]> => {
  const { data: currentUser } = await (supabase as any).from('users').select('id').eq('user_id', currentUserId).single();
  if (!currentUser) return [];
  
  const dbId = currentUser.id;

  const { data: friendships, error } = await (supabase as any)
    .from('friends')
    .select(`
      user1_id ( id, user_id, username ),
      user2_id ( id, user_id, username )
    `)
    .or(`user1_id.eq.${dbId},user2_id.eq.${dbId}`);

  if (error) {
    console.error('Error fetching friends:', error);
    return [];
  }

  return friendships.map((f: any) => {
    // Return the profile of the *other* user
    if (f.user1_id.id === dbId) {
      return f.user2_id;
    } else {
      return f.user1_id;
    }
  });
};