// src/services/firestoreService.js

import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  arrayUnion,
  arrayRemove,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';

export const createUserProfile = async (uid, userData) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, userData);
};

export const getUserProfile = async (uid) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data() : null;
};

export const saveContactMessage = async ({ name, email, message }) => {
  const messagesRef = collection(db, 'contact_messages');
  await addDoc(messagesRef, {
    name,
    email,
    message,
    createdAt: new Date()
  });
};

export const rateNote = async (noteId, userId, rating) => {
  const noteRef = doc(db, 'notes', noteId);
  const noteSnap = await getDoc(noteRef);

  if (!noteSnap.exists()) return;

  const data = noteSnap.data();
  const ratings = data.ratings || {};

  // Update rating
  ratings[userId] = rating;

  // Calculate average
  const ratingValues = Object.values(ratings);
  const averageRating =
    ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;

  await updateDoc(noteRef, {
    ratings,
    averageRating,
    ratingCount: ratingValues.length,
  });
};

// Bookmark functions
export const addBookmark = async (userId, noteId) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    bookmarks: arrayUnion(noteId)
  });
};

export const removeBookmark = async (userId, noteId) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    bookmarks: arrayRemove(noteId)
  });
};

export const getUserBookmarks = async (userId) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const userData = userSnap.data();
    return userData.bookmarks || [];
  }
  return [];
};

export const checkUploadAccess = async (rollNumber) => {
  const accessRef = doc(db, 'uploadAccess', 'upload-access-list');
  const accessSnap = await getDoc(accessRef);
  
  if (accessSnap.exists()) {
    const data = accessSnap.data();
    return data.rollNumbers?.includes(rollNumber) || false;
  }
  return false;
};

export const addUploadAccess = async (rollNumber) => {
  const accessRef = doc(db, 'uploadAccess', 'upload-access-list');
  await updateDoc(accessRef, {
    rollNumbers: arrayUnion(rollNumber)
  });
};

export const removeUploadAccess = async (rollNumber) => {
  const accessRef = doc(db, 'uploadAccess', 'upload-access-list');
  await updateDoc(accessRef, {
    rollNumbers: arrayRemove(rollNumber)
  });
};

export const getUploadAccessList = async () => {
  const accessRef = doc(db, 'uploadAccess', 'upload-access-list');
  const accessSnap = await getDoc(accessRef);
  return accessSnap.exists() ? accessSnap.data().rollNumbers || [] : [];
};

export const saveNoteMetadata = async (noteData) => {
  const notesRef = collection(db, 'notes');
  const docRef = await addDoc(notesRef, {
    ...noteData,
    uploadedAt: new Date(),
    downloads: 0,
    rating: 0,
    reviews: []
  });
  return docRef.id;
};

// Updated getNotes function with department filtering support
export const getNotes = async (filters = {}) => {
  let q = collection(db, 'notes');
  
  // Apply filters if provided
  if (filters.department) {
    q = query(q, where('department', '==', filters.department));
  }
  if (filters.semester) {
    q = query(q, where('semester', '==', filters.semester));
  }
  if (filters.subject) {
    q = query(q, where('subject', '==', filters.subject));
  }
  if (filters.academicYear) {
    q = query(q, where('academicYear', '==', filters.academicYear));
  }
  
  q = query(q, orderBy('uploadedAt', 'desc'));
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Get bookmarked notes by IDs
export const getBookmarkedNotes = async (bookmarkIds) => {
  if (!bookmarkIds || bookmarkIds.length === 0) return [];
  
  try {
    const allNotes = await getNotes();
    return allNotes.filter(note => bookmarkIds.includes(note.id));
  } catch (error) {
    console.error('Error fetching bookmarked notes:', error);
    return [];
  }
};

// Legacy function for backward compatibility
export const getNotesByDepartmentAndSemester = async (department = null, semester = null, subject = null) => {
  return getNotes({ department, semester, subject });
};

export const updateNoteDownloads = async (noteId) => {
  const noteRef = doc(db, 'notes', noteId);
  const noteSnap = await getDoc(noteRef);
  
  if (noteSnap.exists()) {
    const currentDownloads = noteSnap.data().downloads || 0;
    await updateDoc(noteRef, {
      downloads: currentDownloads + 1
    });
  }
};

// New functions for department-specific analytics
export const getNotesCountByDepartment = async () => {
  const notesSnapshot = await getDocs(collection(db, 'notes'));
  const departmentCounts = {};
  
  notesSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const dept = data.department || 'Unknown';
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
  });
  
  return departmentCounts;
};

