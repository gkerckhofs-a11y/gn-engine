// Presentation only. Every command retains its native server authorization.
export function skillLevel(character,id){
 const skills=character?.abilities?.skills??character?.spaceOutlawsSkills?.skills??[];
 const skill=skills.find(s=>s.id===id);
 return skill?(skill.kind==='FIXED'?1:Number(skill.level)||0):0;
}
export function playerCapabilities(d){
 const c=d.character,has=(id,min=1)=>skillLevel(c,id)>=min;
 return {pickpocket:has('ROG-02'),escape:has('ROG-03'),decryption:has('INF-02'),
 navigation:has('PIL-01'),maintenance:has('MEC-02',2),
 ships:has('PIL-01')||d.ownsShip===true,shipWork:has('MEC-02',2)||d.ownsShip===true};
}
