import {MemoryStore} from './support/memory.mjs';
import {groupManagementSuite} from './support/group-management-suite.mjs';
groupManagementSuite(()=>new MemoryStore());
