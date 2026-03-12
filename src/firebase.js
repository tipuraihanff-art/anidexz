import { initializeApp, getApps } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const fbCfg = {
  apiKey: 'AIzaSyD6bnfVL4XZhdpAPtM2_qVrCNNc9aSxve8',
  authDomain: 'anidexz.firebaseapp.com',
  databaseURL: 'https://anidexz-default-rtdb.firebaseio.com',
  projectId: 'anidexz',
  storageBucket: 'anidexz.firebasestorage.app',
  messagingSenderId: '744070068034',
  appId: '1:744070068034:web:76d7007747567d49453adb'
}

const app = getApps().length ? getApps()[0] : initializeApp(fbCfg)
export const db = getDatabase(app)
