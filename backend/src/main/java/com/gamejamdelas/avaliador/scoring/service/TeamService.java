package com.gamejamdelas.avaliador.scoring.service;

import com.gamejamdelas.avaliador.scoring.domain.Team;
import com.gamejamdelas.avaliador.scoring.dto.TeamRequest;
import com.gamejamdelas.avaliador.scoring.error.TeamNotFoundException;
import com.gamejamdelas.avaliador.scoring.repository.TeamRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;

    @Transactional(readOnly = true)
    public List<Team> list() {
        return teamRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Team get(UUID id) {
        return teamRepository.findById(id).orElseThrow(() -> new TeamNotFoundException(id));
    }

    @Transactional
    public Team create(TeamRequest request) {
        Team team = Team.builder()
                .name(request.name())
                .gameTitle(request.gameTitle())
                .build();
        return teamRepository.save(team);
    }

    @Transactional
    public Team update(UUID id, TeamRequest request) {
        Team team = get(id);
        team.setName(request.name());
        team.setGameTitle(request.gameTitle());
        return teamRepository.save(team);
    }

    @Transactional
    public void delete(UUID id) {
        if (!teamRepository.existsById(id)) {
            throw new TeamNotFoundException(id);
        }
        teamRepository.deleteById(id);
    }
}
