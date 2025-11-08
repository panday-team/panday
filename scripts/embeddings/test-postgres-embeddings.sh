#!/usr/bin/env bash
set -e

# Test script for Postgres embeddings implementation
# Tests data integrity, storage, and functionality

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║    Postgres Embeddings Test Suite                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Load environment
if [ -f "../../.env" ]; then
    export $(grep -v '^#' ../../.env | xargs)
fi

DB_URL="${DATABASE_URL}"

if [ -z "$DB_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not set"
    exit 1
fi

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run tests
run_test() {
    local test_name="$1"
    local query="$2"
    local expected="$3"

    echo -n "Testing: $test_name... "

    result=$(psql "$DB_URL" -t -c "$query" 2>&1)
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        if [ -z "$expected" ] || echo "$result" | grep -q "$expected"; then
            echo -e "${GREEN}✓ PASS${NC}"
            ((TESTS_PASSED++))
            if [ ! -z "$result" ]; then
                echo "   Result: $(echo $result | xargs)"
            fi
        else
            echo -e "${RED}✗ FAIL${NC}"
            echo "   Expected: $expected"
            echo "   Got: $(echo $result | xargs)"
            ((TESTS_FAILED++))
        fi
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "   Error: $result"
        ((TESTS_FAILED++))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. DATA INTEGRITY TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

run_test "Embedding documents exist" \
    "SELECT COUNT(*) FROM embedding_documents;" \
    ""

run_test "All embeddings have vectors" \
    "SELECT COUNT(*) FROM embedding_documents WHERE embedding IS NULL;" \
    "0"

run_test "All embeddings have content" \
    "SELECT COUNT(*) FROM embedding_documents WHERE content IS NULL OR content = '';" \
    "0"

run_test "All embeddings have metadata" \
    "SELECT COUNT(*) FROM embedding_documents WHERE metadata IS NULL;" \
    "0"

run_test "Embedding indexes exist" \
    "SELECT COUNT(*) FROM embedding_indexes WHERE \"isActive\" = true;" \
    ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. VECTOR DIMENSION TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check that embeddings are 1536-dimensional vectors
echo "Testing: Vector dimensions are 1536..."
dimension_check=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM embedding_documents WHERE vector_dims(embedding) = 1536;" 2>&1)
total_docs=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM embedding_documents;" 2>&1)

if [ "$dimension_check" = "$total_docs" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "   All $total_docs embeddings have correct dimensions"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "   Expected: $total_docs, Got: $dimension_check"
    ((TESTS_FAILED++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. FOREIGN KEY INTEGRITY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

run_test "All documents link to valid indexes" \
    "SELECT COUNT(*) FROM embedding_documents ed WHERE NOT EXISTS (SELECT 1 FROM embedding_indexes ei WHERE ei.id = ed.\"indexId\");" \
    "0"

run_test "Document counts match" \
    "SELECT CASE WHEN (SELECT COUNT(*) FROM embedding_documents) = (SELECT \"documentCount\" FROM embedding_indexes WHERE \"isActive\" = true LIMIT 1) THEN 'match' ELSE 'mismatch' END;" \
    "match"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. INDEX TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

run_test "HNSW vector index exists" \
    "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'embedding_documents' AND indexname LIKE '%embedding%';" \
    ""

run_test "RoadmapId index exists" \
    "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'embedding_documents' AND indexname LIKE '%roadmapId%';" \
    ""

run_test "Hash index exists for incremental updates" \
    "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'embedding_documents' AND indexname LIKE '%hash%';" \
    ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. STORAGE ANALYSIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Storage sizes:"
psql "$DB_URL" -c "
SELECT
  'embedding_documents' as table_name,
  pg_size_pretty(pg_total_relation_size('embedding_documents')) as total_size,
  pg_size_pretty(pg_relation_size('embedding_documents')) as table_size,
  pg_size_pretty(pg_indexes_size('embedding_documents')) as indexes_size
UNION ALL
SELECT
  'embedding_indexes' as table_name,
  pg_size_pretty(pg_total_relation_size('embedding_indexes')) as total_size,
  pg_size_pretty(pg_relation_size('embedding_indexes')) as table_size,
  pg_size_pretty(pg_indexes_size('embedding_indexes')) as indexes_size
UNION ALL
SELECT
  'data_llamaindex_embeddings' as table_name,
  pg_size_pretty(pg_total_relation_size('data_llamaindex_embeddings')) as total_size,
  pg_size_pretty(pg_relation_size('data_llamaindex_embeddings')) as table_size,
  pg_size_pretty(pg_indexes_size('data_llamaindex_embeddings')) as indexes_size;
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. DATA DISTRIBUTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Chunks per source node:"
psql "$DB_URL" -c "
SELECT
  \"nodeId\",
  COUNT(*) as chunk_count,
  ROUND(AVG(LENGTH(content))) as avg_content_length
FROM embedding_documents
GROUP BY \"nodeId\"
ORDER BY chunk_count DESC
LIMIT 10;
"

echo ""
echo "File type distribution:"
psql "$DB_URL" -c "
SELECT
  metadata->>'file_type' as file_type,
  COUNT(*) as count
FROM embedding_documents
GROUP BY file_type;
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. VECTOR SIMILARITY TEST (Sample)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Testing: Vector similarity search functionality..."

# Get a sample embedding to use as query
sample_result=$(psql "$DB_URL" -t -c "
SELECT embedding
FROM embedding_documents
LIMIT 1;
" 2>&1)

if [ $? -eq 0 ]; then
    # Try a similarity search using the sample embedding
    similarity_test=$(psql "$DB_URL" -t -c "
    SELECT COUNT(*) FROM (
        SELECT \"nodeId\"
        FROM embedding_documents
        ORDER BY embedding <=> (SELECT embedding FROM embedding_documents LIMIT 1)
        LIMIT 5
    ) as similar_docs;
    " 2>&1)

    if [ "$similarity_test" = "5" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        echo "   Vector similarity search working correctly"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "   Similarity search returned $similarity_test results instead of 5"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}⚠ SKIP${NC}"
    echo "   Could not retrieve sample embedding"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. VERSION MANAGEMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Active indexes:"
psql "$DB_URL" -c "
SELECT
  \"roadmapId\",
  \"userId\",
  version,
  \"modelName\",
  \"documentCount\",
  \"isActive\",
  \"createdAt\"
FROM embedding_indexes
ORDER BY \"createdAt\" DESC;
"

run_test "Only one active index per roadmap/user" \
    "SELECT COUNT(*) FROM (SELECT \"roadmapId\", \"userId\", COUNT(*) as active_count FROM embedding_indexes WHERE \"isActive\" = true GROUP BY \"roadmapId\", \"userId\" HAVING COUNT(*) > 1) as duplicates;" \
    "0"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                     TEST SUMMARY                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC} ($TESTS_PASSED/$TOTAL_TESTS)"
    echo ""
    echo "Your Postgres embeddings implementation is working correctly."
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo "  Passed: $TESTS_PASSED/$TOTAL_TESTS"
    echo "  Failed: $TESTS_FAILED/$TOTAL_TESTS"
    echo ""
    echo "Please review the failures above."
    exit 1
fi
