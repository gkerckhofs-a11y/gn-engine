// Project stored starting definitions only; never infer an import row or read acquired resources.
export function dotationsProjection(characters){
 return {module:'personnages',sheet:'Dotations',editable:false,errors:[],references:{},rows:characters.map(c=>({
  row:{id:c.id},title:c.public.displayName,ownerLabel:(c.startingInventory?.items??[]).map(x=>`${x.item.id} ${x.item.name}`).join(' '),
  state:c.masterArchived===true?'archived':'active',
  credits:c.startingCredits?{amount:c.startingCredits.amount,revision:c.startingCredits.revision}:null,
  inventory:c.startingInventory?{revision:c.startingInventory.revision,items:c.startingInventory.items.map(x=>({id:x.item.id,name:x.item.name,unit:x.item.unit,quantity:x.quantity})).sort((a,b)=>a.id.localeCompare(b.id))}:null,
 })).sort((a,b)=>a.title.localeCompare(b.title)||a.row.id.localeCompare(b.row.id))};
}
