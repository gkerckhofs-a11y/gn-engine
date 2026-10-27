import {initializeApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import config from './firebase-config.mjs';

export default getAuth(initializeApp(config));
