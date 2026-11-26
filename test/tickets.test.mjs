import {MemoryStore} from './support/memory.mjs';
import {ticketSuite} from './support/tickets-suite.mjs';
ticketSuite(()=>new MemoryStore());
