import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Dices, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import shelves from '@/assets/optimized/real-games.webp';
import { gameCategories, tableBookingUrl, gamesPrice, termsNote } from '@/lib/tile-content';
export const GamesSection = () => {
 const [active,setActive] = useState(0);
 const reducedMotion = useReducedMotion();
 const category = gameCategories[active];
 return <section id="games" className="section-band dark-section"><div className="page-width">
 <div className="section-heading"><span className="eyebrow">Make your next move</span><h2>Unlimited games.<br/>Endless rounds<span className="text-primary">.</span></h2></div>
 <div className="games-layout"><div className="games-photo"><img src={shelves} alt="TILE's floor-to-ceiling board game shelves" loading="lazy"/><div className="dice-badge"><Dices size={32}/></div></div>
  <div className="games-content"><div className="pricing-tile"><Dices/><div><h3>AED {gamesPrice}<span className="price-mark">*</span> per person.</h3><p>Unlimited games, all day.</p></div></div>
  <p className="price-terms">{termsNote}</p>
 <div className="filter-row" aria-label="game categories">{gameCategories.map((cat,i)=><Button key={cat.name} variant={i===active?'default':'outline'} onClick={()=>setActive(i)} aria-pressed={i===active}>{cat.name.toLowerCase()}</Button>)}</div>
 <div className="featured-games" aria-live="polite"><AnimatePresence mode="wait" initial={false}><motion.div key={category.name} initial={{opacity:0,x:reducedMotion?0:18}} animate={{opacity:1,x:0}} exit={{opacity:0,x:reducedMotion?0:-12}} transition={{duration:reducedMotion?0:.22}}><span className="eyebrow">featured {category.name.toLowerCase()} games</span><ul>{category.games.map((game,i)=><li key={game}><span className="game-number">0{i+1}</span>{game.toLowerCase()}<ArrowUpRight size={16}/></li>)}</ul></motion.div></AnimatePresence></div>
 <p className="text-muted-foreground">Not sure what to play? Our team will teach you.</p><Button asChild><a href={tableBookingUrl} target="_blank" rel="noopener noreferrer">Book a table <ArrowUpRight/></a></Button>
 </div></div></div></section>;
};
