
export interface Space {
  id: string;
  name: string;
  // threads: Thread[]; // Future enhancement
}

export interface Thread { // Placeholder for future use
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
  dataUrl?: string; // For sending to AI flows
}

export interface MlOutputData {
  estimatedCost: string;
  expectedDuration: string;
  weakPoints: string; // Will be a string from AI, then parsed
  powerpointOutline: string; // Will be a string from AI, then parsed
  winLossProbability: number; // 0-100
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface ChatHistoryItem {
  id: string;
  timestamp: Date;
  preview: string;
  question: string;
  answer: string;
}
