using System.Collections;
using UnityEngine;

namespace Catower
{
    /// <summary>
    /// Construit tout le jeu au lancement. Si la scène ne contient pas de Bootstrap, il se crée tout seul :
    /// ouvrir n'importe quelle scène vide puis appuyer sur Play suffit.
    /// </summary>
    [DefaultExecutionOrder(-1000)]
    public class Bootstrap : MonoBehaviour
    {
        public static Transform World;
        static Bootstrap inst;
        GameObject root;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Auto()
        {
            if (FindObjectOfType<Bootstrap>() == null) new GameObject("Catower").AddComponent<Bootstrap>();
        }

        void Awake() { inst = this; BuildWorld(); }

        public static void Restart()
        {
            if (inst != null) inst.StartCoroutine(inst.Rebuild());
        }

        IEnumerator Rebuild()
        {
            Destroy(root);
            yield return null;
            BuildWorld();
        }

        void BuildWorld()
        {
            Time.timeScale = 1f;
            Enemy.All.Clear(); Tower.All.Clear(); Pickup.All.Clear(); Map.Pads.Clear(); Fx.Floaters.Clear();

            foreach (var c in Camera.allCameras) c.gameObject.SetActive(false);

            root = new GameObject("CatowerWorld");
            World = root.transform;

            // Lumière douce et ambiance pastel
            var sun = new GameObject("Sun");
            sun.transform.SetParent(root.transform, false);
            sun.transform.rotation = Quaternion.Euler(55f, -35f, 0f);
            var light = sun.AddComponent<Light>();
            light.type = LightType.Directional;
            light.color = new Color(1f, 0.96f, 0.9f);
            light.intensity = 1.05f;
            light.shadows = LightShadows.Soft;
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.72f, 0.66f, 0.74f);

            Map.Build(root.transform);

            // Caméra
            var cg = new GameObject("Camera");
            cg.transform.SetParent(root.transform, false);
            cg.tag = "MainCamera";
            var cam = cg.AddComponent<Camera>();
            cg.AddComponent<AudioListener>();
            cam.fieldOfView = 40f;
            cam.nearClipPlane = 0.3f;
            cam.farClipPlane = 200f;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Pal.Sky;
            var rig = cg.AddComponent<CameraRig>();
            rig.cam = cam;

            Sfx.Init(root);

            var gm = new GameObject("Game");
            gm.transform.SetParent(root.transform, false);
            var game = gm.AddComponent<Game>();
            game.rig = rig;

            var hero = HeroController.Create(Database.Mochi, new Vector3(-6f, 0f, 2f), cam);
            game.hero = hero;
            rig.target = hero.transform;
            rig.Snap();

            var bs = gm.AddComponent<BuildSystem>();
            bs.Init(cam);
            gm.AddComponent<Hud>();

            game.Banner("Bienvenue ! Construis un canon (touche 1), puis appuie sur Entrée.", 6f);
        }
    }
}
