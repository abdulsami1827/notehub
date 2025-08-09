import React, { useState, useEffect } from "react";
import { X, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendEmailVerification,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../../services/firebase';
import { createUserProfile } from '../../services/firestoreService';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { extractRollNumber, validateCollegeEmail, validateRollNumber } from '../../utils/validators';
import { useAuth } from '../../contexts/AuthContext'; // Add this import

// Real Firebase auth functions
const registerUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    
    const rollNumber = extractRollNumber(email);
    await createUserProfile(userCredential.user.uid, {
      email,
      rollNumber,
      emailVerified: false,
      createdAt: new Date()
    });
    
    return { success: true, message: 'Please check your email for verification' };
  } catch (error) {
    let message = 'Something went wrong. Please try again.';
    if (error.code === 'auth/email-already-in-use') message = 'This roll number is already registered.';
    if (error.code === 'auth/invalid-email') message = 'Invalid roll number format.';
    if (error.code === 'auth/weak-password') message = 'Password must be at least 6 characters.';
    return { success: false, message };
  }
};

const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Refresh user
    await userCredential.user.reload();

    const user = userCredential.user;

    if (!user.emailVerified) {
      await signOut(auth);
      return { success: false, message: 'Please verify your email first' };
    }

    // Update Firestore if email is verified
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { emailVerified: true });

    return { success: true, user };
  } catch (error) {
    let message = 'Login failed. Please try again.';
    if (error.code === 'auth/user-not-found') message = 'No account found for this roll number.';
    if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
    if (error.code === 'auth/invalid-email') message = 'Invalid roll number format.';
    return { success: false, message };
  }
};

