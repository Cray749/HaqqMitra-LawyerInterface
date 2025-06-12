
"use client";

import * as React from 'react';
import {
  SpaceSidebar,
  HeaderControls,
  CaseDetailsForm,
  DocumentUploadPanel,
  MlPredictionOutput,
  DetailedCostRoadmap
} from '@/components/app';
import type { Space, CaseDetails, UploadedFile, MlOutputData, ChatMessage as AppChatMessage, StrategySnapshotData, DetailedCostRoadmapOutput, CaseStageCost, GenerateChatbotResponseOutput, GenerateDevilsAdvocateResponseOutput } from '@/types';
import { initialCaseDetails } from '@/types';
import { SidebarProvider, SidebarInset, useSidebar, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { MessageSquareText, X, FileText, SendHorizonal, User, Bot, Loader2, Trash2, PlusCircle, PanelLeft, Wand2, Swords, Scale, LogOut, Briefcase, IndianRupee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  generateCaseAnalysis,
  GenerateCaseAnalysisInput,
  generateChatbotResponse,
  GenerateChatbotResponseInput,
  generateStrategySnapshot,
  GenerateStrategySnapshotInput,
  generateDevilsAdvocateResponse,
  GenerateDevilsAdvocateResponseInput,
  generateDetailedCostRoadmap,
  GenerateDetailedCostRoadmapInput,
} from '@/ai/flows';
import { saveChatMessage, getChatMessages, clearChatHistory as clearChatHistoryService } from '@/services/chatService';
import { getCases as fetchCases, createCase as createCaseService, updateCaseDetails as updateCaseDetailsService, deleteCase as deleteCaseService, uploadFileToCase as uploadFileToCaseService, removeFileFromCase as removeFileFromCaseService } from '@/services/caseService';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';


type ViewMode = 'details' | 'chatActive' | 'devilsAdvocateActive';

// Helper function to parse and sum INR cost strings
const sumInrCosts = (stages: CaseStageCost[]): string => {
  let minTotal = 0;
  let maxTotal = 0;
  let isRange = false;

  stages.forEach(stage => {
    const costStr = stage.estimatedCostINR.replace(/₹|,|Approx\.\s*/gi, '').trim();
    const parts = costStr.split('-').map(p => p.trim());

    if (parts.length === 2) {
      minTotal += parseFloat(parts[0]) || 0;
      maxTotal += parseFloat(parts[1]) || 0;
      isRange = true;
    } else if (parts.length === 1) {
      const val = parseFloat(parts[0]) || 0;
      minTotal += val;
      maxTotal += val;
    }
  });

  const formatInr = (num: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);

  if (isRange && minTotal !== maxTotal) {
    return `${formatInr(minTotal)} - ${formatInr(maxTotal)}`;
  }
  return formatInr(minTotal); // Handles single values or ranges where min=max
};


export default function AppPage() {
  const isMobile = useIsMobile();
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <AppLayoutContent />
    </SidebarProvider>
  );
}

