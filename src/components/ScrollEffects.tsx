import { useEffect } from 'react';

/** Progressive enhancement: content remains visible when motion is disabled. */
export const ScrollEffects = () => {
 useEffect(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches) return;
  const targets = document.querySelectorAll<HTMLElement>('.hero-copy > *, .tile-grid, .section-heading, .space-bento > *, .games-photo, .games-content > *, .menu-tabs, .menu-panel, .event-card, .private-events > *, .coworking-layout > *, .visit-layout > *, .footer-main > *');
  const animations: Animation[] = [];
  const observer = new IntersectionObserver(entries => {
   entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const target = entry.target as HTMLElement;
    const index = Array.from(target.parentElement?.children ?? []).indexOf(target);
    const direction = index % 2 === 0 ? -1 : 1;
    animations.push(target.animate([
     { opacity: 0, translate: `${direction * 32}px 12px` },
     { opacity: 1, translate: '0px 0px' },
    ], { duration: 850, delay: Math.min(index * 65, 260), easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
    observer.unobserve(target);
   });
  }, { threshold: 0.12 });
  targets.forEach(target => observer.observe(target));
  const photos = document.querySelectorAll<HTMLElement>('.bento-photo img, .games-photo img, .coworking-photo img');
  let frame = 0;
  const update = () => {
   frame = 0;
   photos.forEach(photo => {
    const bounds = photo.parentElement?.getBoundingClientRect();
    if (!bounds || bounds.bottom < 0 || bounds.top > window.innerHeight) return;
    const progress = (bounds.top + bounds.height / 2 - window.innerHeight / 2) / window.innerHeight;
    photo.style.setProperty('--scroll-drift', `${Math.max(-20, Math.min(20, progress * 30))}px`);
   });
  };
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', onScroll, { passive: true });
  update();
  const stopMotion = () => {
   if (!preference.matches) return;
   animations.forEach(animation => animation.cancel());
   observer.disconnect();
   window.removeEventListener('scroll', onScroll);
   photos.forEach(photo => photo.style.removeProperty('--scroll-drift'));
  };
  preference.addEventListener('change', stopMotion);
  return () => {
   observer.disconnect();
   animations.forEach(animation => animation.cancel());
   window.removeEventListener('scroll', onScroll);
   preference.removeEventListener('change', stopMotion);
   cancelAnimationFrame(frame);
   photos.forEach(photo => photo.style.removeProperty('--scroll-drift'));
  };
 }, []);
 return null;
};