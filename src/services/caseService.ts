
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

// Top-level check to ensure Firebase services are available when this module loads
if (!db) {
  const errMsg = "CRITICAL_ERROR_CASE_SERVICE_INIT: Firestore 'db' object is not initialized. This indicates a problem with Firebase setup in 'src/lib/firebase.ts' or environment variables.";
  console.error(errMsg);
  throw new Error(errMsg);
}
if (!storage) {
    const errMsg = "CRITICAL_ERROR_CASE_SERVICE_INIT: Firebase Storage 'storage' object is not initialized. This indicates a problem with Firebase setup in 'src/lib/firebase.ts' or environment variables.";
    console.error(errMsg);
    // Not throwing an error for storage here to allow some functions to work if only Firestore is needed,
    // but functions requiring storage will fail if it's truly uninitialized.
    // Consider if this service can operate meaningfully without storage. If not, throw an error.
}

// Helper function to ensure db is initialized before an operation
async function ensureDbInitialized() {
  if (!db) {
    console.error('FATAL_CASE_SERVICE: Firestore db object is unexpectedly not initialized at runtime. Check Firebase configuration.');
    throw new Error('Firestore database is not available in caseService.');
  }
}

// Helper function to ensure storage is initialized before an operation
async function ensureStorageInitialized() {
  if (!storage) {
    console.error('FATAL_CASE_SERVICE: Firebase Storage object is unexpectedly not initialized at runtime. Check Firebase configuration.');
    throw new Error('Firebase Storage is not available in caseService.');
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
      details: null, 
      createdAt: Timestamp.now()
    };
    await setDoc(caseRef, newCaseServerData);
    
    const newCaseClientData: Space = {
      id: idToUse,
      name: caseName,
      details: undefined, 
      files: [],
    };
    return newCaseClientData;
  } catch (error) {
    console.error(`Error creating or fetching case "${caseName}" (ID: ${idToUse}): `, error); // Log includes the actual error from Firebase
    throw new Error(`Failed to create or fetch case "${caseName}". Review console for underlying Firebase error.`);
  }
}


export async function updateCaseDetails(caseId: string, details: CaseDetails): Promise<void> {
  await ensureDbInitialized();
  const caseDocRef = doc(db, 'cases', caseId);
  try {
    const detailsForFirestore: any = { ...details };
    if (details.filingDate instanceof Date) {
      detailsForFirestore.filingDate = Timestamp.fromDate(details.filingDate);
    } else if (details.filingDate === undefined || details.filingDate === null) {
      detailsForFirestore.filingDate = null; // Explicitly set to null if cleared
    }
    // else it might be already a Timestamp if data came directly from Firestore and wasn't converted, though types suggest Date

    if (details.nextHearingDate instanceof Date) {
      detailsForFirestore.nextHearingDate = Timestamp.fromDate(details.nextHearingDate);
    } else if (details.nextHearingDate === undefined || details.nextHearingDate === null) {
      detailsForFirestore.nextHearingDate = null; // Explicitly set to null if cleared
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
    
    // This part for deleting prefixes (subfolders) might be too simplistic if deep nesting exists.
    // For now, assuming direct files or one level of subfolders.
    for (const folderRef of storageFilesList.prefixes) {
        const nestedFiles = await listAll(folderRef);
        await Promise.all(nestedFiles.items.map(fileRef => deleteObject(fileRef)));
    }

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

    const fileMetadataForFirestore: Omit<UploadedFile, 'file' | 'dataUrl'> & {uploadedAt: Timestamp} = { 
      id: fileId,
      name: fileName,
      type: fileType,
      size: fileSize,
      path: filePath, 
      downloadURL: downloadURL, 
      uploadedAt: Timestamp.now(),
    };

    await updateDoc(caseDocRef, {
      files: arrayUnion(fileMetadataForFirestore)
    });
    
    return {
        id: fileId,
        file: new File([], fileName, { type: fileType }), // Placeholder, original File object is client-side
        name: fileName,
        size: fileSize,
        type: fileType,
        dataUrl: dataUrl, 
        downloadURL: downloadURL, 
        path: filePath,
        uploadedAt: fileMetadataForFirestore.uploadedAt.toDate(),
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
    if (!caseSnap.exists()) {
        console.warn(`Case with ID ${caseId} not found for file removal. File ID: ${fileId}`);
        throw new Error("Case not found for file removal.");
    }

    const caseData = caseSnap.data();
    const filesArray = caseData.files as Array<Partial<UploadedFile>> || [];
    const fileToRemove = filesArray.find(f => f.id === fileId);

    if (!fileToRemove || !fileToRemove.path) {
      console.warn(`File with ID ${fileId} not found in case ${caseId} data or path missing. Proceeding to remove from Firestore array if present.`);
    } else {
      const fileStorageRef = ref(storage, fileToRemove.path);
      try {
        await deleteObject(fileStorageRef);
        console.log(`File ${fileToRemove.path} deleted from storage.`);
      } catch (storageError: any) {
        // Common error if file doesn't exist is 'storage/object-not-found'
        if (storageError.code === 'storage/object-not-found') {
          console.warn(`File ${fileToRemove.path} not found in storage, may have been already deleted.`);
        } else {
          console.warn(`Could not delete file ${fileToRemove.path} from storage:`, storageError);
          // Decide if this should throw or just warn. For now, warn and proceed with Firestore update.
        }
      }
    }
    
    const updatedFiles = filesArray.filter(f => f.id !== fileId);
    await updateDoc(caseDocRef, { files: updatedFiles });

  } catch (error)
{
    console.error(`Error removing file ${fileId} from case ${caseId}: `, error);
    throw new Error("Failed to remove file.");
  }
}
