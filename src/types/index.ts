

export interface Space {
  id: string;
  name: string;
  details?: CaseDetails; 
  files?: UploadedFile[]; 
}

export interface Thread { 
  id: string;
  name: string;
  caseDetails?: CaseDetails;
  uploadedFiles?: File[];
  mlOutput?: MlOutputData;
  chatMessages?: ChatMessage[];
  chatHistory?: ChatHistoryItem[];
}

export interface CaseDetails {
  caseTitle: string;
  courtTribunal: string;
  jurisdiction: string;
  caseType: string;
  plaintiffsDefendants: string;
  briefDescription: string;
  filingDate?: Date;
  nextHearingDate?: Date;
  enableMlPrediction: boolean; 
}

export const initialCaseDetails: CaseDetails = {
  caseTitle: '',
  courtTribunal: '',
  jurisdiction: '',
  caseType: '',
  plaintiffsDefendants: '',
  briefDescription: '',
  filingDate: undefined,
  nextHearingDate: undefined,
  enableMlPrediction: true,
};

export interface UploadedFile {
  id: string;
  file: File; 
  name: string;
  size: number;
  type: string;
  dataUrl?: string; 
  downloadURL?: string; 
  path?: string; 
  uploadedAt?: Date; 
}

export interface MlOutputData { 
  estimatedCost: string;
  expectedDuration: string;
  winProbability: number; 
  lossProbability: number; 
}

export interface StrategySnapshotData {
  openingStatementHook: string;
  topStrengths: string; 
  topWeaknesses: string; 
  citations?: any[];
  searchResults?: any[];
}

export interface ChatMessage {
  id: string;
  text: string; // Can now contain simple HTML
  sender: 'user' | 'bot';
  timestamp: Date; 
  caseId?: string; 
  citations?: any[];
  searchResults?: any[];
}

export interface ChatHistoryItem {
  id:string;
  timestamp: Date;
  preview: string;
  question: string;
  answer: string;
}

export interface CaseStageCost {
  id: string; 
  stageName: string;
  description: string;
  estimatedCostINR: string; 
}

export interface DetailedCostRoadmapOutput {
  stages: CaseStageCost[];
  citations?: any[];
  searchResults?: any[];
  error?: string; 
}

// Specific output types for flows that include an error field
export interface GenerateChatbotResponseOutput {
  botReply: string;
  citations?: any[];
  searchResults?: any[];
  error?: string;
}

export interface GenerateDevilsAdvocateResponseOutput {
  devilReply: string;
  citations?: any[];
  searchResults?: any[];
  error?: string;
}

    