import interior from '@/assets/optimized/hero-cafe.webp';
import padel from '@/assets/optimized/padel.webp';
import food from '@/assets/optimized/food-menu.webp';
import coworking from '@/assets/optimized/real-coworking.webp';
import { ArrowUpRight, Car, Clock, Dices } from 'lucide-react';
export const SpaceSection = () => <section id="space" className="section-band">
 <div className="page-width"><div className="section-heading"><span className="eyebrow">Find your corner</span><h2>One space, every mood<span className="text-primary">.</span></h2></div>
 <div className="space-bento">
  <figure className="bento-photo bento-interior"><img src={interior} alt="TILE café interior with glowing square ceiling lights" loading="lazy"/><figcaption>Inside TILE <ArrowUpRight/></figcaption></figure>
  <div className="bento-story"><span className="neon-square"/><h3>Small pieces,<br/>something bigger.</h3><p>TILE brings people, coffee and games together under one roof.</p></div>
  <figure className="bento-photo bento-padel"><img src={padel} alt="Padel courts at sunset beside TILE" loading="lazy"/><figcaption>Courtside views <ArrowUpRight/></figcaption></figure>
  <div className="bento-stat bento-games"><Dices/><h3>Unlimited<br/>board games</h3></div>
  <figure className="bento-photo bento-food"><img src={food} alt="Fresh TILE food on a green menu beside a padel racket" loading="lazy"/><figcaption>Fresh, plant-forward food <ArrowUpRight/></figcaption></figure>
  <div className="bento-stat bento-hours"><Clock/><h3>8am to<br/>midnight</h3></div>
  <figure className="bento-photo bento-work"><img src={coworking} alt="Bright TILE seating overlooking the padel courts" loading="lazy"/><figcaption>Laptops welcome <ArrowUpRight/></figcaption></figure>
  <div className="bento-stat bento-parking"><Car/><h3>Free<br/>parking</h3></div>
 </div></div>
</section>;
