import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendEmailVerification,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserProfile } from './firestoreService';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase'; // your firestore DB instance
import { extractRollNumber } from '../utils/validators';

export const registerUser = async (email, password) => {
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
    return { success: false, message: error.message };
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Refresh user
    await userCredential.user.reload();

    const user = userCredential.user;

    if (!user.emailVerified) {
      await signOut(auth);
      return { success: false, message: 'Please verify your email first' };
    }

    // ✅ Update Firestore if email is verified
    const userRef = doc(db, 'users', user.uid); // Adjust path to your Firestore structure
    await updateDoc(userRef, { emailVerified: true });

    return { success: true, user };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};