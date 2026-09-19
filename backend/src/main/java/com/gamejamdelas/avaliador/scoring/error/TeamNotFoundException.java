package com.gamejamdelas.avaliador.scoring.error;

import java.util.UUID;

public class TeamNotFoundException extends RuntimeException {

    public TeamNotFoundException(UUID teamId) {
        super("Time não encontrado: " + teamId);
    }
}
