package com.example.examine.config;

import com.example.examine.entity.VerificationRequestEntity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MongoConfigTest {

    @Mock
    private MongoTemplate mongoTemplate;

    @Mock
    private IndexOperations indexOperations;

    @Test
    void initIndexes_createsTtlIndexOnVerificationRequests() {
        when(mongoTemplate.indexOps(VerificationRequestEntity.class)).thenReturn(indexOperations);

        MongoConfig config = new MongoConfig(mongoTemplate);
        config.initIndexes();

        verify(indexOperations).createIndex(any(Index.class));
    }
}
