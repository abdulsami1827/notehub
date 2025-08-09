import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  BookOpen,
  Key,
  Shield,
  Trash2,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  X,
  Settings as SettingsIcon,
  LogOut,
  UserX,
  Lock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboard } from '../../contexts/DashboardContext';
import { auth } from '../../services/firebase';
import { signOut } from 'firebase/auth';
import { 
  updatePassword, 
  deleteUser, 
  reauthenticateWithCredential, 
  EmailAuthProvider 
} from 'firebase/auth';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const Settings = () => {
  const { user: currentUser, logout } = useAuth();
  const { userProfile, updateUserProfile, loading } = useDashboard();
  const navigate = useNavigate();

  // Debug logging
  console.log('Settings Component - Current User:', currentUser);
  console.log('Settings Component - User Profile:', userProfile);
  console.log('Settings Component - Loading:', loading);
  
  const [activeTab, setActiveTab] = useState('profile');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setTimeout(() => {
        navigate('/');
      }, 100); 
    } catch (error) {
      console.error('Error signing out:', error.message);
      alert('Logout failed. Please try again.');
    }
  };
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    phoneNumber: '',
    rollNumber: '',
    department: '',
    semester: '',
    academicYear: ''
  });
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Delete account state
  const [deleteForm, setDeleteForm] = useState({
    currentPassword: '',
    confirmText: ''
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
    delete: false
  });
  
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);

  useEffect(() => {
    console.log("useEffect triggered - User Profile Data:", userProfile);
    console.log("useEffect triggered - Loading:", loading);
    
    // Only update form if userProfile is not null and not loading
    if (userProfile && !loading) {
      console.log("Setting profile form with data:", userProfile);
      setProfileForm({
        displayName: userProfile.displayName || '',
        phoneNumber: userProfile.phoneNumber || '',
        rollNumber: userProfile.rollNumber || '',
        department: userProfile.department || '',
        semester: userProfile.semester || '',
        academicYear: userProfile.academicYear || ''
      });
    }
  }, [userProfile, loading]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Update Firestore document
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        ...profileForm,
        updatedAt: new Date()
      });
      
      // Update local context
      updateUserProfile({
        ...userProfile,
        ...profileForm,
        updatedAt: new Date()
      });
      
      showMessage('success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      showMessage('error', 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validate passwords
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        showMessage('error', 'New passwords do not match.');
        setIsLoading(false);
        return;
      }
      
      if (passwordForm.newPassword.length < 6) {
        showMessage('error', 'Password must be at least 6 characters long.');
        setIsLoading(false);
        return;
      }
      
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordForm.currentPassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update password
      await updatePassword(currentUser, passwordForm.newPassword);
      
      // Clear form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      showMessage('success', 'Password updated successfully!');
    } catch (error) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/wrong-password') {
        showMessage('error', 'Current password is incorrect.');
      } else if (error.code === 'auth/weak-password') {
        showMessage('error', 'Password is too weak. Please choose a stronger password.');
      } else {
        showMessage('error', 'Failed to update password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteForm.confirmText !== 'DELETE MY ACCOUNT') {
      showMessage('error', 'Please type "DELETE MY ACCOUNT" to confirm.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        deleteForm.currentPassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      
      // Delete user data from Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      await deleteDoc(userDocRef);
      
      // Delete user account
      await deleteUser(currentUser);
      
      showMessage('success', 'Account deleted successfully. Redirecting...');
      
      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      
    } catch (error) {
      console.error('Error deleting account:', error);
      if (error.code === 'auth/wrong-password') {
        showMessage('error', 'Current password is incorrect.');
      } else {
        showMessage('error', 'Failed to delete account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Key },
    { id: 'account', label: 'Account', icon: Shield }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 p-4 sm:p-0">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8 sm:py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-white/70 text-sm sm:text-base">Loading your profile...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && !userProfile && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 sm:p-6">
          <div className="flex items-start sm:items-center space-x-3">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-red-400">Profile Not Found</h3>
              <p className="text-sm sm:text-base text-red-300">Unable to load your profile data. Please try refreshing the page.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Only show when not loading and profile exists */}
      {!loading && userProfile && (
        <>
          {/* Header */}
          <div>
            <div className="flex items-start sm:items-center space-x-3 mb-4">
              <div className="p-2.5 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                <SettingsIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  Settings
                </h1>
                <p className="text-white/70 text-sm sm:text-base lg:text-lg">
                  Manage your account preferences and security
                </p>
              </div>
            </div>
          </div>

      {/* Message Alert */}
      {message.text && (
        <div className={`p-3 sm:p-4 rounded-xl border flex items-start space-x-3 ${
          message.type === 'success' 
            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
          )}
          <span className="text-sm sm:text-base">{message.text}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10">
        {/* Tab Navigation */}
        <div className="border-b border-white/10">
          <nav className="flex overflow-x-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 scrollbar-hide">
            <div className="flex space-x-4 sm:space-x-8 min-w-full sm:min-w-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 pb-3 sm:pb-4 border-b-2 transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-white'
                        : 'border-transparent text-white/60 hover:text-white/80'
                    }`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="font-medium text-sm sm:text-base">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-white">Profile Information</h2>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
                      <div className="flex items-center space-x-2">
                        <User className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                        <span>Display Name</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      value={profileForm.displayName}
                      onChange={(e) => setProfileForm({...profileForm, displayName: e.target.value})}
                      className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm sm:text-base"
                      placeholder="Enter your display name"
                    />
                  </div>

                  {/* Email (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                        <span>Email Address</span>
                      </div>
                    </label>
                    <input
                      type="email"
                      value={currentUser?.email || ''}
                      readOnly
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white/60 cursor-not-allowed text-sm sm:text-base"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                        <span>Phone Number</span>
                      </div>
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phoneNumber || ''}
                      onChange={(e) => setProfileForm({...profileForm, phoneNumber: e.target.value})}
                      className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm sm:text-base"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  {/* Roll Number */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                        <span>Roll Number</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      value={profileForm.rollNumber || ''}
                      readOnly
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white/60 cursor-not-allowed text-sm sm:text-base"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
                      <div className="flex items-center space-x-2">
                        <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                        <span>Department</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      value={profileForm.department || ''}
                      onChange={(e) => setProfileForm({...profileForm, department: e.target.value})}
                      className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm sm:text-base"
                      placeholder="Enter your department"
                    />
                  </div>

                  {/* Semester */}
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                        <span>Current Semester</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      value={profileForm.semester || ''}
                      onChange={(e) => setProfileForm({...profileForm, semester: e.target.value})}
                      className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm sm:text-base"
                      placeholder="Enter your current semester"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 sm:pt-6">
                  <button
                    type="submit"
                    disabled={isLoading || loading}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Update Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                <Key className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-white">Change Password</h2>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4 sm:space-y-6 max-w-full sm:max-w-md">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm sm:text-base"
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current')}
                      className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm sm:text-base"
                      placeholder="Enter new password"
                      minLength="6"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm sm:text-base"
                      placeholder="Confirm new password"
                      minLength="6"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-4 sm:pt-6">
                  <button
                    type="submit"
                    disabled={isLoading || loading}
                    className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6 sm:space-y-8">
              <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-white">Account Management</h2>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                  <h3 className="text-lg sm:text-xl font-bold text-red-400">Danger Zone</h3>
                </div>
                
                <p className="text-white/70 mb-4 sm:mb-6 text-sm sm:text-base">
                  Once you delete your account, there is no going back. Please be certain.
                </p>

                <button
                  onClick={() => setDeleteConfirmModal(true)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg text-sm sm:text-base"
                >
                  <UserX className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Delete Account</span>
                </button>
              </div>

              {/* Quick Actions */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Quick Actions</h3>
                
                <div className="space-y-4">
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 w-full text-left p-3 sm:p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                  >
                    <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                    <div>
                      <div className="text-white font-medium text-sm sm:text-base">Sign Out</div>
                      <div className="text-white/60 text-xs sm:text-sm">Sign out of your account</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-6 lg:p-8 border border-white/20 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start sm:items-center space-x-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 bg-red-500/20 rounded-xl">
                <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">Delete Account</h3>
                <p className="text-white/60 text-sm sm:text-base">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 sm:p-4">
                <p className="text-red-300 text-xs sm:text-sm">
                  This will permanently delete your account and all associated data, including:
                </p>
                <ul className="mt-2 text-red-300 text-xs sm:text-sm space-y-1">
                  <li>• Your profile information</li>
                  <li>• All uploaded notes</li>
                  <li>• Account history and statistics</li>
                </ul>
              </div>

              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
                  Enter your current password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.delete ? "text" : "password"}
                    value={deleteForm.currentPassword}
                    onChange={(e) => setDeleteForm({...deleteForm, currentPassword: e.target.value})}
                    className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 text-white placeholder-white/50 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition-all text-sm sm:text-base"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('delete')}
                    className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                  >
                    {showPasswords.delete ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirmation Text */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2 sm:mb-3">
                  Type "DELETE MY ACCOUNT" to confirm
                </label>
                <input
                  type="text"
                  value={deleteForm.confirmText}
                  onChange={(e) => setDeleteForm({...deleteForm, confirmText: e.target.value})}
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white placeholder-white/50 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition-all text-sm sm:text-base"
                  placeholder="DELETE MY ACCOUNT"
                  required
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-6 sm:mt-8">
              <button
                onClick={handleDeleteAccount}
                disabled={isLoading || deleteForm.confirmText !== 'DELETE MY ACCOUNT' || !deleteForm.currentPassword}
                className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Delete Account</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  setDeleteConfirmModal(false);
                  setDeleteForm({ currentPassword: '', confirmText: '' });
                }}
                disabled={isLoading}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all flex-1 justify-center text-sm sm:text-base"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default Settings;