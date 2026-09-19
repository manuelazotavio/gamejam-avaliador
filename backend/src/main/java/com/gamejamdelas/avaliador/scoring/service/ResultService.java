package com.gamejamdelas.avaliador.scoring.service;

import com.gamejamdelas.avaliador.scoring.domain.Criterion;
import com.gamejamdelas.avaliador.scoring.domain.Team;
import com.gamejamdelas.avaliador.scoring.domain.VisitorEvaluation;
import com.gamejamdelas.avaliador.scoring.dto.CriterionScoreResponse;
import com.gamejamdelas.avaliador.scoring.dto.TeamResultResponse;
import com.gamejamdelas.avaliador.scoring.repository.TeamRepository;
import com.gamejamdelas.avaliador.scoring.repository.VisitorEvaluationRepository;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ResultService {

    private final TeamRepository teamRepository;
    private final VisitorEvaluationRepository evaluationRepository;

    @Transactional(readOnly = true)
    public List<TeamResultResponse> computeRanking() {
        List<TeamScoreDraft> drafts = teamRepository.findAll().stream()
                .map(this::computeDraft)
                .toList();

        List<TeamScoreDraft> ranked = drafts.stream()
                .sorted(rankingComparator())
                .toList();

        List<TeamResultResponse> results = new ArrayList<>(ranked.size());
        for (int i = 0; i < ranked.size(); i++) {
            results.add(toResponse(ranked.get(i), i + 1));
        }
        return results;
    }

    private Comparator<TeamScoreDraft> rankingComparator() {
        Comparator<TeamScoreDraft> comparator = Comparator.comparingDouble(TeamScoreDraft::finalScore).reversed();
        for (Criterion criterion : Criterion.inTieBreakOrder()) {
            comparator = comparator.thenComparing(
                    Comparator.comparingDouble((TeamScoreDraft draft) -> draft.criterionAverages().get(criterion)).reversed()
            );
        }
        return comparator.thenComparing(draft -> draft.team().getName(), String.CASE_INSENSITIVE_ORDER);
    }

    private TeamResultResponse toResponse(TeamScoreDraft draft, int rank) {
        List<CriterionScoreResponse> criterionScores = Arrays.stream(Criterion.values())
                .map(criterion -> CriterionScoreResponse.of(criterion, draft.criterionAverages().get(criterion)))
                .toList();
        return new TeamResultResponse(
                rank,
                draft.team().getId(),
                draft.team().getName(),
                draft.team().getGameTitle(),
                draft.finalScore(),
                draft.evaluationCount(),
                criterionScores
        );
    }

    private TeamScoreDraft computeDraft(Team team) {
        List<VisitorEvaluation> evaluations = evaluationRepository.findByTeamIdAndValidTrue(team.getId());
        List<Map<Criterion, Double>> validEvaluations = buildValidEvaluations(evaluations);

        Map<Criterion, Double> criterionAverages = new EnumMap<>(Criterion.class);
        for (Criterion criterion : Criterion.values()) {
            criterionAverages.put(criterion, average(validEvaluations, criterion));
        }

        double finalScore = validEvaluations.stream()
                .mapToDouble(this::sumOfCriteria)
                .average()
                .orElse(0d);

        return new TeamScoreDraft(team, finalScore, criterionAverages, evaluations.size());
    }

    private List<Map<Criterion, Double>> buildValidEvaluations(List<VisitorEvaluation> evaluations) {
        if (evaluations.isEmpty()) {
            return List.of();
        }
        Map<Criterion, Double> visitorAggregate = new EnumMap<>(Criterion.class);
        for (Criterion criterion : Criterion.values()) {
            double average = evaluations.stream()
                    .mapToInt(evaluation -> evaluation.getScores().get(criterion))
                    .average()
                    .orElse(0d);
            visitorAggregate.put(criterion, average);
        }
        return List.of(visitorAggregate);
    }

    private double average(List<Map<Criterion, Double>> evaluations, Criterion criterion) {
        return evaluations.stream()
                .mapToDouble(evaluation -> evaluation.get(criterion))
                .average()
                .orElse(0d);
    }

    private double sumOfCriteria(Map<Criterion, Double> evaluation) {
        return evaluation.values().stream().mapToDouble(Double::doubleValue).sum();
    }

    private record TeamScoreDraft(
            Team team,
            double finalScore,
            Map<Criterion, Double> criterionAverages,
            int evaluationCount
    ) {
    }
}
