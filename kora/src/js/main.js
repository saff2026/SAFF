/* ترتيب الألعاب في الصفحة الرئيسية ثم التشغيل */
const ORDER=['m11','who','grid','career','tena','word','conn','pies','mines','rare','fans','lista','ctx','bingo','gegen','heat','pack','quiz','ttt','poss','ringer','draft'];
GAMES.sort((a,b)=>ORDER.indexOf(a.id)-ORDER.indexOf(b.id));
render();
