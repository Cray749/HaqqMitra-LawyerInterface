
"use client";

import * as React from 'react';
import {
  SpaceSidebar,
  HeaderControls,
  CaseDetailsForm,
  DocumentUploadPanel,
  MlPredictionOutput,
} from '@/components/app';
import type { Space, CaseDetails, UploadedFile, MlOutputData, ChatMessage, ChatHistoryItem } from '@/types';
import { initialCaseDetails } from '@/types';
import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { MessageSquareText, X, FileText, SendHorizonal, User, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateWeakPointsSummary, GenerateWeakPointsSummaryInput } from '@/ai/flows/generate-weak-points-summary';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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
  const [chatHistory, setChatHistory] = React.useState<ChatHistoryItem[]>([]); // Kept for data, not displayed
  const [isBotReplying, setIsBotReplying] = React.useState(false);
  const [chatInputText, setChatInputText] = React.useState('');

  const [viewMode, setViewMode] = React.useState<ViewMode>('details');

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const currentSpace = React.useMemo(() => spaces.find(s => s.id === selectedSpaceId), [spaces, selectedSpaceId]);

  React.useEffect(() => {
    if (selectedSpaceId) {
      console.log(`Selected space: ${selectedSpaceId}`);
    }
  }, [selectedSpaceId]);

  React.useEffect(() => {
    if (viewMode === 'chatActive' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, viewMode]);

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
    setChatInputText('');
    setViewMode('details'); 
    if (showToast) {
      toast({ title: "New Thread Started", description: "All inputs and outputs have been cleared."});
    }
  };
  
  const handleFormSubmit = async (data: CaseDetails) => {
    setCurrentCaseDetails(data);
    if (!data.enableMlPrediction) {
      toast({ title: "Case Saved (No Prediction)", description: "Case details saved without ML prediction."});
      setMlOutput(null);
      return;
    }

    setIsMlLoading(true);
    setMlOutput(null);

    try {
      const weakPointsInput: GenerateWeakPointsSummaryInput = {
        caseDetails: JSON.stringify(data),
        uploadedDocuments: uploadedFiles.map(f => f.dataUrl || f.name), 
      };

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
    if (!text.trim()) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), text, sender: 'user', timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    setIsBotReplying(true);
    setViewMode('chatActive'); 
    setChatInputText('');

    setTimeout(() => {
      const botReply: ChatMessage = {
        id: crypto.randomUUID(),
        text: `This is a simulated bot response to: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
        sender: 'bot',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, botReply]);
      setIsBotReplying(false);

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
  
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-background">
        <SpaceSidebar
          spaces={spaces}
          selectedSpaceId={selectedSpaceId}
          onAddSpace={handleAddSpace}
          onSelectSpace={handleSelectSpace}
          // className="hidden md:block" // Removed to allow Sidebar component to control its visibility
        />
        <div className="flex flex-1 flex-col"> 
            <SidebarInset className="flex-1 flex flex-col">
              <HeaderControls 
                onNewThread={clearAllStates} 
                spaceName={currentSpace?.name} 
                viewMode={viewMode}
                onViewDetails={() => setViewMode('details')}
              />
              <main className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar">
                {viewMode === 'details' && (
                  <div className="space-y-8">
                    <CaseDetailsForm onSubmit={handleFormSubmit} initialData={currentCaseDetails} isSubmitting={isMlLoading} />
                    <DocumentUploadPanel files={uploadedFiles} onFilesChange={setUploadedFiles} />
                    {(currentCaseDetails.enableMlPrediction && (isMlLoading || mlOutput)) && (
                      <MlPredictionOutput isLoading={isMlLoading} data={mlOutput} />
                    )}
                  </div>
                )}
                {viewMode === 'chatActive' && (
                  <div className="space-y-4">
                    {chatMessages.map((msg) => (
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
                    {isBotReplying && chatMessages.length > 0 && chatMessages[chatMessages.length-1].sender === 'user' && (
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
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </main>
              <div className="p-4 border-t bg-background">
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Ask a question..."
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isBotReplying && handleSendMessage(chatInputText)}
                    disabled={isBotReplying}
                    className="flex-1"
                  />
                  <Button onClick={() => handleSendMessage(chatInputText)} disabled={!chatInputText.trim() || isBotReplying} className="bg-accent text-accent-foreground hover:bg-accent/90 px-3">
                    <SendHorizonal className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
