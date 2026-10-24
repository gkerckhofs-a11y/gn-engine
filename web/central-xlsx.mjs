import {readWorkbookXlsx} from './master-xlsx.mjs';
import {writeWorkbook} from './master-xlsx-write.mjs';
import {centralImportSheets,centralImportRequired} from '../src/shared/central-import-schema.mjs';
export const readCentralXlsx=bytes=>readWorkbookXlsx(bytes,centralImportSheets,[],centralImportRequired);
export const writeCentralXlsx=sheets=>writeWorkbook(sheets,centralImportSheets);
