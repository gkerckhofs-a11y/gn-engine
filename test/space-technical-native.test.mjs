import {MemoryStore} from './support/memory.mjs';
import {nativeTechnicalSuite} from './support/space-technical-native-suite.mjs';
nativeTechnicalSuite(()=>new MemoryStore());
