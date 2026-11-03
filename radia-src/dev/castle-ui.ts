// Page de test de l'écran « château » (sans le hub) : /dev/castle-ui.html?room=bedroom
import '../src/ui/styles/base.css';
import '../src/ui/styles/game.css';
import { save, applySettings } from '../src/core/app';
import { openCastle } from '../src/ui/screens/world/castle';
import { roomLayout } from '../src/game/art/world/rooms';
import type { RoomId } from '../src/data/world/ids';

save.load();
applySettings();
const room = new URLSearchParams(location.search).get('room') as RoomId | null;
const w = window as unknown as Record<string, unknown>;
w.__save = save;
w.__layout = roomLayout;
w.__closed = false;
void openCastle(room ?? undefined).then(() => { w.__closed = true; });
