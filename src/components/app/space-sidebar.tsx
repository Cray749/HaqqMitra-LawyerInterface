
"use client";

import type { Space } from '@/types'; // Space type can still be used if its structure fits "Case"
import { Button } from '@/components/ui/button';
// Dialog related imports removed as modal is now handled by parent
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { PlusCircle, LayoutDashboard, ChevronRight } from 'lucide-react';
import * as React from 'react';

interface SpaceSidebarProps {
  caseItems: Pick<Space, 'id' | 'name'>[]; // Renamed from spaces
  selectedCaseId: string | null;      // Renamed from selectedSpaceId
  onTriggerAddCase: () => void;        // Renamed from onAddSpace and changed signature
  onSelectCase: (id: string) => void;   // Renamed from onSelectSpace
  className?: string;
}

export function SpaceSidebar({
  caseItems,
  selectedCaseId,
  onTriggerAddCase,
  onSelectCase,
  className, 
}: SpaceSidebarProps) {

  return (
    <>
      <Sidebar 
        side="left" 
        variant="sidebar"
        collapsible="icon"
        className={className} 
      >
        <SidebarHeader className="p-4 justify-between items-center">
          <h2 className="font-headline text-xl font-semibold group-data-[collapsible=icon]:hidden">Cases</h2> {/* Changed "Spaces" to "Cases" */}
          <div className="md:hidden"> 
             <SidebarTrigger />
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {caseItems.map((caseItem) => (
              <SidebarMenuItem key={caseItem.id}>
                <SidebarMenuButton
                  onClick={() => onSelectCase(caseItem.id)}
                  isActive={selectedCaseId === caseItem.id}
                  className="justify-between group-data-[collapsible=icon]:justify-center"
                  tooltip={caseItem.name}
                >
                  <div className="flex items-center gap-2">
                    <LayoutDashboard />
                    <span className="group-data-[collapsible=icon]:hidden">{caseItem.name}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center hover:bg-accent hover:text-accent-foreground"
            onClick={onTriggerAddCase} // Changed to call onTriggerAddCase
          >
            <PlusCircle />
            <span className="group-data-[collapsible=icon]:hidden">Add Case</span> {/* Changed "Add Space" to "Add Case" */}
          </Button>
        </SidebarFooter>
      </Sidebar>
      {/* Internal Dialog removed, will be handled by page.tsx */}
    </>
  );
}
