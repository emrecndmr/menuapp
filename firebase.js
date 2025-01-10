import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js';

// Firebase yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyCPL64oakcr8bpie869fjtk2YawpzNH7JY",
  authDomain: "menuapp-d4fa3.firebaseapp.com",
  databaseURL: "https://menuapp-d4fa3-default-rtdb.firebaseio.com",
  projectId: "menuapp-d4fa3",
  storageBucket: "menuapp-d4fa3.firebasestorage.app",
  messagingSenderId: "553266352694",
  appId: "1:553266352694:web:b96732b6aad0629d05fe97",
  measurementId: "G-1FFJ73SBWC"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);

// Analytics'i yalnızca production ortamında başlat
const analytics = window.location.hostname !== 'localhost' ? getAnalytics(app) : null;

export { app, database, storage, analytics }; 
