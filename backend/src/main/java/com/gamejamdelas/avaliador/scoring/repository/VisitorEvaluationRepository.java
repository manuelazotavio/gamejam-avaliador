package com.gamejamdelas.avaliador.scoring.repository;

import com.gamejamdelas.avaliador.scoring.domain.VisitorEvaluation;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VisitorEvaluationRepository extends JpaRepository<VisitorEvaluation, UUID> {

    List<VisitorEvaluation> findByTeamIdAndValidTrue(UUID teamId);

    long countByTeamIdAndValidTrue(UUID teamId);
}
