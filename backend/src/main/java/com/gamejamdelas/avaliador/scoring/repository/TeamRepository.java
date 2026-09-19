package com.gamejamdelas.avaliador.scoring.repository;

import com.gamejamdelas.avaliador.scoring.domain.Team;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamRepository extends JpaRepository<Team, UUID> {
}
