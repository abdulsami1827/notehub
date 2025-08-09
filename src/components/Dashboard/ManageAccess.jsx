// src/components/Access/ManageAccess.jsx

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Trash2,
  Mail,
  TrendingUp,
  Clock,
  Infinity,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getUploadAccessList, 
  addUploadAccess, 
  removeUploadAccess 
} from '../../services/firestoreService';
import { validateRollNumber } from '../../utils/validators';

const ManageAccess = () => {
  const { refreshUploadAccess } = useAuth();
  const [accessList, setAccessList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRollNumber, setNewRollNumber] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    loadAccessList();
  }, []);

  const loadAccessList = async () => {
    try {
      const list = await getUploadAccessList();
      setAccessList(list.sort());
    } catch (error) {
      console.error('Error loading access list:', error);
      setMessage({ type: 'error', text: 'Failed to load access list' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccess = async (e) => {
    e.preventDefault();
    if (!newRollNumber.trim()) return;

    setActionLoading('add');
    setMessage({ type: '', text: '' });

    try {
      // Validate roll number format
      if (!validateRollNumber(newRollNumber.trim())) {
        setMessage({ type: 'error', text: 'Invalid roll number format (e.g., 23co33)' });
        setActionLoading('');
        return;
      }

      const rollNumber = newRollNumber.trim().toLowerCase();

      // Check if already exists
      if (accessList.includes(rollNumber)) {
        setMessage({ type: 'error', text: 'Roll number already has upload access' });
        setActionLoading('');
        return;
      }

      await addUploadAccess(rollNumber);
      setAccessList([...accessList, rollNumber].sort());
      setNewRollNumber('');
      setMessage({ type: 'success', text: `Access granted to ${rollNumber}` });
      
      // Refresh current user's access status
      await refreshUploadAccess();
    } catch (error) {
      console.error('Error adding access:', error);
      setMessage({ type: 'error', text: 'Failed to add upload access' });
    } finally {
      setActionLoading('');
    }
  };

  const handleRemoveAccess = async (rollNumber) => {
    if (!window.confirm(`Remove upload access for ${rollNumber}?`)) return;

    setActionLoading(rollNumber);
    setMessage({ type: '', text: '' });

    try {
      await removeUploadAccess(rollNumber);
      setAccessList(accessList.filter(rn => rn !== rollNumber));
      setMessage({ type: 'success', text: `Access removed for ${rollNumber}` });
      
      // Refresh current user's access status
      await refreshUploadAccess();
    } catch (error) {
      console.error('Error removing access:', error);
      setMessage({ type: 'error', text: 'Failed to remove upload access' });
    } finally {
      setActionLoading('');
    }
  };

  const getMessageIcon = () => {
    switch (message.type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'info':
        return <Info className="w-4 h-4 sm:w-5 sm:h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 mb-4">
          <div className="p-2 sm:p-3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl w-fit">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Manage Upload Access
            </h1>
            <p className="text-white/70 text-sm sm:text-base lg:text-lg">
              Control who can upload and share notes
            </p>
          </div>
        </div>
      </div>

      {/* Grant Access Section */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/10 mb-6 sm:mb-8">
        <div className="flex items-center space-x-3 mb-4 sm:mb-6">
          <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
          <h2 className="text-xl sm:text-2xl font-bold text-white">Grant Upload Access</h2>
        </div>
        
        {/* Message Alert */}
        {message.text && (
          <div className={`flex items-start sm:items-center space-x-3 p-3 sm:p-4 rounded-xl border mb-4 sm:mb-6 transition-all ${
            message.type === 'error' 
              ? 'bg-red-500/10 border-red-500/20 text-red-300'
              : 'bg-green-500/10 border-green-500/20 text-green-300'
          }`}>
            <div className="flex-shrink-0 mt-0.5 sm:mt-0">
              {getMessageIcon()}
            </div>
            <span className="font-medium text-sm sm:text-base">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleAddAccess} className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1">
            <input
              type="text"
              value={newRollNumber}
              onChange={(e) => setNewRollNumber(e.target.value)}
              placeholder="Enter roll number (e.g., 23co33)"
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all text-sm sm:text-base"
              pattern="^\d{2}[a-z]{2}\d{2}$"
              title="Format: 23co33"
            />
          </div>
          <button
            type="submit"
            disabled={actionLoading === 'add' || !newRollNumber.trim()}
            className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm sm:text-base min-h-[48px]"
          >
            {actionLoading === 'add' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Adding...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Grant Access</span>
              </>
            )}
          </button>
        </form>

        {/* Instructions */}
        <div className="p-4 sm:p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl sm:rounded-2xl">
          <div className="flex items-start space-x-3">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-300 mb-2 sm:mb-3 text-sm sm:text-base">Instructions:</h3>
              <ul className="text-blue-200 space-y-2 text-xs sm:text-sm">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400 mt-1 flex-shrink-0">•</span>
                  <span>Enter the student's roll number in format: 23co33</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400 mt-1 flex-shrink-0">•</span>
                  <span>Once granted, they can upload and manage notes</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400 mt-1 flex-shrink-0">•</span>
                  <span>They can also manage other users' access</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-400 mt-1 flex-shrink-0">•</span>
                  <span>Roll numbers are case-insensitive</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Current Access List */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10 mb-6 sm:mb-8">
        <div className="p-4 sm:p-6 lg:p-8 border-b border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Users with Upload Access ({accessList.length})
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 sm:py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-violet-400 mx-auto mb-4"></div>
              <p className="text-white/70 text-base sm:text-lg">Loading access list...</p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8">
            {accessList.length === 0 ? (
              <div className="text-center py-12 sm:py-20">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Users className="w-8 h-8 sm:w-12 sm:h-12 text-white/30" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2 sm:mb-4">No users have upload access yet</h3>
                <p className="text-white/60 text-sm sm:text-base lg:text-lg px-4">Grant access to students to start sharing knowledge</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {accessList.map((rollNumber) => (
                  <div key={rollNumber} className="group bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="p-2 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg">
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <button
                        onClick={() => handleRemoveAccess(rollNumber)}
                        disabled={actionLoading === rollNumber}
                        className="p-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Remove access"
                      >
                        {actionLoading === rollNumber ? (
                          <div className="animate-spin h-4 w-4 border-2 border-red-300 border-t-transparent rounded-full"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    
                    <div>
                      <h3 className="font-bold text-white text-base sm:text-lg uppercase mb-2 group-hover:text-purple-200 transition-colors break-all">
                        {rollNumber}
                      </h3>
                      <div className="flex items-start space-x-2 text-white/60">
                        <Mail className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm break-all">{rollNumber}@aiktc.ac.in</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10 mb-6 sm:mb-8">
        <div className="p-4 sm:p-6 lg:p-8 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400" />
            <h2 className="text-xl sm:text-2xl font-bold text-white">Access Statistics</h2>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="group bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
              </div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-white/80 mb-2">Total Uploaders</h3>
              <p className="text-2xl sm:text-3xl font-bold text-white">{accessList.length}</p>
            </div>
            
            <div className="group bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-green-500 to-teal-600 rounded-xl text-white group-hover:scale-110 transition-transform">
                  <Infinity className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
              </div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-white/80 mb-2">Max Allowed</h3>
              <p className="text-2xl sm:text-3xl font-bold text-white">∞</p>
            </div>
            
            <div className="group bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 hover:scale-105 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl text-white group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
              </div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-white/80 mb-2">Access Available</h3>
              <p className="text-2xl sm:text-3xl font-bold text-white">24/7</p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="p-4 sm:p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl sm:rounded-2xl mb-4 sm:mb-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-300 mb-2 sm:mb-3 text-sm sm:text-base">Important Notes:</h3>
            <ul className="text-yellow-200 space-y-2 text-xs sm:text-sm">
              <li className="flex items-start space-x-2">
                <span className="text-yellow-400 mt-1 flex-shrink-0">•</span>
                <span>Users with upload access can manage other users' permissions</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-yellow-400 mt-1 flex-shrink-0">•</span>
                <span>Be careful when granting access to ensure responsible usage</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-yellow-400 mt-1 flex-shrink-0">•</span>
                <span>All upload activities are logged and tracked</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageAccess;