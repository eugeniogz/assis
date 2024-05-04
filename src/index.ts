import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore/lite';

const firebaseConfig = {
    apiKey: "AIzaSyCY70IicrOo0p5Eetik57Y5bSDp5kvmmIk",
    authDomain: "sjcl-794b5.firebaseapp.com",
    projectId: "sjcl-794b5",
    storageBucket: "sjcl-794b5.appspot.com",
    messagingSenderId: "591697127419",
    appId: "1:591697127419:web:6da2b80a08a5754524cd5e",
    measurementId: "G-WB0MLFSPJQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
getEnc();

// Get a list of cities from your database
export async function getEnc() {
  const secret = collection(db, '/secret');
  const docs = await getDocs(secret);
  const cityList = docs.docs.map(doc => doc.data());
  return cityList;
}