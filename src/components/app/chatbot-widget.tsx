
"use client";

import type { ChatMessage } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SendHorizonal, User, Bot } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface ChatbotWidgetProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isSending?: boolean;
}

export function ChatbotWidget({ messages, onSendMessage, isSending }: ChatbotWidgetProps) {
  const [inputText, setInputText] = React.useState('');
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  React.useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if(scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-card border-border">
      <div className="p-4 border-b">
        <h3 className="font-headline text-lg font-semibold text-center">Chat Assistant</h3>
      </div>
      <ScrollArea className="flex-1 p-4 custom-scrollbar" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-end gap-2",
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.sender === 'bot' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback><Bot className="h-5 w-5 text-accent" /></AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-[70%] rounded-xl px-4 py-2 text-sm shadow-md",
                  msg.sender === 'user'
                    ? 'bg-secondary text-secondary-foreground rounded-br-none'
                    : 'bg-accent text-accent-foreground rounded-bl-none'
                )}
              >
                {msg.text}
              </div>
              {msg.sender === 'user' && (
                 <Avatar className="h-8 w-8">
                  <AvatarFallback><User className="h-5 w-5 text-primary" /></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isSending && messages.length > 0 && messages[messages.length-1].sender === 'user' && (
             <div className="flex items-end gap-2 justify-start">
                <Avatar className="h-8 w-8">
                  <AvatarFallback><Bot className="h-5 w-5 text-accent" /></AvatarFallback>
                </Avatar>
                <div className="max-w-[70%] rounded-xl px-4 py-2 text-sm shadow-md bg-accent text-accent-foreground rounded-bl-none">
                    <div className="flex items-center space-x-1">
                        <span className="h-2 w-2 bg-accent-foreground rounded-full animate-pulse delay-75"></span>
                        <span className="h-2 w-2 bg-accent-foreground rounded-full animate-pulse delay-150"></span>
                        <span className="h-2 w-2 bg-accent-foreground rounded-full animate-pulse delay-300"></span>
                    </div>
                </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Ask a question..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isSending && handleSend()}
            disabled={isSending}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!inputText.trim() || isSending} className="bg-accent text-accent-foreground hover:bg-accent/90 px-3">
            <SendHorizonal className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