const resendEmailVerification = async () => {
  try {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      return { success: true, message: 'Verification email sent!' };
    } else {
      return { success: false, message: 'No user found. Please register again.' };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
};

const EmailVerificationModal = ({ isOpen, onClose, onVerified, userEmail }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const { forceRefresh } = useAuth(); // Add this line

  useEffect(() => {
    if (!isOpen) return;
    
    // Real Firebase auth state checking
    const checkVerificationStatus = async () => {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          setIsVerified(true);
          // Update Firestore
          try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, { emailVerified: true });
          } catch (error) {
            console.error('Error updating Firestore:', error);
          }
          
          // Force refresh auth context immediately
          await forceRefresh();
          
          setTimeout(() => {
            onVerified();
            onClose();
          }, 2000);
          return true;
        }
      }
      return false;
    };
    
    // Check immediately
    checkVerificationStatus();
    
    // Then check every 3 seconds
    const interval = setInterval(checkVerificationStatus, 3000);

    return () => clearInterval(interval);
  }, [isOpen, onVerified, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const resendVerification = async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await resendEmailVerification();
      setMessage(result.message);
    } catch (error) {
      setMessage('Failed to send verification email. Please try again.');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative bg-slate-900/95 rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl shadow-purple-500/20 max-w-md w-full mx-4">
        
        {/* Close button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full z-10 touch-manipulation"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-6 sm:p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
            {isVerified ? (
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            ) : (
              <Mail className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            )}
          </div>

          {/* Header */}
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
            {isVerified ? 'Email Verified!' : 'Verify Your Email'}
          </h2>
          
          {isVerified ? (
            <p className="text-white/70 leading-relaxed mb-6 sm:mb-8 text-sm sm:text-base">
              Your email has been successfully verified. You can now access all features of NoteHub.
            </p>
          ) : (
            <p className="text-white/70 leading-relaxed mb-4 sm:mb-6 text-sm sm:text-base">
              We've sent a verification link to <span className="text-purple-400 font-medium break-all">{userEmail}</span>. 
              Please check your inbox and click the link to verify your account.
            </p>
          )}

          {/* Message */}
          {message && (
            <div className="mb-4 sm:mb-6 text-sm text-blue-300 bg-blue-500/10 border border-blue-400/40 rounded-xl px-4 py-3">
              {message}
            </div>
          )}

          {!isVerified && (
            <>
              {/* Auto-check indicator */}
              <div className="flex items-center justify-center space-x-2 mb-4 sm:mb-6 text-white/50 text-xs sm:text-sm">
                <Clock className="w-4 h-4 animate-pulse flex-shrink-0" />
                <span>Auto-checking verification status...</span>
              </div>

              {/* Resend button */}
              <button
                onClick={resendVerification}
                disabled={loading}
                className="w-full py-3 sm:py-4 mb-4 sm:mb-6 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 touch-manipulation text-sm sm:text-base"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 flex-shrink-0" />
                    <span>Resend Verification Email</span>
                  </span>
                )}
              </button>

              {/* Help section */}
              <div className="bg-white/5 rounded-xl sm:rounded-2xl p-4 border border-white/10">
                <h3 className="font-semibold text-white mb-3 text-xs sm:text-sm">Can't find the email?</h3>
                <ul className="text-xs text-white/70 space-y-2">
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Check your spam/junk folder</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Make sure you used your college email</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Wait a few minutes for delivery</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const LoginModal = ({ isOpen, onClose, onLogin }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [formData, setFormData] = useState({
    rollNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Get auth context to trigger re-render in navbar
  const { refreshUploadAccess, forceRefresh } = useAuth();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen || showEmailVerification) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, showEmailVerification]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && (isOpen || showEmailVerification)) {
        if (showEmailVerification) {
          handleCloseEmailVerification();
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, showEmailVerification, onClose]);

  if (!isOpen && !showEmailVerification) return null;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value || '' }));
    setError('');
    setSuccess('');
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setFormData({ rollNumber: '', password: '', confirmPassword: '' });
    setShowPassword(false);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    const { rollNumber, password, confirmPassword } = formData;
    const email = `${rollNumber}@aiktc.ac.in`;

    if (!validateCollegeEmail(email)) {
      setError('Please use your college email (@aiktc.ac.in)');
      setIsLoading(false);
      return;
    }

    if (isLoginMode) {
      const result = await loginUser(email, password);
      if (result.success) {
        // Force refresh auth context immediately
        await forceRefresh();
        onLogin();
        onClose();
      } else {
        setError(result.message);
      }
    } else {
      const rollNumber = extractRollNumber(email);
      if (!validateRollNumber(rollNumber)) {
        setError('Invalid roll number format. Use format: 23co33');
        setIsLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
      const result = await registerUser(email, password);
      if (result.success) {
        setUserEmail(email);
        setShowEmailVerification(true);
      } else {
        setError(result.message);
      }
    }

    setIsLoading(false);
  };

  const handleEmailVerified = async () => {
    setShowEmailVerification(false);
    // Force refresh auth context immediately after verification
    await forceRefresh();
    onLogin();
    onClose();
  };

  const handleCloseEmailVerification = () => {
    setShowEmailVerification(false);
    // Reset form but keep modal open
    setFormData({ rollNumber: '', password: '', confirmPassword: '' });
    setIsLoginMode(true);
    setError('');
    setSuccess('');
  };

  return (
    <>
      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={showEmailVerification}
        onClose={handleCloseEmailVerification}
        onVerified={handleEmailVerified}
        userEmail={userEmail}
      />

      {/* Login/Register Modal */}
      {!showEmailVerification && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`relative bg-slate-900/95 rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl shadow-purple-500/20 w-full max-w-md mx-4 max-h-[95vh] ${!isLoginMode ? 'overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent' : ''}`}>
            
            {/* Close button */}
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full z-10 touch-manipulation"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center pt-10 sm:pt-12 pb-4 sm:pb-6 px-6 sm:px-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                {isLoginMode ? 'Welcome Back!' : 'Join NoteHub'}
              </h2>
              <p className="text-white/70 text-sm sm:text-base">
                {isLoginMode ? 'Sign in to access your study materials' : 'Create your account and start learning'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 sm:px-8">
              {/* Alerts */}
              {error && (
                <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-400/40 rounded-xl px-4 py-3 break-words">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 text-sm text-green-300 bg-green-500/10 border border-green-400/40 rounded-xl px-4 py-3 break-words">
                  {success}
                </div>
              )}

              <div className="space-y-4 sm:space-y-6">
                {/* Roll Number Input */}
                <div className="space-y-2">
                  <label className="block text-white/80 text-sm font-medium">Roll Number</label>
                  <div className="relative">
                    <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5 flex-shrink-0" />
                    <input
                      type="text"
                      value={formData.rollNumber || ''}
                      onChange={(e) => handleInputChange('rollNumber', e.target.value.toLowerCase())}
                      className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-3.5 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-400 focus:bg-white/10 outline-none transition-colors text-sm sm:text-base touch-manipulation"
                      placeholder="e.g. 23co33"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <label className="block text-white/80 text-sm font-medium">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5 flex-shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password || ''}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full pl-10 sm:pl-12 pr-12 py-3 sm:py-3.5 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-400 focus:bg-white/10 outline-none transition-colors text-sm sm:text-base touch-manipulation"
                      placeholder="Enter your password"
                      required
                      autoComplete={isLoginMode ? "current-password" : "new-password"}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 p-1 touch-manipulation"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input (Register mode only) */}
                {!isLoginMode && (
                  <div className="space-y-2">
                    <label className="block text-white/80 text-sm font-medium">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5 flex-shrink-0" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.confirmPassword || ''}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-3.5 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-purple-400 focus:bg-white/10 outline-none transition-colors text-sm sm:text-base touch-manipulation"
                        placeholder="Confirm your password"
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group w-full py-3 sm:py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 touch-manipulation text-sm sm:text-base"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin flex-shrink-0"></div>
                      <span>{isLoginMode ? 'Signing in...' : 'Creating account...'}</span>
                    </div>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <span>{isLoginMode ? 'Sign In' : 'Create Account'}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                    </span>
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="text-center px-6 sm:px-8 py-6 sm:py-8">
              <p className="text-white/70 text-sm">
                {isLoginMode ? "Don't have an account?" : "Already have an account?"}
                <button 
                  type="button"
                  onClick={toggleMode} 
                  className="text-purple-400 hover:text-purple-300 font-medium ml-2 transition-colors duration-300 touch-manipulation"
                >
                  {isLoginMode ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginModal;