package com.gamejamdelas.avaliador.scoring.domain;

public final class ScoreLimits {

    public static final int CREATIVITY_INNOVATION_MAX = 15;
    public static final int TECHNICAL_QUALITY_MAX = 15;
    public static final int THEME_ADEQUACY_MAX = 20;
    public static final int GAMEPLAY_FUN_MAX = 15;
    public static final int ART_SOUND_ORIGINALITY_MAX = 15;
    public static final int INCLUSION_DIVERSITY_ACCESSIBILITY_MAX = 20;

    public static final int TOTAL_MAX = CREATIVITY_INNOVATION_MAX
            + TECHNICAL_QUALITY_MAX
            + THEME_ADEQUACY_MAX
            + GAMEPLAY_FUN_MAX
            + ART_SOUND_ORIGINALITY_MAX
            + INCLUSION_DIVERSITY_ACCESSIBILITY_MAX;

    private ScoreLimits() {
    }
}
