import { useState } from 'react';
import { Dices, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import shelves from '@/assets/optimized/real-games.webp';
import { gameCategories, tableBookingUrl, gamesPrice } from '@/lib/tile-content';
export const GamesSection = () => {
 const [active,setActive] = useState(0);
 const category = gameCategories[active];
 return <section id="games" className="section-band dark-section"><div className="page-width">
 <div className="section-heading"><span className="eyebrow">Make your next move</span><h2>Unlimited games.<br/>Endless rounds<span className="text-primary">.</span></h2></div>
 <div className="games-layout"><div className="games-photo"><img src={shelves} alt="TILE's floor-to-ceiling board game shelves" loading="lazy"/><div className="dice-badge"><Dices size={32}/></div></div>
 <div className="games-content"><div className="pricing-tile"><Dices/><div><h3>AED {gamesPrice} per person.</h3><p>Unlimited games, all day.</p></div></div>
 <div className="filter-row" aria-label="Game categories">{gameCategories.map((cat,i)=><Button key={cat.name} variant={i===active?'default':'hero-outline'} onClick={()=>setActive(i)} aria-pressed={i===active}>{cat.name}</Button>)}</div>
 <div className="featured-games" aria-live="polite"><span className="eyebrow">Featured {category.name.toLowerCase()} games</span>{category.games.length ? <ul>{category.games.map((game,i)=><li key={game}><span className="game-number">0{i+1}</span>{game}<ArrowUpRight size={16}/></li>)}</ul>:<p className="py-8">Ask our team for recommendations</p>}</div>
 <p className="text-muted-foreground">Not sure what to play? Our team will teach you.</p><Button asChild><a href={tableBookingUrl} target="_blank" rel="noopener noreferrer">Book a table <ArrowUpRight/></a></Button>
 </div></div></div></section>;
};