function AppLayoutContent() {
  const { toast } = useToast();
  const { open: isSidebarOpenOnDesktop, isMobile } = useSidebar();

  const [activeCaseId, setActiveCaseId] = React.useState<string | null>(null);
  const [cases, setCases] = React.useState<Space[]>([]);

  const [currentCaseDetails, setCurrentCaseDetails] = React.useState<CaseDetails>(initialCaseDetails);
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const [mlOutput, setMlOutput] = React.useState<MlOutputData | null>(null);
  const [isMlLoading, setIsMlLoading] = React.useState(false);

  const [strategySnapshot, setStrategySnapshot] = React.useState<StrategySnapshotData | null>(null);
  const [isStrategyLoading, setIsStrategyLoading] = React.useState(false);

  const [detailedCostRoadmap, setDetailedCostRoadmap] = React.useState<DetailedCostRoadmapOutput | null>(null);
  const [isDetailedCostRoadmapLoading, setIsDetailedCostRoadmapLoading] = React.useState(false);


  const [chatMessages, setChatMessages] = React.useState<AppChatMessage[]>([]);
  const [isBotReplying, setIsBotReplying] = React.useState(false);
  const [chatInputText, setChatInputText] = React.useState('');

  const [devilsAdvocateMessages, setDevilsAdvocateMessages] = React.useState<AppChatMessage[]>([]);
  const [isDevilsAdvocateReplying, setIsDevilsAdvocateReplying] = React.useState(false);
  const [devilsAdvocateChatInputText, setDevilsAdvocateChatInputText] = React.useState('');
  const [isDevilsAdvocateModeActive, setIsDevilsAdvocateModeActive] = React.useState(false);

  const [viewMode, setViewMode] = React.useState<ViewMode>('details');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const [isAddCaseModalOpen, setIsAddCaseModalOpen] = React.useState(false);
  const [newCaseNameInput, setNewCaseNameInput] = React.useState('');

  const currentCase = React.useMemo(() => cases.find(s => s.id === activeCaseId), [cases, activeCaseId]);

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
            setStrategySnapshot(null);
            setDetailedCostRoadmap(null);

            const messages = await getChatMessages(activeCaseId);
            setChatMessages(messages.map(m => ({...m, timestamp: m.timestamp instanceof Date ? m.timestamp : m.timestamp.toDate()})));
            setDevilsAdvocateMessages([]); 

            setViewMode('details');
            setIsDevilsAdvocateModeActive(false);
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
    if ((viewMode === 'chatActive' || viewMode === 'devilsAdvocateActive') && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, devilsAdvocateMessages, viewMode]);

  React.useEffect(() => {
    if (isDevilsAdvocateModeActive) {
      document.documentElement.classList.add('devil-mode');
      document.documentElement.style.setProperty('--background', '240 10% 3.9%'); // Dark blue-gray
      document.documentElement.style.setProperty('--foreground', '0 0% 98%'); // Almost white
      document.documentElement.style.setProperty('--card', '240 10% 8%');
      document.documentElement.style.setProperty('--card-foreground', '0 0% 98%');
      document.documentElement.style.setProperty('--popover', '240 10% 8%');
      document.documentElement.style.setProperty('--popover-foreground', '0 0% 98%');
      document.documentElement.style.setProperty('--primary', '0 72% 51%'); // Brighter Red
      document.documentElement.style.setProperty('--primary-foreground', '0 0% 98%');
      document.documentElement.style.setProperty('--secondary', '240 5% 15%');
      document.documentElement.style.setProperty('--secondary-foreground', '0 0% 98%');
      document.documentElement.style.setProperty('--muted', '240 5% 20%');
      document.documentElement.style.setProperty('--muted-foreground', '0 0% 60%');
      document.documentElement.style.setProperty('--accent', '0 60% 50%'); // Red accent
      document.documentElement.style.setProperty('--accent-foreground', '0 0% 98%');
      document.documentElement.style.setProperty('--destructive', '0 84.2% 60.2%');
      document.documentElement.style.setProperty('--border', '240 5% 25%');
      document.documentElement.style.setProperty('--input', '240 5% 25%');
      document.documentElement.style.setProperty('--ring', '0 72% 51%');
    } else {
      document.documentElement.classList.remove('devil-mode');
      // Revert to original theme variables from globals.css (or a default light mode)
      // This assumes your globals.css defines the default light theme without .dark selector
      document.documentElement.style.removeProperty('--background');
      document.documentElement.style.removeProperty('--foreground');
      document.documentElement.style.removeProperty('--card');
      document.documentElement.style.removeProperty('--card-foreground');
      document.documentElement.style.removeProperty('--popover');
      document.documentElement.style.removeProperty('--popover-foreground');
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--primary-foreground');
      document.documentElement.style.removeProperty('--secondary');
      document.documentElement.style.removeProperty('--secondary-foreground');
      document.documentElement.style.removeProperty('--muted');
      document.documentElement.style.removeProperty('--muted-foreground');
      document.documentElement.style.removeProperty('--accent');
      document.documentElement.style.removeProperty('--accent-foreground');
      document.documentElement.style.removeProperty('--destructive');
      document.documentElement.style.removeProperty('--border');
      document.documentElement.style.removeProperty('--input');
      document.documentElement.style.removeProperty('--ring');
    }
    return () => {
      document.documentElement.classList.remove('devil-mode');
      // Ensure styles are fully reverted on component unmount
      document.documentElement.style.removeProperty('--background');
      document.documentElement.style.removeProperty('--foreground');
      document.documentElement.style.removeProperty('--card');
      // ... remove other properties as above
    };
  }, [isDevilsAdvocateModeActive]);


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
      const detailedErrorMessage = error.message || "Could not create case.";
      toast({ title: "Error Creating Case", description: detailedErrorMessage, variant: "destructive" });
    }
  };

  const handleSelectCase = (id: string) => {
    if (id !== activeCaseId) {
       setActiveCaseId(id);
       setDetailedCostRoadmap(null);
    }
  };

  const handleCaseDetailsChange = (newDetails: CaseDetails) => {
    setCurrentCaseDetails(newDetails);
  };

  const clearAllStates = (showToast = true) => {
    setCurrentCaseDetails(initialCaseDetails);
    setUploadedFiles([]);
    setMlOutput(null);
    setStrategySnapshot(null);
    setDetailedCostRoadmap(null);
    setIsMlLoading(false);
    setIsStrategyLoading(false);
    setIsDetailedCostRoadmapLoading(false);
    setChatMessages([]);
    setChatInputText('');
    setDevilsAdvocateMessages([]);
    setDevilsAdvocateChatInputText('');
    setIsDevilsAdvocateModeActive(false);
    setViewMode('details');
    if (showToast && activeCaseId) {
      toast({ title: "Inputs Cleared", description: "Form inputs and AI outputs for the current case have been reset."});
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
        setStrategySnapshot(null);
        setDetailedCostRoadmap(null);
        return;
      }

      setIsMlLoading(true);
      setMlOutput(null);
      setStrategySnapshot(null); 
      setDetailedCostRoadmap(null);

      const caseAnalysisInput: GenerateCaseAnalysisInput = {
        caseDetails: JSON.stringify(data),
        uploadedDocuments: uploadedFiles.map(f => f.dataUrl || f.name),
      };
      const analysisResult = await generateCaseAnalysis(caseAnalysisInput);

      const generatedMlOutput: MlOutputData = {
        estimatedCost: analysisResult.estimatedCost, 
        expectedDuration: analysisResult.expectedDuration,
        winProbability: analysisResult.winProbability,
        lossProbability: analysisResult.lossProbability,
      };
      setMlOutput(generatedMlOutput);
      toast({ title: "Base Analysis Complete", description: "AI analysis for cost, duration, and probabilities is available."});

    } catch (error) {
      console.error("Error during case update or base AI analysis:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred during AI analysis.";
      toast({ title: "Operation Failed", description: errorMessage, variant: "destructive"});
      setMlOutput(null);
    } finally {
      setIsMlLoading(false);
    }
  };

  const handleGenerateStrategySnapshot = async () => {
    if (!activeCaseId || !currentCaseDetails) {
      toast({ title: "Missing Data", description: "Please ensure a case is active and details are filled.", variant: "destructive"});
      return;
    }
    if (!currentCaseDetails.enableMlPrediction) {
      toast({ title: "ML Disabled", description: "Please enable ML Prediction in Case Details to generate a strategy.", variant: "default"});
      return;
    }

    setIsStrategyLoading(true);
    setStrategySnapshot(null);
    try {
      const strategyInput: GenerateStrategySnapshotInput = {
        caseDetails: JSON.stringify(currentCaseDetails),
        uploadedDocuments: uploadedFiles.map(f => f.dataUrl || f.name),
      };
      const result = await generateStrategySnapshot(strategyInput);
      setStrategySnapshot(result);
      toast({ title: "Strategy Snapshot Generated", description: "AI-powered strategy insights are now available." });
    } catch (error) {
      console.error("Error generating strategy snapshot:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate strategy snapshot.";
      toast({ title: "Strategy Generation Failed", description: errorMessage, variant: "destructive"});
      setStrategySnapshot(null);
    } finally {
      setIsStrategyLoading(false);
    }
  };

  const handleGenerateDetailedCostRoadmap = async () => {
    if (!activeCaseId || !currentCaseDetails) {
      toast({ title: "Missing Data", description: "Please ensure a case is active and details are filled.", variant: "destructive"});
      return;
    }
     if (!currentCaseDetails.enableMlPrediction) {
      toast({ title: "ML Disabled", description: "Please enable ML Prediction in Case Details to generate cost roadmap.", variant: "default"});
      return;
    }

    setIsDetailedCostRoadmapLoading(true);
    setDetailedCostRoadmap(null);
    try {
      const roadmapInput: GenerateDetailedCostRoadmapInput = {
        caseDetails: JSON.stringify(currentCaseDetails),
        uploadedDocuments: uploadedFiles.map(f => f.dataUrl || f.name),
      };
      const result = await generateDetailedCostRoadmap(roadmapInput);
      setDetailedCostRoadmap(result);

      if (result.error) {
        toast({ title: "Cost Roadmap Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Detailed Cost Roadmap Generated", description: "AI-powered cost breakdown by stage is now available." });
        if (result.stages && result.stages.length > 0) {
          const totalInrCost = sumInrCosts(result.stages);
          setMlOutput(prevMlOutput => {
            if (!prevMlOutput) { 
                return {
                    estimatedCost: totalInrCost,
                    expectedDuration: "N/A", 
                    winProbability: 0, 
                    lossProbability: 0, 
                };
            }
            return {
              ...prevMlOutput,
              estimatedCost: totalInrCost,
            };
          });
        }
      }
    } catch (error) {
      console.error("Error generating detailed cost roadmap:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate detailed cost roadmap.";
      toast({ title: "Roadmap Generation Failed", description: errorMessage, variant: "destructive"});
      setDetailedCostRoadmap({ stages: [], error: errorMessage });
    } finally {
      setIsDetailedCostRoadmapLoading(false);
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

    const historyForApi = chatMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      } as {role: 'user' | 'assistant' | 'system'; content: string}));

    setChatMessages(prev => [...prev, userMessage]);
    setIsBotReplying(true);
    setChatInputText('');

    try {
      await saveChatMessage(activeCaseId, userMessage);

      const chatbotInput: GenerateChatbotResponseInput = {
        userMessage: text,
        chatHistory: historyForApi,
        caseDetails: JSON.stringify(currentCaseDetails),
        uploadedDocuments: uploadedFiles.map(f => f.dataUrl).filter(Boolean) as string[],
      };

      const result: GenerateChatbotResponseOutput = await generateChatbotResponse(chatbotInput);
      let botReplyText = "<p>Sorry, I encountered an error. Please try again.</p>";
      let citations = undefined;
      let searchResults = undefined;

      if (result.error) {
        console.error("Chatbot AI Error:", result.error);
        toast({ title: "Chatbot Error", description: result.error, variant: "destructive"});
        botReplyText = result.botReply || botReplyText; // Use AI's error reply if available
      } else if (result.botReply) {
        botReplyText = result.botReply;
        citations = result.citations;
        searchResults = result.searchResults;
      } else {
        console.error("Chatbot returned an unexpected value:", result);
        toast({ title: "Chatbot Error", description: "Received an invalid response from the AI.", variant: "destructive"});
      }


      const botReplyMessage: AppChatMessage = {
        id: crypto.randomUUID(),
        text: botReplyText,
        sender: 'bot',
        timestamp: new Date(),
        caseId: activeCaseId,
        citations: citations,
        searchResults: searchResults,
      };
      setChatMessages(prev => [...prev, botReplyMessage]);
      await saveChatMessage(activeCaseId, botReplyMessage);

    } catch (error) {
      console.error("Error sending message or getting bot reply:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to get a response.";
      toast({ title: "Chat Error", description: errorMessage, variant: "destructive"});

      const errorBotReply: AppChatMessage = {
        id: crypto.randomUUID(),
        text: "<p>Sorry, I encountered an unexpected error. Please try again.</p>",
        sender: 'bot',
        timestamp: new Date(),
        caseId: activeCaseId,
      };
      setChatMessages(prev => [...prev, errorBotReply]);
    } finally {
      setIsBotReplying(false);
    }
  };

  const handleStartDevilsAdvocateMode = () => {
    if (!activeCaseId) {
      toast({ title: "No Active Case", description: "Please select or create a case first.", variant: "destructive" });
      return;
    }
    setIsDevilsAdvocateModeActive(true);
    setViewMode('devilsAdvocateActive');
    setDevilsAdvocateMessages([]); 
    setDevilsAdvocateChatInputText('');
    toast({ title: "Devil's Advocate Mode", description: "Challenge your case! The theme has changed."});
  };

  const handleEndDevilsAdvocateMode = () => {
    setIsDevilsAdvocateModeActive(false);
    setViewMode('details'); 
    toast({ title: "Devil's Advocate Mode Ended", description: "Theme restored to normal."});
  };

  const handleToggleNormalChat = () => {
    if (isDevilsAdvocateModeActive) {
      handleEndDevilsAdvocateMode(); 
    }
    setViewMode('chatActive'); 
  };

  const handleSendDevilsAdvocateMessage = async (text: string) => {
    if (!text.trim()) return;
    if (!activeCaseId) {
      toast({ title: "No Active Case", description: "Please select a case to engage Devil's Advocate.", variant: "destructive" });
      return;
    }

    const userMessage: AppChatMessage = {
      id: crypto.randomUUID(),
      text,
      sender: 'user',
      timestamp: new Date(),
      caseId: activeCaseId,
    };

    const historyForApi = devilsAdvocateMessages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
    } as {role: 'user' | 'assistant' | 'system'; content: string}));

    setDevilsAdvocateMessages(prev => [...prev, userMessage]);
    setIsDevilsAdvocateReplying(true);
    setDevilsAdvocateChatInputText('');

    try {
      const devilsAdvocateInput: GenerateDevilsAdvocateResponseInput = {
        userStatement: text,
        chatHistory: historyForApi,
        caseDetails: JSON.stringify(currentCaseDetails),
        uploadedDocuments: uploadedFiles.map(f => f.dataUrl).filter(Boolean) as string[],
      };

      const result: GenerateDevilsAdvocateResponseOutput = await generateDevilsAdvocateResponse(devilsAdvocateInput);
      let devilReplyText = "<p>The Devil is having trouble formulating a response. Please try again.</p>";
      let citations = undefined;
      let searchResults = undefined;
      
      if (result.error) {
        console.error("Devil's Advocate AI Error:", result.error);
        toast({ title: "Devil's Advocate Error", description: result.error, variant: "destructive"});
        devilReplyText = result.devilReply || devilReplyText; // Use AI's error reply if available
      } else if (result.devilReply) {
        devilReplyText = result.devilReply;
        citations = result.citations;
        searchResults = result.searchResults;
      } else {
         console.error("generateDevilsAdvocateResponse returned an unexpected value or result.devilReply is undefined:", result);
         toast({ title: "Devil's Advocate Error", description: "The Devil's Advocate AI did not provide a valid response structure.", variant: "destructive" });
      }

      const botReplyMessage: AppChatMessage = {
        id: crypto.randomUUID(),
        text: devilReplyText,
        sender: 'bot',
        timestamp: new Date(),
        caseId: activeCaseId,
        citations: citations,
        searchResults: searchResults,
      };
      setDevilsAdvocateMessages(prev => [...prev, botReplyMessage]);

    } catch (error) {
      console.error("Error getting Devil's Advocate reply:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to get a response from the Devil's Advocate.";
      toast({ title: "Devil's Advocate Error", description: errorMessage, variant: "destructive" });

      const errorBotReply: AppChatMessage = {
        id: crypto.randomUUID(),
        text: "<p>The Devil is having trouble formulating a response due to an unexpected error. Please try again.</p>",
        sender: 'bot',
        timestamp: new Date(),
        caseId: activeCaseId,
      };
      setDevilsAdvocateMessages(prev => [...prev, errorBotReply]);
    } finally {
      setIsDevilsAdvocateReplying(false);
    }
  };

  const currentChatList = viewMode === 'devilsAdvocateActive' ? devilsAdvocateMessages : chatMessages;
  const currentBotReplying = viewMode === 'devilsAdvocateActive' ? isDevilsAdvocateReplying : isBotReplying;

  return (
    <>
    <div className="flex min-h-screen bg-background">
      <SpaceSidebar
        caseItems={cases.map(c => ({id: c.id, name: c.name}))}
        selectedCaseId={activeCaseId}
        onTriggerAddCase={() => setIsAddCaseModalOpen(true)}
        onSelectCase={handleSelectCase}
      />

      {!isMobile && (
        <SidebarTrigger
          size="icon"
          className={cn(
            "fixed top-1/2 -translate-y-1/2 z-20 transition-all duration-200 ease-in-out",
            "shadow-lg border border-border bg-background hover:bg-accent hover:text-accent-foreground"
          )}
          style={{
            left: isSidebarOpenOnDesktop ? 'calc(var(--sidebar-width) - 1.25rem)' : 'calc(var(--sidebar-width-icon) - 1.25rem)',
          }}
        />
      )}

      <div className="flex flex-1 flex-col">
          <SidebarInset className="flex-1 flex flex-col">
            <HeaderControls
              onAddNewCase={handleOpenAddCaseModal}
              spaceName={currentCase?.name}
              viewMode={viewMode}
              onViewDetails={() => {
                if (isDevilsAdvocateModeActive) handleEndDevilsAdvocateMode(); 
                setViewMode('details');
              }}
              onToggleNormalChat={handleToggleNormalChat}
              isDevilsAdvocateModeActive={isDevilsAdvocateModeActive}
              onEndDevilsAdvocate={handleEndDevilsAdvocateMode}
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
                  {(currentCaseDetails.enableMlPrediction && (isMlLoading || mlOutput || isStrategyLoading || strategySnapshot)) && (
                    <MlPredictionOutput
                      isLoading={isMlLoading}
                      data={mlOutput}
                      strategySnapshot={strategySnapshot}
                      isStrategyLoading={isStrategyLoading}
                      onGenerateStrategySnapshot={handleGenerateStrategySnapshot}
                      caseActive={!!activeCaseId && !!currentCaseDetails}
                    />
                  )}
                  {activeCaseId && currentCaseDetails.enableMlPrediction && (
                    <Card className="shadow-xl border-primary/30">
                      <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div>
                                <CardTitle className="font-headline text-2xl text-primary flex items-center">
                                    <IndianRupee className="mr-3 h-7 w-7"/> Detailed Cost & Stage Roadmap (INR)
                                </CardTitle>
                                <CardDescription>AI-generated cost breakdown by case stage.</CardDescription>
                            </div>
                            <Button 
                                onClick={handleGenerateDetailedCostRoadmap} 
                                disabled={isDetailedCostRoadmapLoading || !activeCaseId}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md whitespace-nowrap mt-2 sm:mt-0"
                                size="lg"
                            >
                              {isDetailedCostRoadmapLoading ? (
                                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Costs...</>
                              ) : (
                                <><Briefcase className="mr-2 h-5 w-5" /> Generate Detailed Costs</>
                              )}
                            </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <DetailedCostRoadmap 
                          roadmapData={detailedCostRoadmap}
                          isLoading={isDetailedCostRoadmapLoading}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {activeCaseId && !isDevilsAdvocateModeActive && (
                    <Card className="shadow-xl border-destructive/30">
                      <CardHeader>
                        <CardTitle className="font-headline text-2xl text-destructive flex items-center">
                            <Swords className="mr-3 h-7 w-7"/>Engage Devil's Advocate
                        </CardTitle>
                        <CardDescription>Challenge your case strategy by arguing against an AI opponent.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-4 text-foreground/80">
                          Ready to test your arguments? Enter this mode to have an AI act as opposing counsel. It will counter your statements and help you identify weaknesses in your case. The interface will switch to a special theme for this focused interaction.
                        </p>
                        <Button
                            onClick={handleStartDevilsAdvocateMode}
                            className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md"
                            size="lg"
                            disabled={!activeCaseId}
                        >
                          <Scale className="mr-2 h-5 w-5" /> Start Devil's Advocate Mode
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
              {(viewMode === 'chatActive' || viewMode === 'devilsAdvocateActive') && (
                <div className="space-y-4">
                  {currentChatList.map((msg) => (
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
                          "max-w-[70%] rounded-xl px-4 py-3 text-sm shadow-md prose prose-sm dark:prose-invert",
                          msg.sender === 'user'
                            ? 'bg-secondary text-secondary-foreground rounded-br-none'
                            : (viewMode === 'devilsAdvocateActive' ? 'bg-red-700 text-white rounded-bl-none' : 'bg-accent text-accent-foreground rounded-bl-none')
                        )}
                      >
                        {msg.sender === 'bot' ? (
                            <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                          ) : (
                            msg.text
                          )}
                        {(msg.sender === 'bot' && (msg.citations || msg.searchResults)) && (
                          <div className={cn(
                            "mt-2 pt-2 border-t text-xs opacity-80",
                             viewMode === 'devilsAdvocateActive' ? 'border-white/30' : 'border-accent-foreground/30'
                             )}>
                            {msg.citations && msg.citations.length > 0 && (
                              <div><strong>Citations:</strong> {msg.citations.map((c:any, i:number) => <span key={i}>{c.text || 'source'}</span> )}</div>
                            )}
                            {msg.searchResults && msg.searchResults.length > 0 && (
                               <div><strong>Sources:</strong> {msg.searchResults.map((s:any, i:number) => <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className={cn("underline", viewMode === 'devilsAdvocateActive' ? 'hover:text-white/70' : 'hover:text-accent-foreground/70') }>{s.title || 'link'}</a> )}</div>
                            )}
                          </div>
                        )}
                      </div>
                      {msg.sender === 'user' && (
                         <Avatar className="h-8 w-8">
                          <AvatarFallback><User className="h-5 w-5 text-primary" /></AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  {currentBotReplying && currentChatList.length > 0 && currentChatList[currentChatList.length-1].sender === 'user' && (
                     <div className="flex items-end gap-2 justify-start">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback><Bot className="h-5 w-5 text-accent" /></AvatarFallback>
                        </Avatar>
                        <div className={cn("max-w-[70%] rounded-xl px-4 py-2 text-sm shadow-md rounded-bl-none",
                           viewMode === 'devilsAdvocateActive' ? 'bg-red-700 text-white' : 'bg-accent text-accent-foreground'
                        )}>
                            <div className="flex items-center space-x-1">
                                <span className={cn("h-2 w-2 rounded-full animate-pulse delay-75", viewMode === 'devilsAdvocateActive' ? 'bg-white/70' : 'bg-accent-foreground/70')}></span>
                                <span className={cn("h-2 w-2 rounded-full animate-pulse delay-150", viewMode === 'devilsAdvocateActive' ? 'bg-white/70' : 'bg-accent-foreground/70')}></span>
                                <span className={cn("h-2 w-2 rounded-full animate-pulse delay-300", viewMode === 'devilsAdvocateActive' ? 'bg-white/70' : 'bg-accent-foreground/70')}></span>
                            </div>
                        </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
              </main>
            </ScrollArea>
            {(viewMode === 'chatActive' || viewMode === 'devilsAdvocateActive') && (
                <div className="p-4 border-t bg-background">
                <div className="flex items-center gap-2">
                    <Input
                    type="text"
                    placeholder={
                        viewMode === 'devilsAdvocateActive'
                        ? (activeCaseId ? "Enter your argument..." : "Select a case first.")
                        : (activeCaseId ? "Ask a question about this case..." : "Please select or create a case first")
                    }
                    value={viewMode === 'devilsAdvocateActive' ? devilsAdvocateChatInputText : chatInputText}
                    onChange={(e) => viewMode === 'devilsAdvocateActive' ? setDevilsAdvocateChatInputText(e.target.value) : setChatInputText(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                        if (viewMode === 'devilsAdvocateActive' && !isDevilsAdvocateReplying && activeCaseId) {
                            handleSendDevilsAdvocateMessage(devilsAdvocateChatInputText);
                        } else if (viewMode === 'chatActive' && !isBotReplying && activeCaseId) {
                            handleSendMessage(chatInputText);
                        }
                        }
                    }}
                    disabled={currentBotReplying || !activeCaseId}
                    className="flex-1"
                    />
                    <Button
                    onClick={() => {
                        if (viewMode === 'devilsAdvocateActive' && activeCaseId) {
                        handleSendDevilsAdvocateMessage(devilsAdvocateChatInputText);
                        } else if (viewMode === 'chatActive' && activeCaseId) {
                        handleSendMessage(chatInputText);
                        }
                    }}
                    disabled={
                        viewMode === 'devilsAdvocateActive'
                        ? (!devilsAdvocateChatInputText.trim() || currentBotReplying || !activeCaseId)
                        : (!chatInputText.trim() || currentBotReplying || !activeCaseId)
                    }
                    className={cn("px-3", viewMode === 'devilsAdvocateActive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-accent text-accent-foreground hover:bg-accent/90')}
                    >
                    <SendHorizonal className="h-5 w-5" />
                    </Button>
                </div>
                </div>
            )}
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


    