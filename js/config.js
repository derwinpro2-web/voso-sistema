// ==========================================
// CONFIGURACIÓN TAILWIND
// ==========================================
tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        }
    }
}

// ==========================================
// CONFIGURACIÓN FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAo9Nlk-yJz4UkAlvgX6my_ww3MR-qO6-Q",
    authDomain: "voso-sistema-f81c4.firebaseapp.com",
    databaseURL: "https://voso-sistema-f81c4-default-rtdb.firebaseio.com",
    projectId: "voso-sistema-f81c4",
    storageBucket: "voso-sistema-f81c4.firebasestorage.app",
    messagingSenderId: "385854966826",
    appId: "1:385854966826:web:182e9d68ac20e3eede8753"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
let recordsRef = null;

const ADMIN_EMAIL = 'miguel@polpaico.cl';
let isAdmin = false;
let currentUser = null;
let records = [];
let offlineRecords = JSON.parse(localStorage.getItem('offlineVOSO')) || [];
let currentImage = null;
let isOnline = true;
let currentRecordId = null;
let severityChart = null;
let trendChart = null;
let isLoginMode = true;
let map = null;
let mapMarkers = [];
let recognition = null;
let selectedRecords = new Set();
let editingRecordId = null;
let currentCommentImage = null;
let commentsListener = null;
let currentCommentsRecordId = null;
