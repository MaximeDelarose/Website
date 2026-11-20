#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Catower.EditorTools
{
    public static class CatowerMenu
    {
        [MenuItem("Catower/Créer la scène Main")]
        public static void CreateScene()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            new GameObject("Catower").AddComponent<Bootstrap>();
            System.IO.Directory.CreateDirectory("Assets/_Catower/Scenes");
            const string path = "Assets/_Catower/Scenes/Main.unity";
            EditorSceneManager.SaveScene(scene, path);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(path, true) };
            Debug.Log("Scène créée : " + path + ". Appuie sur Play.");
        }
    }
}
#endif
