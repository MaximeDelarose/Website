using System.Collections.Generic;
using UnityEngine;

namespace Catower
{
    /// <summary>Interface en IMGUI (provisoire) : bulles arrondies aux coins, jamais de fenêtre centrale pendant le combat.</summary>
    public class Hud : MonoBehaviour
    {
        static readonly List<Rect> rects = new List<Rect>();
        static float uiScale = 1f;

        /// <summary>Vrai si la souris est au-dessus d'un élément d'interface (pour ne pas cliquer à travers).</summary>
        public static bool OverUi(Vector3 mouse)
        {
            Vector2 p = new Vector2(mouse.x / uiScale, (Screen.height - mouse.y) / uiScale);
            for (int i = 0; i < rects.Count; i++) if (rects[i].Contains(p)) return true;
            return false;
        }

        // ---- Styles ----
        bool ready;
        GUIStyle sPanel, sBtn, sBtnSel, sSlot, sSlotOff, sBarBg, sLabel;
        readonly Dictionary<Color, GUIStyle> barStyles = new Dictionary<Color, GUIStyle>();
        static readonly Color Muted = new Color(0.49f, 0.42f, 0.53f);
        static readonly Color GoldText = new Color(0.79f, 0.5f, 0.04f);

        static Texture2D RoundTex(Color fill, Color border, int radius = 10, int bw = 3)
        {
            int size = 32;
            var t = new Texture2D(size, size, TextureFormat.RGBA32, false);
            t.filterMode = FilterMode.Bilinear; t.wrapMode = TextureWrapMode.Clamp;
            for (int y = 0; y < size; y++)
                for (int x = 0; x < size; x++)
                {
                    float dx = Mathf.Max(Mathf.Abs(x + 0.5f - size / 2f) - (size / 2f - radius), 0f);
                    float dy = Mathf.Max(Mathf.Abs(y + 0.5f - size / 2f) - (size / 2f - radius), 0f);
                    float d = Mathf.Sqrt(dx * dx + dy * dy) - radius;
                    float a = Mathf.Clamp01(0.5f - d);
                    Color c = d > -bw ? border : fill;
                    c.a *= a;
                    t.SetPixel(x, y, c);
                }
            t.Apply();
            return t;
        }

        GUIStyle Box(Color fill, Color border, Color? hover = null)
        {
            var s = new GUIStyle();
            s.normal.background = RoundTex(fill, border);
            if (hover.HasValue) { s.hover.background = RoundTex(hover.Value, border); s.active.background = s.hover.background; }
            s.border = new RectOffset(10, 10, 10, 10);
            return s;
        }

        void Init()
        {
            if (ready) return;
            ready = true;
            var ink = Pal.Ink;
            sPanel = Box(new Color(1f, 0.96f, 0.98f, 0.94f), ink);
            sBtn = Box(Pal.PinkSoft, ink, Pal.Pink);
            sBtnSel = Box(Pal.Pink, ink, Pal.Pink);
            sSlot = Box(Color.white, ink);
            sSlotOff = Box(new Color(0.88f, 0.84f, 0.9f), new Color(0.6f, 0.52f, 0.65f));
            sBarBg = Box(new Color(0.29f, 0.21f, 0.33f, 0.25f), ink, null);
            sLabel = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold, wordWrap = true, clipping = TextClipping.Overflow };
        }

        GUIStyle BarFill(Color c)
        {
            GUIStyle s;
            if (!barStyles.TryGetValue(c, out s)) { s = Box(c, c); barStyles[c] = s; }
            return s;
        }

        // ---- Aides de dessin ----
        bool rep;
        void Panel(Rect r, GUIStyle st = null) { GUI.Box(r, GUIContent.none, st ?? sPanel); if (rep) rects.Add(r); }
        void Reg(Rect r) { if (rep) rects.Add(r); }

        void Txt(Rect r, string s, int size, Color c, TextAnchor a = TextAnchor.MiddleCenter)
        {
            sLabel.fontSize = size; sLabel.alignment = a; sLabel.normal.textColor = c;
            GUI.Label(r, s, sLabel);
        }

        void Outlined(Rect r, string s, int size, Color c, Color outline)
        {
            for (int dx = -2; dx <= 2; dx += 2) for (int dy = -2; dy <= 2; dy += 2)
                    if (dx != 0 || dy != 0) Txt(new Rect(r.x + dx, r.y + dy, r.width, r.height), s, size, outline);
            Txt(r, s, size, c);
        }

