import {spaceContractAppealsSuite} from './support/space-contract-appeals-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceContractAppealsSuite(()=>new MemoryStore());
