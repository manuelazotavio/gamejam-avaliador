package com.gamejamdelas.avaliador.scoring.domain;

import jakarta.persistence.Embeddable;
import java.util.EnumMap;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScoreSheet {

    private int creativityInnovation;
    private int technicalQuality;
    private int themeAdequacy;
    private int gameplayFun;
    private int artSoundOriginality;
    private int inclusionDiversityAccessibility;

    public int get(Criterion criterion) {
        return switch (criterion) {
            case CRIATIVIDADE_INOVACAO -> creativityInnovation;
            case QUALIDADE_TECNICA -> technicalQuality;
            case ADEQUACAO_TEMA_DESAFIO -> themeAdequacy;
            case JOGABILIDADE_DIVERSAO -> gameplayFun;
            case ORIGINALIDADE_ARTE_SOM_DESIGN -> artSoundOriginality;
            case INCLUSAO_DIVERSIDADE_ACESSIBILIDADE -> inclusionDiversityAccessibility;
        };
    }

    public int total() {
        return creativityInnovation
                + technicalQuality
                + themeAdequacy
                + gameplayFun
                + artSoundOriginality
                + inclusionDiversityAccessibility;
    }

    public Map<Criterion, Integer> toMap() {
        Map<Criterion, Integer> map = new EnumMap<>(Criterion.class);
        for (Criterion criterion : Criterion.values()) {
            map.put(criterion, get(criterion));
        }
        return map;
    }
}
