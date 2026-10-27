import { ArrowUpRight, ArrowDown, Car, Clock, Dices } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TileGrid } from '@/components/TileGrid';
import { tableBookingUrl } from '@/lib/tile-content';
export const HeroSection = () => <section id="home" className="hero dark-section">
 <div className="page-width hero-layout">
  <div className="hero-copy">
   <p className="hero-eyebrow"><span className="neon-square"/> Board games · Mahjong · Specialty coffee · Fresh food</p>
   <h1>the missing<br/>piece<span className="text-primary">.</span></h1>
    <p className="hero-subline">Unlimited board games, specialty coffee, fresh food and a table with your name on it. Inside Grip Sports Club, JLT.</p>
   <div className="hero-buttons"><Button asChild size="lg"><a href={tableBookingUrl} target="_blank" rel="noopener noreferrer">Book a table <ArrowUpRight/></a></Button><Button asChild variant="hero-outline" size="lg"><a href="#menu">See the menu <ArrowDown/></a></Button></div>
   <div className="hero-facts"><span><Dices/> AED 30 unlimited games</span><span><Clock/> 8am to midnight daily</span><span><Car/> Free parking</span></div>
  </div>
  <TileGrid/>
 </div>
 <div className="hero-bottom page-width"><span>A place to belong. A reason to stay.</span><a href="#space" aria-label="Explore the space"><ArrowDown size={18}/></a></div>
</section>;
