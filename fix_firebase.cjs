const fs = require('fs');

const filepath = 'src/firebase.ts';
let content = fs.readFileSync(filepath, 'utf8');

// replace "import firebaseConfig from '../firebase-applet-config.json';" with the user's config
const userConfig = `const firebaseConfig = {
  apiKey: "AIzaSyDBEOdBHS3mxxE1Vhw2pSh0BjGaK6M8GBw",
  authDomain: "c-trade-diario.firebaseapp.com",
  databaseURL: "https://c-trade-diario-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "c-trade-diario",
  storageBucket: "c-trade-diario.firebasestorage.app",
  messagingSenderId: "699030568101",
  appId: "1:699030568101:web:8e4871564f410eb466a14c",
  measurementId: "G-L1YGRSF0GE"
};`;

content = content.replace("import firebaseConfig from '../firebase-applet-config.json';", userConfig);
content = content.replace("firebaseConfig.firestoreDatabaseId", "undefined");

fs.writeFileSync(filepath, content);
console.log('Fixed firebase.ts');
