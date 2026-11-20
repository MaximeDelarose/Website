using System;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace AshboundTower
{
    /// <summary>État de la partie : préparation → séquence en cours → victoire/défaite, pause, redémarrage.</summary>
    [DefaultExecutionOrder(-200)]
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        public GameBalance balance;
        public int sequenceNumber = 1;

        public GameState State { get; private set; }
        public bool Paused { get; private set; }
        /// <summary>Secondes écoulées depuis le lancement de la séquence (n'avance pas en pause).</summary>
        public float SequenceTime { get; private set; }

        public event Action<GameState> StateChanged;
        public event Action<bool> PauseChanged;

        void Awake()
        {
            Instance = this;
            Time.timeScale = 1f;
            State = GameState.Preparation;
        }

        void OnDestroy()
        {
            if (Instance == this) Instance = null;
            Time.timeScale = 1f;
        }

        void Start()
        {
            if (Economy.Instance != null && balance != null) Economy.Instance.SetGold(balance.startingGold);
            SetState(GameState.Preparation);
        }

        void Update()
        {
            if (Input.GetKeyDown(KeyCode.R)) { Restart(); return; }

            if (Input.GetKeyDown(KeyCode.Escape))
            {
                if (BuildController.Instance != null && BuildController.Instance.CancelActive()) return;
                TogglePause();
            }
            else if (Input.GetKeyDown(KeyCode.P)) TogglePause();

            if (State == GameState.Preparation && !Paused && (Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.Space)))
                StartSequence();

            if (State == GameState.Playing) SequenceTime += Time.deltaTime;
        }

        void SetState(GameState s)
        {
            State = s;
            if (StateChanged != null) StateChanged(s);
        }

        public void StartSequence()
        {
            if (State != GameState.Preparation) return;
            SequenceTime = 0f;
            SetState(GameState.Playing);
            AudioManager.Play("wave", 0.8f);
            if (WaveDirector.Instance != null) WaveDirector.Instance.Begin();
        }

        public void Victory()
        {
            if (State != GameState.Playing) return;
            SetState(GameState.Victory);
            AudioManager.Play("win", 1f);
        }

        public void Defeat()
        {
            if (State != GameState.Playing) return;
            SetState(GameState.Defeat);
            AudioManager.Play("lose", 1f);
        }

        public void TogglePause()
        {
            if (State != GameState.Playing && State != GameState.Preparation) return;
            SetPaused(!Paused);
        }

        public void SetPaused(bool p)
        {
            Paused = p;
            Time.timeScale = p ? 0f : 1f;
            if (PauseChanged != null) PauseChanged(p);
        }

        public void Restart()
        {
            Time.timeScale = 1f;
            SceneManager.LoadScene(SceneManager.GetActiveScene().name);
        }

        public bool Simulating { get { return State == GameState.Playing && !Paused; } }
    }
}
