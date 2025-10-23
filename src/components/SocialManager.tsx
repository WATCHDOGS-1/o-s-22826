import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, Check, X, Search, Users, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUserId } from '@/lib/userStorage';
import { 
  searchUsers, 
  sendFriendRequest, 
  getPendingRequests, 
  handleFriendRequest, 
  getFriends,
  UserProfile,
  FriendRequest
} from '@/lib/social';

const SocialManager = () => {
  const currentUserId = getUserId();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSocialData();
  }, [currentUserId]);

  const loadSocialData = async () => {
    setLoading(true);
    try {
      const [requests, friendList] = await Promise.all([
        getPendingRequests(currentUserId),
        getFriends(currentUserId)
      ]);
      setPendingRequests(requests);
      setFriends(friendList);
    } catch (e) {
      console.error('Failed to load social data:', e);
      toast({
        title: 'Error',
        description: 'Failed to load social data.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    const results = await searchUsers(searchQuery, currentUserId);
    setSearchResults(results);
  };

  const handleSendRequest = async (toUserId: string) => {
    try {
      await sendFriendRequest(currentUserId, toUserId);
      toast({
        title: 'Request Sent',
        description: 'Friend request sent successfully.',
      });
      setSearchResults(prev => prev.filter(u => u.user_id !== toUserId));
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message || 'Failed to send request.',
        variant: 'destructive'
      });
    }
  };

  const handleRequestAction = async (requestId: string, action: 'ACCEPT' | 'REJECT') => {
    try {
      await handleFriendRequest(requestId, action, currentUserId);
      toast({
        title: action === 'ACCEPT' ? 'Friend Added' : 'Request Rejected',
        description: action === 'ACCEPT' ? 'You are now friends!' : 'Request dismissed.',
      });
      loadSocialData();
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Failed to process request.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <Card className="p-6 text-center text-muted-foreground">Loading social data...</Card>;
  }

  return (
    <div className="space-y-6">
      {/* Search Users */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Search className="h-4 w-4" /> Find Users
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder="Search username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        {searchResults.length > 0 && (
          <ScrollArea className="h-40 border rounded-md p-2">
            <div className="space-y-2">
              {searchResults.map(user => (
                <div key={user.user_id} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                  <span className="font-medium">{user.username}</span>
                  <Button size="sm" onClick={() => handleSendRequest(user.user_id)}>
                    <UserPlus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Pending Requests */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" /> Pending Requests ({pendingRequests.length})
        </h3>
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending friend requests.</p>
        ) : (
          <ScrollArea className="h-40 border rounded-md p-2">
            <div className="space-y-2">
              {pendingRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                  <span className="font-medium">{req.from_user.username}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => handleRequestAction(req.id, 'ACCEPT')}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleRequestAction(req.id, 'REJECT')}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Friends List */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4" /> Friends ({friends.length})
        </h3>
        {friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">You have no friends yet. Find someone to study with!</p>
        ) : (
          <ScrollArea className="h-40 border rounded-md p-2">
            <div className="space-y-2">
              {friends.map(friend => (
                <div key={friend.user_id} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                  <span className="font-medium">{friend.username}</span>
                  <Button size="sm" variant="outline" disabled>
                    Chat (Coming Soon)
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
};

export default SocialManager;