package com.gamejamdelas.avaliador.scoring.dto;

import com.gamejamdelas.avaliador.scoring.domain.Team;
import java.util.UUID;

public record TeamResponse(
        UUID id,
        String name,
        String gameTitle
) {

    public static TeamResponse from(Team team) {
        return new TeamResponse(team.getId(), team.getName(), team.getGameTitle());
    }
}
