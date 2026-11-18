import {MemoryStore} from './support/memory.mjs';
import {terminalQrSuite} from './support/terminal-qr-suite.mjs';
terminalQrSuite(()=>new MemoryStore());
import {terminalQrPortSuite} from './support/terminal-qr-suite.mjs';
terminalQrPortSuite(()=>new MemoryStore());
import {terminalQrServicesSuite} from './support/terminal-qr-suite.mjs';
terminalQrServicesSuite(()=>new MemoryStore());
