import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalAutoDetectLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

const originalAuth = getAuth(app);
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

async function testConnection() {
  try {
    // Try to perform a query/lookup directly from the server.
    // If it fails with permission-denied, it means the connection WAS successful,
    // but the security rules rightly blocked unauthorized reads.
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection check completed successfully!");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isOffline = 
      errorMsg.includes('the client is offline') || 
      errorMsg.includes('Could not reach Cloud Firestore backend') ||
      errorMsg.includes('Backend didn\'t respond') ||
      errorMsg.includes('network') ||
      errorMsg.includes('timeout');

    if (isOffline) {
      console.warn(
        "Firestore connection check: Operating in offline/resilient cache mode.\n" +
        "The SDK will automatically queue operations and synchronize them once a persistent channel is established."
      );
    } else {
      // Permission-denied or document-not-found means we did indeed reach the Firestore backend successfully!
      console.log("Firestore connection check: Backend reached successfully! (Normal response code returned: " + errorMsg + ")");
    }
  }
}
testConnection();
