import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  MessageSquare, 
  FileText, 
  Search, 
  BookOpen,
  Send,
  Bot,
  User,
  Sparkles,
  CloudUpload,
  CheckCircle,
  AlertCircle,
  X,
  Database,
  Filter,
  Plus,
  Trash2,
  Download,
  Star,
  Eye,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  deleteDoc,  // Added missing import
  serverTimestamp 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';  // Added missing import
import { db } from '../../services/firebase';
import { 
  initializeGoogleDrive, 
  signInToGoogle, 
  isAuthenticated,
  getFileUrl,
  downloadFile,
  getAccessToken
} from '../../services/driveService';

// Gemini API utilities
const getNextGeminiKey = () => {
  const keys = (import.meta.env.VITE_GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    throw new Error("No Gemini API keys configured in VITE_GEMINI_API_KEY");
  }
  const index = Math.floor(Math.random() * keys.length);
  return keys[index];
};

const withGeminiRetry = async (requestFn, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = getNextGeminiKey();
    try {
      const result = await requestFn(apiKey);
      return result;
    } catch (err) {
      console.warn(`Gemini attempt ${attempt + 1} failed: ${err.message}`);
      lastError = err;
      
      if (err.message.includes('quota') || err.message.includes('rate')) {
        continue;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  throw new Error(`All Gemini API keys failed: ${lastError?.message}`);
};

// Convert file to base64 for Gemini API
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // Remove data:mime;base64, prefix
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

// Enhanced chat function
const chatWithFile = async (file, question, chatHistory) => {
  const MODEL = "gemini-1.5-flash";
  
  const conversationContext = chatHistory.slice(-6).map(msg => 
    `${msg.sender === 'user' ? 'Human' : 'AI'}: ${msg.text}`
  ).join('\n');
  
  const prompt = `
You are an AI study assistant helping students understand their document content. Answer questions based on the provided document.

${conversationContext ? `Previous conversation:\n${conversationContext}\n` : ''}

Current question: ${question}

Instructions:
- Answer based on the document content provided
- If the question is not covered in the document, mention that politely and try to provide general guidance
- Be helpful, clear, and educational in your responses
- Use examples from the document when possible
- Keep responses concise but informative (aim for 2-4 sentences)
- If asked for summaries, provide structured bullet points
- If asked for practice questions, create 3-5 relevant questions
- Format your response clearly with proper spacing

Answer:
`.trim();

  return await withGeminiRetry(async (apiKey) => {
    // Convert file to base64
    const base64Data = await fileToBase64(file);
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: 'application/pdf',
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 1024
      }
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!text) throw new Error("No response from Gemini");
    return text;
  });
};

const fetchGoogleDriveFile = async (fileId, fileName, mimeType) => {
  try {
    const token = getAccessToken(); // may be undefined

    // 1) Try Drive API (works if token has access OR file is publicly visible to API)
    const driveApiUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
    let res;
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      res = await fetch(driveApiUrl, { headers, mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        return new File([blob], fileName, { type: mimeType });
      }
      console.warn('[fetchGoogleDriveFile] Drive API fetch failed', res.status, res.statusText);
    } catch (e) {
      console.warn('[fetchGoogleDriveFile] Drive API request threw', e);
    }

    // 2) If Drive API failed with 404/403, try the unauthenticated public endpoint (works for "anyone with the link")
    const publicUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
    try {
      res = await fetch(publicUrl, { mode: 'cors' }); // no Authorization header
      if (res.ok) {
        const blob = await res.blob();
        return new File([blob], fileName, { type: mimeType });
      }
      console.warn('[fetchGoogleDriveFile] public uc endpoint failed', res.status, res.statusText);
    } catch (e) {
      console.warn('[fetchGoogleDriveFile] public uc request threw', e);
    }

    // 3) As a last resort, surface a helpful error
    if (res && (res.status === 404 || res.status === 403)) {
      throw new Error(`Failed to download file: ${res.status} ${res.statusText} — check fileId and sharing settings (is it public or in a Shared Drive?).`);
    }

    throw new Error('Failed to download file: unknown error (see logs)');

  } catch (error) {
    console.error('Error fetching Google Drive file:', error);
    throw error;
  }
};


// IMPROVED: Better authentication checking
const getCurrentUser = () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  console.log('[getCurrentUser] Current authentication state:', {
    hasUser: !!currentUser,
    uid: currentUser?.uid || 'none',
    email: currentUser?.email || 'none',
    isAnonymous: currentUser?.isAnonymous || false
  });
  return currentUser;
};

