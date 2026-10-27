import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { menuCategories, sentenceCase, hasPrice } from '@/lib/menu-data';
export const MenuSection = () => {
 const [active,setActive] = useState('breakfast');
 const category = menuCategories.find(cat => cat.id===active) ?? menuCategories[0];
 return <section id="menu" className="section-band"><div className="page-width">
  <div className="section-heading"><span className="eyebrow">Good ingredients. Good company.</span><h2>fuel your play<span className="text-primary">.</span></h2><p>Good ingredients, good coffee, good fuel. Simple things done well.</p></div>
  <div className="menu-tabs" role="tablist" aria-label="Menu categories">{menuCategories.map(cat=><Button key={cat.id} id={`tab-${cat.id}`} role="tab" aria-selected={active===cat.id} aria-controls="menu-panel" variant={active===cat.id?'default':'outline'} onClick={()=>setActive(cat.id)}>{sentenceCase(cat.label)}</Button>)}</div>
  <div id="menu-panel" role="tabpanel" aria-labelledby={`tab-${active}`} className="menu-panel"><div className="menu-category-title"><h3>{sentenceCase(category.label)}</h3><span className="text-muted-foreground">Made for a little pause.</span></div>
   {category.sections.map((section,i)=><div key={i} className="menu-subsection">{section.subheading && <h4 className="menu-subheading">{sentenceCase(section.subheading)}</h4>}<div className="menu-items">{section.items.map(item=><article key={item.name} className="menu-item"><div className="menu-item-top"><h4>{sentenceCase(item.name)}</h4>{hasPrice(item.price) && <><span className="price-leader"/><span className="menu-price">AED {item.price}</span></>}</div>{item.description && <p>{sentenceCase(item.description)}</p>}{item.dietary?.length ? <div className="dietary-tags">{item.dietary.map(tag=><span key={tag}>{tag}</span>)}</div>:null}</article>)}</div></div>)}
   {category.note && <p className="menu-note">{sentenceCase(category.note)}</p>}
  </div>
 </div></section>;
};
