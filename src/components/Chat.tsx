import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface ChatProps {
  userId: string;
}

interface Message {
  id: string;
  username: string;
  message: string;
  created_at: string;
}

const Chat: React.FC<ChatProps> = ({ userId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProfile();
    loadMessages();
    subscribeToMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();
    
    if (data) setUsername(data.username);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50);

    if (data) setMessages(data);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await supabase.from('chat_messages').insert([
      {
        user_id: userId,
        username,
        message: newMessage,
      },
    ]);

    setNewMessage('');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="glass p-6 rounded-2xl glow animate-slide-up flex flex-col h-[400px]">
      <h2 className="text-2xl font-bold mb-4 text-glow">Chat</h2>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-xl animate-slide-in ${
              msg.username === username
                ? 'bg-primary/20 ml-8'
                : 'bg-card/50 mr-8'
            }`}
          >
            <div className="text-xs text-muted-foreground mb-1">
              {msg.username}
            </div>
            <div className="text-sm">{msg.message}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="glass border-primary/50 focus:border-primary"
        />
        <Button type="submit" className="bg-gradient-primary glow">
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
};

export default Chat;