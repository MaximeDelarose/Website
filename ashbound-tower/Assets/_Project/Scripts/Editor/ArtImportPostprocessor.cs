using UnityEditor;
using UnityEngine;

namespace AshboundTower.EditorTools
{
    /// <summary>Applique automatiquement les réglages pixel art (filtre Point, sans compression, 32 px/unité, pivots) aux PNG du projet,
    /// ce qui évite toute manipulation manuelle dans l'inspecteur.</summary>
    public class ArtImportPostprocessor : AssetPostprocessor
    {
        void OnPreprocessTexture()
        {
            string p = assetPath.Replace('\\', '/');
            if (!p.StartsWith("Assets/_Project/")) return;
            bool ground = p.Contains("/Art/Ground/");
            bool billboard = p.Contains("/Art/Billboards/");
            bool fx = p.Contains("/Resources/Ashbound/Fx/");
            bool ui = p.Contains("/Resources/Ashbound/UI/");
            if (!ground && !billboard && !fx && !ui) return;

            TextureImporter ti = (TextureImporter)assetImporter;
            ti.textureType = TextureImporterType.Sprite;
            ti.spriteImportMode = SpriteImportMode.Single;
            ti.spritePixelsPerUnit = ui ? 100f : 32f;
            ti.filterMode = FilterMode.Point;
            ti.textureCompression = TextureImporterCompression.Uncompressed;
            ti.mipmapEnabled = false;
            ti.alphaIsTransparency = true;
            ti.maxTextureSize = 2048;

            TextureImporterSettings s = new TextureImporterSettings();
            ti.ReadTextureSettings(s);
            s.spriteAlignment = (int)(billboard ? UnityEngine.SpriteAlignment.BottomCenter : UnityEngine.SpriteAlignment.Center);
            s.spriteMeshType = SpriteMeshType.FullRect;
            ti.SetTextureSettings(s);

            if (ui)
            {
                string n = System.IO.Path.GetFileNameWithoutExtension(p);
                float b = 0f;
                if (n == "panel" || n == "panel_dark") b = 12f;
                else if (n == "button" || n == "button_hover") b = 8f;
                else if (n == "bar_bg" || n == "bar_fill") b = 3f;
                ti.spriteBorder = new Vector4(b, b, b, b);
            }
        }
    }
}
