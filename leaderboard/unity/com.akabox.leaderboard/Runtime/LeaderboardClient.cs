using System;
using System.Collections;
using System.Globalization;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace AkaBox.Leaderboard
{
    /// <summary>
    /// Client du classement. Les méthodes renvoient des coroutines :
    /// <code>
    /// var client = new LeaderboardClient(config);
    /// StartCoroutine(client.Submit("Maxime", 1234, r => Debug.Log(r.rank), e => Debug.LogWarning(e)));
    /// StartCoroutine(client.GetTop(10, rows => ..., e => ...));
    /// </code>
    /// </summary>
    public sealed class LeaderboardClient
    {
        public const int MaxLimit = 100;

        private readonly LeaderboardConfig _config;

        public LeaderboardClient(LeaderboardConfig config)
        {
            _config = config;
        }

        /// <summary>Récupère le classement (meilleur score par joueur), du 1er au <paramref name="limit"/>-ième.</summary>
        public IEnumerator GetTop(int limit, Action<LeaderboardEntry[]> onSuccess, Action<LeaderboardError> onError = null)
        {
            if (!CheckConfig(onError)) yield break;
            limit = Mathf.Clamp(limit, 1, MaxLimit);
            string body = "{\"p_game\":" + Json(_config.gameId) + ",\"p_limit\":" + limit.ToString(CultureInfo.InvariantCulture) + "}";

            yield return Post("lb_top", body, text =>
            {
                EntryList list = JsonUtility.FromJson<EntryList>("{\"items\":" + (string.IsNullOrEmpty(text) ? "[]" : text) + "}");
                onSuccess?.Invoke(list != null && list.items != null ? list.items : new LeaderboardEntry[0]);
            }, onError);
        }

        /// <summary>
        /// Envoie un score. <paramref name="metaJson"/> est optionnel : un objet JSON libre
        /// (ex : "{\"level\":3,\"version\":\"2.0\"}").
        /// </summary>
        public IEnumerator Submit(string player, double score, Action<SubmitResult> onSuccess,
                                  Action<LeaderboardError> onError = null, string metaJson = null)
        {
            if (!CheckConfig(onError)) yield break;
            if (double.IsNaN(score) || double.IsInfinity(score))
            {
                onError?.Invoke(new LeaderboardError(LeaderboardErrorCode.InvalidScore, "Score invalide."));
                yield break;
            }

            string meta = string.IsNullOrWhiteSpace(metaJson) ? "{}" : metaJson.Trim();
            string body = "{\"p_game\":" + Json(_config.gameId) +
                          ",\"p_player\":" + Json(player ?? "") +
                          ",\"p_score\":" + score.ToString("R", CultureInfo.InvariantCulture) +
                          ",\"p_meta\":" + meta + "}";

            yield return Post("lb_submit", body, text =>
            {
                onSuccess?.Invoke(JsonUtility.FromJson<SubmitResult>(text));
            }, onError);
        }

        // ------------------------------------------------------------------

        private bool CheckConfig(Action<LeaderboardError> onError)
        {
            if (_config != null && _config.IsValid) return true;
            onError?.Invoke(new LeaderboardError(LeaderboardErrorCode.NotConfigured,
                "LeaderboardConfig incomplet (projectUrl, publicKey, gameId)."));
            return false;
        }

        private IEnumerator Post(string function, string json, Action<string> onSuccess, Action<LeaderboardError> onError)
        {
            string url = _config.projectUrl.Trim().TrimEnd('/') + "/rest/v1/rpc/" + function;
            string key = _config.publicKey.Trim();

            using (var request = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST))
            {
                request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                request.SetRequestHeader("apikey", key);
                // Ancienne clé « anon » (JWT) : il faut aussi l'en-tête Authorization.
                if (!key.StartsWith("sb_", StringComparison.Ordinal))
                    request.SetRequestHeader("Authorization", "Bearer " + key);
#if !UNITY_WEBGL || UNITY_EDITOR
                request.timeout = Mathf.Max(1, _config.timeoutSeconds);
#endif
                yield return request.SendWebRequest();

                string text = request.downloadHandler != null ? request.downloadHandler.text : "";

                if (request.result == UnityWebRequest.Result.Success)
                {
                    try { onSuccess(text); }
                    catch (Exception e)
                    {
                        onError?.Invoke(new LeaderboardError(LeaderboardErrorCode.Server, "Réponse illisible : " + e.Message, request.responseCode));
                    }
                    yield break;
                }

                if (request.result == UnityWebRequest.Result.ConnectionError || request.responseCode == 0)
                {
                    onError?.Invoke(new LeaderboardError(LeaderboardErrorCode.Network, request.error, request.responseCode));
                    yield break;
                }

                onError?.Invoke(ParseError(text, request.responseCode, request.error));
            }
        }

        private static LeaderboardError ParseError(string text, long status, string fallback)
        {
            string message = null;
            try { message = JsonUtility.FromJson<ErrorBody>(text)?.message; } catch { /* pas du JSON */ }

            switch (message)
            {
                case "unknown_game":   return new LeaderboardError(LeaderboardErrorCode.UnknownGame, "Ce jeu n'existe pas dans lb_games (ou est désactivé).", status);
                case "invalid_player": return new LeaderboardError(LeaderboardErrorCode.InvalidPlayer, "Pseudo invalide : 2 à 20 caractères (lettres, chiffres, espace, _ - .).", status);
                case "invalid_score":  return new LeaderboardError(LeaderboardErrorCode.InvalidScore, "Score hors des bornes autorisées pour ce jeu.", status);
                case "rate_limited":   return new LeaderboardError(LeaderboardErrorCode.RateLimited, "Trop d'envois, réessaie plus tard.", status);
                default:               return new LeaderboardError(LeaderboardErrorCode.Server, message ?? fallback ?? ("HTTP " + status), status);
            }
        }

        /// <summary>Chaîne C# → littéral JSON.</summary>
        private static string Json(string s)
        {
            var sb = new StringBuilder(s.Length + 2);
            sb.Append('"');
            foreach (char c in s)
            {
                switch (c)
                {
                    case '"': sb.Append("\\\""); break;
                    case '\\': sb.Append("\\\\"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (c < 0x20) sb.Append("\\u").Append(((int)c).ToString("x4"));
                        else sb.Append(c);
                        break;
                }
            }
            sb.Append('"');
            return sb.ToString();
        }
    }
}
