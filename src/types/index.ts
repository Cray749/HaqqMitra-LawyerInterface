
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
  enableMlPrediction: boolean; // This will still control if the base analysis (cost, duration, probability) runs
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

export interface MlOutputData { // Basic analysis results
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
  text: string;
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

// New types for Detailed Cost Roadmap
export interface CaseStageCost {
  id: string; // For React key, can be generated client-side
  stageName: string;
  description: string;
  estimatedCostINR: string; // e.g., "₹10,000 - ₹15,000" or "Approx. ₹20,000"
}

export interface DetailedCostRoadmapOutput {
  stages: CaseStageCost[];
  citations?: any[];
  searchResults?: any[];
  error?: string; // To communicate AI parsing/generation errors
}