// IMPROVED: Enhanced chat storage functions with better authentication handling
const saveChatToDatabase = async (noteId, chatHistory, userProfile = null) => {
  console.log('[saveChatToDatabase] Starting save operation:', { 
    noteId, 
    chatHistoryLength: chatHistory?.length, 
    userProfileUid: userProfile?.uid,
    fallbackCheck: 'attempting getCurrentUser fallback'
  });

  if (!noteId) {
    console.error('[saveChatToDatabase] ERROR: missing noteId');
    return { ok: false, reason: 'missing-noteId' };
  }

  // IMPROVED: Try multiple ways to get user ID
  let uid = userProfile?.uid;
  
  // Fallback 1: Try getCurrentUser
  if (!uid) {
    const currentUser = getCurrentUser();
    uid = currentUser?.uid;
    console.log('[saveChatToDatabase] Fallback 1 - getCurrentUser result:', { uid });
  }
  
  // Fallback 2: Try getAuth directly
  if (!uid) {
    try {
      const auth = getAuth();
      uid = auth.currentUser?.uid;
      console.log('[saveChatToDatabase] Fallback 2 - getAuth direct result:', { uid });
    } catch (error) {
      console.warn('[saveChatToDatabase] getAuth failed:', error);
    }
  }

  if (!uid) {
    console.error('[saveChatToDatabase] ERROR: No user ID found through any method');
    return { ok: false, reason: 'no-authentication' };
  }

  if (!Array.isArray(chatHistory) || chatHistory.length === 0) {
    console.warn('[saveChatToDatabase] WARNING: empty chatHistory, nothing to save');
    return { ok: false, reason: 'empty-history' };
  }

  const docId = `${noteId}_${uid}`;
  const chatRef = doc(db, 'chats', docId);
  
  console.log('[saveChatToDatabase] About to write to:', { 
    collection: 'chats',
    docId: docId,
    messageCount: chatHistory.length,
    fullPath: `chats/${docId}`,
    finalUid: uid
  });

  try {
    const processedChatHistory = chatHistory.map((msg, index) => {
      let timestampISO;
      
      if (msg.timestamp instanceof Date) {
        timestampISO = msg.timestamp.toISOString();
      } else if (msg.timestamp?.toDate) {
        timestampISO = msg.timestamp.toDate().toISOString();
      } else if (typeof msg.timestamp === 'string') {
        timestampISO = msg.timestamp;
      } else {
        timestampISO = new Date().toISOString();
      }
      
      console.log(`[saveChatToDatabase] Processing message ${index + 1}:`, {
        sender: msg.sender,
        textLength: msg.text?.length || 0,
        originalTimestamp: msg.timestamp,
        processedTimestamp: timestampISO
      });
      
      return { 
        ...msg, 
        timestamp: timestampISO,
        messageId: `${Date.now()}_${index}`
      };
    });

    const chatData = {
      noteId,
      userId: uid,
      chatHistory: processedChatHistory,
      messageCount: processedChatHistory.length,
      lastUpdated: serverTimestamp(),
      createdAt: serverTimestamp(),
      version: 1
    };

    console.log('[saveChatToDatabase] Data to be saved:', {
      ...chatData,
      chatHistory: `[${chatData.chatHistory.length} messages]`
    });

    await setDoc(chatRef, chatData, { merge: true });

    console.log('[saveChatToDatabase] ✅ SUCCESS: Chat saved to Firestore');
    return { ok: true, docId, uid };
    
  } catch (err) {
    console.error('[saveChatToDatabase] ❌ FAILED:', {
      errorCode: err.code,
      errorMessage: err.message,
      errorStack: err.stack,
      docPath: `chats/${docId}`,
      uid
    });
    return { ok: false, reason: err.message, code: err.code };
  }
};

const loadChatFromDatabase = async (noteId, userProfile = null) => {
  console.log('[loadChatFromDatabase] Starting load operation:', { 
    noteId, 
    userProfileUid: userProfile?.uid,
    fallbackCheck: 'attempting getCurrentUser fallback'
  });

  if (!noteId) {
    console.warn('[loadChatFromDatabase] Missing noteId');
    return [];
  }
  
  // IMPROVED: Try multiple ways to get user ID
  let uid = userProfile?.uid;
  
  if (!uid) {
    const currentUser = getCurrentUser();
    uid = currentUser?.uid;
    console.log('[loadChatFromDatabase] Fallback - getCurrentUser result:', { uid });
  }
  
  if (!uid) {
    console.warn('[loadChatFromDatabase] No user ID available, returning empty chat');
    return [];
  }
  
  try {
    const docId = `${noteId}_${uid}`;
    console.log('[loadChatFromDatabase] Loading from docId:', docId);
    
    const chatRef = doc(db, 'chats', docId);
    const chatDoc = await getDoc(chatRef);
    
    if (chatDoc.exists()) {
      const data = chatDoc.data();
      console.log('[loadChatFromDatabase] Document exists, raw data:', {
        messageCount: data.messageCount,
        hasMessages: !!data.chatHistory,
        messagesLength: data.chatHistory?.length || 0,
        lastUpdated: data.lastUpdated,
        userId: data.userId
      });
      
      const chatHistory = (data.chatHistory || []).map((msg, index) => {
        let timestamp;
        try {
          if (typeof msg.timestamp === 'string') {
            timestamp = new Date(msg.timestamp);
          } else if (msg.timestamp?.toDate) {
            timestamp = msg.timestamp.toDate();
          } else if (msg.timestamp instanceof Date) {
            timestamp = msg.timestamp;
          } else {
            timestamp = new Date();
          }
        } catch (e) {
          console.warn(`[loadChatFromDatabase] Invalid timestamp for message ${index}:`, msg.timestamp);
          timestamp = new Date();
        }
        
        return {
          ...msg,
          timestamp
        };
      });
      
      console.log('[loadChatFromDatabase] ✅ SUCCESS: Loaded chat history with', chatHistory.length, 'messages');
      return chatHistory;
    } else {
      console.log('[loadChatFromDatabase] No existing chat document found for:', docId);
      return [];
    }
    
  } catch (error) {
    console.error('[loadChatFromDatabase] ❌ FAILED:', {
      errorCode: error.code,
      errorMessage: error.message,
      noteId,
      uid
    });
    return [];
  }
};

