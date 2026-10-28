import {centralKnowledgeSuite} from './support/central-knowledge-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
centralKnowledgeSuite(()=>new MemoryStore());