        void Bar(Rect r, float frac, Color c)
        {
            GUI.Box(r, GUIContent.none, sBarBg);
            float w = (r.width - 6f) * Mathf.Clamp01(frac);
            if (w > 8f) GUI.Box(new Rect(r.x + 3, r.y + 3, w, r.height - 6), GUIContent.none, BarFill(c));
        }

        // ---- Rendu ----
        void OnGUI()
        {
            if (Game.I == null || Game.I.hero == null) return;
            Init();
            rep = Event.current.type == EventType.Repaint;
            if (rep) rects.Clear();

            uiScale = Screen.height / 720f;
            GUI.matrix = Matrix4x4.Scale(new Vector3(uiScale, uiScale, 1f));
            float W = Screen.width / uiScale, H = 720f;
            var g = Game.I;

            DrawFloaters();
            DrawHints();
            DrawTop(W, g);
            DrawHero(H, g);
            DrawBuildBar(W, H, g);
            DrawCroquettes(W, H, g);
            DrawWaveControl(W, H, g);
            if (BuildSystem.I != null && BuildSystem.I.selected != null) DrawTowerPanel(W, H, BuildSystem.I.selected);
            if (g.bannerT > 0f) Outlined(new Rect(0, 100, W, 60), g.banner, 34, Color.white, Pal.Ink);
            if (g.phase == Phase.Victory || g.phase == Phase.Defeat) DrawEnd(W, H, g);
        }

        void DrawFloaters()
        {
            var cam = Game.I.rig.cam;
            foreach (var f in Fx.Floaters)
            {
                Vector3 sp = cam.WorldToScreenPoint(f.pos + Vector3.up * (f.t * 1.6f));
                if (sp.z < 0f) continue;
                float x = sp.x / uiScale, y = (Screen.height - sp.y) / uiScale;
                var c = f.color; c.a = 1f - Mathf.Clamp01((f.t - f.life * 0.6f) / (f.life * 0.4f));
                var o = Pal.Ink; o.a = c.a;
                Outlined(new Rect(x - 50, y - 15, 100, 30), f.text, f.size, c, o);
            }
        }

        void DrawHints()
        {
            var r = new Rect(12, 8, 330, 70);
            Panel(r);
            Txt(new Rect(r.x + 8, r.y + 4, r.width - 16, 20), "Clic droit : bouger / attaquer", 13, Pal.Ink);
            Txt(new Rect(r.x + 8, r.y + 24, r.width - 16, 20), "Q W E : capacités   ·   1 2 3 : construire", 13, Pal.Ink);
            Txt(new Rect(r.x + 8, r.y + 44, r.width - 16, 20), "Clic gauche : poser / choisir   ·   Espace : recentrer", 12, Muted);
        }

        void DrawTop(float W, Game g)
        {
            var r = new Rect(W / 2 - 190, 8, 380, 74);
            Panel(r);
            Txt(new Rect(r.x, r.y + 4, r.width, 20), "Cœur à protéger", 14, Pal.Ink);
            float f = g.coreHp / (float)g.coreMax;
            Bar(new Rect(r.x + 14, r.y + 24, r.width - 28, 22), f, f > 0.3f ? Pal.Pink : Pal.Coral);
            Txt(new Rect(r.x + 14, r.y + 24, r.width - 28, 22), g.coreHp + " / " + g.coreMax, 14, Pal.Ink);
            string line = g.phase == Phase.Prep ? "Séquence " + (g.sequence + 1) + "/" + Game.SequencesToWin + "  ·  Préparation"
                : "Séquence " + (g.sequence + 1) + "/" + Game.SequencesToWin + "  ·  Vague " + g.wave + "/" + Game.WavesPerSequence;
            Txt(new Rect(r.x, r.y + 48, r.width, 22), line, 15, Pal.Ink);
        }

