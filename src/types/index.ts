
export interface Space {
  id: string;
  name: string;
  details?: CaseDetails; // Optional, as it might not be immediately available or set
  files?: UploadedFile[]; // Optional
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
  file: File; // Original File object, client-side only
  name: string;
  size: number;
  type: string;
  dataUrl?: string; // For sending to AI flows or immediate display
  downloadURL?: string; // For files stored in Firebase Storage
  path?: string; // Storage path
  uploadedAt?: Date; // Timestamp of upload
}

export interface MlOutputData {
  estimatedCost: string;
  expectedDuration: string;
  strongPoints: string; // Will be a string from AI, then parsed
  weakPoints: string; // Will be a string from AI, then parsed
  winProbability: number; // 0-100
  lossProbability: number; // 0-100
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date; // Firestore Timestamp will be converted to JS Date on fetch
  caseId?: string; // Added for context, used in AppChatMessage
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
