package com.gamejamdelas.avaliador.scoring.dto;

import com.gamejamdelas.avaliador.scoring.domain.Criterion;

public record CriterionScoreResponse(
        Criterion criterion,
        String label,
        int maxScore,
        double average
) {

    public static CriterionScoreResponse of(Criterion criterion, double average) {
        return new CriterionScoreResponse(criterion, criterion.getLabel(), criterion.getMaxScore(), average);
    }
}