        void DrawHero(float H, Game g)
        {
            var hero = g.hero;
            var r = new Rect(12, H - 132, 270, 120);
            Panel(r);
            Txt(new Rect(r.x + 10, r.y + 4, 150, 22), hero.def.name, 17, Pal.Ink, TextAnchor.MiddleLeft);
            Txt(new Rect(r.x + 120, r.y + 4, 140, 22), "Niveau " + g.level, 15, Pal.Violet, TextAnchor.MiddleRight);
            float f = g.level >= g.MaxLevel ? 1f : (g.xp - g.XpPrev) / (float)(g.XpNext - g.XpPrev);
            Bar(new Rect(r.x + 10, r.y + 28, r.width - 20, 18), f, Pal.Violet);
            Txt(new Rect(r.x + 10, r.y + 28, r.width - 20, 18), g.level >= g.MaxLevel ? "XP max" : "XP " + g.xp + " / " + g.XpNext, 12, Color.white);

            var ab = hero.def.abilities;
            for (int i = 0; i < ab.Length; i++)
            {
                var s = new Rect(r.x + 14 + i * 84, r.y + 52, 72, 62);
                bool locked = g.level < ab[i].unlockLevel;
                GUI.Box(s, GUIContent.none, locked ? sSlotOff : sSlot);
                Txt(new Rect(s.x, s.y + 2, s.width, 28), ab[i].key.ToString(), 22, locked ? Muted : Pal.Ink);
                Txt(new Rect(s.x - 4, s.y + 32, s.width + 8, 26), locked ? "Niv. " + ab[i].unlockLevel : ab[i].name, 11, locked ? Muted : Pal.Ink);
                float cdv = hero.cd[i];
                if (cdv > 0f && !locked)
                {
                    float fr = cdv / ab[i].cooldown;
                    GUI.color = new Color(0.29f, 0.21f, 0.33f, 0.55f);
                    GUI.DrawTexture(new Rect(s.x + 3, s.y + 3 + (s.height - 6) * (1f - fr), s.width - 6, (s.height - 6) * fr), Texture2D.whiteTexture);
                    GUI.color = Color.white;
                    Txt(s, Mathf.CeilToInt(cdv).ToString(), 24, Color.white);
                }
            }
            Reg(r);
        }

        void DrawBuildBar(float W, float H, Game g)
        {
            var towers = Database.Towers;
            float bw = 150, gap = 8;
            float x0 = W / 2 - (towers.Length * bw + (towers.Length - 1) * gap) / 2;
            for (int i = 0; i < towers.Length; i++)
            {
                var d = towers[i];
                var r = new Rect(x0 + i * (bw + gap), H - 92, bw, 80);
                bool sel = BuildSystem.I != null && BuildSystem.I.buildIndex == i;
                bool afford = g.croquettes >= d.cost;
                Reg(r);
                if (GUI.Button(r, GUIContent.none, sel ? sBtnSel : sBtn)) BuildSystem.I.SelectBuild(i);
                Txt(new Rect(r.x, r.y + 4, r.width, 22), (i + 1) + " · " + d.name, 14, Pal.Ink);
                Txt(new Rect(r.x, r.y + 26, r.width, 18), d.role, 12, Muted);
                Txt(new Rect(r.x, r.y + 48, r.width, 26), d.cost + " croquettes", 16, afford ? GoldText : Pal.Coral);
            }
        }

        void DrawCroquettes(float W, float H, Game g)
        {
            var r = new Rect(W - 212, H - 72, 200, 60);
            Panel(r);
            Txt(new Rect(r.x, r.y + 4, r.width, 18), "Croquettes", 13, Muted);
            Txt(new Rect(r.x, r.y + 20, r.width, 36), g.croquettes.ToString(), 30, GoldText);
        }

        void DrawWaveControl(float W, float H, Game g)
        {
            if (g.phase != Phase.Prep && !(g.phase == Phase.Waves && g.wave < Game.WavesPerSequence)) return;
            var r = new Rect(W / 2 - 220, H - 142, 440, 42);
            Panel(r);
            string label = g.phase == Phase.Prep ? "Préparation : construis tes défenses" : "Prochaine vague dans " + Mathf.CeilToInt(g.NextWaveIn) + " s";
            Txt(new Rect(r.x + 8, r.y, 260, r.height), label, 14, Pal.Ink, TextAnchor.MiddleLeft);
            var b = new Rect(r.x + r.width - 160, r.y + 5, 152, r.height - 10);
            if (GUI.Button(b, GUIContent.none, sBtn)) g.Ready();
            Txt(b, g.phase == Phase.Prep ? "Prêt ! (Entrée)" : "Appeler (Entrée)", 14, Pal.Ink);
        }

