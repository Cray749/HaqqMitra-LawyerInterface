
"use client";

import type { Space } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  spaces: Space[];
  selectedSpaceId: string | null;
  onAddSpace: (name: string) => void;
  onSelectSpace: (id: string) => void;
  className?: string;
}

export function SpaceSidebar({
  spaces,
  selectedSpaceId,
  onAddSpace,
  onSelectSpace,
  className,
}: SpaceSidebarProps) {
  const [isAddSpaceModalOpen, setIsAddSpaceModalOpen] = React.useState(false);
  const [newSpaceName, setNewSpaceName] = React.useState('');

  const handleAddSpace = () => {
    if (newSpaceName.trim()) {
      onAddSpace(newSpaceName.trim());
      setNewSpaceName('');
      setIsAddSpaceModalOpen(false);
    }
  };

  return (
    <>
      <Sidebar side="left" variant="sidebar" collapsible="icon" className={className}>
        <SidebarHeader className="p-4 justify-between items-center">
          <h2 className="font-headline text-xl font-semibold group-data-[collapsible=icon]:hidden">Spaces</h2>
          <div className="md:hidden">
             <SidebarTrigger />
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {spaces.map((space) => (
              <SidebarMenuItem key={space.id}>
                <SidebarMenuButton
                  onClick={() => onSelectSpace(space.id)}
                  isActive={selectedSpaceId === space.id}
                  className="justify-between group-data-[collapsible=icon]:justify-center"
                  tooltip={space.name}
                >
                  <div className="flex items-center gap-2">
                    <LayoutDashboard />
                    <span className="group-data-[collapsible=icon]:hidden">{space.name}</span>
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
            onClick={() => setIsAddSpaceModalOpen(true)}
          >
            <PlusCircle />
            <span className="group-data-[collapsible=icon]:hidden">Add Space</span>
          </Button>
        </SidebarFooter>
      </Sidebar>

      <Dialog open={isAddSpaceModalOpen} onOpenChange={setIsAddSpaceModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Add New Space</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="spaceName" className="text-right">
                Name
              </Label>
              <Input
                id="spaceName"
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                className="col-span-3"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSpaceModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSpace} className="bg-accent text-accent-foreground hover:bg-accent/90">Add Space</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
