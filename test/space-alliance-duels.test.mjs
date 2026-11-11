import {allianceDuelSuite} from './support/space-alliance-duels-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
allianceDuelSuite(()=>new MemoryStore());
