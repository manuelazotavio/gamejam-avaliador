package com.gamejamdelas.avaliador.scoring.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.data.Offset.offset;

import com.gamejamdelas.avaliador.scoring.domain.Team;
import com.gamejamdelas.avaliador.scoring.dto.EvaluationRequest;
import com.gamejamdelas.avaliador.scoring.dto.TeamResultResponse;
import com.gamejamdelas.avaliador.scoring.repository.TeamRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ResultServiceTest {

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private EvaluationService evaluationService;

    @Autowired
    private ResultService resultService;

    @Test
    void finalScoreIsTheAverageOfVisitorScoresPerCriterion() {
        Team team = teamRepository.save(Team.builder().name("Pixel Bruxas").gameTitle("Encanto de Bytes").build());

        evaluationService.submit(team.getId(), new EvaluationRequest(10, 10, 15, 10, 10, 15));
        evaluationService.submit(team.getId(), new EvaluationRequest(15, 15, 20, 15, 15, 20));

        TeamResultResponse result = resultService.computeRanking().get(0);

        assertThat(result.finalScore()).isCloseTo(85d, offset(0.001));
        assertThat(result.evaluationCount()).isEqualTo(2);
    }

    @Test
    void tieIsBrokenByCreativityAndInnovationFirst() {
        Team teamB = teamRepository.save(Team.builder().name("Byte Me").gameTitle("Overclock").build());
        Team teamC = teamRepository.save(Team.builder().name("Garotas Glitch").gameTitle("Falha Fatal").build());

        evaluationService.submit(teamB.getId(), new EvaluationRequest(15, 0, 0, 0, 0, 0));
        evaluationService.submit(teamC.getId(), new EvaluationRequest(0, 15, 0, 0, 0, 0));

        List<TeamResultResponse> ranking = resultService.computeRanking();

        assertThat(ranking.get(0).finalScore()).isEqualTo(ranking.get(1).finalScore());
        assertThat(ranking.get(0).teamName()).isEqualTo("Byte Me");
        assertThat(ranking.get(0).rank()).isEqualTo(1);
        assertThat(ranking.get(1).teamName()).isEqualTo("Garotas Glitch");
        assertThat(ranking.get(1).rank()).isEqualTo(2);
    }

    @Test
    void teamWithoutEvaluationsScoresZeroAndRanksLast() {
        Team evaluated = teamRepository.save(Team.builder().name("Rainha do Loop").gameTitle("Ciclo Infinito").build());
        Team notEvaluated = teamRepository.save(Team.builder().name("Sem Votos").gameTitle("Jogo Fantasma").build());

        evaluationService.submit(evaluated.getId(), new EvaluationRequest(1, 0, 0, 0, 0, 0));

        List<TeamResultResponse> ranking = resultService.computeRanking();

        TeamResultResponse last = ranking.get(ranking.size() - 1);
        assertThat(last.teamName()).isEqualTo("Sem Votos");
        assertThat(last.finalScore()).isZero();
        assertThat(last.evaluationCount()).isZero();
    }
}
