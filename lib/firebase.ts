"use client";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import config from "./firebase-public.json";

export function firebase() {
  const existed = getApps().length > 0;
  const app = existed
    ? getApp()
    : initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || config.apiKey,
        authDomain:
          process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || config.authDomain,
        projectId:
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || config.projectId,
        storageBucket:
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
          config.storageBucket,
        messagingSenderId:
          process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
          config.messagingSenderId,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || config.appId,
      });
  const db = existed
    ? getFirestore(app)
    : initializeFirestore(app, {
        localCache: memoryLocalCache(),
        experimentalAutoDetectLongPolling: true,
      });
  return { auth: getAuth(app), db, storage: getStorage(app) };
}
