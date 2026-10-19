import {MemoryStore} from './support/memory.mjs';
import {knowledgeSuite} from './support/knowledge-suite.mjs';
knowledgeSuite(()=>new MemoryStore());
