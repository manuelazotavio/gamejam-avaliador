package com.gamejamdelas.avaliador.scoring.service;

import com.gamejamdelas.avaliador.scoring.domain.Team;
import com.gamejamdelas.avaliador.scoring.domain.VisitorEvaluation;
import com.gamejamdelas.avaliador.scoring.dto.EvaluationRequest;
import com.gamejamdelas.avaliador.scoring.error.TeamNotFoundException;
import com.gamejamdelas.avaliador.scoring.repository.TeamRepository;
import com.gamejamdelas.avaliador.scoring.repository.VisitorEvaluationRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EvaluationService {

    private final TeamRepository teamRepository;
    private final VisitorEvaluationRepository evaluationRepository;

    @Transactional
    public VisitorEvaluation submit(UUID teamId, EvaluationRequest request) {
        Team team = teamRepository.findById(teamId).orElseThrow(() -> new TeamNotFoundException(teamId));
        VisitorEvaluation evaluation = VisitorEvaluation.builder()
                .team(team)
                .scores(request.toScoreSheet())
                .build();
        return evaluationRepository.save(evaluation);
    }
}
