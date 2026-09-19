package com.gamejamdelas.avaliador.scoring.dto;

import jakarta.validation.constraints.NotBlank;

public record TeamRequest(
        @NotBlank String name,
        @NotBlank String gameTitle
) {
}
