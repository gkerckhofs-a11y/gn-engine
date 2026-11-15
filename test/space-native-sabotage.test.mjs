import {MemoryStore} from './support/memory.mjs';
import {nativeSabotageSuite} from './support/space-native-sabotage-suite.mjs';
nativeSabotageSuite(()=>new MemoryStore());
