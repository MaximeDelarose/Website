using System;
using UnityEngine;
using UnityEngine.EventSystems;

namespace AshboundTower
{
    /// <summary>Construction et sélection des tourelles à la souris : prévisualisation, rayon d'action, validité de l'emplacement, paiement après confirmation.</summary>
    public class BuildController : MonoBehaviour
    {
        public static BuildController Instance { get; private set; }

        public BuildSlot[] slots = new BuildSlot[0];
        public float pickRadius = 1.4f;

        public TowerDefinition BuildDef { get; private set; }
        public Tower Selected { get; private set; }
        public event Action Changed;

        SpriteRenderer ghost, ring, selRing;
        Camera cam;
        BuildSlot hovered;
        readonly Plane ground = new Plane(Vector3.up, Vector3.zero);

        void Awake() { Instance = this; }
        void OnDestroy() { if (Instance == this) Instance = null; }

        void Start()
        {
            cam = Camera.main;
            GameObject g = new GameObject("Ghost");
            g.transform.SetParent(transform, false);
            ghost = g.AddComponent<SpriteRenderer>();
            ghost.sortingOrder = GameAssets.OrderFx - 100;
            ghost.enabled = false;
            g.AddComponent<BillboardSprite>().depthSort = false;
            ring = GameAssets.FlatSprite("RangeRing", transform, GameAssets.Ring, GameAssets.OrderRing).GetComponent<SpriteRenderer>();
            ring.enabled = false;
            selRing = GameAssets.FlatSprite("SelectedRing", transform, GameAssets.Ring, GameAssets.OrderRing + 1).GetComponent<SpriteRenderer>();
            selRing.enabled = false;
        }

        void Notify() { if (Changed != null) Changed(); }

        public void ToggleBuild(TowerDefinition def)
        {
            if (def == null || !def.implemented) return;
            SetBuildDef(BuildDef == def ? null : def);
        }

        public void SetBuildDef(TowerDefinition def)
        {
            BuildDef = def;
            if (def != null) Select(null);
            AudioManager.Play("click", 0.5f);
            Notify();
        }

        public void Select(Tower t)
        {
            if (Selected == t) return;
            Selected = t;
            Notify();
        }

        /// <summary>Annule le mode construction ou la sélection. Retourne vrai si quelque chose était actif.</summary>
        public bool CancelActive()
        {
            if (BuildDef != null) { BuildDef = null; Notify(); return true; }
            if (Selected != null) { Select(null); return true; }
            return false;
        }

        bool GroundPoint(out Vector3 p)
        {
            p = Vector3.zero;
            if (cam == null) cam = Camera.main;
            if (cam == null) return false;
            Ray r = cam.ScreenPointToRay(Input.mousePosition);
            float enter;
            if (!ground.Raycast(r, out enter)) return false;
            p = r.GetPoint(enter);
            return true;
        }

        BuildSlot NearestSlot(Vector3 p)
        {
            BuildSlot best = null; float bd = pickRadius * pickRadius;
            for (int i = 0; i < slots.Length; i++)
            {
                if (slots[i] == null) continue;
                Vector3 d = slots[i].transform.position - p; d.y = 0f;
                if (d.sqrMagnitude <= bd) { bd = d.sqrMagnitude; best = slots[i]; }
            }
            return best;
        }

        Tower NearestTower(Vector3 p)
        {
            for (int i = 0; i < slots.Length; i++)
            {
                BuildSlot s = slots[i];
                if (s == null || s.Occupant == null) continue;
                Vector3 d = s.transform.position - p; d.y = 0f;
                if (d.sqrMagnitude <= pickRadius * pickRadius) return s.Occupant;
            }
            return null;
        }

        bool CanBuildHere(BuildSlot s)
        {
            if (s == null || !s.IsFree || BuildDef == null) return false;
            if (BuildDef.maxBuilt > 0 && CountBuilt(BuildDef) >= BuildDef.maxBuilt) return false;
            return Economy.Instance != null && Economy.Instance.CanAfford(BuildDef.buildCost);
        }

        int CountBuilt(TowerDefinition def)
        {
            int n = 0;
            for (int i = 0; i < slots.Length; i++) if (slots[i] != null && slots[i].Occupant != null && slots[i].Occupant.Def == def) n++;
            return n;
        }

