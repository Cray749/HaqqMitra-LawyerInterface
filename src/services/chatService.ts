
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

// Helper function to ensure db is initialized
async function ensureDbInitialized() {
  if (!db) {
    console.error('Firestore db object is not initialized in chatService. This should not happen if firebase.ts is correctly set up.');
    throw new Error('Firestore database is not initialized in chatService. Check Firebase configuration and initialization in firebase.ts.');
  }
}

// No AppChatMessage needed if ChatMessage in types.ts already includes caseId (optional)
// interface AppChatMessage extends ChatMessage {
//     caseId: string; 
// }

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
      // Ensure timestamp is a Firestore Timestamp or serverTimestamp for consistent ordering
      timestamp: message.timestamp instanceof Date ? Timestamp.fromDate(message.timestamp) : serverTimestamp(),
      // Explicitly do not save caseId within the subcollection document if not needed there
      // caseId: message.caseId, // Only if you want to denormalize caseId into each message doc
      citations: message.citations || null, // Store if present, otherwise null
      searchResults: message.searchResults || null, // Store if present, otherwise null
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
      // Convert Firestore Timestamp to JS Date
      const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date();
      
      return {
        id: docSnap.id,
        text: data.text,
        sender: data.sender as 'user' | 'bot',
        timestamp: timestamp,
        caseId: caseId, // Add caseId context back for client-side use if needed
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
