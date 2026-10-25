import {centralSnapshotsSuite} from './support/central-snapshots-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
centralSnapshotsSuite(()=>new MemoryStore());
