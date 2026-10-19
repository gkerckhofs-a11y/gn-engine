import {MemoryStore} from './support/memory.mjs';
import {workflowSuite} from './support/workflow-suite.mjs';
workflowSuite(()=>new MemoryStore());
