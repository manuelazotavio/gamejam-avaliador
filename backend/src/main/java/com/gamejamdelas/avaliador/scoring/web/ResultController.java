package com.gamejamdelas.avaliador.scoring.web;

import com.gamejamdelas.avaliador.scoring.dto.TeamResultResponse;
import com.gamejamdelas.avaliador.scoring.service.ResultService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/results")
@RequiredArgsConstructor
public class ResultController {

    private final ResultService resultService;

    @GetMapping
    public List<TeamResultResponse> results() {
        return resultService.computeRanking();
    }
}
