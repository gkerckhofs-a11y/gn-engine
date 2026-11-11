import {pirateAllianceSuite} from './support/space-pirate-alliances-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
pirateAllianceSuite(()=>new MemoryStore());
