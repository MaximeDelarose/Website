using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace AshboundTower
{
    /// <summary>Interface complète en français, construite par code : stabilité du Cœur, or, chronomètre, séquence/vague, barre de construction,
    /// fiche d'amélioration, écrans de préparation / pause / victoire / défaite. Les sprites viennent de Resources/Ashbound/UI.</summary>
    [DefaultExecutionOrder(100)]
    public class GameUI : MonoBehaviour
    {
        const string Dir = "Ashbound/UI/";
        static readonly Color Ivory = new Color(0.95f, 0.92f, 0.82f);
        static readonly Color Gold = new Color(1f, 0.83f, 0.37f);
        static readonly Color Cyan = new Color(0.45f, 0.94f, 1f);

        Font font;
        Sprite sPanel, sPanelDark, sButton, sButtonHover, sBarBg, sBarFill, iGold, iHeart, iTime, iWave, iBolt, iSword, sVignette;
        Image heartFill;
        Text heartText, seqText, timeText, goldText, toastText, hintText;
        GameObject prepPanel, endPanel, pausePanel, towerPanel;
        Text endTitle, endBody, towerTitle, towerStats, upgradeText, upgradeDesc;
        Button upgradeButton;
        Image[] buildButtonImages = new Image[0];
        TowerDefinition[] buildDefs = new TowerDefinition[0];
        float toastTimer;

        // ------------------------------------------------------------ construction
        Sprite S(string n) { return Resources.Load<Sprite>(Dir + n); }

        void Start()
        {
            font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            sPanel = S("panel"); sPanelDark = S("panel_dark"); sButton = S("button"); sButtonHover = S("button_hover");
            sBarBg = S("bar_bg"); sBarFill = S("bar_fill"); iGold = S("icon_gold"); iHeart = S("icon_heart"); iTime = S("icon_time");
            iWave = S("icon_wave"); iBolt = S("icon_bolt"); iSword = S("icon_sword"); sVignette = S("vignette");

            if (FindObjectOfType<EventSystem>() == null)
            {
                GameObject es = new GameObject("EventSystem");
                es.AddComponent<EventSystem>();
                es.AddComponent<StandaloneInputModule>();
            }

            GameObject cg = new GameObject("HUD");
            cg.transform.SetParent(transform, false);
            Canvas canvas = cg.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 10;
            CanvasScaler scaler = cg.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;
            cg.AddComponent<GraphicRaycaster>();
            Transform root = cg.transform;

            Image vig = Img("Vignette", root, sVignette, Color.white, false);
            Stretch(vig.rectTransform);
            vig.raycastTarget = false;

            BuildTopBar(root);
            BuildBuildBar(root);
            BuildTowerPanel(root);
            BuildOverlays(root);

            toastText = Txt("Toast", root, "", 30, Ivory, TextAnchor.MiddleCenter);
            Place(toastText.rectTransform, new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0f, -130f), new Vector2(900f, 50f));
            hintText = Txt("Hint", root, "Clic gauche : construire / sélectionner   ·   [1] Orbe foudroyant   ·   Clic droit / Échap : annuler   ·   [Entrée] lancer   ·   [P] pause   ·   [R] recommencer", 17, new Color(0.8f, 0.8f, 0.9f, 0.8f), TextAnchor.MiddleLeft);
            Place(hintText.rectTransform, new Vector2(0f, 0f), new Vector2(0f, 0f), new Vector2(0f, 0f), new Vector2(18f, 10f), new Vector2(1500f, 26f));

            Subscribe();
            RefreshAll();
        }

        void BuildTopBar(Transform root)
        {
            // Stabilité du Cœur (haut gauche)
            Image p1 = Panel("HeartPanel", root, sPanel);
            Place(p1.rectTransform, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(20f, -18f), new Vector2(520f, 96f));
            Image ic = Img("Icon", p1.transform, iHeart, Color.white, false); Place(ic.rectTransform, V(0f, 0.5f), V(0f, 0.5f), V(0f, 0.5f), V(22f, 0f), V(52f, 52f));
            Text lbl = Txt("Label", p1.transform, "STABILITÉ DU CŒUR", 20, Cyan, TextAnchor.MiddleLeft); Place(lbl.rectTransform, V(0f, 1f), V(0f, 1f), V(0f, 1f), V(88f, -12f), V(400f, 26f));
            Image bg = Img("BarBg", p1.transform, sBarBg, Color.white, true); Place(bg.rectTransform, V(0f, 0f), V(0f, 0f), V(0f, 0f), V(88f, 16f), V(404f, 34f));
            heartFill = Img("BarFill", bg.transform, sBarFill, new Color(0.62f, 0.35f, 1f), true);
            Stretch(heartFill.rectTransform); heartFill.rectTransform.offsetMin = new Vector2(3f, 3f); heartFill.rectTransform.offsetMax = new Vector2(-3f, -3f);
            heartFill.type = Image.Type.Filled; heartFill.fillMethod = Image.FillMethod.Horizontal; heartFill.fillOrigin = 0;
            heartText = Txt("Value", bg.transform, "100 / 100", 20, Color.white, TextAnchor.MiddleCenter); Stretch(heartText.rectTransform);

            // Séquence / vague / chrono (haut centre)
            Image p2 = Panel("WavePanel", root, sPanel);
            Place(p2.rectTransform, V(0.5f, 1f), V(0.5f, 1f), V(0.5f, 1f), V(0f, -18f), V(560f, 96f));
            Image wi = Img("Icon", p2.transform, iWave, Color.white, false); Place(wi.rectTransform, V(0f, 0.5f), V(0f, 0.5f), V(0f, 0.5f), V(22f, 0f), V(52f, 52f));
            seqText = Txt("Seq", p2.transform, "", 26, Ivory, TextAnchor.MiddleLeft); Place(seqText.rectTransform, V(0f, 1f), V(0f, 1f), V(0f, 1f), V(88f, -10f), V(460f, 36f));
            timeText = Txt("Time", p2.transform, "", 30, Gold, TextAnchor.MiddleLeft); Place(timeText.rectTransform, V(0f, 0f), V(0f, 0f), V(0f, 0f), V(88f, 10f), V(300f, 40f));

            // Or (haut droite)
            Image p3 = Panel("GoldPanel", root, sPanel);
            Place(p3.rectTransform, V(1f, 1f), V(1f, 1f), V(1f, 1f), V(-20f, -18f), V(260f, 96f));
            Image gi = Img("Icon", p3.transform, iGold, Color.white, false); Place(gi.rectTransform, V(0f, 0.5f), V(0f, 0.5f), V(0f, 0.5f), V(24f, 0f), V(52f, 52f));
            goldText = Txt("Gold", p3.transform, "0", 40, Gold, TextAnchor.MiddleLeft); Place(goldText.rectTransform, V(0f, 0f), V(1f, 1f), V(0f, 0.5f), V(90f, 0f), V(-100f, 0f));
        }

        void BuildBuildBar(Transform root)
        {
            GameManager gm = GameManager.Instance;
            System.Collections.Generic.List<TowerDefinition> defs = new System.Collections.Generic.List<TowerDefinition>();
            if (gm != null && gm.balance != null)
                for (int i = 0; i < gm.balance.towers.Length; i++) if (gm.balance.towers[i] != null && gm.balance.towers[i].implemented) defs.Add(gm.balance.towers[i]);
            buildDefs = defs.ToArray();
            buildButtonImages = new Image[buildDefs.Length];

            Image bar = Panel("BuildBar", root, sPanelDark);
            Place(bar.rectTransform, V(0.5f, 0f), V(0.5f, 0f), V(0.5f, 0f), V(0f, 44f), V(Mathf.Max(1, buildDefs.Length) * 330f + 30f, 112f));
            for (int i = 0; i < buildDefs.Length; i++)
            {
                TowerDefinition def = buildDefs[i];
                Image b = Img("Build_" + def.id, bar.transform, sButton, Color.white, true);
                b.pixelsPerUnitMultiplier = 0.5f;
                Place(b.rectTransform, V(0f, 0.5f), V(0f, 0.5f), V(0f, 0.5f), V(15f + i * 330f, 0f), V(320f, 92f));
                Button btn = b.gameObject.AddComponent<Button>();
                btn.targetGraphic = b;
                ColorBlock cb = btn.colors; cb.highlightedColor = new Color(1.25f, 1.25f, 1.4f); cb.pressedColor = new Color(0.8f, 0.8f, 0.9f); btn.colors = cb;
                TowerDefinition captured = def;
                btn.onClick.AddListener(() => { if (BuildController.Instance != null) BuildController.Instance.ToggleBuild(captured); });
                buildButtonImages[i] = b;

                Image ico = Img("Icon", b.transform, def.baseSprite, Color.white, false);
                ico.preserveAspect = true; ico.raycastTarget = false;
                Place(ico.rectTransform, V(0f, 0.5f), V(0f, 0.5f), V(0f, 0.5f), V(10f, 0f), V(70f, 80f));
                Text name = Txt("Name", b.transform, def.displayName + "  [" + (i + 1) + "]", 24, Ivory, TextAnchor.MiddleLeft);
                Place(name.rectTransform, V(0f, 1f), V(0f, 1f), V(0f, 1f), V(88f, -12f), V(228f, 34f));
                Image gi = Img("Gold", b.transform, iGold, Color.white, false); gi.raycastTarget = false;
                Place(gi.rectTransform, V(0f, 0f), V(0f, 0f), V(0f, 0f), V(88f, 12f), V(32f, 32f));
                Text cost = Txt("Cost", b.transform, def.buildCost.ToString(), 28, Gold, TextAnchor.MiddleLeft);
                Place(cost.rectTransform, V(0f, 0f), V(0f, 0f), V(0f, 0f), V(126f, 10f), V(120f, 36f));
            }
        }

        void BuildTowerPanel(Transform root)
        {
            Image p = Panel("TowerPanel", root, sPanel);
            towerPanel = p.gameObject;
            Place(p.rectTransform, V(1f, 0.5f), V(1f, 0.5f), V(1f, 0.5f), V(-20f, -20f), V(420f, 430f));
            towerTitle = Txt("Title", p.transform, "", 28, Cyan, TextAnchor.MiddleLeft);
            Place(towerTitle.rectTransform, V(0f, 1f), V(1f, 1f), V(0.5f, 1f), V(0f, -16f), V(-50f, 40f));
            towerStats = Txt("Stats", p.transform, "", 22, Ivory, TextAnchor.UpperLeft);
            Place(towerStats.rectTransform, V(0f, 1f), V(1f, 1f), V(0.5f, 1f), V(0f, -64f), V(-50f, 150f));

            Image ub = Img("UpgradeButton", p.transform, sButton, Color.white, true);
            ub.pixelsPerUnitMultiplier = 0.5f;
            Place(ub.rectTransform, V(0f, 0f), V(1f, 0f), V(0.5f, 0f), V(0f, 22f), V(-40f, 150f));
            upgradeButton = ub.gameObject.AddComponent<Button>();
            upgradeButton.targetGraphic = ub;
            upgradeButton.onClick.AddListener(OnUpgradeClicked);
            upgradeText = Txt("Label", ub.transform, "", 24, Gold, TextAnchor.UpperCenter);
            Place(upgradeText.rectTransform, V(0f, 1f), V(1f, 1f), V(0.5f, 1f), V(0f, -10f), V(-24f, 60f));
            upgradeDesc = Txt("Desc", ub.transform, "", 18, Ivory, TextAnchor.UpperCenter);
            Place(upgradeDesc.rectTransform, V(0f, 0f), V(1f, 1f), V(0.5f, 0.5f), V(0f, -26f), V(-24f, -66f));
            ub.raycastTarget = true;
            towerPanel.SetActive(false);
        }

        void BuildOverlays(Transform root)
        {
            // Préparation
            Image prep = Panel("Prep", root, sPanel);
            prepPanel = prep.gameObject;
            Place(prep.rectTransform, V(0.5f, 0.5f), V(0.5f, 0.5f), V(0.5f, 0.5f), V(0f, 40f), V(760f, 300f));
            Text pt = Txt("Title", prep.transform, "PRÉPARATION", 44, Cyan, TextAnchor.MiddleCenter);
            Place(pt.rectTransform, V(0f, 1f), V(1f, 1f), V(0.5f, 1f), V(0f, -24f), V(0f, 56f));
            Text pb = Txt("Body", prep.transform, "Bâtissez vos premières défenses sur les plaques runiques.\nLes ennemis jailliront du portail violet et marcheront jusqu'au Cœur.\nPrenez tout votre temps : la séquence commence quand vous le décidez.", 22, Ivory, TextAnchor.UpperCenter);
            Place(pb.rectTransform, V(0f, 1f), V(1f, 1f), V(0.5f, 1f), V(0f, -92f), V(-60f, 110f));
            MakeButton("Start", prep.transform, "LANCER LA SÉQUENCE  [Entrée]", V(0.5f, 0f), V(0f, 28f), V(480f, 72f), () => { if (GameManager.Instance != null) GameManager.Instance.StartSequence(); });

            // Fin de partie
            Image end = Panel("End", root, sPanel);
            endPanel = end.gameObject;
            Place(end.rectTransform, V(0.5f, 0.5f), V(0.5f, 0.5f), V(0.5f, 0.5f), V(0f, 20f), V(700f, 320f));
            endTitle = Txt("Title", end.transform, "", 64, Gold, TextAnchor.MiddleCenter);
            Place(endTitle.rectTransform, V(0f, 1f), V(1f, 1f), V(0.5f, 1f), V(0f, -24f), V(0f, 80f));
            endBody = Txt("Body", end.transform, "", 26, Ivory, TextAnchor.UpperCenter);
            Place(endBody.rectTransform, V(0f, 1f), V(1f, 1f), V(0.5f, 1f), V(0f, -116f), V(-60f, 90f));
            MakeButton("Restart", end.transform, "REJOUER  [R]", V(0.5f, 0f), V(0f, 28f), V(380f, 72f), () => { if (GameManager.Instance != null) GameManager.Instance.Restart(); });

            // Pause
            Image pause = Panel("Pause", root, sPanel);
            pausePanel = pause.gameObject;
            Place(pause.rectTransform, V(0.5f, 0.5f), V(0.5f, 0.5f), V(0.5f, 0.5f), V(0f, 0f), V(560f, 330f));
            Text pa = Txt("Title", pause.transform, "PAUSE", 56, Cyan, TextAnchor.MiddleCenter);
            Place(pa.rectTransform, V(0f, 1f), V(1f, 1f), V(0.5f, 1f), V(0f, -24f), V(0f, 70f));
            MakeButton("Resume", pause.transform, "REPRENDRE  [P]", V(0.5f, 0.5f), V(0f, -10f), V(380f, 64f), () => { if (GameManager.Instance != null) GameManager.Instance.SetPaused(false); });
            MakeButton("Restart", pause.transform, "RECOMMENCER  [R]", V(0.5f, 0.5f), V(0f, -92f), V(380f, 64f), () => { if (GameManager.Instance != null) GameManager.Instance.Restart(); });
            prepPanel.SetActive(false); endPanel.SetActive(false); pausePanel.SetActive(false);
        }

        // ------------------------------------------------------------ abonnements & rafraîchissement
        void Subscribe()
        {
            if (GameManager.Instance != null) { GameManager.Instance.StateChanged += OnState; GameManager.Instance.PauseChanged += OnPause; }
            if (HeartCore.Instance != null) HeartCore.Instance.Changed += OnHeart;
            if (Economy.Instance != null) Economy.Instance.GoldChanged += OnGold;
            if (BuildController.Instance != null) BuildController.Instance.Changed += OnBuildChanged;
            if (WaveDirector.Instance != null) WaveDirector.Instance.WaveStarted += OnWave;
            Notifier.Toast += OnToast;
        }

        void OnDestroy()
        {
            if (GameManager.Instance != null) { GameManager.Instance.StateChanged -= OnState; GameManager.Instance.PauseChanged -= OnPause; }
            if (HeartCore.Instance != null) HeartCore.Instance.Changed -= OnHeart;
            if (Economy.Instance != null) Economy.Instance.GoldChanged -= OnGold;
            if (BuildController.Instance != null) BuildController.Instance.Changed -= OnBuildChanged;
            if (WaveDirector.Instance != null) WaveDirector.Instance.WaveStarted -= OnWave;
            Notifier.Toast -= OnToast;
        }

        void OnState(GameState s) { RefreshOverlays(); }
        void OnPause(bool p) { RefreshOverlays(); }
        void OnHeart(float v, float max) { RefreshHeart(); }
        void OnGold(int g) { goldText.text = g.ToString(); }
        void OnBuildChanged() { RefreshBuildBar(); RefreshTowerPanel(); }
        void OnWave(int n, WaveDefinition w) { ShowToast(w.label, Gold); }
        void OnToast(string msg, Color c) { ShowToast(msg, c); }

        void ShowToast(string msg, Color c) { toastText.text = msg; toastText.color = c; toastTimer = 2.2f; }

        void RefreshAll() { RefreshHeart(); RefreshOverlays(); RefreshBuildBar(); RefreshTowerPanel(); if (Economy.Instance != null) goldText.text = Economy.Instance.Gold.ToString(); }

        void RefreshHeart()
        {
            HeartCore h = HeartCore.Instance;
            if (h == null || heartFill == null) return;
            float max = Mathf.Max(1f, h.MaxStability);
            heartFill.fillAmount = Mathf.Clamp01(h.Stability / max);
            heartFill.color = Color.Lerp(new Color(1f, 0.25f, 0.35f), new Color(0.62f, 0.35f, 1f), Mathf.Clamp01(h.Stability / max * 1.6f));
            heartText.text = Mathf.CeilToInt(h.Stability) + " / " + Mathf.CeilToInt(max);
        }

        void RefreshOverlays()
        {
            GameManager gm = GameManager.Instance;
            if (gm == null) return;
            prepPanel.SetActive(gm.State == GameState.Preparation && !gm.Paused);
            pausePanel.SetActive(gm.Paused);
            bool over = gm.State == GameState.Victory || gm.State == GameState.Defeat;
            endPanel.SetActive(over);
            if (over)
            {
                bool win = gm.State == GameState.Victory;
                endTitle.text = win ? "VICTOIRE" : "DÉFAITE";
                endTitle.color = win ? Gold : new Color(1f, 0.4f, 0.45f);
                endBody.text = (win ? "Le Cœur tient bon : la séquence est vaincue.\n" : "Le Cœur s'est effondré sous la corruption.\n") + "Ennemis vaincus : " + Notifier.KillCount + "   ·   Temps : " + Clock(gm.SequenceTime);
            }
        }

        void RefreshBuildBar()
        {
            BuildController bc = BuildController.Instance;
            for (int i = 0; i < buildButtonImages.Length; i++)
                buildButtonImages[i].color = bc != null && bc.BuildDef == buildDefs[i] ? new Color(0.6f, 1f, 0.8f) : Color.white;
        }

        void RefreshTowerPanel()
        {
            BuildController bc = BuildController.Instance;
            Tower t = bc != null ? bc.Selected : null;
            towerPanel.SetActive(t != null);
            if (t == null) return;
            TowerStats s = t.Stats;
            towerTitle.text = t.Def.displayName + "  ·  niveau " + (t.Tier + 1);
            towerStats.text = "Dégâts : " + s.damage.ToString("0.#") + "\nCadence : " + s.attacksPerSecond.ToString("0.0#") + " / s\nPortée : " + s.range.ToString("0.#")
                + "\nÉclairs par salve : " + s.zapCount + "\nChaîne : " + (s.chainJumps > 0 ? s.chainJumps + " rebonds" : "aucune");
            if (t.HasNextUpgrade)
            {
                TowerUpgrade u = t.NextUpgrade;
                bool afford = Economy.Instance != null && Economy.Instance.CanAfford(u.cost);
                upgradeText.text = "AMÉLIORER : " + u.displayName + "\n" + u.cost + " or";
                upgradeText.color = afford ? Gold : new Color(1f, 0.5f, 0.5f);
                upgradeDesc.text = u.description + (u.provisional ? "\n(valeurs provisoires)" : "");
                upgradeButton.interactable = true;
            }
            else
            {
                upgradeText.text = "NIVEAU MAXIMAL";
                upgradeText.color = Cyan;
                upgradeDesc.text = "Cette tourelle a atteint sa dernière amélioration disponible.";
                upgradeButton.interactable = false;
            }
        }

        void OnUpgradeClicked()
        {
            BuildController bc = BuildController.Instance;
            if (bc != null && bc.Selected != null) { bc.Selected.TryUpgrade(); RefreshTowerPanel(); }
        }

        static string Clock(float s)
        {
            int total = Mathf.Max(0, Mathf.FloorToInt(s));
            return (total / 60).ToString("00") + ":" + (total % 60).ToString("00");
        }

        void Update()
        {
            GameManager gm = GameManager.Instance;
            if (gm != null)
            {
                WaveDirector wd = WaveDirector.Instance;
                string wave = gm.State == GameState.Preparation ? "PRÉPARATION" : "VAGUE " + Mathf.Max(1, wd != null ? wd.CurrentWave : 1) + " / " + (wd != null ? wd.TotalWaves : 10);
                seqText.text = "SÉQUENCE " + gm.sequenceNumber + "  ·  " + wave;
                float nominal = gm.balance != null && gm.balance.sequence != null ? gm.balance.sequence.nominalDuration : 300f;
                timeText.text = Clock(gm.SequenceTime) + " / " + Clock(nominal);
            }
            if (toastTimer > 0f)
            {
                toastTimer -= Time.unscaledDeltaTime;
                Color c = toastText.color; c.a = Mathf.Clamp01(toastTimer / 0.5f); toastText.color = c;
                if (toastTimer <= 0f) toastText.text = "";
            }
            if (towerPanel.activeSelf) RefreshTowerPanel();   // coût/or à jour en continu
        }

        // ------------------------------------------------------------ helpers UI
        static Vector2 V(float x, float y) { return new Vector2(x, y); }

        Image Panel(string name, Transform parent, Sprite sprite)
        {
            Image i = Img(name, parent, sprite, Color.white, true);
            i.pixelsPerUnitMultiplier = 0.55f;
            return i;
        }

        Image Img(string name, Transform parent, Sprite sprite, Color color, bool sliced)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            Image im = go.AddComponent<Image>();
            im.sprite = sprite; im.color = color;
            im.type = sliced ? Image.Type.Sliced : Image.Type.Simple;
            im.raycastTarget = sliced;
            return im;
        }

        Text Txt(string name, Transform parent, string text, int size, Color color, TextAnchor anchor)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            Text t = go.AddComponent<Text>();
            t.font = font; t.text = text; t.fontSize = size; t.color = color; t.alignment = anchor;
            t.horizontalOverflow = HorizontalWrapMode.Wrap; t.verticalOverflow = VerticalWrapMode.Overflow;
            t.raycastTarget = false;
            Outline o = go.AddComponent<Outline>();
            o.effectColor = new Color(0.04f, 0.02f, 0.1f, 0.95f); o.effectDistance = new Vector2(2f, -2f);
            return t;
        }

        void MakeButton(string name, Transform parent, string label, Vector2 anchor, Vector2 pos, Vector2 size, UnityEngine.Events.UnityAction onClick)
        {
            Image b = Img(name, parent, sButton, Color.white, true);
            b.pixelsPerUnitMultiplier = 0.5f;
            Place(b.rectTransform, anchor, anchor, anchor, pos, size);
            Button btn = b.gameObject.AddComponent<Button>();
            btn.targetGraphic = b;
            ColorBlock cb = btn.colors; cb.highlightedColor = new Color(1.25f, 1.25f, 1.4f); cb.pressedColor = new Color(0.8f, 0.8f, 0.9f); btn.colors = cb;
            btn.onClick.AddListener(onClick);
            Text t = Txt("Label", b.transform, label, 28, Gold, TextAnchor.MiddleCenter);
            Stretch(t.rectTransform);
        }

        static void Stretch(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one; rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
        }

        static void Place(RectTransform rt, Vector2 aMin, Vector2 aMax, Vector2 pivot, Vector2 pos, Vector2 size)
        {
            rt.anchorMin = aMin; rt.anchorMax = aMax; rt.pivot = pivot; rt.anchoredPosition = pos; rt.sizeDelta = size;
        }
    }
}
