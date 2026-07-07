import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
const firebaseConfig = {
  apiKey: "AIzaSyDBEOdBHS3mxxE1Vhw2pSh0BjGaK6M8GBw",
  authDomain: "c-trade-diario.firebaseapp.com",
  databaseURL: "https://c-trade-diario-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "c-trade-diario",
  storageBucket: "c-trade-diario.firebasestorage.app",
  messagingSenderId: "699030568101",
  appId: "1:699030568101:web:8e4871564f410eb466a14c",
  measurementId: "G-L1YGRSF0GE"
};

export const app = initializeApp(firebaseConfig);

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    experimentalForceLongPolling: true
  }, undefined);
} catch (cacheErr) {
  console.warn("[Firebase] Failed to initialize persistent local cache, falling back to in-memory local cache:", cacheErr);
  firestoreDb = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalForceLongPolling: true
  }, undefined);
}

export const db = firestoreDb;

const originalAuth = getAuth(app);
setPersistence(originalAuth, browserLocalPersistence).catch(console.error);
export const storage = getStorage(app);

// Proxied Auth to support Partner Mode (Portfolio Partner Acesso Total)
export const auth = new Proxy(originalAuth, {
  get(target, prop, receiver) {
    if (prop === 'currentUser') {
      const originalUser = target.currentUser;
      if (!originalUser) return null;

      const partnerMainUserUid = localStorage.getItem('partnerMainUserUid');
      const partnerMainUserEmail = localStorage.getItem('partnerMainUserEmail');
      const partnerMainUserDisplayName = localStorage.getItem('partnerMainUserDisplayName');
      const partnerMainUserPhotoURL = localStorage.getItem('partnerMainUserPhotoURL');

      if (partnerMainUserUid) {
        return new Proxy(originalUser, {
          get(userTarget, userProp) {
            if (userProp === 'uid') return partnerMainUserUid;
            if (userProp === 'email') return partnerMainUserEmail || userTarget.email;
            if (userProp === 'displayName') return partnerMainUserDisplayName || userTarget.displayName;
            if (userProp === 'photoURL') return partnerMainUserPhotoURL || userTarget.photoURL;
            const val = Reflect.get(userTarget, userProp);
            if (typeof val === 'function') {
              return val.bind(userTarget);
            }
            return val;
          }
        });
      }
    }
    if (prop === 'signOut') {
      return async () => {
        localStorage.removeItem('partnerModeActive');
        localStorage.removeItem('partnerMainUserUid');
        localStorage.removeItem('partnerMainUserEmail');
        localStorage.removeItem('partnerMainUserDisplayName');
        localStorage.removeItem('partnerMainUserPhotoURL');
        return target.signOut();
      };
    }
    const val = Reflect.get(target, prop);
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;
  }
});

// Helper to register standard user auth for the partner back-office-style
export async function registerPartnerAuth(email: string, psw: string) {
  if (!email || !psw) return;
  try {
    let secondApp;
    const existingApps = getApps();
    const partnerApp = existingApps.find(app => app.name === 'SecondaryPartner');
    if (partnerApp) {
      secondApp = partnerApp;
    } else {
      secondApp = initializeApp(firebaseConfig, 'SecondaryPartner');
    }
    const secondAuth = getAuth(secondApp);

    try {
      await createUserWithEmailAndPassword(secondAuth, email, psw);
      console.log("[Partner] Registered new credentials in Firebase Auth.");
    } catch (createErr: any) {
      if (createErr.code === 'auth/email-already-in-use') {
        console.log("[Partner] Email already registered. Synchronizing password.");
        try {
          await signInWithEmailAndPassword(secondAuth, email, psw);
          console.log("[Partner] Password matches existing register.");
        } catch (loginErr: any) {
          console.warn("[Partner] Password sync skipped: ", loginErr.message);
        }
      } else {
        throw createErr;
      }
    }
  } catch (err) {
    console.error("[Partner] Error in registerPartnerAuth:", err);
  }
}

// Helper to register new maestro administrative credentials
export async function registerNewMaestroAuth(email: string, psw: string) {
  if (!email || !psw) return null;
  const existingApps = getApps();
  const adminApp = existingApps.find(app => app.name === 'SecondaryAdmin');
  const secondApp = adminApp || initializeApp(firebaseConfig, 'SecondaryAdmin');
  const secondAuth = getAuth(secondApp);
  const result = await createUserWithEmailAndPassword(secondAuth, email, psw);
  return result.user.uid;
}


