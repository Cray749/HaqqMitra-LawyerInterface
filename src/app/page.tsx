
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
  generateWeakPointsSummary,
  GenerateWeakPointsSummaryInput,
  generatePowerpointOutline,
  // GeneratePowerpointOutlineInput, // Not used directly in page.tsx
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
          // If no cases, open modal to add one
          setIsAddCaseModalOpen(true);
        }
      } catch (error) {
        console.error("Failed to fetch cases:", error);
        toast({ title: "Error", description: "Could not load cases.", variant: "destructive" });
      }
    };
    loadCases();
  }, [toast]); // Removed activeCaseId to prevent re-triggering on case selection if cases list changes

  // Load case details, files, and chat when activeCaseId changes
  React.useEffect(() => {
    if (activeCaseId) {
      const loadCaseData = async () => {
        try {
          const caseData = cases.find(c => c.id === activeCaseId);
          if (caseData) {
            // Simulate fetching detailed case data if it's not fully loaded
            // For now, we assume 'caseData.details' might be populated or needs fetching
            // This part would involve calling `getCase(activeCaseId)` if details aren't in the list summary
            const detailedCase = await createCaseService(caseData.name, caseData.id); // This also fetches if exists
            
            setCurrentCaseDetails(detailedCase.details || initialCaseDetails);
            setUploadedFiles(detailedCase.files || []);
            setMlOutput(null); // Clear previous ML output
            
            const messages = await getChatMessages(activeCaseId);
            setChatMessages(messages.map(m => ({...m, timestamp: m.timestamp.toDate()})));
            setViewMode('details'); // Reset to details view
          }
        } catch (error) {
          console.error(`Failed to load data for case ${activeCaseId}:`, error);
          toast({ title: "Error", description: `Could not load data for case.`, variant: "destructive" });
        }
      };
      loadCaseData();
    } else {
      // No active case, reset relevant states
      clearAllStates(false); // Don't show toast if it's initial load without cases
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCaseId, toast]); // cases removed to prevent loop if getCases returns new objects

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
    } catch (error) {
      console.error("Failed to create case:", error);
      toast({ title: "Error", description: "Could not create case.", variant: "destructive" });
    }
  };

  const handleSelectCase = (id: string) => {
    if (id !== activeCaseId) {
       setActiveCaseId(id);
       // Data loading for the selected case is handled by the useEffect hook watching activeCaseId
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
    if (showToast && activeCaseId) { // Only toast if there's an active case context being cleared
      toast({ title: "Inputs Cleared", description: "Form inputs and ML outputs for the current case have been reset."});
    }
  };
  
  const handleFormSubmit = async (data: CaseDetails) => {
    if (!activeCaseId) {
      toast({ title: "No Active Case", description: "Please select or create a case first.", variant: "destructive" });
      return;
    }
    setCurrentCaseDetails(data); // ensure UI reflects submitted data immediately
    try {
      await updateCaseDetailsService(activeCaseId, data);
      toast({ title: "Case Updated", description: "Case details have been saved." });

      if (!data.enableMlPrediction) {
        setMlOutput(null); // Clear ML output if disabled
        return;
      }

      setIsMlLoading(true);
      setMlOutput(null);

      // Generate Weak Points Summary
      const weakPointsInput: GenerateWeakPointsSummaryInput = {
        caseDetails: JSON.stringify(data),
        uploadedDocuments: uploadedFiles.map(f => f.dataUrl || f.name),
      };
      const weakPointsResult = await generateWeakPointsSummary(weakPointsInput);

      // TODO: Integrate PowerPoint Outline Generation if desired upon form submit
      // const pptInput: GeneratePowerpointOutlineInput = {...};
      // const pptResult = await generatePowerpointOutline(pptInput);
      
      const generatedMlOutput: MlOutputData = {
        estimatedCost: `$${(Math.random() * 100000 + 5000).toFixed(0)}`, // Keep dummy for now
        expectedDuration: `${Math.floor(Math.random() * 12) + 1} months / ${Math.floor(Math.random() * 20) + 1} days`, // Keep dummy
        strongPoints: weakPointsResult.strongPointsSummary,
        weakPoints: weakPointsResult.weakPointsSummary,
        // powerpointOutline: pptResult.powerpointOutline, // If integrating PPT
        winProbability: Math.floor(Math.random() * 50) + 45, // Keep dummy
        lossProbability: Math.floor(Math.random() * 50) + 5, // Keep dummy
      };
      setMlOutput(generatedMlOutput);
      toast({ title: "Prediction Complete", description: "ML analysis results are now available."});

    } catch (error) {
      console.error("Error during case update or ML prediction:", error);
      toast({ title: "Operation Failed", description: "An error occurred.", variant: "destructive"});
      setMlOutput(null);
    } finally {
      setIsMlLoading(false);
    }
  };

  const handleNewThread = () => {
    if (!activeCaseId) {
       toast({ title: "No Active Case", description: "Please select or create a case to start a new thread.", variant: "destructive" });
       return;
    }
    // Clear local state for the current view
    clearAllStates(true);
    // Optionally clear server-side chat history for this case ID
    // clearChatHistoryService(activeCaseId).then(() => {
    //   toast({ title: "Chat History Cleared", description: "Server chat history for this case is cleared." });
    // }).catch(err => {
    //   toast({ title: "History Clear Failed", description: "Could not clear server chat history.", variant: "destructive"});
    // });
  };

  const handleFilesChange = async (newFiles: UploadedFile[]) => {
    if (!activeCaseId) {
      toast({ title: "No Active Case", description: "Please select a case before uploading files.", variant: "destructive"});
      return;
    }
    // Determine added and removed files for server-side sync
    const oldFileIds = new Set(uploadedFiles.map(f => f.id));
    const newFileIds = new Set(newFiles.map(f => f.id));

    const filesToAdd = newFiles.filter(f => !oldFileIds.has(f.id));
    const filesToRemoveIds = uploadedFiles.filter(f => !newFileIds.has(f.id)).map(f => f.id);

    try {
      for (const file of filesToAdd) {
        if (file.dataUrl) { // Ensure dataUrl is present
          await uploadFileToCaseService(activeCaseId, file.id, file.name, file.type, file.size, file.dataUrl);
        }
      }
      for (const fileId of filesToRemoveIds) {
        await removeFileFromCaseService(activeCaseId, fileId);
      }
      setUploadedFiles(newFiles); // Update local state after successful server operations
      toast({ title: "Files Updated", description: "Document list has been synchronized."});
    } catch (error) {
      console.error("Error updating files:", error);
      toast({ title: "File Update Failed", description: "Could not sync all file changes.", variant: "destructive"});
      // Potentially revert local state or re-fetch from server if sync fails critically
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
    setChatMessages(prev => [...prev, userMessage]);
    setIsBotReplying(true);
    setViewMode('chatActive'); 
    setChatInputText('');

    try {
      await saveChatMessage(activeCaseId, userMessage);

      // Prepare context for the AI
      const formattedChatHistory = chatMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));
      // Add the latest user message to history for the API call
      formattedChatHistory.push({role: 'user', content: userMessage.text});


      const chatbotInput: GenerateChatbotResponseInput = {
        userMessage: text,
        chatHistory: formattedChatHistory,
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
        citations: result.citations, // Store if needed
        searchResults: result.searchResults, // Store if needed
      };
      setChatMessages(prev => [...prev, botReplyMessage]);
      await saveChatMessage(activeCaseId, botReplyMessage);

    } catch (error) {
      console.error("Error sending message or getting bot reply:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to get a response.";
      toast({ title: "Chat Error", description: errorMessage, variant: "destructive"});
      // Optionally, add a system error message to chat
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
        spaces={cases.map(c => ({id: c.id, name: c.name}))} // Pass simplified spaces
        selectedSpaceId={activeCaseId}
        onAddSpace={() => setIsAddCaseModalOpen(true)}
        onSelectSpace={handleSelectCase}
      />
      <div className="flex flex-1 flex-col"> 
          <SidebarInset className="flex-1 flex flex-col">
            <HeaderControls 
              onNewThread={handleNewThread} 
              spaceName={currentCase?.name} 
              viewMode={viewMode}
              onViewDetails={() => setViewMode('details')}
            />
            <ScrollArea className="flex-1 custom-scrollbar" type="auto">
              <main className="p-4 md:p-6">
              {viewMode === 'details' && (
                <div className="space-y-8">
                  <CaseDetailsForm 
                    key={activeCaseId} // Ensure form re-initializes when case changes
                    onSubmit={handleFormSubmit} 
                    initialData={currentCaseDetails} 
                    isSubmitting={isMlLoading}
                    onValuesChange={handleCaseDetailsChange}
                  />
                  <DocumentUploadPanel 
                    key={`docs-${activeCaseId}`} // Ensure panel re-initializes for new case
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

    <Dialog open={isAddCaseModalOpen} onOpenChange={setIsAddCaseModalOpen}>
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