        void Update()
        {
            GameManager gm = GameManager.Instance;
            bool active = gm != null && !gm.Paused && (gm.State == GameState.Playing || gm.State == GameState.Preparation);
            if (!active) { HideVisuals(); return; }

            if (Input.GetMouseButtonDown(1)) CancelActive();

            Vector3 gp = Vector3.zero;
            bool overUi = EventSystem.current != null && EventSystem.current.IsPointerOverGameObject();
            bool haveGround = !overUi && GroundPoint(out gp);

            // surlignage des emplacements
            hovered = haveGround ? NearestSlot(gp) : null;
            bool buildMode = BuildDef != null;
            for (int i = 0; i < slots.Length; i++)
            {
                if (slots[i] == null) continue;
                int mode = buildMode ? 1 : 0;
                if (slots[i] == hovered && (buildMode || slots[i].Occupant != null))
                    mode = buildMode ? (CanBuildHere(hovered) ? 2 : 3) : (slots[i].Occupant != null ? 2 : 0);
                slots[i].SetHighlight(mode);
            }

            UpdateGhost();
            UpdateSelectionRing();

            if (Input.GetKeyDown(KeyCode.Alpha1) && gm.balance != null && gm.balance.towers.Length > 0) ToggleBuild(gm.balance.towers[0]);

            if (haveGround && Input.GetMouseButtonDown(0)) OnLeftClick(gp);
        }

        void OnLeftClick(Vector3 gp)
        {
            if (BuildDef != null)
            {
                BuildSlot s = NearestSlot(gp);
                if (s == null) { return; }
                if (!s.IsFree) { Select(s.Occupant); BuildDef = null; Notify(); return; }
                TryBuild(s);
                return;
            }
            Tower t = NearestTower(gp);
            Select(t);   // null si on clique dans le vide : désélectionne
        }

        void TryBuild(BuildSlot s)
        {
            if (BuildDef.maxBuilt > 0 && CountBuilt(BuildDef) >= BuildDef.maxBuilt)
            {
                AudioManager.Play("error", 0.6f);
                Notifier.ShowToast("Limite de constructions atteinte", new Color(1f, 0.5f, 0.5f));
                return;
            }
            if (Economy.Instance == null || !Economy.Instance.TrySpend(BuildDef.buildCost))
            {
                AudioManager.Play("error", 0.6f);
                Notifier.ShowToast("Pas assez d'or (" + BuildDef.buildCost + " requis)", new Color(1f, 0.5f, 0.5f));
                return;
            }
            Tower t = Tower.Create(BuildDef, s);
            AudioManager.Play("build", 0.9f);
            FxPool.Burst(s.transform.position + Vector3.up * 0.3f, new Color(0.55f, 0.5f, 0.75f), 16, 4f, 0.7f, 0.9f);
            Notifier.ShowToast(BuildDef.displayName + " construite", new Color(0.6f, 1f, 0.8f));
            Select(t);
            BuildDef = null;
            Notify();
        }

        void UpdateGhost()
        {
            bool show = BuildDef != null && hovered != null && hovered.IsFree;
            ghost.enabled = show; ring.enabled = show;
            if (!show) return;
            bool ok = CanBuildHere(hovered);
            Color c = ok ? new Color(0.7f, 1f, 1f, 0.6f) : new Color(1f, 0.4f, 0.45f, 0.6f);
            ghost.sprite = BuildDef.baseSprite;
            ghost.color = c;
            ghost.transform.position = hovered.transform.position;
            ring.transform.position = hovered.transform.position + Vector3.up * 0.01f;
            float scale = BuildDef.baseStats.range;           // le sprite d'anneau fait 2 unités de diamètre
            ring.transform.localScale = new Vector3(scale, scale, 1f);
            ring.color = ok ? new Color(0.4f, 0.9f, 1f, 0.7f) : new Color(1f, 0.35f, 0.4f, 0.7f);
        }

        void UpdateSelectionRing()
        {
            bool show = Selected != null;
            selRing.enabled = show;
            if (!show) return;
            selRing.transform.position = Selected.transform.position + Vector3.up * 0.01f;
            float s = Selected.Stats.range;
            selRing.transform.localScale = new Vector3(s, s, 1f);
            selRing.color = new Color(1f, 0.9f, 0.5f, 0.8f);
        }

        void HideVisuals()
        {
            if (ghost != null) ghost.enabled = false;
            if (ring != null) ring.enabled = false;
        }
    }
}
