/**
 * Backward-compatible re-export.
 * All logic has been moved to services/rag/ — import from there for new code.
 */
export {
    multiStageRetrieval,
    semanticClustering,
    multiHopReasoning,
    fuseContext,
    adaptiveRetrieval,
    rerankContext,
    rerankWithCohere
} from './rag/index.js';
