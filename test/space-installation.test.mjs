import {installationSuite} from './support/space-installation-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
installationSuite(()=>new MemoryStore());
