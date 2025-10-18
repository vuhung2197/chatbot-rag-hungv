-- Vector Database Optimization Scripts
-- Tối ưu hóa database cho large-scale vector search

USE chatbot;

-- 1. Tạo vector index cho similarity search
-- Sử dụng ivfflat index cho vector similarity
ALTER TABLE knowledge_chunks 
ADD INDEX idx_embedding_vector USING ivfflat (embedding) 
WITH (lists = 100);

-- 2. Tạo composite index cho performance
CREATE INDEX idx_chunks_parent_created ON knowledge_chunks(parent_id, created_at);
CREATE INDEX idx_chunks_token_count ON knowledge_chunks(token_count);

-- 3. Tối ưu hóa table structure
-- Thêm columns cho vector metadata
ALTER TABLE knowledge_chunks 
ADD COLUMN vector_norm FLOAT GENERATED ALWAYS AS (
  SQRT(JSON_EXTRACT(embedding, '$[0]') * JSON_EXTRACT(embedding, '$[0]') + 
        JSON_EXTRACT(embedding, '$[1]') * JSON_EXTRACT(embedding, '$[1]') + 
        JSON_EXTRACT(embedding, '$[2]') * JSON_EXTRACT(embedding, '$[2]'))
) STORED;

-- 4. Tạo view cho vector search optimization
CREATE VIEW vector_search_view AS
SELECT 
  id,
  parent_id,
  title,
  content,
  embedding,
  token_count,
  vector_norm,
  created_at
FROM knowledge_chunks
WHERE embedding IS NOT NULL;

-- 5. Tạo stored procedure cho vector similarity search
DELIMITER //

CREATE PROCEDURE SearchSimilarVectors(
  IN query_embedding JSON,
  IN similarity_threshold FLOAT,
  IN result_limit INT
)
BEGIN
  SELECT 
    id,
    title,
    content,
    embedding,
    (1 - (embedding <-> query_embedding)) as similarity_score
  FROM knowledge_chunks 
  WHERE (1 - (embedding <-> query_embedding)) > similarity_threshold
  ORDER BY similarity_score DESC
  LIMIT result_limit;
END //

DELIMITER ;

-- 6. Tạo function cho cosine similarity calculation
DELIMITER //

CREATE FUNCTION CosineSimilarity(vec1 JSON, vec2 JSON) 
RETURNS FLOAT
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE dot_product FLOAT DEFAULT 0;
  DECLARE norm1 FLOAT DEFAULT 0;
  DECLARE norm2 FLOAT DEFAULT 0;
  DECLARE i INT DEFAULT 0;
  DECLARE vec_length INT DEFAULT JSON_LENGTH(vec1);
  DECLARE val1 FLOAT;
  DECLARE val2 FLOAT;
  
  WHILE i < vec_length DO
    SET val1 = JSON_EXTRACT(vec1, CONCAT('$[', i, ']'));
    SET val2 = JSON_EXTRACT(vec2, CONCAT('$[', i, ']'));
    
    SET dot_product = dot_product + (val1 * val2);
    SET norm1 = norm1 + (val1 * val1);
    SET norm2 = norm2 + (val2 * val2);
    
    SET i = i + 1;
  END WHILE;
  
  IF norm1 = 0 OR norm2 = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN dot_product / (SQRT(norm1) * SQRT(norm2));
END //

DELIMITER ;

-- 7. Tạo trigger để tự động update vector metadata
DELIMITER //

CREATE TRIGGER update_vector_metadata
AFTER INSERT ON knowledge_chunks
FOR EACH ROW
BEGIN
  UPDATE knowledge_chunks 
  SET vector_norm = SQRT(
    JSON_EXTRACT(embedding, '$[0]') * JSON_EXTRACT(embedding, '$[0]') + 
    JSON_EXTRACT(embedding, '$[1]') * JSON_EXTRACT(embedding, '$[1]') + 
    JSON_EXTRACT(embedding, '$[2]') * JSON_EXTRACT(embedding, '$[2]')
  )
  WHERE id = NEW.id;
END //

DELIMITER ;

-- 8. Tạo index cho full-text search kết hợp
ALTER TABLE knowledge_chunks 
ADD FULLTEXT(title, content);

-- 9. Tạo table cho vector search cache
CREATE TABLE IF NOT EXISTS vector_search_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  query_hash VARCHAR(64) NOT NULL UNIQUE,
  query_embedding JSON NOT NULL,
  results JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 1 HOUR),
  INDEX idx_query_hash (query_hash),
  INDEX idx_expires_at (expires_at)
);

-- 10. Cleanup procedure cho cache
DELIMITER //

CREATE PROCEDURE CleanupVectorCache()
BEGIN
  DELETE FROM vector_search_cache 
  WHERE expires_at < NOW();
END //

DELIMITER ;

-- 11. Tạo event scheduler để tự động cleanup cache
SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS cleanup_vector_cache
ON SCHEDULE EVERY 1 HOUR
DO
  CALL CleanupVectorCache();

-- 12. Performance monitoring queries
-- Query để check vector search performance
SELECT 
  COUNT(*) as total_vectors,
  AVG(JSON_LENGTH(embedding)) as avg_dimension,
  MAX(created_at) as last_updated,
  MIN(created_at) as first_created
FROM knowledge_chunks;

-- Query để check index usage
SHOW INDEX FROM knowledge_chunks;

-- Query để check cache hit rate
SELECT 
  COUNT(*) as total_cache_entries,
  COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_cache_entries
FROM vector_search_cache;
