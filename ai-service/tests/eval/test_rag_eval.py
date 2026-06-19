"""Eval harness đầy đủ (T13) — LLM/DB thật. `uv run pytest -m eval -s`.

Đo: intent accuracy, retrieval recall (KB), faithfulness (LLM-judge), latency.
Một test async chạy tuần tự (1 event loop -> pool asyncpg an toàn). In báo cáo + assert ngưỡng.
So sánh vs Node: ghi nhận định tính trong docs (Node không có eval harness tự động).
"""

import time

import pytest

from app.intent.classifier import IntentClassifier
from app.rag.pipeline import RagPipeline
from app.services.llm import LLMClient
from tests.eval.harness import (
    EVAL_CASES,
    faithfulness_rate,
    judge_faithful,
    retrieval_recall,
    score_intent,
)

pytestmark = pytest.mark.eval


async def test_full_eval():
    classifier = IntentClassifier()
    pipeline = RagPipeline()
    llm = LLMClient()

    # 1) Intent accuracy + latency phân loại
    intent_results: list[tuple[str, str]] = []
    intent_latencies: list[float] = []
    for case in EVAL_CASES:
        t0 = time.monotonic()
        got = (await classifier.classify(case["q"], use_cache=False))["intent"]
        intent_latencies.append((time.monotonic() - t0) * 1000)
        intent_results.append((case["intent"], got))
    intent_acc = score_intent(intent_results)

    # 2) Retrieval recall + 3) faithfulness trên câu KB
    kb_cases = [c for c in EVAL_CASES if c["kb"]]
    has_ctx_flags: list[bool] = []
    faithful_flags: list[bool] = []
    answer_latencies: list[float] = []
    for case in kb_cases:
        t0 = time.monotonic()
        # threshold thực tế (0.3): chỉ nhận chunk đủ liên quan -> faithfulness đo đúng
        res = await pipeline.answer(case["q"], top_k=5, threshold=0.3, max_tokens=400)
        answer_latencies.append((time.monotonic() - t0) * 1000)
        has_ctx_flags.append(res.has_context)
        if res.has_context:
            faithful_flags.append(await judge_faithful(llm, res.context, res.reply))

    recall = retrieval_recall(has_ctx_flags)
    faithful = faithfulness_rate(faithful_flags)

    def avg(xs):
        return sum(xs) / len(xs) if xs else 0.0

    wrong = [
        (c["q"], exp, got)
        for c, (exp, got) in zip(EVAL_CASES, intent_results, strict=True)
        if exp != got
    ]
    print("\n========== RAG EVAL REPORT ==========")
    print(f"Intent accuracy : {intent_acc:.0%} ({len(EVAL_CASES)} cases)")
    if wrong:
        print(f"  sai: {wrong}")
    print(f"Retrieval recall: {recall:.0%} ({len(kb_cases)} câu KB)")
    print(f"Faithfulness    : {faithful:.0%} ({len(faithful_flags)} câu đánh giá)")
    print(f"Latency intent  : {avg(intent_latencies):.0f} ms (avg)")
    print(f"Latency answer  : {avg(answer_latencies):.0f} ms (avg)")
    print("=====================================")

    assert intent_acc >= 0.85, f"intent accuracy {intent_acc:.0%} < 85%; sai: {wrong}"
    assert recall >= 0.5, f"retrieval recall {recall:.0%} < 50%"
    if faithful_flags:  # chỉ assert khi có câu grounded để đánh giá
        assert faithful >= 0.8, f"faithfulness {faithful:.0%} < 80%"
