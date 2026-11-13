package com.example.examine.service;

import com.example.examine.entity.CounterEntity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.time.Year;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StudentCodeServiceTest {

    @Mock
    private MongoTemplate mongoTemplate;

    @InjectMocks
    private StudentCodeService studentCodeService;

    @Test
    void generate_returnsFormattedSequence() {
        CounterEntity counter = CounterEntity.builder().key("student_code").seq(5L).build();
        when(mongoTemplate.findAndModify(
                any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(CounterEntity.class)))
                .thenReturn(counter);

        String code = studentCodeService.generate();

        assertThat(code).isEqualTo("STU-" + Year.now().getValue() + "-5");
    }

    @Test
    void generate_whenCounterIsNull_fallsBackToOne() {
        when(mongoTemplate.findAndModify(
                any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(CounterEntity.class)))
                .thenReturn(null);

        String code = studentCodeService.generate();

        assertThat(code).isEqualTo("STU-" + Year.now().getValue() + "-1");
    }
}
