
"use client";

import * as React from 'react';
import {
  SpaceSidebar,
  HeaderControls,
  CaseDetailsForm,
  DocumentUploadPanel,
  MlPredictionOutput,
} from '@/components/app';
import type { Space, CaseDetails, UploadedFile, MlOutputData, ChatMessage as AppChatMessage, ChatHistoryItem } from '@/types';
import { initialCaseDetails } from '@/types';
import { SidebarProvider, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { MessageSquareText, X, FileText, SendHorizonal, User, Bot, Loader2, Trash2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  generateCaseAnalysis, // Changed from generateWeakPointsSummary
  GenerateCaseAnalysisInput, // Changed
  generateChatbotResponse,
  GenerateChatbotResponseInput,
} from '@/ai/flows';
import { saveChatMessage, getChatMessages, clearChatHistory as clearChatHistoryService } from '@/services/chatService';
import { getCases as fetchCases, createCase as createCaseService, updateCaseDetails as updateCaseDetailsService, deleteCase as deleteCaseService, uploadFileToCase as uploadFileToCaseService, removeFileFromCase as removeFileFromCaseService } from '@/services/caseService';
import { Input } from '@/components/ui/input'; // This is the chat Input
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';


type ViewMode = 'details' | 'chatActive';

// Main component definition
export default function AppPage() {
  const isMobile = useIsMobile();
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <AppLayoutContent />
    </SidebarProvider>
  );
}

