import {MemoryStore} from './support/memory.mjs';
import {notebookSuite} from './support/notebook-suite.mjs';
notebookSuite(()=>new MemoryStore());
