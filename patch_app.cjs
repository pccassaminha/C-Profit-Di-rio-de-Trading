const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/} catch \(error\) \{\n\s*console\.error\("Error loading settings from Firestore in App\.tsx:", error\);\n\s*\}/g, `} catch (error: any) {
          if (error.code !== 'permission-denied') {
            console.error("Error loading settings from Firestore in App.tsx:", error);
          }
        }`);

fs.writeFileSync('src/App.tsx', content);
