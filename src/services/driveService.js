let gapi = null;
let tokenClient = null;
let accessToken = null;

// --- Token persistence helpers ---
const TOKEN_STORAGE_KEY = 'google_drive_access_token';
const TOKEN_EXPIRY_KEY = 'google_drive_token_expiry';

const saveTokenToStorage = (token, expiresIn = 3600) => {
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    // Calculate expiry time (default 1 hour)
    const expiryTime = Date.now() + (expiresIn * 1000);
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  } catch (e) {
    console.warn('Could not save token to storage:', e);
  }
};

const getTokenFromStorage = () => {
  try {
    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
    
    if (!token || !expiry) return null;
    
    // Check if token is expired
    if (Date.now() >= parseInt(expiry)) {
      clearStoredToken();
      return null;
    }
    
    return token;
  } catch (e) {
    console.warn('Could not retrieve token from storage:', e);
    return null;
  }
};

const clearStoredToken = () => {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch (e) {
    console.warn('Could not clear stored token:', e);
  }
};

// --- helper: load script once ---
const loadScriptOnce = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = (e) => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
};

// --- initializeGoogleDrive (enhanced with token restoration) ---
export const initializeGoogleDrive = async () => {
  // If gapi already initialized, check for stored token
  if (gapi?.client) {
    if (!accessToken) {
      const storedToken = getTokenFromStorage();
      if (storedToken) {
        accessToken = storedToken;
        gapi.client.setToken({ access_token: accessToken });
      }
    }
    return gapi;
  }

  // load scripts (idempotent)
  await loadScriptOnce('https://apis.google.com/js/api.js');
  await loadScriptOnce('https://accounts.google.com/gsi/client');

  // assign gapi reference
  gapi = window.gapi;

  // wait for gapi client to be ready
  await new Promise((resolve, reject) => {
    if (!gapi) {
      return reject(new Error('gapi not available on window'));
    }
    gapi.load('client', {
      callback: resolve,
      onerror: () => reject(new Error('gapi.client failed to load'))
    });
  });

  await gapi.client.init({
    apiKey: import.meta.env.VITE_GOOGLE_DRIVE_API_KEY,
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
  });

  // Try to restore token from storage
  const storedToken = getTokenFromStorage();
  if (storedToken) {
    accessToken = storedToken;
    gapi.client.setToken({ access_token: accessToken });
  }

  tokenClient = null;
  return gapi;
};

// --- signInToGoogle (enhanced with token persistence) ---
export const signInToGoogle = async (prompt = 'consent') => {
  // if already have access token, short-circuit
  if (accessToken) {
    return { access_token: accessToken };
  }

  // Check for stored token first
  const storedToken = getTokenFromStorage();
  if (storedToken) {
    accessToken = storedToken;
    if (gapi?.client) {
      gapi.client.setToken({ access_token: accessToken });
    }
    return { access_token: accessToken };
  }

  // ensure google scripts are loaded
  if (!window.google) {
    await initializeGoogleDrive();
    if (!window.google) throw new Error('Google Identity Services not loaded');
  }

  const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

  return new Promise((resolve, reject) => {
    try {
      const localTokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: SCOPE,
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            return reject(tokenResponse);
          }
          
          accessToken = tokenResponse.access_token;
          
          // Save token to storage
          const expiresIn = tokenResponse.expires_in || 3600;
          saveTokenToStorage(accessToken, expiresIn);
          
          // make gapi.client aware of token
          if (gapi?.client) {
            gapi.client.setToken({ access_token: accessToken });
          }
          
          tokenClient = localTokenClient;
          resolve(tokenResponse);
        }
      });

      localTokenClient.requestAccessToken({ prompt });
    } catch (err) {
      reject(err);
    }
  });
};

// --- Enhanced sign out to clear storage ---
export const signOutFromGoogle = () => {
  if (accessToken) {
    try { 
      window.google.accounts.oauth2.revoke(accessToken); 
    } catch (e) {
      console.warn('Could not revoke token:', e);
    }
    accessToken = null;
  }
  
  // Clear stored token
  clearStoredToken();
  
  if (gapi?.client) gapi.client.setToken(null);
  tokenClient = null;
};

