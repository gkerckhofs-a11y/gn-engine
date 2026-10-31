import {allianceDefenseSuite} from './support/space-alliance-defense-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
allianceDefenseSuite(()=>new MemoryStore());
