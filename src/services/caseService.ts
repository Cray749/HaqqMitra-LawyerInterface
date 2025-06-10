
'use server';

import { db, storage } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  arrayUnion,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import type { Space, CaseDetails, UploadedFile } from '@/types';

// Helper function to ensure db is initialized
async function ensureDbInitialized() {
  if (!db) {
    console.error('Firestore db object is not initialized in caseService. This should not happen if firebase.ts is correctly set up.');
    throw new Error('Firestore database is not initialized in caseService. Check Firebase configuration and initialization in firebase.ts.');
  }
}

// Helper function to ensure storage is initialized
async function ensureStorageInitialized() {
  if (!storage) {
    console.error('Firebase Storage object is not initialized in caseService. This should not happen if firebase.ts is correctly set up.');
    throw new Error('Firebase Storage is not initialized in caseService. Check Firebase configuration and initialization in firebase.ts.');
  }
}


export async function getCases(): Promise<Space[]> {
  await ensureDbInitialized();
  try {
    const casesSnapshot = await getDocs(collection(db, 'cases'));
    const casesList = casesSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const details = data.details ? {
            ...data.details,
            filingDate: data.details.filingDate instanceof Timestamp ? data.details.filingDate.toDate() : undefined,
            nextHearingDate: data.details.nextHearingDate instanceof Timestamp ? data.details.nextHearingDate.toDate() : undefined,
        } : undefined;

        return {
            id: docSnap.id,
            name: data.name,
            details: details,
            files: data.files?.map((f:any) => ({
                ...f,
                uploadedAt: f.uploadedAt instanceof Timestamp ? f.uploadedAt.toDate() : undefined
            })) || [],
        } as Space;
    });
    return casesList;
  } catch (error) {
    console.error("Error fetching cases: ", error);
    throw new Error("Failed to fetch cases.");
  }
}

export async function createCase(caseName: string, caseId?: string): Promise<Space> {
  await ensureDbInitialized();
  const idToUse = caseId || doc(collection(db, 'cases')).id;
  const caseRef = doc(db, 'cases', idToUse);

  try {
    const docSnap = await getDoc(caseRef);
    
    if (docSnap.exists()) {
        console.log(`Case ${idToUse} already exists, returning existing data.`);
        const data = docSnap.data();
        const details = data.details ? {
            ...data.details,
            filingDate: data.details.filingDate instanceof Timestamp ? data.details.filingDate.toDate() : undefined,
            nextHearingDate: data.details.nextHearingDate instanceof Timestamp ? data.details.nextHearingDate.toDate() : undefined,
        } : undefined;
        return {
            id: docSnap.id,
            name: data.name,
            details: details,
            files: data.files?.map((f:any) => ({
                ...f,
                uploadedAt: f.uploadedAt instanceof Timestamp ? f.uploadedAt.toDate() : undefined,
            })) || [],
        } as Space;
    }

    const newCaseServerData = {
      name: caseName,
      id: idToUse,
      files: [],
      details: null, // Storing null for details initially
      createdAt: Timestamp.now()
    };
    await setDoc(caseRef, newCaseServerData);
    
    // Return data consistent with the Space type, details will be undefined initially
    const newCaseClientData: Space = {
      id: idToUse,
      name: caseName,
      details: undefined, 
      files: [],
    };
    return newCaseClientData;
  } catch (error) {
    console.error("Error creating or fetching case: ", error);
    throw new Error(`Failed to create or fetch case "${caseName}".`);
  }
}


export async function updateCaseDetails(caseId: string, details: CaseDetails): Promise<void> {
  await ensureDbInitialized();
  const caseDocRef = doc(db, 'cases', caseId);
  try {
    const detailsForFirestore: any = { ...details };
    if (details.filingDate) {
      detailsForFirestore.filingDate = Timestamp.fromDate(new Date(details.filingDate));
    } else {
      delete detailsForFirestore.filingDate; 
    }
    if (details.nextHearingDate) {
      detailsForFirestore.nextHearingDate = Timestamp.fromDate(new Date(details.nextHearingDate));
    } else {
      delete detailsForFirestore.nextHearingDate; 
    }
    
    await updateDoc(caseDocRef, { details: detailsForFirestore });
  } catch (error) {
    console.error(`Error updating case details for ${caseId}: `, error);
    throw new Error("Failed to update case details.");
  }
}

