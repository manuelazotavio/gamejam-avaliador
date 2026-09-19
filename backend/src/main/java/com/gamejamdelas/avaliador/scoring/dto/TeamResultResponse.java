package com.gamejamdelas.avaliador.scoring.dto;

import java.util.List;
import java.util.UUID;

public record TeamResultResponse(
        int rank,
        UUID teamId,
        String teamName,
        String gameTitle,
        double finalScore,
        int evaluationCount,
        List<CriterionScoreResponse> criterionScores
) {
}
