package com.gamejamdelas.avaliador.scoring.dto;

import com.gamejamdelas.avaliador.scoring.domain.VisitorEvaluation;
import java.time.Instant;
import java.util.UUID;

public record EvaluationResponse(
        UUID id,
        UUID teamId,
        int total,
        Instant createdAt
) {

    public static EvaluationResponse from(VisitorEvaluation evaluation) {
        return new EvaluationResponse(
                evaluation.getId(),
                evaluation.getTeam().getId(),
                evaluation.getScores().total(),
                evaluation.getCreatedAt()
        );
    }
}
