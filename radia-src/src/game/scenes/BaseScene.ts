import Phaser from 'phaser';
import { events } from '../../core/app';
import { safeInsets, viewport, type Insets } from '../layout';
import { paint, texScale } from '../art/kit';

/**
 * Base des scènes : repère en pixels CSS (caméra zoomée de la densité),
 * zones sûres, recalcul de la mise en page au redimensionnement.
 */
export abstract class BaseScene extends Phaser.Scene {
  W = 0;
  H = 0;
  dpr = 1;
  safe: Insets = { top: 0, bottom: 0, left: 0, right: 0 };
  private offLayout: (() => void) | null = null;

  protected initLayout(): void {
    this.measure();
    this.offLayout = events.on('layout', () => {
      if (!this.sys.isActive() && !this.sys.isVisible()) return;
      this.measure();
      this.layout();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.offLayout?.(); this.offLayout = null; });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => { this.offLayout?.(); this.offLayout = null; });
  }

  protected measure(): void {
    const v = viewport();
    this.W = v.w;
    this.H = v.h;
    this.dpr = v.dpr;
    this.safe = safeInsets();
    const cam = this.cameras.main;
    cam.setOrigin(0, 0);
    cam.setZoom(v.dpr);
    cam.setSize(v.w * v.dpr, v.h * v.dpr);
    cam.setScroll(0, 0);
  }

  /** Repositionne tous les éléments (appelé au démarrage et à chaque redimensionnement). */
  abstract layout(): void;

  /** Crée (une seule fois) une texture dessinée en Canvas 2D, nette à la densité de l'écran. */
  tex(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): string {
    if (!this.textures.exists(key)) {
      this.textures.addCanvas(key, paint(w, h, texScale(), draw));
    }
    return key;
  }

  /** Texte net (résolution = densité de l'écran). */
  text(x: number, y: number, str: string, style: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.GameObjects.Text {
    return this.add.text(x, y, str, {
      fontFamily: 'Fredoka, "Avenir Next", sans-serif',
      fontSize: '18px',
      color: '#58433F',
      resolution: Math.min(3, this.dpr),
      ...style,
    });
  }
}
