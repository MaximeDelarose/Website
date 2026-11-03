/**
 * Problèmes d'échecs classiques. `line` : coups UCI en alternance
 * (joueuse, adversaire, joueuse…). Pour les mats, tout coup qui mate est
 * accepté, même s'il n'est pas celui de la solution.
 */
export interface ChessPuzzle {
  id: string;
  title: string;
  goal: 'mate1' | 'mate2' | 'win';
  hint: string;
  fen: string;
  line: string[];
}

export const CHESS_PUZZLES: ChessPuzzle[] = [
  { id: 'p1', title: 'Le couloir', goal: 'mate1', hint: 'Le roi noir est coincé derrière ses pions.', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', line: ['d1d8'] },
  { id: 'p2', title: 'Le baiser de la dame', goal: 'mate1', hint: 'Le roi blanc soutient sa dame.', fen: '7k/8/6K1/8/8/8/8/Q7 w - - 0 1', line: ['a1a8'] },
  { id: 'p3', title: 'Le coup du berger', goal: 'mate1', hint: 'La case f7 n\'est défendue que par le roi.', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1', line: ['f3f7'] },
  { id: 'p4', title: 'Le mat étouffé', goal: 'mate1', hint: 'Le roi est entouré de ses propres pièces. Un cavalier suffit.', fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', line: ['g5f7'] },
  { id: 'p5', title: 'Côté noir', goal: 'mate1', hint: 'Cette fois, tu joues les noirs.', fen: '3r2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1', line: ['d8d1'] },
  { id: 'p6', title: 'Le mat arabe', goal: 'mate1', hint: 'Tour et cavalier, un duo de charme.', fen: '7k/7p/5N2/8/8/8/8/6RK w - - 0 1', line: ['g1g8'] },
  { id: 'p7', title: 'La fourchette', goal: 'win', hint: 'Un cavalier peut attaquer deux pièces à la fois.', fen: 'q3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', line: ['b5c7', 'e8d7', 'c7a8'] },
  { id: 'p8', title: 'L\'enfilade', goal: 'win', hint: 'Fais échec : ce qui se cache derrière le roi tombera.', fen: '8/1q6/8/3k4/8/8/8/K2B4 w - - 0 1', line: ['d1f3', 'd5c5', 'f3b7'] },
  { id: 'p9', title: 'L\'échelle', goal: 'mate2', hint: 'Une tour coupe la route, l\'autre donne le mat.', fen: '7k/8/8/8/8/8/R7/1R4K1 w - - 0 1', line: ['a2a7', 'h8g8', 'b1b8'] },
  { id: 'p10', title: 'Le sacrifice étouffé', goal: 'mate2', hint: 'Offre ta dame… pour mieux étouffer le roi.', fen: '5r1k/6pp/7N/8/8/1Q6/6PP/6K1 w - - 0 1', line: ['b3g8', 'f8g8', 'h6f7'] },
  { id: 'p11', title: 'Le sacrifice de la dame', goal: 'mate2', hint: 'Une dame qui se sacrifie ouvre la colonne à la tour.', fen: 'r1b2k1r/ppp1bppp/8/1B1Q4/5q2/2P5/PPP2PPP/R3R1K1 w - - 1 1', line: ['d5d8', 'e7d8', 'e1e8'] },
];
