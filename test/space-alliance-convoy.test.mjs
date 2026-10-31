import {allianceConvoySuite} from './support/space-alliance-convoy-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
allianceConvoySuite(()=>new MemoryStore());
