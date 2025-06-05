
"use client";

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FilePlus2, PanelLeft } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';

interface HeaderControlsProps {
  onNewThread: () => void;
  spaceName?: string;
}

export function HeaderControls({ onNewThread, spaceName }: HeaderControlsProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:py-4">
       <Button
          variant="outline"
          size="icon"
          className="sm:hidden"
          onClick={toggleSidebar}
        >
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      <div className="flex-1">
        {spaceName && <h1 className="font-headline text-xl font-semibold">{spaceName}</h1>}
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onNewThread} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <FilePlus2 className="mr-2 h-4 w-4" /> New Thread
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Start over with a fresh case.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </header>
  );
}
