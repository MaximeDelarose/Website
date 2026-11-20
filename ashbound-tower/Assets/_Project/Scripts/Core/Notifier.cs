using System;
using UnityEngine;

namespace AshboundTower
{
    /// <summary>Événements globaux légers (messages à l'écran, ennemis tués).
    /// Les abonnés doivent toujours se désabonner dans OnDestroy.</summary>
    public static class Notifier
    {
        public static event Action<string, Color> Toast;
        public static event Action<Enemy> EnemyKilled;
        public static int KillCount { get; private set; }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        static void ResetStatics()
        {
            Toast = null; EnemyKilled = null; KillCount = 0;
        }

        public static void ShowToast(string message, Color color)
        {
            if (Toast != null) Toast(message, color);
        }

        public static void ReportKill(Enemy e)
        {
            KillCount++;
            if (EnemyKilled != null) EnemyKilled(e);
        }
    }
}
