import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { menuCategories, hasPrice } from '@/lib/menu-data';
export const MenuSection = () => {
 const [active,setActive] = useState('breakfast');
 const reducedMotion = useReducedMotion();
 const category = menuCategories.find(cat => cat.id===active) ?? menuCategories[0];
 return <section id="menu" className="section-band"><div className="page-width">
  <div className="section-heading"><span className="eyebrow">Good ingredients. Good company.</span><h2>fuel your play<span className="text-primary">.</span></h2><p>Good ingredients, good coffee, good fuel. Simple things done well.</p></div>
  <div className="menu-tabs" role="tablist" aria-label="menu categories">{menuCategories.map(cat=><Button key={cat.id} id={`tab-${cat.id}`} role="tab" aria-selected={active===cat.id} aria-controls="menu-panel" variant={active===cat.id?'default':'outline'} onClick={()=>setActive(cat.id)}>{cat.label.toLowerCase()}</Button>)}</div>
  <div id="menu-panel" role="tabpanel" aria-labelledby={`tab-${active}`} className="menu-panel"><AnimatePresence mode="wait" initial={false}><motion.div key={category.id} initial={{opacity:0,x:reducedMotion?0:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:reducedMotion?0:-16}} transition={{duration:reducedMotion?0:.2}}><div className="menu-category-title"><h3>{category.label.toLowerCase()}</h3><span className="text-muted-foreground">made for a little pause.</span></div>
   {category.sections.map((section,i)=><div key={i} className="menu-subsection">{section.subheading && <h4 className="menu-subheading">{section.subheading.toLowerCase()}</h4>}<div className="menu-items">{section.items.map(item=><article key={item.name} className="menu-item"><div className="menu-item-top"><h4>{item.name.toLowerCase()}</h4>{hasPrice(item.price) && <><span className="price-leader"/><span className="menu-price">aed {item.price}</span></>}</div>{item.description && <p>{item.description.toLowerCase()}</p>}{item.dietary?.length ? <div className="dietary-tags">{item.dietary.map(tag=><span key={tag}>{tag.toLowerCase()}</span>)}</div>:null}</article>)}</div></div>)}
   {category.note && <p className="menu-note">{category.note.toLowerCase()}</p>}
  </motion.div></AnimatePresence>
  </div>
 </div></section>;
};
