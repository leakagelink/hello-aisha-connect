// Firebase web configuration for Hello Aisha.
//
// These values are PUBLIC by Firebase's own design — the Web API Key, App ID,
// and VAPID key are meant to be shipped in client code. They do not grant
// write/admin access; security is enforced by Firebase Security Rules and the
// server-side service account (kept server-only via the connector).
//
// They are also mirrored by the firebase_messaging connector as
// VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_* env vars when "Include web push"
// is enabled. We prefer the connector vars and fall back to these constants.

export const FIREBASE_WEB_CONFIG = {
  apiKey: "",
  authDomain: "hello-aisha.firebaseapp.com",
  projectId: "hello-aisha",
  storageBucket: "hello-aisha.firebasestorage.app",
  messagingSenderId: "1054196339726",
  appId: "1:1054196339726:web:50d1198384031a48b5185f",
  measurementId: "G-YTMCDJPPJW",
};

export const FIREBASE_VAPID_KEY =
  "BMpLNhFHk5kJklBAd_b5NIoGoyNPCEq-IpRF1nH-2s7knLv5VOQiCv8H3coKJxybGmijhpFM4lYWAJGo32KUXLg";