// Extracted content component
function AppLayoutContent() {
  const { toast } = useToast();
  const { setOpen: setSidebarOpen } = useSidebar();
  const isMobile = useIsMobile();

  const [activeCaseId, setActiveCaseId] = React.useState<string | null>(null);
  const [cases, setCases] = React.useState<Space[]>([]);
  
  const [currentCaseDetails, setCurrentCaseDetails] = React.useState<CaseDetails>(initialCaseDetails);
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const [mlOutput, setMlOutput] = React.useState<MlOutputData | null>(null);
  const [isMlLoading, setIsMlLoading] = React.useState(false);
  
  const [chatMessages, setChatMessages] = React.useState<AppChatMessage[]>([]);
  const [isBotReplying, setIsBotReplying] = React.useState(false);
  const [chatInputText, setChatInputText] = React.useState('');

  const [viewMode, setViewMode] = React.useState<ViewMode>('details');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const [isAddCaseModalOpen, setIsAddCaseModalOpen] = React.useState(false);
  const [newCaseNameInput, setNewCaseNameInput] = React.useState('');

  const currentCase = React.useMemo(() => cases.find(s => s.id === activeCaseId), [cases, activeCaseId]);

  // Fetch initial cases
  React.useEffect(() => {
    const loadCases = async () => {
      try {
        const fetchedCases = await fetchCases();
        setCases(fetchedCases);
        if (fetchedCases.length > 0 && !activeCaseId) {
          setActiveCaseId(fetchedCases[0].id);
        } else if (fetchedCases.length === 0) {
          setIsAddCaseModalOpen(true);
        }
      } catch (error) {
        console.error("Failed to fetch cases:", error);
        toast({ title: "Error", description: "Could not load cases.", variant: "destructive" });
      }
    };
    loadCases();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); 

  // Load case details, files, and chat when activeCaseId changes
  React.useEffect(() => {
    if (activeCaseId) {
      const loadCaseData = async () => {
        try {
          const caseData = cases.find(c => c.id === activeCaseId);
          if (caseData) {
            const detailedCase = await createCaseService(caseData.name, caseData.id); 
            
            setCurrentCaseDetails(detailedCase.details || initialCaseDetails);
            setUploadedFiles(detailedCase.files || []);
            setMlOutput(null); 
            
            const messages = await getChatMessages(activeCaseId);
            setChatMessages(messages.map(m => ({...m, timestamp: m.timestamp instanceof Date ? m.timestamp : m.timestamp.toDate()})));
            setViewMode('details'); 
          }
        } catch (error) {
          console.error(`Failed to load data for case ${activeCaseId}:`, error);
          toast({ title: "Error", description: `Could not load data for case.`, variant: "destructive" });
        }
      };
      loadCaseData();
    } else {
      clearAllStates(false); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCaseId, toast]); 

  React.useEffect(() => {
    if (viewMode === 'chatActive' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, viewMode]);

  const handleAddCase = async () => {
    if (!newCaseNameInput.trim()) {
      toast({ title: "Error", description: "Case name cannot be empty.", variant: "destructive" });
      return;
    }
    try {
      const newCase = await createCaseService(newCaseNameInput.trim());
      setCases(prev => [...prev, {id: newCase.id, name: newCase.name, details: newCase.details, files: newCase.files}]);
      setActiveCaseId(newCase.id);
      setNewCaseNameInput('');
      setIsAddCaseModalOpen(false);
      toast({ title: "Case Created", description: `Case "${newCase.name}" has been added.`});
    } catch (error: any) {
      console.error("Failed to create case:", error);
      toast({ title: "Error Creating Case", description: error.message || "Could not create case.", variant: "destructive" });
    }
  };

  const handleSelectCase = (id: string) => {
    if (id !== activeCaseId) {
       setActiveCaseId(id);
    }
    if (isMobile) {
      setSidebarOpen(false);
    }
  };
  
  const handleCaseDetailsChange = (newDetails: CaseDetails) => {
    setCurrentCaseDetails(newDetails);
  };

  const clearAllStates = (showToast = true) => {
    setCurrentCaseDetails(initialCaseDetails);
    setUploadedFiles([]);
    setMlOutput(null);
    setIsMlLoading(false);
    setChatMessages([]);
    setChatInputText('');
    setViewMode('details'); 
    if (showToast && activeCaseId) { 
      toast({ title: "Inputs Cleared", description: "Form inputs and ML outputs for the current case have been reset."});
    }
  };
  
  const handleFormSubmit = async (data: CaseDetails) => {
    if (!activeCaseId) {
      toast({ title: "No Active Case", description: "Please select or create a case first.", variant: "destructive" });
      return;
    }
    setCurrentCaseDetails(data); 
    try {
      await updateCaseDetailsService(activeCaseId, data);
      toast({ title: "Case Updated", description: "Case details have been saved." });

      if (!data.enableMlPrediction) {
        setMlOutput(null); 
        return;
      }

      setIsMlLoading(true);
      setMlOutput(null); 

      const caseAnalysisInput: GenerateCaseAnalysisInput = {
        caseDetails: JSON.stringify(data),
        uploadedDocuments: uploadedFiles.map(f => f.dataUrl || f.name),
      };
      const analysisResult = await generateCaseAnalysis(caseAnalysisInput);
      
      const generatedMlOutput: MlOutputData = {
        estimatedCost: analysisResult.estimatedCost,
        expectedDuration: analysisResult.expectedDuration,
        strongPoints: analysisResult.strongPointsSummary,
        weakPoints: analysisResult.weakPointsSummary,
        winProbability: analysisResult.winProbability,
        lossProbability: analysisResult.lossProbability,
      };
      setMlOutput(generatedMlOutput);
      toast({ title: "Prediction Complete", description: "AI analysis results are now available."});

    } catch (error) {
      console.error("Error during case update or AI analysis:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred during AI analysis.";
      toast({ title: "Operation Failed", description: errorMessage, variant: "destructive"});
      setMlOutput(null); 
    } finally {
      setIsMlLoading(false);
    }
  };

  const handleOpenAddCaseModal = () => {
    setIsAddCaseModalOpen(true);
  };

  const handleFilesChange = async (newFiles: UploadedFile[]) => {
    if (!activeCaseId) {
      toast({ title: "No Active Case", description: "Please select a case before uploading files.", variant: "destructive"});
      return;
    }
    const oldFileIds = new Set(uploadedFiles.map(f => f.id));
    const newFileIds = new Set(newFiles.map(f => f.id));

    const filesToAdd = newFiles.filter(f => !oldFileIds.has(f.id));
    const filesToRemoveIds = uploadedFiles.filter(f => !newFileIds.has(f.id)).map(f => f.id);

    try {
      for (const file of filesToAdd) {
        if (file.dataUrl) { 
          await uploadFileToCaseService(activeCaseId, file.id, file.name, file.type, file.size, file.dataUrl);
        }
      }
      for (const fileId of filesToRemoveIds) {
        await removeFileFromCaseService(activeCaseId, fileId);
      }
      setUploadedFiles(newFiles); 
      toast({ title: "Files Updated", description: "Document list has been synchronized."});
    } catch (error) {
      console.error("Error updating files:", error);
      toast({ title: "File Update Failed", description: "Could not sync all file changes.", variant: "destructive"});
    }
  };
  
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    if (!activeCaseId) {
      toast({ title: "No Active Case", description: "Please select or create a case to chat.", variant: "destructive" });
      return;
    }

    const userMessage: AppChatMessage = { 
      id: crypto.randomUUID(), 
      text, 
      sender: 'user', 
      timestamp: new Date(),
      caseId: activeCaseId,
    };
    
    const historyForApi = chatMessages.map(msg => ({ // Use chatMessages *before* adding current userMessage
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      } as {role: 'user' | 'assistant'; content: string}));
        
    setChatMessages(prev => [...prev, userMessage]);
    setIsBotReplying(true);
    setViewMode('chatActive'); 
    setChatInputText('');

    try {
      await saveChatMessage(activeCaseId, userMessage);

      const chatbotInput: GenerateChatbotResponseInput = {
        userMessage: text, 
        chatHistory: historyForApi,
        caseDetails: JSON.stringify(currentCaseDetails), 
        uploadedDocuments: uploadedFiles.map(f => f.dataUrl).filter(Boolean) as string[], 
      };

      const result = await generateChatbotResponse(chatbotInput);

      const botReplyMessage: AppChatMessage = {
        id: crypto.randomUUID(),
        text: result.botReply,
        sender: 'bot',
        timestamp: new Date(),
        caseId: activeCaseId,
        citations: result.citations, 
        searchResults: result.searchResults, 
      };
      setChatMessages(prev => [...prev, botReplyMessage]);
      await saveChatMessage(activeCaseId, botReplyMessage);

    } catch (error) {
      console.error("Error sending message or getting bot reply:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to get a response.";
      toast({ title: "Chat Error", description: errorMessage, variant: "destructive"});
      
      const errorBotReply: AppChatMessage = {
        id: crypto.randomUUID(),
        text: "Sorry, I encountered an error. Please try again.",
        sender: 'bot',
        timestamp: new Date(),
        caseId: activeCaseId,
      };
      setChatMessages(prev => [...prev, errorBotReply]);
    } finally {
      setIsBotReplying(false);
    }
  };
  
  return (
    <>
    <div className="flex min-h-screen bg-background">
      <SpaceSidebar
        caseItems={cases.map(c => ({id: c.id, name: c.name}))} 
        selectedCaseId={activeCaseId}
        onTriggerAddCase={() => setIsAddCaseModalOpen(true)}
        onSelectCase={handleSelectCase}
      />
      <div className="flex flex-1 flex-col"> 
          <SidebarInset className="flex-1 flex flex-col">
            <HeaderControls 
              onAddNewCase={handleOpenAddCaseModal} 
              spaceName={currentCase?.name} 
              viewMode={viewMode}
              onViewDetails={() => setViewMode('details')}
            />
            <ScrollArea className="flex-1 custom-scrollbar" type="auto">
              <main className="p-4 md:p-6">
              {viewMode === 'details' && (
                <div className="space-y-8">
                  <CaseDetailsForm 
                    key={activeCaseId} 
                    onSubmit={handleFormSubmit} 
                    initialData={currentCaseDetails} 
                    isSubmitting={isMlLoading}
                  />
                  <DocumentUploadPanel 
                    key={`docs-${activeCaseId}`} 
                    files={uploadedFiles} 
                    onFilesChange={handleFilesChange} 
                  />
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
            </ScrollArea>
            <div className="p-4 border-t bg-background">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder={activeCaseId ? "Ask a question about this case..." : "Please select or create a case first"}
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isBotReplying && activeCaseId && handleSendMessage(chatInputText)}
                  disabled={isBotReplying || !activeCaseId}
                  className="flex-1"
                />
                <Button 
                  onClick={() => handleSendMessage(chatInputText)} 
                  disabled={!chatInputText.trim() || isBotReplying || !activeCaseId} 
                  className="bg-accent text-accent-foreground hover:bg-accent/90 px-3"
                >
                  <SendHorizonal className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </SidebarInset>
      </div>
    </div>

    <Dialog open={isAddCaseModalOpen} onOpenChange={(isOpen) => {
        setIsAddCaseModalOpen(isOpen);
        if (!isOpen) setNewCaseNameInput(''); 
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Add New Case</DialogTitle>
          <DialogDescription>
            Enter a name for your new case to get started.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-case-name-modal" className="text-right">
              Name
            </Label>
            <Input
              id="new-case-name-modal"
              value={newCaseNameInput}
              onChange={(e) => setNewCaseNameInput(e.target.value)}
              className="col-span-3"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleAddCase()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {setIsAddCaseModalOpen(false); setNewCaseNameInput('');}}>Cancel</Button>
          <Button onClick={handleAddCase} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
