package com.gamejamdelas.avaliador.scoring.dto;

import com.gamejamdelas.avaliador.scoring.domain.ScoreLimits;
import com.gamejamdelas.avaliador.scoring.domain.ScoreSheet;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record EvaluationRequest(
        @Min(0) @Max(ScoreLimits.CREATIVITY_INNOVATION_MAX) int creativityInnovation,
        @Min(0) @Max(ScoreLimits.TECHNICAL_QUALITY_MAX) int technicalQuality,
        @Min(0) @Max(ScoreLimits.THEME_ADEQUACY_MAX) int themeAdequacy,
        @Min(0) @Max(ScoreLimits.GAMEPLAY_FUN_MAX) int gameplayFun,
        @Min(0) @Max(ScoreLimits.ART_SOUND_ORIGINALITY_MAX) int artSoundOriginality,
        @Min(0) @Max(ScoreLimits.INCLUSION_DIVERSITY_ACCESSIBILITY_MAX) int inclusionDiversityAccessibility
) {

    public ScoreSheet toScoreSheet() {
        return ScoreSheet.builder()
                .creativityInnovation(creativityInnovation)
                .technicalQuality(technicalQuality)
                .themeAdequacy(themeAdequacy)
                .gameplayFun(gameplayFun)
                .artSoundOriginality(artSoundOriginality)
                .inclusionDiversityAccessibility(inclusionDiversityAccessibility)
                .build();
    }
}
