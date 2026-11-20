import { STAGE_ORDER } from "../engine/state";
import { useGame } from "../game";
import { Sheet } from "./ui";

/** Barème affiché tel qu'il est calculé : les chiffres viennent de la configuration. */
export function RulesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { config } = useGame();
  const s = config.scoring;
  return (
    <Sheet open={open} onClose={onClose} title="Comment le score est calculé" kicker="Barème identique pour toutes les équipes">
      <table className="rules">
        <thead>
          <tr><th>Épreuve</th><th>Réussite</th><th>Rapidité</th><th>Erreur</th></tr>
        </thead>
        <tbody>
          {STAGE_ORDER.map((id) => (
            <tr key={id}>
              <td>{config.texts.stages[id].name}</td>
              <td>{s.stages[id].base}</td>
              <td>jusqu'à +{s.stages[id].maxTimeBonus}</td>
              <td>−{s.stages[id].errorPenalty}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="rules__list">
        <li><strong>Rapidité.</strong> Le bonus diminue régulièrement, seconde après seconde, jusqu'au temps de référence de l'épreuve ({STAGE_ORDER.map((id) => `${Math.round(s.stages[id].parSeconds / 60 * 10) / 10} min`).join(" · ")}).</li>
        <li><strong>Indices.</strong> {s.stages.deduction.hintCosts.map((c) => `−${c}`).join(", ")} points pour les indices successifs des épreuves 2 et 3 ; −{s.stages.memory.hintCosts[0]} pour revoir la grille ; −{s.stages.finale.hintCosts[0]} en finale.</li>
        <li><strong>Finale.</strong> Chaque surcharge du noyau retire {s.overloadPenalty} points.</li>
        <li><strong>Temps restant.</strong> Mission réussie : +{s.pointsPerSecondLeft} points par seconde restante au chrono.</li>
        <li><strong>Chrono.</strong> {Math.round(config.durationSeconds / 60)} minutes. Il ne tourne que pendant les épreuves : il est en pause pendant les explications et les bilans.</li>
        <li><strong>Plancher.</strong> Une épreuve réussie rapporte toujours au moins {s.stages.memory.minScore} points ({s.stages.finale.minScore} pour la finale).</li>
      </ul>
    </Sheet>
  );
}
