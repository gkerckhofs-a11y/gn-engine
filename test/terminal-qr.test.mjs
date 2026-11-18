import {MemoryStore} from './support/memory.mjs';
import {terminalQrSuite} from './support/terminal-qr-suite.mjs';
terminalQrSuite(()=>new MemoryStore());
