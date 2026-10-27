import { Coffee, Dice5, Dices, Club, CircleDot, Diamond, Puzzle, Spade } from 'lucide-react';
const Meeple = () => <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 14a6 6 0 1 1 12 0l10 8-4 5-7-4 6 17H13l6-17-7 4-4-5z" strokeLinejoin="round" /></svg>;
const Mahjong = () => <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2"><rect x="11" y="5" width="26" height="38" rx="4"/><path d="M24 12v25M16 20h16v10H16z" /></svg>;
const Knight = () => <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 40h27v-6H15l3-8 9-6-6-4-8 6-5-4 12-12 6-2 3 6c8 5 10 13 7 24M24 9l-3-5M12 43h28" strokeLinejoin="round"/><circle cx="25" cy="14" r="1"/></svg>;
const Domino = () => <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2"><rect x="13" y="5" width="22" height="38" rx="3"/><path d="M13 24h22"/><circle cx="20" cy="13" r="1.5"/><circle cx="28" cy="18" r="1.5"/><circle cx="20" cy="31" r="1.5"/><circle cx="28" cy="37" r="1.5"/><circle cx="24" cy="34" r="1.5"/></svg>;
const tiles = [
 {icon:Dice5,tone:'sage'}, {icon:Meeple}, {icon:Coffee}, {icon:Spade,tone:'cream'}, {icon:Mahjong},
 {icon:Knight}, {empty:true}, {icon:Domino,tone:'wood'}, {icon:CircleDot}, {icon:Club},
 {icon:Diamond}, {icon:Mahjong,tone:'glow'}, {icon:Dices,tone:'sage'}, {}, {icon:Puzzle},
 {icon:Coffee,tone:'cream'}, {icon:Spade}, {}, {icon:Meeple,tone:'glow'}, {icon:Domino},
];
export const TileGrid = () => <div className="tile-grid" aria-label="A grid of game pieces with a missing piece for you">
 {tiles.map((tile,i) => <div key={i} className={`game-tile ${tile.tone ? `tile-${tile.tone}`:''} ${tile.empty?'tile-empty':''}`}>
  {tile.icon && <tile.icon aria-hidden="true" />}
  {tile.empty && <div className="you-tile">you<span>.</span></div>}
 </div>)}
</div>;
