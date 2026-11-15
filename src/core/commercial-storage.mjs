import {createLogisticsService} from './logistics.mjs';

// Explicit server mode of the existing warehouse engine. The request cannot
// turn the ordinary/group warehouse controller into a commercial controller.
export const commercialStorageCommands={
 commercialStorageAdmin:'warehouseAdmin',saveCommercialStorage:'saveWarehouse',
 commercialStorages:'warehouses',commercialStorage:'warehouseDetail',
 prepareCommercialStorageRent:'prepareWarehouseRent',rentCommercialStorage:'rentWarehouse',
 prepareCommercialStorageMove:'prepareWarehouseMove',moveCommercialStorage:'moveWarehouseStock',
 prepareCommercialStorageRelease:'prepareWarehouseRelease',releaseCommercialStorage:'releaseWarehouse'
};
export function createCommercialStorageService(options){
 const native=createLogisticsService({...options,commercialStorage:true});
 return (action,actor,input)=>native(commercialStorageCommands[action],actor,input);
}
