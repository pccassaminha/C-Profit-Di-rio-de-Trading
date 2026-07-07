const fs = require('fs');

const filepath = 'src/components/Auth.tsx';
let content = fs.readFileSync(filepath, 'utf8');

const regex = /if \(isLogin\) \{[\s\S]*?onSuccess\(false\); \/\/ existing user/;
const replacement = `if (isLogin) {
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (loginErr: any) {
          throw loginErr;
        }

        try {
          const qPartner = query(
            collection(db, 'usuarios'),
            where('partnerEmail', '==', email.trim().toLowerCase())
          );
          const partnerSnap = await getDocs(qPartner);
          if (!partnerSnap.empty) {
            const parentDoc = partnerSnap.docs[0];
            const parentUid = parentDoc.id;
            const parentData = parentDoc.data();
            
            // Store partner mode variables in localStorage
            localStorage.setItem('partnerModeActive', 'true');
            localStorage.setItem('partnerMainUserUid', parentUid);
            localStorage.setItem('partnerMainUserEmail', parentData.email || '');
            localStorage.setItem('partnerMainUserDisplayName', (parentData.nome || parentData.name || 'Maestro') + ' (Parceiro)');
            localStorage.setItem('partnerMainUserPhotoURL', parentData.photoURL || '');
            console.log("[Partner Logged] Partner mode ready for parent UID:", parentUid);
          } else {
            // Standard user sign in
            localStorage.removeItem('partnerModeActive');
            localStorage.removeItem('partnerMainUserUid');
            localStorage.removeItem('partnerMainUserEmail');
            localStorage.removeItem('partnerMainUserDisplayName');
            localStorage.removeItem('partnerMainUserPhotoURL');
          }
        } catch (partnerErr: any) {
          console.warn("Partner log lookup failed after login:", partnerErr);
        }
        
        onSuccess(false); // existing user`;

content = content.replace(regex, replacement);
fs.writeFileSync(filepath, content);
console.log('Fixed Auth.tsx');