export async function deleteCase(caseId: string): Promise<void> {
  await ensureDbInitialized();
  await ensureStorageInitialized();
  const caseDocRef = doc(db, 'cases', caseId);
  const batch = writeBatch(db);

  try {
    const caseStorageFolderRef = ref(storage, `cases/${caseId}`);
    const storageFilesList = await listAll(caseStorageFolderRef);
    await Promise.all(storageFilesList.items.map(fileRef => deleteObject(fileRef)));
    
    storageFilesList.prefixes.forEach(async (folderRef) => {
        const nestedFiles = await listAll(folderRef);
        await Promise.all(nestedFiles.items.map(fileRef => deleteObject(fileRef)));
        // Note: This does not handle deeper nesting. If you have many levels, a recursive solution is needed.
        // For now, assuming one level of prefixes (if any) or direct files.
    });


    const chatMessagesRef = collection(db, 'cases', caseId, 'chatMessages');
    const chatMessagesSnap = await getDocs(chatMessagesRef);
    chatMessagesSnap.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    
    batch.delete(caseDocRef);

    await batch.commit();
    console.log(`Case ${caseId} and its associated data deleted successfully.`);

  } catch (error) {
    console.error(`Error deleting case ${caseId}: `, error);
    throw new Error("Failed to delete case and its associated data.");
  }
}


export async function uploadFileToCase(caseId: string, fileId: string, fileName: string, fileType: string, fileSize: number, dataUrl: string): Promise<UploadedFile> {
  await ensureDbInitialized();
  await ensureStorageInitialized();
  
  const filePath = `cases/${caseId}/${fileId}-${fileName}`;
  const fileUploadRef = ref(storage, filePath);
  const caseDocRef = doc(db, 'cases', caseId);

  try {
    await uploadString(fileUploadRef, dataUrl, 'data_url');
    const downloadURL = await getDownloadURL(fileUploadRef);

    const fileMetadataForFirestore: Partial<UploadedFile> = { // Use Partial as 'file' object is not stored
      id: fileId,
      name: fileName,
      type: fileType,
      size: fileSize,
      path: filePath, 
      downloadURL: downloadURL, 
      uploadedAt: Timestamp.now().toDate(), // Store as JS Date in Firestore via Timestamp
    };

    await updateDoc(caseDocRef, {
      files: arrayUnion(fileMetadataForFirestore)
    });
    
    return {
        id: fileId,
        name: fileName,
        size: fileSize,
        type: fileType,
        dataUrl: dataUrl, // Client-side dataUrl
        downloadURL: downloadURL, // Storage download URL
        path: filePath,
        uploadedAt: (fileMetadataForFirestore.uploadedAt as Timestamp).toDate(), // Ensure it's a JS Date
    } as UploadedFile;

  } catch (error) {
    console.error(`Error uploading file ${fileName} for case ${caseId}: `, error);
    throw new Error(`Failed to upload file "${fileName}".`);
  }
}


export async function removeFileFromCase(caseId: string, fileId: string): Promise<void> {
  await ensureDbInitialized();
  await ensureStorageInitialized();
  const caseDocRef = doc(db, 'cases', caseId);

  try {
    const caseSnap = await getDoc(caseDocRef);
    if (!caseSnap.exists()) throw new Error("Case not found for removal.");

    const caseData = caseSnap.data();
    const fileToRemove = caseData.files?.find((f: any) => f.id === fileId);

    if (!fileToRemove || !fileToRemove.path) {
      console.warn(`File with ID ${fileId} not found in case ${caseId} data or path missing, skipping storage deletion. Proceeding to remove from Firestore array.`);
    } else {
      const fileStorageRef = ref(storage, fileToRemove.path);
      await deleteObject(fileStorageRef).catch(err => {
        console.warn(`Could not delete file ${fileToRemove.path} from storage (it may have been already deleted or path was incorrect):`, err);
      });
    }
    
    const updatedFiles = caseData.files?.filter((f: any) => f.id !== fileId) || [];
    await updateDoc(caseDocRef, { files: updatedFiles });

  } catch (error) {
    console.error(`Error removing file ${fileId} from case ${caseId}: `, error);
    throw new Error("Failed to remove file.");
  }
}
