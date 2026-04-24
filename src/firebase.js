import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAQZQCN2XD6aKYQ8qau2yiOE-mQbLRmcM4",
  authDomain: "finance-tracker-a077e.firebaseapp.com",
  projectId: "finance-tracker-a077e",
  storageBucket: "finance-tracker-a077e.firebasestorage.app",
  messagingSenderId: "1094916774138",
  appId: "1:1094916774138:web:c90989e5e2a1cb8a291143"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
