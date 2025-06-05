
"use client";

import type { ChatHistoryItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, MessageSquare, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatHistoryProps {
  history: ChatHistoryItem[];
  onClearHistory: () => void;
  onLoadHistoryItem?: (item: ChatHistoryItem) => void; // Optional: if want to load history into chat
}

export function ChatHistory({ history, onClearHistory, onLoadHistoryItem }: ChatHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <div className="p-4 border-t h-full flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-headline text-md font-semibold">History</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No chat history yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t h-full flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-headline text-md font-semibold">History</h3>
        <Button variant="ghost" size="sm" onClick={onClearHistory} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear
        </Button>
      </div>
      <ScrollArea className="flex-1 custom-scrollbar pr-2">
        <Accordion type="single" collapsible className="w-full space-y-2">
          {history.map((item) => (
            <AccordionItem key={item.id} value={item.id} className="bg-card border rounded-md shadow-sm">
              <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
                <div className="flex items-center gap-2 w-full">
                  <MessageSquare className="h-4 w-4 text-accent flex-shrink-0" />
                  <span className="truncate flex-1 text-left" title={item.preview}>{item.preview}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3 text-sm space-y-2">
                <p><strong>You:</strong> {item.question}</p>
                <p><strong>Bot:</strong> {item.answer}</p>
                {onLoadHistoryItem && (
                    <Button variant="link" size="sm" className="p-0 h-auto text-accent" onClick={() => onLoadHistoryItem(item)}>
                        Revisit this conversation
                    </Button>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
