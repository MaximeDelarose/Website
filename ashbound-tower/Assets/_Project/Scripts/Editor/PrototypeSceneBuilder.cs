using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace AshboundTower.EditorTools
{
    /// <summary>Génère en un clic : données (ScriptableObjects), matériaux et scène « Arene_01 » (sol peint, chemin, plaques de construction, décor, Cœur, caméra, managers, UI).
    /// Menu : Ashbound Tower ▸ Générer la scène de prototype. S'exécute aussi automatiquement à la première ouverture du projet.</summary>
    public static class PrototypeSceneBuilder
    {
        const string Root = "Assets/_Project";
        const string ScenePath = Root + "/Scenes/Arene_01.unity";
        const string DataDir = Root + "/Data";

        [Serializable] class Pt { public float x; public float z; }
        [Serializable] class DecorJson { public string kind; public float x; public float z; public bool flip; }
        [Serializable]
        class LayoutJson
        {
            public float width; public float height; public float pathHalfWidth;
            public Pt spawn; public Pt heart; public Pt[] path; public Pt[] slots; public DecorJson[] decor;
        }

        // ------------------------------------------------------------ menus
        [MenuItem("Ashbound Tower/Générer la scène de prototype")]
        public static void BuildMenu()
        {
            if (File.Exists(ScenePath) && !EditorUtility.DisplayDialog("Régénérer la scène", "La scène Arene_01 existe déjà : elle sera écrasée (vos modifications manuelles de la scène seront perdues, les données Data/ sont conservées). Continuer ?", "Régénérer", "Annuler")) return;
            if (!UnityEditor.SceneManagement.EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            Build(false);
        }

        [MenuItem("Ashbound Tower/Réinitialiser les données par défaut et régénérer la scène")]
        public static void BuildResetMenu()
        {
            if (EditorUtility.DisplayDialog("Réinitialiser", "Ceci écrase les ScriptableObjects de Assets/_Project/Data (ennemis, tourelles, séquence, équilibrage). Continuer ?", "Oui", "Annuler"))
            {
                if (!UnityEditor.SceneManagement.EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
                Build(true);
            }
        }

        [InitializeOnLoadMethod]
        static void AutoBuildOnFirstOpen()
        {
            EditorApplication.delayCall += () =>
            {
                if (Application.isPlaying || EditorApplication.isCompiling || EditorApplication.isUpdating) return;
                if (SessionState.GetBool("AshboundAutoBuildTried", false)) return;
                if (UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene().isDirty) return;   // ne jamais écraser un travail non sauvegardé
                SessionState.SetBool("AshboundAutoBuildTried", true);
                if (!File.Exists(ScenePath) && File.Exists(Root + "/Data/Arena01_layout.json")) Build(false);
            };
        }

        // ------------------------------------------------------------ utilitaires
        static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            string parent = Path.GetDirectoryName(path).Replace('\\', '/');
            EnsureFolder(parent);
            AssetDatabase.CreateFolder(parent, Path.GetFileName(path));
        }

        static Sprite Spr(string folder, string name)
        {
            Sprite s = AssetDatabase.LoadAssetAtPath<Sprite>(Root + "/" + folder + "/" + name + ".png");
            if (s == null) Debug.LogWarning("[Ashbound] Sprite introuvable : " + folder + "/" + name);
            return s;
        }

        static Sprite Bill(string name) { return Spr("Art/Billboards", name); }

        static T Asset<T>(string name, bool reset, out bool created) where T : ScriptableObject
        {
            string path = DataDir + "/" + name + ".asset";
            T existing = AssetDatabase.LoadAssetAtPath<T>(path);
            created = existing == null || reset;
            if (existing != null && !reset) return existing;
            if (existing != null) AssetDatabase.DeleteAsset(path);
            T a = ScriptableObject.CreateInstance<T>();
            AssetDatabase.CreateAsset(a, path);
            return a;
        }

        // ------------------------------------------------------------ données par défaut (valeurs PROVISOIRES, voir Docs/HYPOTHESES.md)
        static EnemyDefinition MakeEnemy(string id, string name, EnemyKind kind, float hp, float speed, float dmg, int gold, int xp, string sprite, float fps, float scale, float shadow, bool bar, float barW, bool reset)
        {
            bool created;
            EnemyDefinition e = Asset<EnemyDefinition>("Enemy_" + id, reset, out created);
            if (!created) return e;
            e.id = id; e.displayName = name; e.kind = kind; e.maxHealth = hp; e.moveSpeed = speed; e.heartDamage = dmg;
            e.goldReward = gold; e.xpReward = xp; e.frameRate = fps; e.visualScale = scale; e.shadowSize = shadow;
            e.alwaysShowHealthBar = bar; e.healthBarWidth = barW;
            e.walkFrames = new Sprite[] { Bill(sprite + "_0"), Bill(sprite + "_1") };
            EditorUtility.SetDirty(e);
            return e;
        }

        static TowerUpgrade Up(string name, string desc, int cost, TowerStatModifier m, Sprite s)
        {
            TowerUpgrade u = new TowerUpgrade();
            u.displayName = name; u.description = desc; u.cost = cost; u.modifier = m; u.towerSprite = s; u.provisional = true;
            return u;
        }

        static TowerDefinition MakeOrb(bool reset)
        {
            bool created;
            TowerDefinition t = Asset<TowerDefinition>("Tower_OrbeFoudroyant", reset, out created);
            if (!created) return t;
            t.id = "orbe_foudroyant"; t.displayName = "Orbe foudroyant"; t.family = TowerFamily.OrbeFoudroyant; t.element = Element.Neutre;
            t.description = "Petite sphère électrique qui frappe vite une cible unique, avec des éclairs précis.";
            t.buildCost = 50; t.implemented = true; t.baseSprite = Bill("tower_orb_0"); t.muzzleHeight = 1.5f;
            t.baseStats = new TowerStats { damage = 8f, attacksPerSecond = 1.6f, range = 5.5f, zapCount = 1, chainJumps = 0, chainRadius = 2.8f, chainFalloff = 0.7f };
            TowerBranch b = new TowerBranch();
            b.branchName = "Voie de la Foudre";
            b.description = "Décharges multiples, puis éclairs en chaîne (Google Doc). Le 3e palier est une hypothèse provisoire.";
            b.tiers = new TowerUpgrade[]
            {
                Up("Décharges multiples", "Plusieurs éclairs par salve, chacun sur une cible différente.", 60, new TowerStatModifier { zapCountBonus = 2, damageMultiplier = 0.85f }, Bill("tower_orb_1")),
                Up("Éclairs en chaîne", "Chaque éclair rebondit sur 2 ennemis proches.", 110, new TowerStatModifier { chainJumpsBonus = 2, chainRadiusBonus = 0.5f }, Bill("tower_orb_2")),
                Up("Surtension", "Dégâts, cadence et portée accrus, 2 rebonds de plus. (provisoire)", 180, new TowerStatModifier { damageMultiplier = 1.5f, attackRateMultiplier = 1.25f, rangeBonus = 1f, chainJumpsBonus = 2 }, Bill("tower_orb_3"))
            };
            t.branches = new TowerBranch[] { b };
            EditorUtility.SetDirty(t);
            return t;
        }

        static TowerDefinition MakePlaceholder(string file, string id, string name, TowerFamily fam, string desc, int cost, bool reset)
        {
            bool created;
            TowerDefinition t = Asset<TowerDefinition>(file, reset, out created);
            if (!created) return t;
            t.id = id; t.displayName = name; t.family = fam; t.description = desc; t.buildCost = cost; t.implemented = false;
            t.baseSprite = Bill("tower_orb_0");
            EditorUtility.SetDirty(t);
            return t;
        }

        static WaveDefinition Wave(float start, string label, params SpawnGroup[] groups)
        {
            WaveDefinition w = new WaveDefinition(); w.startTime = start; w.label = label; w.groups = groups; return w;
        }

        static SpawnGroup G(EnemyDefinition e, int count, float spacing, float delay)
        {
            SpawnGroup g = new SpawnGroup(); g.enemy = e; g.count = count; g.spacing = spacing; g.delay = delay; return g;
        }

        static SequenceDefinition MakeSequence(EnemyDefinition orb, EnemyDefinition scout, EnemyDefinition elite, EnemyDefinition mini, EnemyDefinition boss, bool reset)
        {
            bool created;
            SequenceDefinition s = Asset<SequenceDefinition>("Sequence_01", reset, out created);
            if (!created) return s;
            s.displayName = "Séquence 1"; s.nominalDuration = 300f; s.randomSeed = 1234;
            float t0 = 10f, dt = 27f;   // 10 vagues réparties sur ~5 minutes
            s.waves = new WaveDefinition[]
            {
                Wave(t0 + dt * 0, "Vague 1 — Premiers murmures", G(orb, 5, 0.5f, 0f)),
                Wave(t0 + dt * 1, "Vague 2 — La corruption s'étend", G(orb, 7, 0.45f, 0f)),
                Wave(t0 + dt * 2, "Vague 3 — Des ombres rapides", G(orb, 5, 0.5f, 0f), G(scout, 4, 0.4f, 1.5f)),
                Wave(t0 + dt * 3, "Vague 4 — Le flot grossit", G(orb, 9, 0.4f, 0f), G(scout, 5, 0.35f, 2f)),
                Wave(t0 + dt * 4, "Vague 5 — Le Broyeur de ruines approche !", G(mini, 1, 1f, 0f), G(orb, 8, 0.45f, 2f)),
                Wave(t0 + dt * 5, "Vague 6 — Meute d'ombres", G(orb, 8, 0.4f, 0f), G(scout, 8, 0.3f, 1.5f)),
                Wave(t0 + dt * 6, "Vague 7 — Gardiens de cendre", G(elite, 2, 2f, 0f), G(orb, 10, 0.4f, 1f)),
                Wave(t0 + dt * 7, "Vague 8 — Tempête d'ombres", G(scout, 12, 0.25f, 0f), G(orb, 8, 0.4f, 2f)),
                Wave(t0 + dt * 8, "Vague 9 — Bataillon de cendre", G(elite, 3, 1.8f, 0f), G(orb, 12, 0.35f, 1f)),
                Wave(t0 + dt * 9, "Vague 10 — LE SEIGNEUR DE CENDRE !", G(boss, 1, 1f, 0f), G(elite, 3, 2f, 3f), G(orb, 10, 0.4f, 2f))
            };
            TrickleDefinition a = new TrickleDefinition(); a.enemy = orb; a.startTime = 2f; a.endTime = 270f; a.interval = 6f; a.packMin = 1; a.packMax = 3; a.packSpacing = 0.45f;
            TrickleDefinition b = new TrickleDefinition(); b.enemy = scout; b.startTime = 60f; b.endTime = 270f; b.interval = 11f; b.packMin = 1; b.packMax = 2; b.packSpacing = 0.35f;
            s.trickles = new TrickleDefinition[] { a, b };
            EditorUtility.SetDirty(s);
            return s;
        }

        // ------------------------------------------------------------ construction principale
        public static void Build(bool resetData)
        {
            try
            {
                AssetDatabase.Refresh();
                EnsureFolder(DataDir); EnsureFolder(Root + "/Scenes"); EnsureFolder(Root + "/Materials");

                TextAsset layoutAsset = AssetDatabase.LoadAssetAtPath<TextAsset>(Root + "/Data/Arena01_layout.json");
                if (layoutAsset == null) { Debug.LogError("[Ashbound] Arena01_layout.json introuvable. Lancez Tools/art/generate_all.py."); return; }
                LayoutJson L = JsonUtility.FromJson<LayoutJson>(layoutAsset.text);

                PlayerSettings.productName = "Ashbound Tower";

                // --- données
                EnemyDefinition orb = MakeEnemy("spectre", "Spectre corrompu", EnemyKind.Standard, 55f, 2.3f, 4f, 4, 1, "enemy_orb", 4f, 1f, 1.3f, false, 1.0f, resetData);
                EnemyDefinition scout = MakeEnemy("fureteur", "Fureteur d'ombre", EnemyKind.Rapide, 30f, 4.2f, 3f, 3, 1, "enemy_scout", 8f, 1f, 1.5f, false, 1.0f, resetData);
                EnemyDefinition elite = MakeEnemy("gardien", "Gardien de cendre", EnemyKind.Elite, 240f, 1.5f, 15f, 30, 8, "enemy_elite", 2.5f, 0.9f, 2.2f, true, 1.6f, resetData);
                EnemyDefinition mini = MakeEnemy("broyeur", "Broyeur de ruines", EnemyKind.MiniBoss, 1000f, 1.2f, 35f, 90, 25, "enemy_miniboss", 2f, 0.85f, 3.4f, true, 2.4f, resetData);
                EnemyDefinition boss = MakeEnemy("seigneur", "Seigneur de Cendre", EnemyKind.Boss, 3600f, 0.9f, 100f, 250, 80, "enemy_boss", 2f, 0.8f, 4.2f, true, 3.2f, resetData);
                TowerDefinition towerOrb = MakeOrb(resetData);
                TowerDefinition relay = MakePlaceholder("Tower_RelaisElectrique", "relais_electrique", "Relais électrique", TowerFamily.RelaisElectrique,
                    "Soutien : diffuse une zone qui augmente la cadence des tourelles proches. Prévu à l'étape 3.", 120, resetData);
                TowerDefinition ultimate = MakePlaceholder("Tower_UltimeEpeiste", "tourelle_ultime_epeiste", "Tourelle ultime (à définir)", TowerFamily.TourelleUltimeEpeiste,
                    "Emplacement d'architecture réservé : le Google Doc ne définit pas encore cette tourelle.", 300, resetData);
                SequenceDefinition sequence = MakeSequence(orb, scout, elite, mini, boss, resetData);

                bool createdBalance;
                GameBalance balance = Asset<GameBalance>("GameBalance", resetData, out createdBalance);
                if (createdBalance)
                {
                    balance.startingGold = 150; balance.heartMaxStability = 100f; balance.sequence = sequence;
                    balance.towers = new TowerDefinition[] { towerOrb, relay, ultimate };
                    EditorUtility.SetDirty(balance);
                }

                // --- matériaux
                Material zapMat = LoadOrCreateMaterial("Zap");
                Material emberMat = LoadOrCreateMaterial("Ember");
                Sprite sparkSprite = AssetDatabase.LoadAssetAtPath<Sprite>(Root + "/Resources/Ashbound/Fx/fx_spark.png");
                if (sparkSprite != null) emberMat.mainTexture = sparkSprite.texture;
                EditorUtility.SetDirty(emberMat); EditorUtility.SetDirty(zapMat);

                // --- scène
                UnityEditor.SceneManagement.EditorSceneManager.NewScene(UnityEditor.SceneManagement.NewSceneSetup.EmptyScene, UnityEditor.SceneManagement.NewSceneMode.Single);
                BuildScene(L, balance, sequence, zapMat, emberMat);

                AssetDatabase.SaveAssets();
                EditorBuildSettings.scenes = new EditorBuildSettingsScene[] { new EditorBuildSettingsScene(ScenePath, true) };
                Debug.Log("[Ashbound] Scène générée : " + ScenePath + ". Appuyez sur Lecture.");
            }
            catch (Exception ex)
            {
                Debug.LogError("[Ashbound] Échec de la génération : " + ex);
            }
        }

        static Material LoadOrCreateMaterial(string name)
        {
            string path = Root + "/Materials/" + name + ".mat";
            Material m = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (m != null) return m;
            m = new Material(Shader.Find("Sprites/Default"));
            AssetDatabase.CreateAsset(m, path);
            return m;
        }

        static GameObject Flat(string name, Transform parent, Vector3 pos, Sprite sprite, int order)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.transform.position = pos;
            go.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
            SpriteRenderer sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = sprite; sr.sortingOrder = order;
            return go;
        }

        static void BuildScene(LayoutJson L, GameBalance balance, SequenceDefinition sequence, Material zapMat, Material emberMat)
        {
            // Caméra
            GameObject camGo = new GameObject("Main Camera");
            camGo.tag = "MainCamera";
            Camera cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.035f, 0.025f, 0.07f);
            cam.nearClipPlane = 0.3f; cam.farClipPlane = 200f;
            camGo.AddComponent<AudioListener>();
            CameraRig rig = camGo.AddComponent<CameraRig>();
            rig.arenaSize = new Vector2(L.width, L.height);

            // Gestionnaires
            GameObject mgr = new GameObject("Managers");
            GameManager gm = AddChild(mgr, "GameManager").AddComponent<GameManager>(); gm.balance = balance;
            AddChild(mgr, "Economy").AddComponent<Economy>();
            AddChild(mgr, "Audio").AddComponent<AudioManager>();
            AddChild(mgr, "FxPool").AddComponent<FxPool>();
            ZapVfx zap = AddChild(mgr, "ZapVfx").AddComponent<ZapVfx>(); zap.lineMaterial = zapMat;

            // Arène
            GameObject arena = new GameObject("Arena");
            Sprite groundSprite = Spr("Art/Ground", "arena01_ground");
            Flat("Ground", arena.transform, Vector3.zero, groundSprite, GameAssets.OrderGround);

            GameObject pathGo = new GameObject("Path");
            pathGo.transform.SetParent(arena.transform, false);
            PathRoute route = pathGo.AddComponent<PathRoute>();
            Vector3[] pts = new Vector3[L.path.Length];
            for (int i = 0; i < pts.Length; i++) pts[i] = new Vector3(L.path[i].x, 0f, L.path[i].z);
            route.SetPoints(pts);

            GameObject spawn = new GameObject("SpawnPoint");
            spawn.transform.SetParent(arena.transform, false);
            spawn.transform.position = new Vector3(L.spawn.x, 0f, L.spawn.z);

            GameObject heartGo = new GameObject("Heart");
            heartGo.transform.SetParent(arena.transform, false);
            heartGo.transform.position = new Vector3(L.heart.x, 0f, L.heart.z);
            HeartCore heart = heartGo.AddComponent<HeartCore>();
            heart.frames = new Sprite[] { Bill("heart_0"), Bill("heart_1") };

            GameObject slotsGo = new GameObject("BuildSlots");
            slotsGo.transform.SetParent(arena.transform, false);
            BuildSlot[] slots = new BuildSlot[L.slots.Length];
            for (int i = 0; i < slots.Length; i++)
            {
                GameObject s = new GameObject("Slot_" + (i + 1).ToString("00"));
                s.transform.SetParent(slotsGo.transform, false);
                s.transform.position = new Vector3(L.slots[i].x, 0f, L.slots[i].z);
                slots[i] = s.AddComponent<BuildSlot>();
            }

            // Décor
            GameObject decorGo = new GameObject("Decor");
            decorGo.transform.SetParent(arena.transform, false);
            Sprite shadow = AssetDatabase.LoadAssetAtPath<Sprite>(Root + "/Resources/Ashbound/Fx/fx_shadow.png");
            for (int i = 0; i < L.decor.Length; i++)
            {
                DecorJson d = L.decor[i];
                GameObject g = new GameObject(d.kind + "_" + i);
                g.transform.SetParent(decorGo.transform, false);
                g.transform.position = new Vector3(d.x, 0f, d.z);
                GameObject vis = new GameObject("Visual");
                vis.transform.SetParent(g.transform, false);
                SpriteRenderer sr = vis.AddComponent<SpriteRenderer>();
                sr.flipX = d.flip;
                vis.AddComponent<BillboardSprite>();
                float sh = 1.4f;
                if (d.kind == "brazier")
                {
                    Sprite[] fr = new Sprite[] { Bill("brazier_0"), Bill("brazier_1") };
                    sr.sprite = fr[0];
                    vis.AddComponent<SpriteFrameAnimator>().Setup(sr, fr, 6f, (i * 0.37f) % 2f);
                    sh = 0.9f;
                }
                else
                {
                    sr.sprite = Bill(d.kind);
                    if (d.kind.StartsWith("tree")) sh = 2.4f; else if (d.kind == "ruin_arch") sh = 3.4f; else if (d.kind == "ruin_pillar") sh = 1.6f;
                    else if (d.kind == "rock") sh = 1.7f; else if (d.kind == "rock_small") sh = 1.0f; else if (d.kind == "crystal") sh = 1.3f; else sh = 1.1f;
                }
                Flat("Shadow", g.transform, g.transform.position, shadow, GameAssets.OrderShadow).transform.localScale = new Vector3(sh, sh, 1f);
            }

            // Ambiance : lucioles spectrales
            GameObject fx = new GameObject("AmbientMotes");
            fx.transform.position = new Vector3(0f, 0.6f, 0f);
            ParticleSystem ps = fx.AddComponent<ParticleSystem>();
            ParticleSystem.MainModule main = ps.main;
            main.loop = true; main.startLifetime = 6f; main.startSpeed = 0.15f; main.startSize = 0.22f; main.maxParticles = 160;
            main.startColor = new ParticleSystem.MinMaxGradient(new Color(0.5f, 0.85f, 1f, 0.8f), new Color(0.75f, 0.45f, 1f, 0.8f));
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            ParticleSystem.EmissionModule em = ps.emission; em.rateOverTime = 14f;
            ParticleSystem.ShapeModule shp = ps.shape; shp.shapeType = ParticleSystemShapeType.Box; shp.scale = new Vector3(L.width - 2f, 1.5f, L.height - 2f);
            ParticleSystemRenderer psr = fx.GetComponent<ParticleSystemRenderer>();
            psr.sharedMaterial = emberMat; psr.sortingOrder = 2000;

            // Systèmes de jeu
            GameObject sys = new GameObject("GameSystems");
            WaveDirector wd = AddChild(sys, "WaveDirector").AddComponent<WaveDirector>();
            wd.sequence = sequence; wd.route = route;
            BuildController bc = AddChild(sys, "BuildController").AddComponent<BuildController>();
            bc.slots = slots;
            AddChild(sys, "UI").AddComponent<GameUI>();

            EditorUtility.SetDirty(gm);
            UnityEditor.SceneManagement.EditorSceneManager.SaveScene(UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene(), ScenePath);
        }

        static GameObject AddChild(GameObject parent, string name)
        {
            GameObject g = new GameObject(name);
            g.transform.SetParent(parent.transform, false);
            return g;
        }
    }
}