export const getPopularSubjectsByDepartment = async (department) => {
  const q = query(
    collection(db, 'notes'),
    where('department', '==', department),
    orderBy('downloads', 'desc')
  );
  
  const snapshot = await getDocs(q);
  const subjectDownloads = {};
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const subject = data.subject;
    const downloads = data.downloads || 0;
    
    if (!subjectDownloads[subject]) {
      subjectDownloads[subject] = 0;
    }
    subjectDownloads[subject] += downloads;
  });
  
  return Object.entries(subjectDownloads)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([subject, downloads]) => ({ subject, downloads }));
};

// Update note metadata
export const updateNoteMetadata = async (noteId, updateData) => {
  const noteRef = doc(db, 'notes', noteId);
  await updateDoc(noteRef, updateData);
};

// Delete a note
export const deleteNote = async (noteId) => {
  const noteRef = doc(db, 'notes', noteId);
  await deleteDoc(noteRef);
};

// Get user statistics including bookmarks
export const getUserStats = async (userId) => {
  try {
    const userProfile = await getUserProfile(userId);
    const allNotes = await getNotes();
    
    // Count user's uploaded notes
    const uploadedNotes = allNotes.filter(note => note.uploadedByUid === userId);
    
    // Get bookmark count
    const bookmarks = userProfile?.bookmarks || [];
    
    // Calculate total downloads of user's notes
    const totalDownloads = uploadedNotes.reduce((sum, note) => sum + (note.downloads || 0), 0);
    
    // Calculate average rating of user's notes
    const notesWithRatings = uploadedNotes.filter(note => note.ratingCount > 0);
    const averageRating = notesWithRatings.length > 0 
      ? notesWithRatings.reduce((sum, note) => sum + note.averageRating, 0) / notesWithRatings.length
      : 0;

    return {
      uploadedNotesCount: uploadedNotes.length,
      bookmarksCount: bookmarks.length,
      totalDownloads,
      averageRating: parseFloat(averageRating.toFixed(1))
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return {
      uploadedNotesCount: 0,
      bookmarksCount: 0,
      totalDownloads: 0,
      averageRating: 0
    };
  }
};

// ---------------- NOTICES ----------------
export async function addNotice(notice) {
  const colRef = collection(db, "notices");
  const docRef = await addDoc(colRef, notice);
  return { id: docRef.id, ...notice };
}

export async function getNotices(filters = {}) {
  const cond = [];
  if (filters.branch && filters.branch !== "all") cond.push(where("branch", "in", [filters.branch, "all"]));
  if (filters.academicYear && filters.academicYear !== "all") cond.push(where("academicYear", "in", [filters.academicYear, "all"]));
  if (filters.semester && filters.semester !== "all") cond.push(where("semester", "in", [filters.semester, "all"]));
  let q;
  if (cond.length > 0) q = query(collection(db, "notices"), ...cond, orderBy("postedAt", "desc"));
  else q = query(collection(db, "notices"), orderBy("postedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------------- SUBMISSIONS ----------------
export async function addSubmission(submission) {
  const colRef = collection(db, "submissions");
  const docRef = await addDoc(colRef, submission);
  return { id: docRef.id, ...submission };
}

export async function getSubmissions(filters = {}) {
  const cond = [];
  if (filters.branch && filters.branch !== "all") cond.push(where("branch", "in", [filters.branch, "all"]));
  if (filters.academicYear && filters.academicYear !== "all") cond.push(where("academicYear", "in", [filters.academicYear, "all"]));
  if (filters.semester && filters.semester !== "all") cond.push(where("semester", "in", [filters.semester, "all"]));
  let q;
  if (cond.length > 0) q = query(collection(db, "submissions"), ...cond, orderBy("createdAt", "desc"));
  else q = query(collection(db, "submissions"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
