import {MemoryStore} from './support/memory.mjs';
import {playerIdentitySuite} from './support/player-identity-suite.mjs';
playerIdentitySuite(()=>new MemoryStore());
