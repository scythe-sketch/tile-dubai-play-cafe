export const whatsappUrl = (message: string) => `https://wa.me/971525789699?text=${encodeURIComponent(message)}`;
export const tableBookingUrl = whatsappUrl("Hi TILE, I'd like to book a table for [number] people on [date]");
export const deskBookingUrl = whatsappUrl("Hi TILE, I'd like to work from TILE on [date]");
export const privateBookingUrl = whatsappUrl("Hi TILE, I'd like to enquire about a private event");
export const instagramUrl = 'https://instagram.com/tiledubai';
export const address = 'Grip Sports Club, Jumeirah Heights, Dubai';
export const gamesPrice = 30;
export const googleMapsUrl = 'https://www.google.com/maps?q=347R+6J+tile+Board+Game+Cafe+-+Al+Thanyah+Fifth+-+Jumeirah+Heights+-+Dubai&ftid=0x3e5f6d003ab61c43:0x27eb4bcc1d7fbe4a&entry=gps';
export const googleMapsEmbedUrl = 'https://www.google.com/maps?output=embed&q=TILE+Board+Game+Cafe&cid=2876476547628588618';
export const gameCategories = [
 { name: 'Strategy', games: ['Catan', 'Ticket to Ride', 'Splendor', 'Azul', 'Pandemic'] },
 { name: 'Party', games: ['Codenames', 'Dixit', 'Exploding Kittens', 'Werewolf', 'The Mind'] },
 { name: 'Classic', games: ['Chess', 'Backgammon', 'Scrabble', 'Carrom', 'Rummikub'] },
 { name: 'Two-Player', games: ['Patchwork', 'Sequence', 'Blokus', 'Playing Cards', 'Uno'] },
 { name: 'Mahjong', games: [] },
];
export const events: { name: string; description: string; day?: string; time?: string }[] = [
 { name: 'Mahjong Majlis', description: 'Tiles on the table. Good company all around.' },
 { name: 'Play Days', description: 'A little friendly competition, a lot of connection.' },
 { name: 'Game nights', description: 'Gather around a new game or an old favourite.' },
 { name: 'Tournaments', description: 'Bring your best moves. All skill levels welcome.' },
 { name: 'Missing Piece Meetups', description: 'New faces, shared interests and easy conversation.' },
 { name: 'Study groups', description: 'Study sessions and language exchange meetups.' },
 { name: 'Creative nights', description: 'Sketching, journaling and a little inspiration.' },
];
export const eventBookingUrl = (name: string) => whatsappUrl(`Hi TILE, I'd like to join ${name}`);