        void DrawTowerPanel(float W, float H, Tower t)
        {
            var r = new Rect(W - 312, H - 396, 300, 312);
            Panel(r);
            Txt(new Rect(r.x, r.y + 6, r.width, 24), t.def.name, 18, Pal.Ink);
            Txt(new Rect(r.x + 8, r.y + 30, r.width - 16, 36), StatLine(t), 12, Muted);
            PathBlock(new Rect(r.x + 10, r.y + 70, r.width - 20, 84), t, 0, "A");
            PathBlock(new Rect(r.x + 10, r.y + 160, r.width - 20, 84), t, 1, "B");
            var sell = new Rect(r.x + 10, r.y + 256, r.width - 20, 42);
            if (GUI.Button(sell, GUIContent.none, sBtn)) { BuildSystem.I.Select(null); t.Sell(); return; }
            Txt(sell, "Vendre (V)  +" + t.SellValue, 15, Pal.Ink);
        }

        void PathBlock(Rect r, Tower t, int path, string key)
        {
            var step = t.NextStep(path);
            string why;
            bool can = t.CanUpgrade(path, out why);
            bool afford = step != null && Game.I.croquettes >= step.cost;
            string dots = "";
            for (int i = 0; i < 5; i++) dots += i < t.tiers[path] ? "●" : "○";
            GUI.enabled = can && afford;
            if (GUI.Button(r, GUIContent.none, sBtn)) t.TryUpgrade(path);
            GUI.enabled = true;
            Txt(new Rect(r.x + 8, r.y + 2, r.width - 16, 20), key + " · " + t.def.pathNames[path] + "   " + dots, 14, Pal.Ink, TextAnchor.MiddleLeft);
            if (step == null || !can)
                Txt(new Rect(r.x + 8, r.y + 24, r.width - 16, 56), why, 12, Muted, TextAnchor.UpperLeft);
            else
            {
                Txt(new Rect(r.x + 8, r.y + 24, r.width - 90, 20), step.name, 14, Pal.Ink, TextAnchor.MiddleLeft);
                Txt(new Rect(r.x + r.width - 92, r.y + 24, 84, 20), step.cost.ToString(), 15, afford ? GoldText : Pal.Coral, TextAnchor.MiddleRight);
                Txt(new Rect(r.x + 8, r.y + 46, r.width - 16, 34), step.desc, 12, Muted, TextAnchor.UpperLeft);
            }
        }

        string StatLine(Tower t)
        {
            var s = t.stats;
            switch (t.def.kind)
            {
                case TowerKind.Cannon:
                    return "Dégâts " + s.damage.ToString("0") + "  ·  Portée " + s.range.ToString("0.#") + "  ·  " + (1f / s.cooldown).ToString("0.0") + " tirs/s"
                        + (s.splash > 0 ? "  ·  zone " + s.splash.ToString("0.#") : "") + (s.pierce ? "  ·  perforant" : "");
                case TowerKind.Fountain:
                    return "Dégâts " + s.damage.ToString("0") + "  ·  Portée " + s.range.ToString("0.#") + "  ·  Ralentit " + ((1f - s.slowMul) * 100f).ToString("0") + " %" + (s.freeze ? "  ·  fige" : "");
                default:
                    return "Dégâts/s " + s.dps.ToString("0") + "  ·  Portée " + s.range.ToString("0.#") + "  ·  " + s.beams + " faisceau(x)" + (s.ramp > 0 ? "  ·  chauffe" : "");
            }
        }

        void DrawEnd(float W, float H, Game g)
        {
            GUI.color = new Color(0.29f, 0.21f, 0.33f, 0.55f);
            GUI.DrawTexture(new Rect(0, 0, W, H), Texture2D.whiteTexture);
            GUI.color = Color.white;
            var r = new Rect(W / 2 - 220, H / 2 - 120, 440, 240);
            Panel(r);
            bool win = g.phase == Phase.Victory;
            Txt(new Rect(r.x, r.y + 24, r.width, 50), win ? "Victoire !" : "Le Cœur est tombé…", 36, win ? Pal.Violet : Pal.Coral);
            Txt(new Rect(r.x + 20, r.y + 84, r.width - 40, 50), win ? "Mochi a protégé le Cœur pendant " + Game.SequencesToWin + " séquences." : "Séquence " + (g.sequence + 1) + ", vague " + g.wave + ". On retente ?", 16, Pal.Ink);
            var b = new Rect(r.x + 110, r.y + 160, 220, 52);
            if (GUI.Button(b, GUIContent.none, sBtn)) Bootstrap.Restart();
            Txt(b, "Rejouer", 20, Pal.Ink);
        }
    }
}
