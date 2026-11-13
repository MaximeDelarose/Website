namespace AshboundTower
{
    /// <summary>Les six éléments du Google Doc (« à la Wakfu »). Chaque héros en possède 3.
    /// Neutre = tourelle commune sans élément. Pas encore exploité par le gameplay (étape 5+).</summary>
    public enum Element { Neutre, Feu, Eau, Terre, Air, Lumiere, Tenebre }

    public enum EnemyKind { Standard, Rapide, Elite, MiniBoss, Boss }

    /// <summary>Familles de tourelles. Les trois premières sont celles de l'Épéiste électrique,
    /// les suivantes celles d'Églantyne (prévues au Google Doc, non implémentées).</summary>
    public enum TowerFamily
    {
        OrbeFoudroyant, RelaisElectrique, TourelleUltimeEpeiste,
        PiegeDeRonce, ArbreAPoupees, ArbreMonde
    }

    public enum GameState { Preparation, Playing, Victory, Defeat }
}
