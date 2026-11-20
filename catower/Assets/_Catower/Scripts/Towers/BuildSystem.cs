using UnityEngine;

namespace Catower
{
    /// <summary>Construction : touches 1-3 puis clic gauche sur un emplacement. Clic gauche sur une tourelle pour la sélectionner.</summary>
    public class BuildSystem : MonoBehaviour
    {
        public static BuildSystem I;
        public int buildIndex = -1;
        public Tower selected;
        Pad hover;
        Camera cam;
        LineRenderer ghostRange;
        readonly Plane ground = new Plane(Vector3.up, 0f);

        public void Init(Camera c) { cam = c; }
        void Awake() { I = this; }

        public void SelectBuild(int i)
        {
            buildIndex = (buildIndex == i) ? -1 : i;
            Select(null);
        }

        public void Select(Tower t)
        {
            if (selected != null) selected.ShowRange(false);
            selected = t;
            if (t != null) { t.ShowRange(true); buildIndex = -1; }
        }

        Vector3 MouseGround()
        {
            Ray r = cam.ScreenPointToRay(Input.mousePosition);
            float d;
            return ground.Raycast(r, out d) ? r.GetPoint(d) : Vector3.zero;
        }

        void Update()
        {
            for (int i = 0; i < Database.Towers.Length; i++)
                if (Input.GetKeyDown(KeyCode.Alpha1 + i)) SelectBuild(i);
            if (Input.GetKeyDown(KeyCode.Escape)) { buildIndex = -1; Select(null); }

            if (selected != null)
            {
                if (Input.GetKeyDown(KeyCode.A)) selected.TryUpgrade(0);
                if (Input.GetKeyDown(KeyCode.B)) selected.TryUpgrade(1);
                if (Input.GetKeyDown(KeyCode.V)) { var t = selected; Select(null); t.Sell(); Sfx.Play("build", 0.7f); }
            }

            // Emplacement survolé
            hover = null;
            if (!Hud.OverUi(Input.mousePosition))
            {
                Vector3 g = MouseGround();
                float best = 1.9f;
                foreach (var p in Map.Pads)
                {
                    float d = Enemy.Flat(p.Pos, g);
                    if (d < best) { best = d; hover = p; }
                }
            }

            // Couleur des emplacements
            float pulse = 0.5f + 0.5f * Mathf.Sin(Time.time * 6f);
            foreach (var p in Map.Pads)
            {
                bool free = p.tower == null;
                Color c = Pal.Pink;
                c.a = free ? (buildIndex >= 0 ? 0.6f + 0.4f * pulse : 0.5f) : 0f;
                if (p == hover && buildIndex >= 0 && free) c = Color.white;
                p.ring.startColor = c; p.ring.endColor = c;
                p.ring.transform.localScale = Vector3.one * (p == hover && buildIndex >= 0 ? 1.1f : 1f);
            }

            // Portée fantôme
            if (ghostRange == null) { ghostRange = Gfx.Circle(Bootstrap.World, 1f, Color.white, 0.15f, 0.15f, 64); }
            bool showGhost = buildIndex >= 0 && hover != null && hover.tower == null;
            ghostRange.gameObject.SetActive(showGhost);
            if (showGhost)
            {
                var d = Database.Towers[buildIndex];
                float r = d.kind == TowerKind.Laser ? d.stats.range : d.stats.range;
                ghostRange.transform.position = hover.Pos;
                ghostRange.transform.localScale = new Vector3(r, 1, r);
            }

            // Clic gauche
            if (Input.GetMouseButtonDown(0) && !Hud.OverUi(Input.mousePosition))
            {
                if (hover != null && hover.tower != null) Select(hover.tower);
                else if (buildIndex >= 0 && hover != null) TryBuild(hover);
                else if (buildIndex < 0) Select(null);
            }
        }

        void TryBuild(Pad pad)
        {
            var d = Database.Towers[buildIndex];
            if (Game.I.croquettes < d.cost) { Game.I.Banner("Pas assez de croquettes", 1.5f); Sfx.Play("error"); return; }
            Game.I.croquettes -= d.cost;
            var t = Tower.Create(d, pad);
            if (!Input.GetKey(KeyCode.LeftShift)) { buildIndex = -1; Select(t); }
        }
    }
}
