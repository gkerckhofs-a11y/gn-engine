import {MemoryStore} from './support/memory.mjs';
import {spaceGroupWalletsSuite} from './support/space-group-wallets-suite.mjs';
spaceGroupWalletsSuite(()=>new MemoryStore());
