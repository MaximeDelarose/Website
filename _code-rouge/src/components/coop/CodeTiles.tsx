/** Le code du salon en grandes tuiles mécaniques qui se retournent une à une. */
export function CodeTiles({ code, small }: { code: string; small?: boolean }) {
  return (
    <div className={`codetiles ${small ? "codetiles--sm" : ""}`} role="img" aria-label={`Code du salon : ${code.split("").join(" ")}`} data-testid="room-code" data-code={code}>
      {[...code].map((c, i) => (
        <span key={i} className="codetile" style={{ animationDelay: `${i * 110}ms` }}>
          <span className="codetile__char">{c}</span>
        </span>
      ))}
    </div>
  );
}
