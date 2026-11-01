import {ransomSponsorSuite} from './support/space-boarding-ransom-sponsor-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
ransomSponsorSuite(()=>new MemoryStore());