const deleteChatFromDatabase = async (noteId, userProfile = null) => {
  console.log('[deleteChatFromDatabase] Starting delete operation:', { 
    noteId, 
    userProfileUid: userProfile?.uid 
  });

  if (!noteId) {
    console.error('[deleteChatFromDatabase] Missing noteId');
    return;
  }
  
  let uid = userProfile?.uid;
  if (!uid) {
    const currentUser = getCurrentUser();
    uid = currentUser?.uid;
  }
  
  if (!uid) {
    console.error('[deleteChatFromDatabase] No user ID available');
    return;
  }
  
  try {
    const docId = `${noteId}_${uid}`;
    console.log('[deleteChatFromDatabase] Deleting docId:', docId);
    
    const chatRef = doc(db, 'chats', docId);
    await deleteDoc(chatRef);
    
    console.log('[deleteChatFromDatabase] ✅ SUCCESS: Chat document deleted from database');
    
  } catch (error) {
    console.error('[deleteChatFromDatabase] ❌ FAILED:', {
      errorCode: error.code,
      errorMessage: error.message,
      noteId,
      uid
    });
    throw error;
  }
};

const AIChatNotes = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedNote, setSelectedNote] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  
  // Real data state
  const [notes, setNotes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);
  
  // Chat state
  const [chatHistory, setChatHistory] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSavingChat, setIsSavingChat] = useState(false);
  
  // Quick questions
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const quickQuestions = [
    "Summarize the main topics covered in this document",
    "What are the most important concepts I should focus on?", 
    "Create practice questions to test my understanding",
    "Make a study plan based on this content",
    "What topics are likely to appear in exams?",
    "Explain the most difficult concepts in simple terms"
  ];
  
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Debug useEffect to log state changes
  useEffect(() => {
    console.log('[DEBUG] State changed:', {
      selectedNoteId: selectedNote?.id || 'none',
      chatHistoryLength: chatHistory.length,
      userProfileUid: userProfile?.uid || 'none',
      isTyping,
      isSavingChat
    });
  }, [selectedNote, chatHistory, userProfile, isTyping, isSavingChat]);

  // Initialize Google Drive on component mount
  useEffect(() => {
    console.log('[useEffect] Initializing Google Drive...');
    initializeGoogleDrive().catch(error => {
      console.error('Failed to initialize Google Drive:', error);
    });
  }, []);

  // Load notes from Firestore
  useEffect(() => {
    console.log('[useEffect] Loading notes from database...');
    loadNotesFromDatabase();
  }, []);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isTyping]);

  // FIXED auto-save useEffect with comprehensive logging
  useEffect(() => {
    console.log('[useEffect] Auto-save check:', {
      hasSelectedNote: !!selectedNote?.id,
      chatHistoryLength: chatHistory.length,
      hasUserUid: !!userProfile?.uid,
      isTyping,
      shouldSave: selectedNote?.id && chatHistory.length > 0 && userProfile?.uid && !isTyping
    });

    if (selectedNote?.id && chatHistory.length > 0 && userProfile?.uid && !isTyping) {
      console.log('[useEffect] Setting up auto-save timer for 2 seconds...');
      
      const saveTimer = setTimeout(async () => {
        console.log('[AUTO-SAVE] Timer triggered, starting save...');
        try {
          setIsSavingChat(true);
          const result = await saveChatToDatabase(selectedNote.id, chatHistory, userProfile);
          
          if (result.ok) {
            console.log('[AUTO-SAVE] ✅ SUCCESS: Chat auto-saved successfully');
          } else {
            console.error('[AUTO-SAVE] ❌ FAILED:', result);
            setMessage({ 
              type: 'error', 
              text: `Auto-save failed: ${result.reason}. Your messages are still local.` 
            });
          }
        } catch (error) {
          console.error('[AUTO-SAVE] ❌ EXCEPTION:', error);
          setMessage({ 
            type: 'error', 
            text: 'Failed to auto-save chat. Your messages are still local.' 
          });
        } finally {
          setIsSavingChat(false);
          console.log('[AUTO-SAVE] Save operation completed');
        }
      }, 2000);

      return () => {
        console.log('[useEffect] Clearing auto-save timer');
        clearTimeout(saveTimer);
      };
    } else {
      console.log('[useEffect] Auto-save conditions not met, skipping');
    }
  }, [chatHistory, selectedNote?.id, userProfile?.uid, isTyping]);

  const validatePDFFile = (file) => {
    console.log('[validatePDFFile] Validating file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    // Check MIME type
    if (file.type !== 'application/pdf') {
      console.error('[validatePDFFile] Invalid MIME type:', file.type);
      return false;
    }
    
    // Check file extension
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      console.error('[validatePDFFile] Invalid file extension');
      return false;
    }
    
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      console.error('[validatePDFFile] File too large:', file.size);
      return false;
    }
    
    console.log('[validatePDFFile] ✅ File validation passed');
    return true;
  };

  const handleFileUpload = async (file) => {
    console.log('[handleFileUpload] Starting file upload:', file?.name);
    
    if (!file) return;
    
    if (!validatePDFFile(file)) {
      setMessage({ 
        type: 'error', 
        text: 'Please upload a PDF file only. Other file formats are not supported.' 
      });
      return;
    }

    try {
      console.log('[handleFileUpload] Setting up uploaded file...');
      setUploadedFile(file);
      setCurrentFile(file);
      setChatHistory([]);
      setSelectedNote(null);
      setShowQuickQuestions(true);
      
      console.log('[handleFileUpload] ✅ File upload completed successfully');
      setMessage({ 
        type: 'success', 
        text: `PDF file "${file.name}" uploaded successfully and ready for chat!` 
      });
      
    } catch (error) {
      console.error('[handleFileUpload] ❌ File processing error:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to process file: ${error.message}` 
      });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleSelectNote = async (note) => {
    console.log('[handleSelectNote] Selecting note:', {
      noteId: note.id,
      title: note.title,
      fileName: note.fileName
    });

    try {
      setLoading(true);
      
      // Check if note is PDF by file extension since no mimeType field
      const isPDF = (note.fileName && note.fileName.toLowerCase().endsWith('.pdf')) ||
                    (note.title && note.title.toLowerCase().endsWith('.pdf'));
      
      if (!isPDF) {
        console.error('[handleSelectNote] Note is not a PDF file');
        setMessage({ 
          type: 'error', 
          text: 'This note is not a PDF file. Only PDF files are supported for chat.' 
        });
        setLoading(false);
        return;
      }
      
      setSelectedNote(note);
      setUploadedFile(null);
      
      // Authenticate with Google Drive if needed
      if (!isAuthenticated()) {
        console.log('[handleSelectNote] Not authenticated, signing in...');
        await signInToGoogle();
      }
      
      // Use fileName if available, otherwise use title with .pdf extension
      const fileName = note.fileName || `${note.title}.pdf`;
      
      console.log('[handleSelectNote] Fetching file from Google Drive...');
      // Fetch the actual file from Google Drive
      const file = await fetchGoogleDriveFile(note.fileId, fileName, 'application/pdf');
      setCurrentFile(file);
      
      console.log('[handleSelectNote] Loading previous chat history...');
      // Load previous chat history from database
      const previousChat = await loadChatFromDatabase(note.id, userProfile);
      setChatHistory(previousChat);
      
      console.log('[handleSelectNote] ✅ Note selection completed successfully');
      setMessage({ 
        type: 'success', 
        text: `Loaded "${note.title}" successfully! Ready to chat.${previousChat.length > 0 ? ` (${previousChat.length} previous messages loaded)` : ''}` 
      });
      setShowQuickQuestions(previousChat.length === 0);
      
    } catch (error) {
      console.error('[handleSelectNote] ❌ Error selecting note:', error);
      if (error.message.includes('Not authenticated') || error.message.includes('Authentication expired')) {
        setMessage({ 
          type: 'error', 
          text: 'Authentication required. Please sign in to Google Drive to access your notes.' 
        });
        try {
          await signInToGoogle();
          setMessage({ 
            type: 'info', 
            text: 'Signed in successfully. Please try selecting the note again.' 
          });
        } catch (authError) {
          console.error('Re-authentication failed:', authError);
          setMessage({ 
            type: 'error', 
            text: 'Failed to authenticate with Google Drive. Please refresh the page and try again.' 
          });
        }
      } else {
        setMessage({ 
          type: 'error', 
          text: `Failed to load note: ${error.message}` 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (question) => {
    const cleanQuestion = question.replace(/^[📝🔍❓📊🎯💡]\s*/, '');
    setCurrentQuestion(cleanQuestion);
    setShowQuickQuestions(false);
    setTimeout(() => handleSendMessage(cleanQuestion), 100);
  };

  // FIXED handleSendMessage function with comprehensive logging
  const handleSendMessage = async (questionOverride = null) => {
    const question = questionOverride || currentQuestion.trim();
    console.log('[handleSendMessage] Starting message send:', {
      question: question.substring(0, 50) + (question.length > 50 ? '...' : ''),
      hasCurrentFile: !!currentFile,
      isTyping,
      currentChatLength: chatHistory.length
    });

    if (!question || !currentFile || isTyping) {
      console.warn('[handleSendMessage] Validation failed:', {
        hasQuestion: !!question,
        hasCurrentFile: !!currentFile,
        isTyping
      });
      return;
    }
    
    // Create user message
    const userMessage = { 
      sender: 'user', 
      text: question, 
      timestamp: new Date(),
      id: `user_${Date.now()}`
    };
    
    const newChatHistory = [...chatHistory, userMessage];
    console.log('[handleSendMessage] Adding user message, new length:', newChatHistory.length);
    setChatHistory(newChatHistory);
    
    if (!questionOverride) setCurrentQuestion('');
    setIsTyping(true);
    
    try {
      console.log('[handleSendMessage] Calling Gemini API...');
      const response = await chatWithFile(currentFile, question, chatHistory);
      console.log('[handleSendMessage] Gemini response received, length:', response.length);
      
      const aiMessage = { 
        sender: 'ai', 
        text: response, 
        timestamp: new Date(),
        id: `ai_${Date.now()}`
      };
      
      const finalChatHistory = [...newChatHistory, aiMessage];
      console.log('[handleSendMessage] Final chat history length:', finalChatHistory.length);
      setChatHistory(finalChatHistory);
      
      // FIXED: Better error handling for auto-save with immediate save
      if (selectedNote?.id && userProfile?.uid) {
        console.log('[handleSendMessage] Triggering immediate save after message...');
        try {
          setIsSavingChat(true);
          const saveResult = await saveChatToDatabase(selectedNote.id, finalChatHistory, userProfile);
          
          if (saveResult.ok) {
            console.log('[handleSendMessage] ✅ Immediate save completed successfully');
          } else {
            console.error('[handleSendMessage] ❌ Immediate save failed:', saveResult);
            setMessage({ 
              type: 'error', 
              text: `Failed to save chat: ${saveResult.reason}` 
            });
          }
        } catch (saveError) {
          console.error('[handleSendMessage] ❌ Save exception:', saveError);
          setMessage({ 
            type: 'error', 
            text: 'Failed to save chat. Your messages are still local.' 
          });
        } finally {
          setIsSavingChat(false);
        }
      } else {
        console.log('[handleSendMessage] Skipping save - missing requirements:', {
          hasSelectedNote: !!selectedNote?.id,
          hasUserUid: !!userProfile?.uid
        });
      }
      
    } catch (error) {
      console.error('[handleSendMessage] ❌ Gemini API error:', error);
      let errorText = 'Sorry, I encountered an error while processing your question.';
      
      if (error.message.includes('quota') || error.message.includes('rate')) {
        errorText = 'API quota exceeded. Please try again in a moment.';
      } else if (error.message.includes('No Gemini API keys')) {
        errorText = 'Gemini API not configured. Please contact administrator.';
      } else if (error.message.includes('file size') || error.message.includes('too large')) {
        errorText = 'File is too large for processing. Please try a smaller file.';
      }
      
      const errorMessage = { 
        sender: 'ai', 
        text: errorText, 
        timestamp: new Date(),
        id: `error_${Date.now()}`
      };
      const finalChatHistory = [...newChatHistory, errorMessage];
      setChatHistory(finalChatHistory);
      
      // Save error message to database too
      if (selectedNote?.id && userProfile?.uid) {
        try {
          await saveChatToDatabase(selectedNote.id, finalChatHistory, userProfile);
          console.log('[handleSendMessage] Error message saved to database');
        } catch (saveError) {
          console.error('[handleSendMessage] Failed to save error message:', saveError);
        }
      }
    } finally {
      setIsTyping(false);
      console.log('[handleSendMessage] Message send operation completed');
    }
  };

  const loadNotesFromDatabase = async () => {
    console.log('[loadNotesFromDatabase] Starting notes load...');
    setLoading(true);
    try {
      const notesRef = collection(db, 'notes');
      // Simple query - just order by uploadedAt, no mimeType filter needed
      const q = query(notesRef, orderBy('uploadedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      console.log('[loadNotesFromDatabase] Query completed, docs found:', querySnapshot.size);
      
      const notesData = [];
      const deptSet = new Set();
      const semSet = new Set();
      
      querySnapshot.forEach((doc) => {
        const noteData = { id: doc.id, ...doc.data() };
        
        // Filter PDF files in JavaScript by checking file extension
        const isPDF = (noteData.fileName && noteData.fileName.toLowerCase().endsWith('.pdf')) ||
                      (noteData.title && noteData.title.toLowerCase().endsWith('.pdf'));
        
        console.log('[loadNotesFromDatabase] Processing note:', {
          id: noteData.id,
          title: noteData.title,
          fileName: noteData.fileName,
          isPDF
        });
        
        if (isPDF) {
          notesData.push(noteData);
          if (noteData.department) deptSet.add(noteData.department);
          if (noteData.semester) semSet.add(noteData.semester);
        }
      });
      
      console.log('[loadNotesFromDatabase] ✅ Filtered PDF notes:', {
        totalDocs: querySnapshot.size,
        pdfNotes: notesData.length,
        departments: Array.from(deptSet),
        semesters: Array.from(semSet)
      });
      
      setNotes(notesData);
      setDepartments(Array.from(deptSet).sort());
      setSemesters(Array.from(semSet).sort((a, b) => parseInt(a) - parseInt(b)));
      setNotesLoaded(true);
      
      if (notesData.length === 0) {
        console.log('[loadNotesFromDatabase] No PDF notes found');
        setMessage({ 
          type: 'info', 
          text: 'No PDF notes found in the database. Upload some PDF files to get started!' 
        });
      }
      
    } catch (error) {
      console.error('[loadNotesFromDatabase] ❌ Error loading notes:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to load notes: ${error.message}` 
      });
      setNotesLoaded(true);
    } finally {
      setLoading(false);
      console.log('[loadNotesFromDatabase] Load operation completed');
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = !filterDepartment || note.department === filterDepartment;
    const matchesSemester = !filterSemester || note.semester === filterSemester;
    return matchesSearch && matchesDepartment && matchesSemester;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return (a.title || '').localeCompare(b.title || '');
      case 'subject':
        return (a.subject || '').localeCompare(b.subject || '');
      case 'semester':
        return parseInt(a.semester || '0') - parseInt(b.semester || '0');
      default: // 'recent'
        return new Date(b.createdAt?.toDate() || 0) - new Date(a.createdAt?.toDate() || 0);
    }
  });

  const clearChat = async () => {
    console.log('[clearChat] Clearing chat history...');
    setChatHistory([]);
    setShowQuickQuestions(true);
    
    if (selectedNote?.id && userProfile?.uid) {
      console.log('[clearChat] Deleting chat from database...');
      try {
        await deleteChatFromDatabase(selectedNote.id, userProfile);
        console.log('[clearChat] ✅ Chat cleared from database successfully');
      } catch (error) {
        console.error('[clearChat] ❌ Failed to clear chat from database:', error);
      }
    }
    
    setMessage({ type: 'info', text: 'Chat history cleared.' });
  };

  const exportChatHistory = () => {
    console.log('[exportChatHistory] Exporting chat history:', chatHistory.length, 'messages');
    
    if (chatHistory.length === 0) {
      console.warn('[exportChatHistory] No chat history to export');
      return;
    }
    
    const chatText = chatHistory.map(msg => 
      `${msg.sender === 'user' ? 'Q' : 'A'}: ${msg.text}\nTime: ${msg.timestamp.toLocaleString()}\n`
    ).join('\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_history_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[exportChatHistory] ✅ Chat history exported successfully');
    setMessage({ type: 'success', text: 'Chat history exported successfully!' });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const now = new Date();
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  // Debug function - you can call this from browser console
  window.debugChatState = () => {
    console.log('=== CHAT DEBUG STATE ===');
    console.log('Selected Note:', selectedNote);
    console.log('User Profile:', userProfile);
    console.log('Chat History:', chatHistory);
    console.log('Current File:', currentFile);
    console.log('Is Saving Chat:', isSavingChat);
    console.log('========================');
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3 mb-3 sm:mb-4">
          <div className="p-2 sm:p-3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg sm:rounded-xl">
            <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              AI Chat with PDF Notes
            </h1>
            <p className="text-white/70 text-sm sm:text-base lg:text-lg">
              Upload PDF files or select existing PDF notes to chat with AI
            </p>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div className={`flex items-start space-x-3 p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all ${
          message.type === 'error' 
            ? 'bg-red-500/10 border-red-500/20 text-red-300'
            : message.type === 'success'
            ? 'bg-green-500/10 border-green-500/20 text-green-300'
            : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
        }`}>
          {message.type === 'error' ? <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" /> :
           message.type === 'success' ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" /> :
           <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
          <span className="font-medium text-sm sm:text-base">{message.text}</span>
          <button 
            onClick={() => setMessage({ type: '', text: '' })}
            className="ml-auto text-current hover:opacity-70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Left Panel - Note Selection */}
        <div className="xl:col-span-1 space-y-4 sm:space-y-6">
          {/* Tab Selection */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10 p-1">
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all text-sm sm:text-base ${
                  activeTab === 'upload' 
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg' 
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload PDF</span>
              </button>
              <button
                onClick={() => setActiveTab('existing')}
                className={`flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all text-sm sm:text-base ${
                  activeTab === 'existing' 
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg' 
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>PDF Library ({notes.length})</span>
              </button>
            </div>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'upload' ? (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10 p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                <CloudUpload className="w-5 h-5 text-violet-400" />
                <span>Upload PDF File</span>
              </h3>
              
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
                  dragOver 
                    ? 'border-violet-400 bg-violet-500/10 scale-[1.02]' 
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                {uploadedFile ? (
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium break-all">{uploadedFile.name}</p>
                      <p className="text-white/60 text-xs mt-1">
                        {formatFileSize(uploadedFile.size)} • PDF Ready for chat
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        console.log('[handleFileUpload] Removing uploaded file');
                        setUploadedFile(null);
                        setCurrentFile(null);
                        setChatHistory([]);
                        setShowQuickQuestions(true);
                        setSelectedNote(null);
                      }}
                      className="flex items-center space-x-2 mx-auto px-3 py-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/30 transition-all text-sm"
                    >
                      <X className="w-4 h-4" />
                      <span>Remove</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                      <FileText className="w-6 h-6 text-white/50" />
                    </div>
                    <div>
                      <p className="text-white mb-2">
                        <span className="hidden sm:inline">Drag and drop your PDF here, or </span>
                        <label className="text-violet-400 cursor-pointer hover:text-violet-300 font-medium underline">
                          browse
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,application/pdf"
                            onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                          />
                        </label>
                      </p>
                      <p className="text-white/50 text-xs">
                        PDF files only (Max 50MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* PDF Information */}
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="text-white/80 font-medium text-sm mb-2 flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>PDF-Only Chat</span>
                  </h4>
                  <ul className="text-white/60 text-xs space-y-1">
                    <li>• Only PDF files are supported for optimal AI processing</li>
                    <li>• Chat history automatically saved to database</li>
                    <li>• Previous conversations restored when reopening notes</li>
                    <li>• Best text extraction and layout understanding</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center space-x-2">
                  <Database className="w-5 h-5 text-violet-400" />
                  <span>PDF Notes Library</span>
                </h3>
                <button
                  onClick={loadNotesFromDatabase}
                  disabled={loading}
                  className="flex items-center space-x-2 p-2 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-lg transition-all disabled:opacity-50"
                  title="Refresh notes"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="text-xs">Refresh</span>
                </button>
              </div>
              
              {/* Search, Filter and Sort */}
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
                  <input
                    type="text"
                    placeholder="Search PDF notes by title, subject, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-violet-400 text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-400 text-sm"
                  >
                    <option value="" className="bg-slate-800">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept} className="bg-slate-800">{dept}</option>
                    ))}
                  </select>
                  <select
                    value={filterSemester}
                    onChange={(e) => setFilterSemester(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-400 text-sm"
                  >
                    <option value="" className="bg-slate-800">All Semesters</option>
                    {semesters.map(sem => (
                      <option key={sem} value={sem} className="bg-slate-800">Semester {sem}</option>
                    ))}
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-400 text-sm"
                  >
                    <option value="recent" className="bg-slate-800">Recent</option>
                    <option value="title" className="bg-slate-800">Title A-Z</option>
                    <option value="subject" className="bg-slate-800">Subject</option>
                    <option value="semester" className="bg-slate-800">Semester</option>
                  </select>
                </div>
              </div>
              
              {/* Notes List */}
              <div className="space-y-3 max-h-96 overflow-y-auto overflow-x-hidden scrollbar-hide">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400 mx-auto mb-4"></div>
                    <p className="text-white/60">Loading PDF notes...</p>
                  </div>
                ) : filteredNotes.length > 0 ? (
                  filteredNotes.map(note => (
                    <div
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                        selectedNote?.id === note.id 
                          ? 'bg-violet-500/20 border-violet-400/50' 
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <FileText className="w-5 h-5 text-red-400" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white text-sm truncate mb-1">{note.title}</h4>
                          {note.description && (
                            <p className="text-white/80 text-xs mb-2 line-clamp-2">{note.description}</p>
                          )}
                          <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                            <span>{note.subject}</span>
                            <span>{note.fileSize ? formatFileSize(note.fileSize) : 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/40">{note.department} • Sem {note.semester}</span>
                            <span className="text-white/40">{getTimeAgo(note.createdAt)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-2">
                            <span className="text-white/60">By: {note.uploadedBy}</span>
                            <span className="text-white/60">{note.academicYear}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <span className="text-green-400 text-xs">Google Drive PDF</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MessageSquare className="w-3 h-3 text-blue-400" />
                              <span className="text-blue-400 text-xs">Chat Available</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : notesLoaded ? (
                  <div className="text-center py-8 text-white/60">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No PDF notes found</p>
                    {searchQuery || filterDepartment || filterSemester ? (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setFilterDepartment('');
                          setFilterSemester('');
                        }}
                        className="mt-2 text-violet-400 hover:text-violet-300 text-sm underline"
                      >
                        Clear filters
                      </button>
                    ) : (
                      <p className="text-white/40 text-sm mt-2">
                        Upload some PDF notes to get started
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Chat Interface */}
        <div className="xl:col-span-2">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10 h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">AI Study Assistant</h3>
                  <p className="text-white/60 text-xs">
                    {uploadedFile ? (
                      <>Chatting with: {uploadedFile.name}</>
                    ) : 
                     selectedNote ? (
                      <>Chatting with: {selectedNote.title}</>
                     ) : 
                     'Select or upload a PDF file to start chatting'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {isSavingChat && (
                  <div className="flex items-center space-x-1 text-green-400 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </div>
                )}
                {selectedNote?.fileId && (
                  <button
                    onClick={() => window.open(getFileUrl(selectedNote.fileId), '_blank')}
                    className="p-2 text-white/60 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-all"
                    title="View in Google Drive"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                {chatHistory.length > 0 && (
                  <>
                    <button
                      onClick={exportChatHistory}
                      className="p-2 text-white/60 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all"
                      title="Export chat history"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={clearChat}
                      className="p-2 text-white/60 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Clear chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Chat Messages */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
            >
              {!currentFile ? (
                <div className="flex items-center justify-center h-full text-white/60">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Ready to Chat!</p>
                    <p className="text-sm">Upload a PDF file or select an existing PDF note to start asking questions.</p>
                  </div>
                </div>
              ) : chatHistory.length === 0 ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-center text-white/60">
                    <div className="text-center">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 text-violet-400" />
                      <p className="text-lg font-medium mb-2">Start Your Conversation</p>
                      <p className="text-sm">Ask me anything about your PDF document!</p>
                      <div className="mt-2 text-xs text-white/50">
                        PDF ready: {currentFile.name} ({formatFileSize(currentFile.size)})
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Questions */}
                  {showQuickQuestions && (
                    <div className="space-y-3">
                      <h4 className="text-white/80 font-medium text-center text-sm">Quick Start Questions:</h4>
                      <div className="grid gap-2">
                        {quickQuestions.map((question, index) => (
                          <button
                            key={index}
                            onClick={() => handleQuickQuestion(question)}
                            className="p-3 bg-white/5 border border-white/20 rounded-lg text-left text-white/80 hover:bg-white/10 hover:border-violet-400/50 transition-all text-sm"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {chatHistory.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex items-start space-x-3 ${
                        msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        msg.sender === 'user' 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600' 
                          : 'bg-gradient-to-r from-violet-500 to-purple-600'
                      }`}>
                        {msg.sender === 'user' ? 
                          <User className="w-4 h-4 text-white" /> : 
                          <Bot className="w-4 h-4 text-white" />
                        }
                      </div>
                      <div className={`flex-1 ${msg.sender === 'user' ? 'text-right' : ''}`}>
                        <div className={`inline-block p-3 rounded-lg max-w-[85%] ${
                          msg.sender === 'user' 
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                            : 'bg-white/10 text-white border border-white/20'
                        }`}>
                          <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        </div>
                        <p className="text-xs text-white/40 mt-1">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white/10 border border-white/20 rounded-lg p-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 sm:p-6 border-t border-white/10">
              {/* Quick Actions */}
              {currentFile && chatHistory.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => handleQuickQuestion("📝 Summarize the main topics covered")}
                    className="px-3 py-1 bg-white/10 border border-white/20 text-white/80 rounded-lg hover:bg-white/20 transition-all text-xs"
                  >
                    📝 Summarize
                  </button>
                  <button
                    onClick={() => handleQuickQuestion("❓ Give me practice questions")}
                    className="px-3 py-1 bg-white/10 border border-white/20 text-white/80 rounded-lg hover:bg-white/20 transition-all text-xs"
                  >
                    ❓ Quiz Me
                  </button>
                  <button
                    onClick={() => handleQuickQuestion("🔍 What are the key concepts?")}
                    className="px-3 py-1 bg-white/10 border border-white/20 text-white/80 rounded-lg hover:bg-white/20 transition-all text-xs"
                  >
                    🔍 Key Points
                  </button>
                  <button
                    onClick={() => handleQuickQuestion("💡 Explain the most difficult concepts in simple terms")}
                    className="px-3 py-1 bg-white/10 border border-white/20 text-white/80 rounded-lg hover:bg-white/20 transition-all text-xs"
                  >
                    💡 Simplify
                  </button>
                </div>
              )}
              
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <textarea
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={currentFile ? "Ask a question about your PDF document..." : "Please select or upload a PDF file first"}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 resize-none"
                    rows={2}
                    disabled={!currentFile || isTyping}
                  />
                </div>
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!currentQuestion.trim() || !currentFile || isTyping}
                  className="p-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isTyping ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              {/* Chat Stats */}
              {chatHistory.length > 0 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                  <span className="text-white/60 text-xs">
                    {chatHistory.filter(msg => msg.sender === 'user').length} questions • {chatHistory.filter(msg => msg.sender === 'ai').length} responses
                    {/* {selectedNote && (
                      <span className="text-green-400"> • Auto-saved</span>
                    )} */}
                  </span>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={exportChatHistory}
                      className="text-violet-400 hover:text-violet-300 text-xs flex items-center space-x-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export</span>
                    </button>
                    {/* Manual Save Button for Testing */}
                    {selectedNote && chatHistory.length > 0 && (
                      <button
                        onClick={async () => {
                          console.log('[Manual Save] Triggering manual save...');
                          try {
                            setIsSavingChat(true);
                            const result = await saveChatToDatabase(selectedNote.id, chatHistory, userProfile);
                            if (result.ok) {
                              setMessage({ type: 'success', text: 'Chat saved manually!' });
                            } else {
                              setMessage({ type: 'error', text: `Manual save failed: ${result.reason}` });
                            }
                          } catch (error) {
                            console.error('[Manual Save] Failed:', error);
                            setMessage({ type: 'error', text: 'Manual save failed!' });
                          } finally {
                            setIsSavingChat(false);
                          }
                        }}
                        disabled={isSavingChat}
                        className="text-blue-400 hover:text-blue-300 text-xs flex items-center space-x-1 disabled:opacity-50"
                      >
                        <Database className="w-3 h-3" />
                        <span>Save Now</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document Information Panel */}
      {(selectedNote || uploadedFile) && currentFile && (
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Eye className="w-5 h-5 text-violet-400" />
            <span>PDF Document Information</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/60 text-xs mb-1">File Name</p>
              <p className="text-white text-sm font-medium">
                {selectedNote ? selectedNote.title : uploadedFile?.name}
              </p>
            </div>
            
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/60 text-xs mb-1">File Size</p>
              <p className="text-white text-sm font-medium">
                {formatFileSize(currentFile.size)}
              </p>
            </div>
            
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/60 text-xs mb-1">File Type</p>
              <p className="text-white text-sm font-medium">PDF</p>
            </div>
            
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/60 text-xs mb-1">Status</p>
              <p className="text-green-400 text-sm font-medium">✓ Ready for Chat</p>
            </div>
            
            {selectedNote && (
              <>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/60 text-xs mb-1">Subject</p>
                  <p className="text-white text-sm font-medium">{selectedNote.subject}</p>
                </div>
                
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/60 text-xs mb-1">Department</p>
                  <p className="text-white text-sm font-medium">{selectedNote.department}</p>
                </div>
                
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/60 text-xs mb-1">Semester</p>
                  <p className="text-white text-sm font-medium">Semester {selectedNote.semester}</p>
                </div>
                
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/60 text-xs mb-1">Academic Year</p>
                  <p className="text-white text-sm font-medium">{selectedNote.academicYear}</p>
                </div>
              </>
            )}
          </div>
          
          {/* Enhanced Chat Storage Info with Debug Details */}
          {selectedNote && (
            <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/20">
              <h4 className="text-white/80 font-medium text-sm mb-2 flex items-center space-x-2">
                <Database className="w-4 h-4" />
                <span>Chat History Storage</span>
              </h4>
              <p className="text-white/60 text-sm mb-2">
                Your chat conversations are automatically saved to the database and will be restored 
                when you select this note again. All messages are preserved across sessions.
              </p>
              
              {/* Debug Info */}
              <div className="mt-3 p-2 bg-white/5 rounded border border-white/10">
                <p className="text-white/60 text-xs mb-1"><strong>Storage Status:</strong></p>
                <div className="grid grid-cols-2 gap-2 text-xs text-white/50">
                  <div>Document ID: <span className="text-white/70">{selectedNote.id}_{userProfile?.uid}</span></div>
                  <div>Collection: <span className="text-white/70">chats</span></div>
                  <div>Messages: <span className="text-white/70">{chatHistory.length}</span></div>
                  {/* <div>Auto-save: <span className="text-green-400">{selectedNote ? 'Enabled' : 'Disabled'}</span></div> */}
                </div>
              </div>
              
              {chatHistory.length > 0 && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-white/60 text-xs">
                    Current session: {chatHistory.length} messages
                  </span>
                  {/* <span className="text-green-400 text-xs flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Auto-saved</span>
                  </span> */}
                </div>
              )}
            </div>
          )}

          {/* PDF Processing Info */}
          <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/20">
            <h4 className="text-white/80 font-medium text-sm mb-2 flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>PDF Processing</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-white/60">
              <div>
                <p className="font-medium text-white/80 mb-1">Why PDF-Only:</p>
                <ul className="space-y-1">
                  <li>• Best AI text extraction</li>
                  <li>• Preserved document layout</li>
                  <li>• Consistent processing results</li>
                  <li>• Universal compatibility</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-white/80 mb-1">Features:</p>
                <ul className="space-y-1">
                  <li>• Chat history persistence</li>
                  <li>• Automatic cloud storage</li>
                  <li>• Cross-session continuity</li>
                  <li>• Optimized for study materials</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChatNotes;