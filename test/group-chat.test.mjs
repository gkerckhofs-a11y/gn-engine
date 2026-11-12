import {MemoryStore} from './support/memory.mjs';
import {groupChatSuite} from './support/group-chat-suite.mjs';
groupChatSuite(()=>new MemoryStore());
