package com.gamejamdelas.avaliador.scoring.config;

import com.gamejamdelas.avaliador.scoring.domain.Team;
import com.gamejamdelas.avaliador.scoring.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!test")
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final TeamRepository teamRepository;

    @Override
    public void run(String... args) {
        if (teamRepository.count() > 0) {
            return;
        }
        teamRepository.save(Team.builder().name("Pixel Bruxas").gameTitle("Encanto de Bytes").build());
        teamRepository.save(Team.builder().name("Byte Me").gameTitle("Overclock").build());
        teamRepository.save(Team.builder().name("Garotas Glitch").gameTitle("Falha Fatal").build());
        teamRepository.save(Team.builder().name("Rainha do Loop").gameTitle("Ciclo Infinito").build());
    }
}
