package com.gamejamdelas.avaliador.scoring.web;

import com.gamejamdelas.avaliador.scoring.dto.EvaluationRequest;
import com.gamejamdelas.avaliador.scoring.dto.EvaluationResponse;
import com.gamejamdelas.avaliador.scoring.service.EvaluationService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teams/{teamId}/evaluations")
@RequiredArgsConstructor
public class EvaluationController {

    private final EvaluationService evaluationService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EvaluationResponse submit(@PathVariable UUID teamId, @Valid @RequestBody EvaluationRequest request) {
        return EvaluationResponse.from(evaluationService.submit(teamId, request));
    }
}
