
"use client";

import * as React from 'react';
import {
  SpaceSidebar,
  HeaderControls,
  CaseDetailsForm,
  DocumentUploadPanel,
  MlPredictionOutput,
  ChatbotWidget,
  ChatHistory,
} from '@/components/app';
import type { Space, CaseDetails, UploadedFile, MlOutputData, ChatMessage, ChatHistoryItem } from '@/types';
import { initialCaseDetails } from '@/types';
import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MessageSquareText, X, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// Removed: import { generatePowerpointOutline, GeneratePowerpointOutlineInput } from '@/ai/flows/generate-powerpoint-outline';
import { generateWeakPointsSummary, GenerateWeakPointsSummaryInput } from '@/ai/flows/generate-weak-points-summary';

// Dummy initial spaces
const initialSpaces: Space[] = [
  { id: 'space-1', name: 'Case Alpha vs Beta' },
  { id: 'space-2', name: 'Patent Dispute Gamma' },
  { id: 'space-3', name: 'Corporate Litigation Delta' },
];

type ViewMode = 'details' | 'chatActive';

export default function AppPage() {
  const { toast } = useToast();
  const [spaces, setSpaces] = React.useState<Space[]>(initialSpaces);
  const [selectedSpaceId, setSelectedSpaceId] = React.useState<string | null>(initialSpaces[0]?.id || null);
  
  const [currentCaseDetails, setCurrentCaseDetails] = React.useState<CaseDetails>(initialCaseDetails);
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const [mlOutput, setMlOutput] = React.useState<MlOutputData | null>(null);
  const [isMlLoading, setIsMlLoading] = React.useState(false);
  
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = React.useState<ChatHistoryItem[]>([]);
  const [isBotReplying, setIsBotReplying] = React.useState(false);

  const [isChatSheetOpen, setIsChatSheetOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>('details');

  const currentSpace = React.useMemo(() => spaces.find(s => s.id === selectedSpaceId), [spaces, selectedSpaceId]);

  React.useEffect(() => {
    if (selectedSpaceId) {
      console.log(`Selected space: ${selectedSpaceId}`);
      // clearAllStates(false); // Optionally reset when space changes, ensure viewMode is reset too
    }
  }, [selectedSpaceId]);

  const handleAddSpace = (name: string) => {
    const newSpace: Space = { id: crypto.randomUUID(), name };
    setSpaces(prev => [...prev, newSpace]);
    setSelectedSpaceId(newSpace.id);
    toast({ title: "Space Created", description: `Space "${name}" has been added.`});
  };

  const handleSelectSpace = (id: string) => {
    setSelectedSpaceId(id);
  };

  const clearAllStates = (showToast = true) => {
    setCurrentCaseDetails(initialCaseDetails);
    setUploadedFiles([]);
    setMlOutput(null);
    setIsMlLoading(false);
    setChatMessages([]);
    setViewMode('details'); // Reset view mode
    // setChatHistory([]); // User might want to keep history across threads within a space
    if (showToast) {
      toast({ title: "New Thread Started", description: "All inputs and outputs have been cleared."});
    }
  };
  
  const handleFormSubmit = async (data: CaseDetails) => {
    setCurrentCaseDetails(data);
    if (!data.enableMlPrediction) {
      toast({ title: "Case Saved (No Prediction)", description: "Case details saved without ML prediction."});
      setMlOutput(null); // Clear any previous ML output
      return;
    }

    setIsMlLoading(true);
    setMlOutput(null);

    try {
      // Prepare AI inputs
      const weakPointsInput: GenerateWeakPointsSummaryInput = {
        caseDetails: JSON.stringify(data), // Pass full case details
        uploadedDocuments: uploadedFiles.map(f => f.name),
      };

      // AI call for weak points (which now includes strong points)
      const weakPointsResult = await generateWeakPointsSummary(weakPointsInput);
      
      const generatedMlOutput: MlOutputData = {
        estimatedCost: `$${(Math.random() * 100000 + 5000).toFixed(0)}`,
        expectedDuration: `${Math.floor(Math.random() * 12) + 1} months / ${Math.floor(Math.random() * 20) + 1} days`,
        strongPoints: weakPointsResult.strongPointsSummary,
        weakPoints: weakPointsResult.weakPointsSummary,
        winProbability: Math.floor(Math.random() * 50) + 45, 
        lossProbability: Math.floor(Math.random() * 50) + 5,
      };
      setMlOutput(generatedMlOutput);
      toast({ title: "Prediction Complete", description: "ML analysis results are now available."});
    } catch (error) {
      console.error("Error during ML prediction:", error);
      toast({ title: "Prediction Failed", description: "An error occurred while generating predictions.", variant: "destructive"});
      setMlOutput(null);
    } finally {
      setIsMlLoading(false);
    }
  };

  const handleSendMessage = (text: string) => {
    const userMessage: ChatMessage = { id: crypto.randomUUID(), text, sender: 'user', timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    setIsBotReplying(true);
    setViewMode('chatActive'); // Switch view when a message is sent

    // Simulate bot reply
    setTimeout(() => {
      const botReply: ChatMessage = {
        id: crypto.randomUUID(),
        text: `This is a simulated bot response to: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
        sender: 'bot',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, botReply]);
      setIsBotReplying(false);

      // Save to history
      const historyItem: ChatHistoryItem = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        preview: userMessage.text.substring(0, 30) + (userMessage.text.length > 30 ? '...' : ''),
        question: userMessage.text,
        answer: botReply.text,
      };
      setChatHistory(prev => [historyItem, ...prev]); 
    }, 1000);
  };

  const handleClearChatHistory = () => {
    setChatHistory([]);
    toast({ title: "Chat History Cleared" });
  };
  
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-background">
        <SpaceSidebar
          spaces={spaces}
          selectedSpaceId={selectedSpaceId}
          onAddSpace={handleAddSpace}
          onSelectSpace={handleSelectSpace}
          className="hidden md:block"
        />
        <div className="flex flex-1 flex-col"> 
            <SidebarInset className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
              <HeaderControls 
                onNewThread={clearAllStates} 
                spaceName={currentSpace?.name} 
                viewMode={viewMode}
                onViewDetails={() => setViewMode('details')}
              />
              <main className="flex-1 p-4 md:p-6 space-y-8">
                {viewMode === 'details' && (
                  <>
                    <CaseDetailsForm onSubmit={handleFormSubmit} initialData={currentCaseDetails} isSubmitting={isMlLoading} />
                    <DocumentUploadPanel files={uploadedFiles} onFilesChange={setUploadedFiles} />
                    {(currentCaseDetails.enableMlPrediction && (isMlLoading || mlOutput)) && (
                      <MlPredictionOutput isLoading={isMlLoading} data={mlOutput} />
                    )}
                  </>
                )}
                {viewMode === 'chatActive' && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <MessageSquareText size={56} className="text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Chat Active</h2>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      The case details and predictions are hidden to give you a focused chat experience. 
                      You can bring them back using the button in the header or below.
                    </p>
                    <Button onClick={() => setViewMode('details')} variant="outline" size="lg">
                      <FileText size={18} className="mr-2" /> View Case Details & Predictions
                    </Button>
                  </div>
                )}
              </main>
            </SidebarInset>
        </div>
        <aside className="hidden lg:flex flex-col w-[380px] xl:w-[420px] border-l bg-card h-screen sticky top-0">
          <div className="flex-1 min-h-0">
            <ChatbotWidget messages={chatMessages} onSendMessage={handleSendMessage} isSending={isBotReplying} />
          </div>
          <div className="h-[40%] border-t min-h-0">
            <ChatHistory history={chatHistory} onClearHistory={handleClearChatHistory} />
          </div>
        </aside>

        <div className="lg:hidden fixed bottom-6 right-6 z-50">
          <Sheet open={isChatSheetOpen} onOpenChange={setIsChatSheetOpen}>
            <SheetTrigger asChild>
              <Button size="icon" className="rounded-full w-14 h-14 shadow-xl bg-accent hover:bg-accent/90">
                <MessageSquareText className="h-6 w-6 text-accent-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-md p-0 flex flex-col">
                <SheetHeader className="p-4 border-b flex flex-row justify-between items-center space-y-0">
                    <SheetTitle className="font-headline text-lg font-semibold">Chat & History</SheetTitle>
                    <SheetClose asChild>
                        <Button variant="ghost" size="icon"><X className="h-5 w-5"/></Button>
                    </SheetClose>
                </SheetHeader>
              <div className="flex-1 min-h-0">
                <ChatbotWidget messages={chatMessages} onSendMessage={handleSendMessage} isSending={isBotReplying} />
              </div>
              <div className="h-[40%] border-t min-h-0">
                <ChatHistory history={chatHistory} onClearHistory={handleClearChatHistory} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </SidebarProvider>
  );
}
