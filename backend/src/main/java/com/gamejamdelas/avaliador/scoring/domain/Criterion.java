package com.gamejamdelas.avaliador.scoring.domain;

import lombok.Getter;

@Getter
public enum Criterion {

    CRIATIVIDADE_INOVACAO("Criatividade e inovação", ScoreLimits.CREATIVITY_INNOVATION_MAX, 1),
    QUALIDADE_TECNICA("Qualidade técnica", ScoreLimits.TECHNICAL_QUALITY_MAX, 2),
    ADEQUACAO_TEMA_DESAFIO("Adequação ao tema e ao desafio", ScoreLimits.THEME_ADEQUACY_MAX, 3),
    INCLUSAO_DIVERSIDADE_ACESSIBILIDADE("Inclusão, diversidade e acessibilidade", ScoreLimits.INCLUSION_DIVERSITY_ACCESSIBILITY_MAX, 4),
    JOGABILIDADE_DIVERSAO("Jogabilidade e diversão", ScoreLimits.GAMEPLAY_FUN_MAX, 5),
    ORIGINALIDADE_ARTE_SOM_DESIGN("Originalidade na arte, som e design", ScoreLimits.ART_SOUND_ORIGINALITY_MAX, 6);

    private final String label;
    private final int maxScore;
    private final int tieBreakOrder;

    Criterion(String label, int maxScore, int tieBreakOrder) {
        this.label = label;
        this.maxScore = maxScore;
        this.tieBreakOrder = tieBreakOrder;
    }

    public static Criterion[] inTieBreakOrder() {
        return java.util.Arrays.stream(values())
                .sorted(java.util.Comparator.comparingInt(Criterion::getTieBreakOrder))
                .toArray(Criterion[]::new);
    }
}
