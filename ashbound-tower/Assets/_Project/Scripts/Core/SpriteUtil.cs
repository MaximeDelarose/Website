using UnityEngine;

namespace AshboundTower
{
    /// <summary>Sprites générés à la volée (carrés blancs pour les barres de vie).</summary>
    public static class SpriteUtil
    {
        static Sprite white, whiteLeft;

        static Texture2D MakeTex()
        {
            Texture2D t = new Texture2D(1, 1, TextureFormat.RGBA32, false);
            t.SetPixel(0, 0, Color.white);
            t.Apply();
            t.filterMode = FilterMode.Point;
            return t;
        }

        /// <summary>Carré blanc de 1 unité, pivot au centre.</summary>
        public static Sprite White
        {
            get
            {
                if (white == null) white = Sprite.Create(MakeTex(), new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f), 1f);
                return white;
            }
        }

        /// <summary>Carré blanc de 1 unité, pivot à gauche (barres de progression).</summary>
        public static Sprite WhiteLeft
        {
            get
            {
                if (whiteLeft == null) whiteLeft = Sprite.Create(MakeTex(), new Rect(0, 0, 1, 1), new Vector2(0f, 0.5f), 1f);
                return whiteLeft;
            }
        }
    }

    /// <summary>Sprites partagés chargés depuis Resources/Ashbound/Fx.</summary>
    public static class GameAssets
    {
        static Sprite Load(string n) { return Resources.Load<Sprite>("Ashbound/Fx/" + n); }
        static Sprite shadow, spark, ring, slot, disc;
        public static Sprite Shadow { get { if (shadow == null) shadow = Load("fx_shadow"); return shadow; } }
        public static Sprite Spark { get { if (spark == null) spark = Load("fx_spark"); return spark; } }
        public static Sprite Ring { get { if (ring == null) ring = Load("fx_ring"); return ring; } }
        public static Sprite SlotOutline { get { if (slot == null) slot = Load("fx_slot"); return slot; } }
        public static Sprite Disc { get { if (disc == null) disc = Load("fx_disc"); return disc; } }

        /// <summary>Ordres de tri : sol -1000, calques au sol -990..-860, sprites debout ~500..1500 (tri par profondeur), FX 3000+.</summary>
        public const int OrderGround = -1000;
        public const int OrderSlotMarker = -960;
        public const int OrderRing = -900;
        public const int OrderShadow = -880;
        public const int OrderFx = 3000;
        public const int OrderHealthBar = 3500;

        public static GameObject FlatSprite(string name, Transform parent, Sprite s, int order)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            SpriteRenderer sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = s;
            sr.sortingOrder = order;
            return go;
        }
    }
}
