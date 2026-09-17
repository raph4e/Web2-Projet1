import { useState, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import './ChessBoard.css';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

const PIECE_UNICODE = {
  p: { w: '♙', b: '♟' },
  n: { w: '♘', b: '♞' },
  b: { w: '♗', b: '♝' },
  r: { w: '♖', b: '♜' },
  q: { w: '♕', b: '♛' },
  k: { w: '♔', b: '♚' },
};

export default function ChessBoard() {
  // useRef keeps one Chess instance alive across renders
  const gameRef = useRef(new Chess());
  const game = gameRef.current;

  // Bump this to force a re-render whenever the game state mutates
  const [, setVersion] = useState(0);
  const forceUpdate = () => setVersion((v) => v + 1);

  const [selectedSquare, setSelectedSquare] = useState(null);
  const [lastMove, setLastMove] = useState(null);

  const legalMoves = useMemo(() => {
    if (!selectedSquare) return [];
    return game.moves({ square: selectedSquare, verbose: true });
  }, [selectedSquare, game]);

  const boardState = game.board(); // 8x8 array, row 0 = rank 8

  function getPieceAt(square) {
    const fileIdx = FILES.indexOf(square[0]);
    const rankIdx = 8 - parseInt(square[1], 10);
    return boardState[rankIdx][fileIdx];
  }

  function handleSquareClick(square) {
    if (game.isGameOver()) return;

    if (selectedSquare) {
      const move = legalMoves.find((m) => m.to === square);
      if (move) {
        const promotion = move.flags.includes('p') ? 'q' : undefined;
        const result = game.move({ from: selectedSquare, to: square, promotion });
        if (result) {
          setLastMove({ from: result.from, to: result.to });
        }
        setSelectedSquare(null);
        forceUpdate();
        return;
      }
    }

    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
    } else {
      setSelectedSquare(null);
    }
  }

  function handleUndo() {
    game.undo();
    setSelectedSquare(null);
    setLastMove(null);
    forceUpdate();
  }

  function handleReset() {
    game.reset();
    setSelectedSquare(null);
    setLastMove(null);
    forceUpdate();
  }

  function getStatus() {
    const turn = game.turn() === 'w' ? 'Blancs' : 'Noirs';

    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Noirs' : 'Blancs';
      return { title: `Échec et mat — les ${winner} gagnent`, sub: 'La partie est terminée.', check: false };
    }
    if (game.isStalemate()) {
      return { title: 'Pat — partie nulle', sub: 'Aucun coup légal disponible.', check: false };
    }
    if (game.isThreefoldRepetition()) {
      return { title: 'Nulle par répétition', sub: 'La même position est apparue trois fois.', check: false };
    }
    if (game.isInsufficientMaterial()) {
      return { title: 'Nulle — matériel insuffisant', sub: 'Aucun camp ne peut forcer le mat.', check: false };
    }
    if (game.isDraw()) {
      return { title: 'Partie nulle', sub: 'Règle des 50 coups atteinte.', check: false };
    }
    if (game.isCheck()) {
      return { title: `Échec aux ${turn}`, sub: "Le roi est menacé — parez l'échec.", check: true };
    }
    return {
      title: `Trait aux ${turn}`,
      sub: selectedSquare ? 'Choisissez une case de destination' : 'Sélectionnez une pièce pour commencer',
      check: false,
    };
  }

  const status = getStatus();
  const history = game.history({ verbose: true });
  const historyPairs = [];
  for (let i = 0; i < history.length; i += 2) {
    historyPairs.push({
      num: i / 2 + 1,
      white: history[i]?.san || '',
      black: history[i + 1]?.san || '',
    });
  }

  return (
    <div className="chess-layout">
      <div className="chess-board-column">
        <h1 className="chess-title">Échiquier</h1>
        <div className="chess-board-wrap">
          <div className="chess-board">
            {RANKS.map((rank) =>
              FILES.map((file) => {
                const square = file + rank;
                const isLight = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 0;
                const piece = getPieceAt(square);
                const isSelected = selectedSquare === square;
                const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
                const moveHere = legalMoves.find((m) => m.to === square);
                const isKingInCheck =
                  status.check && piece && piece.type === 'k' && piece.color === game.turn();

                return (
                  <div
                    key={square}
                    className={[
                      'chess-square',
                      isLight ? 'light' : 'dark',
                      isSelected ? 'selected' : '',
                      isLastMove ? 'last-move' : '',
                      isKingInCheck ? 'in-check' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => handleSquareClick(square)}
                  >
                    {piece && (
                      <span className={`chess-piece ${piece.color === 'w' ? 'white' : 'black'}`}>
                        {PIECE_UNICODE[piece.type][piece.color]}
                      </span>
                    )}
                    {moveHere &&
                      (moveHere.flags.includes('c') || moveHere.flags.includes('e') ? (
                        <div className="chess-capture-ring" />
                      ) : (
                        <div className="chess-move-dot" />
                      ))}
                  </div>
                );
              })
            )}
          </div>
          <div className="chess-file-labels">
            {FILES.map((f) => (
              <span key={f}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="chess-panel">
        <p className={`chess-status ${status.check ? 'check' : ''}`}>{status.title}</p>
        <p className="chess-sub-status">{status.sub}</p>

        <div className="chess-turn-indicator">
          <div className={`chess-turn-dot ${game.turn() === 'w' ? 'white' : 'black'}`} />
          <span>Aux {game.turn() === 'w' ? 'Blancs' : 'Noirs'} de jouer</span>
        </div>

        <div className="chess-btn-row">
          <button className="chess-btn-secondary" onClick={handleUndo} disabled={history.length === 0}>
            Annuler
          </button>
          <button className="chess-btn-primary" onClick={handleReset}>
            Nouvelle partie
          </button>
        </div>

        <p className="chess-history-label">Historique des coups</p>
        <div className="chess-history">
          {historyPairs.length === 0 ? (
            <span className="chess-history-empty">Aucun coup joué</span>
          ) : (
            historyPairs.map((row) => (
              <div className="chess-history-row" key={row.num}>
                <span className="num">{row.num}.</span>
                <span>{row.white}</span>
                <span>{row.black}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
