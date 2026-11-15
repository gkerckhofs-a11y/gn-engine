import {MemoryStore} from './support/memory.mjs';
import {installationRepairSuite} from './support/space-installation-repair-suite.mjs';
installationRepairSuite(()=>new MemoryStore());
