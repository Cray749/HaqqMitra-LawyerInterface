
"use client";

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PlusCircle, FileText, MessageSquareText, LogOut } from 'lucide-react'; // Added MessageSquareText

interface HeaderControlsProps {
  onAddNewCase: () => void;
  spaceName?: string;
  viewMode: 'details' | 'chatActive' | 'devilsAdvocateActive';
  onViewDetails: () => void;
  onToggleNormalChat: () => void; // New prop
  isDevilsAdvocateModeActive: boolean;
  onEndDevilsAdvocate: () => void;
}

export function HeaderControls({
  onAddNewCase,
  spaceName,
  viewMode,
  onViewDetails,
  onToggleNormalChat, // New prop
  isDevilsAdvocateModeActive,
  onEndDevilsAdvocate
}: HeaderControlsProps) {

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:py-4">
      <div className="flex-1">
        {spaceName && <h1 className="font-headline text-xl font-semibold">{spaceName}</h1>}
      </div>

      <div className="flex items-center gap-2">
        {viewMode !== 'details' && ( // Show "View Details" if in any chat mode or DA mode
           <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onViewDetails} variant="outline">
                  <FileText className="mr-2 h-4 w-4" /> View Details
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show case details and predictions.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {isDevilsAdvocateModeActive && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="destructive" onClick={onEndDevilsAdvocate} className="whitespace-nowrap">
                  <LogOut className="mr-2 h-4 w-4" /> End Devil's Mode
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exit Devil's Advocate mode.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {!isDevilsAdvocateModeActive && viewMode !== 'chatActive' && ( // Show Chat Assistant if not in DA mode and not in normal chat
           <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onToggleNormalChat} variant="outline">
                  <MessageSquareText className="mr-2 h-4 w-4" /> Chat Assistant
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open the AI chat assistant for this case.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={onAddNewCase} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="mr-2 h-4 w-4" /> New Case
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create a new case.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}
