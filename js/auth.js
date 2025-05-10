// Firebase configuration
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Replace with your Firebase project config
const firebaseConfig = {
    apiKey: "AIzaSyBsCHB0tgLcfyHWTquddDJOA79tfjpYfmU",
    authDomain: "connectchat-6aea9.firebaseapp.com",
    projectId: "connectchat-6aea9",
    storageBucket: "connectchat-6aea9.firebasestorage.app",
    messagingSenderId: "17427783564",
    appId: "1:17427783564:web:7011d725a7393cd34140a9",
    measurementId: "G-MN9J5ZCMN7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Check authentication state
onAuthStateChanged(auth, user => {
    const currentPath = window.location.pathname;
    
    if (user) {
        // User is signed in
        console.log('User signed in:', user.email);
        
        // If on login or register page, redirect to chat
        if (currentPath.includes('login.html') || 
            currentPath.includes('register.html') || 
            currentPath === '/' || 
            currentPath.includes('index.html')) {
            window.location.href = 'chat.html';
        }
        
        // Update UI for chat page
        if (currentPath.includes('chat.html')) {
            // Get user info
            getDoc(doc(db, 'users', user.uid))
                .then(docSnapshot => {
                    if (docSnapshot.exists()) {
                        const userData = docSnapshot.data();
                        const currentUserElement = document.getElementById('current-user');
                        if (currentUserElement) {
                            currentUserElement.textContent = userData.username;
                        }
                    }
                })
                .catch(error => {
                    console.error("Error getting user data:", error);
                });
        }
    } else {
        // User is signed out
        console.log('No user signed in');
        
        // If on protected page, redirect to login
        if (currentPath.includes('chat.html')) {
            window.location.href = 'login.html';
        }
    }
});

// Register function
function register(email, password, username) {
    const errorElement = document.getElementById('register-error');
    if (errorElement) {
        errorElement.textContent = '';
    }
    
    createUserWithEmailAndPassword(auth, email, password)
        .then(userCredential => {
            // Add user to Firestore
            const user = userCredential.user;
            return setDoc(doc(db, 'users', user.uid), {
                username: username,
                email: email,
                createdAt: serverTimestamp(),
                status: 'online'
            });
        })
        .then(() => {
            console.log('User registered successfully');
            window.location.href = 'chat.html';
        })
        .catch(error => {
            console.error("Registration error:", error);
            if (errorElement) {
                errorElement.textContent = error.message;
            }
        });
}

// Login function
function login(email, password) {
    const errorElement = document.getElementById('login-error');
    if (errorElement) {
        errorElement.textContent = '';
    }
    
    signInWithEmailAndPassword(auth, email, password)
        .then(userCredential => {
            // Update user status
            const user = userCredential.user;
            return updateDoc(doc(db, 'users', user.uid), {
                status: 'online',
                lastLogin: serverTimestamp()
            });
        })
        .then(() => {
            console.log('User logged in successfully');
            window.location.href = 'chat.html';
        })
        .catch(error => {
            console.error("Login error:", error);
            if (errorElement) {
                errorElement.textContent = error.message;
            }
        });
}

// Logout function
function logout() {
    // Update user status before logout
    const user = auth.currentUser;
    if (user) {
        updateDoc(doc(db, 'users', user.uid), {
            status: 'offline',
            lastSeen: serverTimestamp()
        })
        .then(() => {
            signOut(auth)
                .then(() => {
                    console.log('User logged out successfully');
                    window.location.href = 'login.html';
                })
                .catch(error => {
                    console.error('Logout error:', error);
                });
        })
        .catch(error => {
            console.error('Error updating user status:', error);
            // Still try to sign out even if status update fails
            signOut(auth).then(() => {
                window.location.href = 'login.html';
            });
        });
    } else {
        // Just redirect if no user is signed in
        window.location.href = 'login.html';
    }
}

// Set up logout button listener if it exists
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Set up register form listener if it exists
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const username = document.getElementById('register-username').value;
            register(email, password, username);
        });
    }
    
    // Set up login form listener if it exists
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            login(email, password);
        });
    }
});