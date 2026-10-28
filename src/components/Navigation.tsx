import { useEffect, useState } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/BrandLogo';
import { tableBookingUrl } from '@/lib/tile-content';
const links = ['Games', 'Play', 'Menu', 'Events', 'Coworking'];
export const Navigation = () => {
 const [open,setOpen] = useState(false);
 const [active,setActive] = useState('');
 useEffect(() => {
  const update = () => {
   const current = links.map(label => document.getElementById(label.toLowerCase())).filter((el): el is HTMLElement => Boolean(el)).filter(el => el.getBoundingClientRect().top <= 160).slice(-1)[0];
   setActive(current?.id || '');
  };
  window.addEventListener('scroll',update,{passive:true}); update();
  return () => window.removeEventListener('scroll',update);
 },[]);
 return <header className="site-nav dark-section">
  <nav className="page-width nav-inner" aria-label="Main navigation">
   <a href="#home" onClick={() => setOpen(false)}><BrandLogo /></a>
   <div className="desktop-links">{links.map(label => <a key={label} href={`#${label.toLowerCase()}`} className={label==="Play"?"nav-play":undefined} aria-current={active===label.toLowerCase()?'location':undefined}>{label}</a>)}</div>
   <Button asChild className="nav-book"><a href={tableBookingUrl} target="_blank" rel="noopener noreferrer">Book a table <ArrowUpRight /></a></Button>
   <Button variant="ghost" size="icon" className="mobile-toggle" aria-label={open?'Close menu':'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open?<X/>:<Menu/>}</Button>
  </nav>
  {open && <div className="mobile-links">{links.map(label => <a key={label} href={`#${label.toLowerCase()}`} className={label==="Play"?"nav-play":undefined} onClick={() => setOpen(false)}>{label}</a>)}<Button asChild><a href={tableBookingUrl} target="_blank" rel="noopener noreferrer">Book a table</a></Button></div>}
 </header>;
};
