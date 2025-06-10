
'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import type { ChatMessage } from '@/types'; // Assuming ChatMessage in types matches this structure

// Helper function to ensure db is initialized
async function ensureDbInitialized() {
  if (!db) {
    console.error('Firestore db object is not initialized in chatService. This should not happen if firebase.ts is correctly set up.');
    throw new Error('Firestore database is not initialized in chatService. Check Firebase configuration and initialization in firebase.ts.');
  }
}

interface AppChatMessage extends ChatMessage {
    caseId: string; // Ensure caseId is part of the message structure passed to save
}

export async function saveChatMessage(caseId: string, message: AppChatMessage): Promise<void> {
  await ensureDbInitialized();
  if (!caseId || !message || !message.id) {
    console.error("Invalid arguments for saveChatMessage: caseId and message.id are required.");
    throw new Error("Invalid arguments for saving chat message.");
  }
  try {
    const messagesCollectionRef = collection(db, 'cases', caseId, 'chatMessages');
    const messageDocRef = doc(messagesCollectionRef, message.id); // Use message.id as Firestore document ID

    const messageData = {
      text: message.text,
      sender: message.sender,
      timestamp: message.timestamp instanceof Date ? Timestamp.fromDate(message.timestamp) : serverTimestamp(), // Convert JS Date to Firestore Timestamp or use server timestamp
    };
    
    await setDoc(messageDocRef, messageData);
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
      return {
        id: docSnap.id,
        text: data.text,
        sender: data.sender as 'user' | 'bot',
        timestamp: data.timestamp, // Keep as Firestore Timestamp, page.tsx will convert
      } as ChatMessage; // Cast, page.tsx expects id, text, sender, timestamp (Firebase Timestamp)
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
