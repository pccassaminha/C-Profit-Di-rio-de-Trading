import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from './src/firebase';
const q = query(collection(db, 'test'));
onSnapshot(q, {
  next: (snap) => console.log(snap),
  error: (err) => console.error(err)
});
