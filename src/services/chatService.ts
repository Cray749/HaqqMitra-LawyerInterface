
'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import type { ChatMessage } from '@/types';

// Top-level check to ensure Firebase Firestore is available when this module loads
if (!db) {
  const errMsg = "CRITICAL_ERROR_CHAT_SERVICE_INIT: Firestore 'db' object is not initialized. This indicates a problem with Firebase setup in 'src/lib/firebase.ts' or environment variables.";
  console.error(errMsg);
  throw new Error(errMsg);
}

// Helper function to ensure db is initialized before an operation
async function ensureDbInitialized() {
  if (!db) {
    console.error('FATAL_CHAT_SERVICE: Firestore db object is unexpectedly not initialized at runtime. Check Firebase configuration.');
    throw new Error('Firestore database is not available in chatService.');
  }
}


export async function saveChatMessage(caseId: string, message: ChatMessage): Promise<void> {
  await ensureDbInitialized();
  if (!caseId || !message || !message.id) {
    console.error("Invalid arguments for saveChatMessage: caseId and message.id are required.");
    throw new Error("Invalid arguments for saving chat message.");
  }
  try {
    const messagesCollectionRef = collection(db, 'cases', caseId, 'chatMessages');
    const messageDocRef = doc(messagesCollectionRef, message.id);

    const messageDataToSave = {
      text: message.text,
      sender: message.sender,
      timestamp: message.timestamp instanceof Date ? Timestamp.fromDate(message.timestamp) : serverTimestamp(),
      citations: message.citations || null,
      searchResults: message.searchResults || null,
    };
    
    await setDoc(messageDocRef, messageDataToSave);
  } catch (error) {
    console.error(`Error saving chat message for case ${caseId}:`, error);
    throw new Error('Failed to save chat message.');
  }
}

export async function getChatMessages(caseId: string): Promise<ChatMessage[]> {
  await ensureDbInitialized();
  if (!caseId) {
    console.error("Invalid arguments for getChatMessages: caseId is required.");
    return [];
  }
  try {
    const messagesCollectionRef = collection(db, 'cases', caseId, 'chatMessages');
    const q = query(messagesCollectionRef, orderBy('timestamp', 'asc'));
    const querySnapshot = await getDocs(q);

    const messages: ChatMessage[] = querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date();
      
      return {
        id: docSnap.id,
        text: data.text,
        sender: data.sender as 'user' | 'bot',
        timestamp: timestamp,
        caseId: caseId, 
        citations: data.citations,
        searchResults: data.searchResults,
      } as ChatMessage;
    });
    return messages;
  } catch (error) {
    console.error(`Error fetching chat messages for case ${caseId}:`, error);
    throw new Error('Failed to fetch chat messages.');
  }
}

export async function clearChatHistory(caseId: string): Promise<void> {
  await ensureDbInitialized();
  if (!caseId) {
    console.error("Invalid arguments for clearChatHistory: caseId is required.");
    throw new Error("Invalid arguments for clearing chat history.");
  }
  try {
    const messagesCollectionRef = collection(db, 'cases', caseId, 'chatMessages');
    const querySnapshot = await getDocs(messagesCollectionRef);
    
    const batch = writeBatch(db);
    querySnapshot.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    
    await batch.commit();
  } catch (error) {
    console.error(`Error clearing chat history for case ${caseId}:`, error);
    throw new Error('Failed to clear chat history.');
  }
}
