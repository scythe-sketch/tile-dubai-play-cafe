import { test, expect } from 'bun:test';
import { gamesPrice, gameCategories, tableBookingUrl, deskBookingUrl, eventBookingUrl, events, address, googleMapsUrl, googleMapsEmbedUrl, termsNote, prizeTerms } from './tile-content';
import { hasPrice } from './menu-data';
test('Unlimited gaming is AED 30 per person',()=>expect(gamesPrice).toBe(30));
test('Strategy has the five specified games',()=>expect(gameCategories[0].games).toEqual(['Catan','Ticket to Ride','Splendor','Azul','Pandemic']));
test('Table booking includes people and date placeholders',()=>expect(new URL(tableBookingUrl).searchParams.get('text')).toBe("Hi TILE, I'd like to book a table for [number] people on [date]"));
test('Desk booking includes date placeholder',()=>expect(new URL(deskBookingUrl).searchParams.get('text')).toBe("Hi TILE, I'd like to work from TILE on [date]"));
test('Event booking names the event',()=>expect(new URL(eventBookingUrl('Mahjong Majlis')).searchParams.get('text')).toBe("Hi TILE, I'd like to join Mahjong Majlis"));
test('Community events lead with Mahjong Majlis and Play Days',()=>expect(events.slice(0,2).map(e=>e.name)).toEqual(['Mahjong Majlis','Play Days']));
test('Empty price is hidden; numeric AED value is shown',()=>{expect(hasPrice(undefined)).toBe(false);expect(hasPrice(30)).toBe(true)});
test('Location is Grip Sports Club in Jumeirah Lake Towers',()=>expect(address).toBe('Grip Sports Club, Jumeirah Lake Towers, Dubai'));
test('The map embed is pinned to TILE exact coordinates',()=>expect(googleMapsEmbedUrl).toContain('q=25.0630879,55.1415203'));
test('The map link opens TILE shared Google Maps location',()=>expect(googleMapsUrl).toBe('https://share.google/lpX3rw7tnS8ZIkqQQ'));
test('Unwanted community events cannot be booked from the event list',()=>{
 expect(events.some(event=>event.name==='Missing Piece Meetups')).toBe(false);
 expect(events.some(event=>event.name==='Creative nights')).toBe(false);
});

test("price terms", () => {
  expect(termsNote).toBe("*terms & conditions apply");
  expect(prizeTerms).toContain("redeemed in person at TILE within 30 days");
  expect(prizeTerms).toContain("one prize per person every 4 weeks");
});
