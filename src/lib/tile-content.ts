export const whatsappUrl = (message: string) => `https://wa.me/971525789699?text=${encodeURIComponent(message)}`;
export const tableBookingUrl = whatsappUrl("Hi TILE, I'd like to book a table for [number] people on [date]");
export const deskBookingUrl = whatsappUrl("Hi TILE, I'd like to work from TILE on [date]");
export const privateBookingUrl = whatsappUrl("Hi TILE, I'd like to enquire about a private event");
export const instagramUrl = 'https://instagram.com/tiledubai';
export const address = 'Grip Sports Club, Jumeirah Lake Towers, Dubai';
export const gamesPrice = 30;
export const termsNote = '*terms & conditions apply';
export const prizeTerms = '*terms & conditions apply. the unlimited board games voucher and drink are redeemed in person at tile within 30 days; one prize per person every 4 weeks.';
export const googleMapsUrl = 'https://share.google/lpX3rw7tnS8ZIkqQQ';
export const googleMapsEmbedUrl = 'https://maps.google.com/maps?q=25.0630879,55.1415203&z=17&output=embed';
export const gameCategories = [
 { name: 'Strategy', games: ['Catan', 'Ticket to Ride', 'Splendor', 'Azul', 'Pandemic'] },
 { name: 'Party', games: ['Codenames', 'Dixit', 'Exploding Kittens', 'Werewolf', 'The Mind'] },
 { name: 'Classic', games: ['Chess', 'Backgammon', 'Scrabble', 'Carrom', 'Rummikub'] },
 { name: 'Two-Player', games: ['Patchwork', 'Sequence', 'Blokus', 'Playing Cards', 'Uno'] },
 { name: 'Mahjong', games: ['Mahjong'] },
];
export const events: { name: string; description: string; day?: string; time?: string }[] = [
 { name: 'Mahjong Majlis', description: 'Tiles on the table. Good company all around.' },
 { name: 'Play Days', description: 'A little friendly competition, a lot of connection.' },
 { name: 'Game nights', description: 'Gather around a new game or an old favourite.' },
 { name: 'Tournaments', description: 'Bring your best moves. All skill levels welcome.' },
 { name: 'Study groups', description: 'Study sessions and language exchange meetups.' },
];
export const eventBookingUrl = (name: string) => whatsappUrl(`Hi TILE, I'd like to join ${name}`);