// --- Enhanced authentication check ---
export const isAuthenticated = () => {
  if (accessToken) return true;
  
  // Check storage if no in-memory token
  const storedToken = getTokenFromStorage();
  if (storedToken) {
    accessToken = storedToken;
    if (gapi?.client) {
      gapi.client.setToken({ access_token: accessToken });
    }
    return true;
  }
  
  return false;
};

// Export function to get the current access token
export const getAccessToken = () => {
  if (accessToken) return accessToken;
  
  // Try to get from storage
  const storedToken = getTokenFromStorage();
  if (storedToken) {
    accessToken = storedToken;
    if (gapi?.client) {
      gapi.client.setToken({ access_token: accessToken });
    }
  }
  
  return accessToken;
};

// --- All your existing functions remain unchanged ---

const loadGoogleAPIs = async () => {
  await new Promise((resolve) => {
    const script1 = document.createElement('script');
    script1.src = 'https://apis.google.com/js/api.js';
    script1.onload = resolve;
    document.head.appendChild(script1);
  });

  await new Promise((resolve) => {
    const script2 = document.createElement('script');
    script2.src = 'https://accounts.google.com/gsi/client';
    script2.onload = resolve;
    document.head.appendChild(script2);
  });

  gapi = window.gapi;
};

const initializeGoogleClient = async () => {
  await new Promise((resolve) => {
    gapi.load('client', resolve);
  });

  await gapi.client.init({
    apiKey: import.meta.env.VITE_GOOGLE_DRIVE_API_KEY,
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
  });

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive.file',
    callback: (tokenResponse) => {
      accessToken = tokenResponse.access_token;
      if (gapi.client.getToken() === null && tokenResponse.access_token) {
        gapi.client.setToken({
          access_token: tokenResponse.access_token
        });
      }
    },
  });
};

export const createFolder = async (name, parentId = null) => {
  if (!accessToken) {
    throw new Error('Not authenticated. Please sign in to Google first.');
  }
  
  const metadata = {
    name: name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : undefined
  };
  
  const response = await gapi.client.drive.files.create({
    resource: metadata
  });
  
  return response.result;
};

export const uploadFile = async (file, folderId, fileName) => {
  if (!accessToken) {
    throw new Error('Not authenticated. Please sign in to Google first.');
  }

  const metadata = {
    name: fileName,
    parents: [folderId]
  };
  
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
  form.append('file', file);
  
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: form
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token might be expired, clear it
      accessToken = null;
      clearStoredToken();
      throw new Error('Not authenticated. Please sign in to Google first.');
    }
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} ${errorText}`);
  }
  
  return await response.json();
};

export const setFilePublic = async (fileId, { type = 'anyone', role = 'reader', allowFileDiscovery = false, domain } = {}) => {
  if (!accessToken) {
    throw new Error('Not authenticated. Please sign in to Google first.');
  }

  const body = {
    role,
    type
  };

  if (type === 'domain' && domain) {
    body.domain = domain;
  }

  if (typeof allowFileDiscovery === 'boolean') {
    body.allowFileDiscovery = allowFileDiscovery;
  }

  const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    if (resp.status === 401) {
      accessToken = null;
      clearStoredToken();
      throw new Error('Not authenticated. Please sign in to Google first.');
    }
    const txt = await resp.text();
    const err = new Error(`Permission set failed: ${resp.status} ${txt}`);
    err.status = resp.status;
    throw err;
  }

  return await resp.json();
};

export const deleteFile = async (fileId) => {
  try {
    if (!accessToken) {
      throw new Error('Not authenticated. Please sign in to Google first.');
    }
    
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        accessToken = null;
        clearStoredToken();
        throw new Error('Not authenticated. Please sign in to Google first.');
      }
      throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

export const getFileUrl = (fileId) => {
  return `https://drive.google.com/file/d/${fileId}/view`;
};

export const downloadFile = (fileId, fileName) => {
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};