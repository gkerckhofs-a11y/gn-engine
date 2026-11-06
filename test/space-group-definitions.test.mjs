import {MemoryStore} from './support/memory.mjs';
import {groupDefinitionsSuite} from './support/space-group-definitions-suite.mjs';
groupDefinitionsSuite(()=>new MemoryStore());
