import React, { useState, useRef, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: number;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
}

interface FocusRoomChatProps {
  userId: string;
  userName: string;
  onSendMessage: (message: string) => void;
  incomingMessages: Message[];
}

const FocusRoomChat: React.FC<FocusRoomChatProps> = ({ userId, userName, onSendMessage, incomingMessages }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [incomingMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-xl shadow-2xl border border-border/50 backdrop-blur-sm transition-all duration-500">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-primary">Room Chat</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {incomingMessages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.senderId === userId ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-xs lg:max-w-md p-3 rounded-xl shadow-md transition-all duration-300",
                msg.senderId === userId
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-secondary text-secondary-foreground rounded-tl-none"
              )}
            >
              <p className="text-xs font-bold mb-1 opacity-80">
                {msg.senderId === userId ? 'You' : msg.senderName}
              </p>
              <p className="text-sm break-words">{msg.content}</p>
              <span className="block text-right text-xs opacity-60 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-border flex space-x-2">
        <Input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Send a message..."
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!message.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default FocusRoomChat;