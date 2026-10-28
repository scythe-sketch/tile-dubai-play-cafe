// Compact conservative filter: normalize common leetspeak and separators.
const blocked = ['fuck', 'shit', 'bitch', 'cunt', 'asshole', 'bastard', 'motherfucker', 'dick', 'cock', 'pussy', 'wanker', 'twat', 'slut', 'whore', 'nigger', 'nigga', 'faggot', 'fag', 'retard', 'nazi'];
export function isProfane(nickname: string): boolean {
  const normalized = nickname.toLowerCase().replace(/[01345789]/g, c => ({ '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g' }[c]!)).replace(/[ _]/g, '');
  return blocked.some(word => normalized.includes(word)) || /(?:sh1t|b1tch|f4g|a55|d1ck|fuk|phuck)/i.test(nickname);
}
