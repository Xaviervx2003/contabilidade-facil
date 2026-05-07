# Baseline EXPLAIN ANALYZE

Gerado em: 2026-05-07T15:25:17.071475+00:00

## Dashboard /sessoes-por-mes

```text
Sort  (cost=7.57..7.69 rows=48 width=80) (actual time=0.162..0.163 rows=2 loops=1)
  Sort Key: (date_trunc('month'::text, criado_em))
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=6
  ->  HashAggregate  (cost=5.15..6.23 rows=48 width=80) (actual time=0.145..0.147 rows=2 loops=1)
        Group Key: date_trunc('month'::text, criado_em)
        Batches: 1  Memory Usage: 24kB
        Buffers: shared hit=3
        ->  Seq Scan on sessoes_estudo s  (cost=0.00..4.56 rows=78 width=24) (actual time=0.009..0.035 rows=78 loops=1)
              Filter: (criado_em >= (now() - '7 mons'::interval))
              Buffers: shared hit=3
Planning:
  Buffers: shared hit=136
Planning Time: 0.302 ms
Execution Time: 0.228 ms
```

## Feedbacks paginados

```text
Limit  (cost=919.43..1072.86 rows=20 width=929) (actual time=0.022..0.023 rows=0 loops=1)
  Buffers: shared hit=9
  ->  Incremental Sort  (cost=919.43..1839.98 rows=120 width=929) (actual time=0.021..0.022 rows=0 loops=1)
        Sort Key: f.resolvido, ((SubPlan 1)) DESC, f.data_criacao DESC
        Presorted Key: f.resolvido
        Full-sort Groups: 1  Sort Method: quicksort  Average Memory: 25kB  Peak Memory: 25kB
        Buffers: shared hit=9
        ->  Nested Loop  (cost=0.43..1835.24 rows=120 width=929) (actual time=0.002..0.003 rows=0 loops=1)
              Buffers: shared hit=1
              ->  Index Scan using idx_feedbacks_resolvido on feedbacks_questoes f  (cost=0.14..45.94 rows=120 width=607) (actual time=0.002..0.002 rows=0 loops=1)
                    Buffers: shared hit=1
              ->  Index Scan using questoes_pkey on questoes q  (cost=0.29..6.74 rows=1 width=318) (never executed)
                    Index Cond: (id = f.questao_id)
              SubPlan 1
                ->  Aggregate  (cost=8.16..8.17 rows=1 width=8) (never executed)
                      ->  Index Scan using idx_feedbacks_questao_id on feedbacks_questoes f2  (cost=0.14..8.16 rows=1 width=0) (never executed)
                            Index Cond: (questao_id = f.questao_id)
                            Filter: (NOT resolvido)
Planning:
  Buffers: shared hit=280
Planning Time: 0.768 ms
Execution Time: 0.060 ms
```

## Busca textual em questoes

```text
Limit  (cost=0.29..1571.68 rows=50 width=4) (actual time=1.292..22.407 rows=50 loops=1)
  Buffers: shared hit=4594
  ->  Index Scan using questoes_pkey on questoes q  (cost=0.29..10780.04 rows=343 width=4) (actual time=1.290..22.399 rows=50 loops=1)
        Filter: ((enunciado ~~* '%contabilidade%'::text) OR ((banca)::text ~~* '%contabilidade%'::text) OR ((orgao)::text ~~* '%contabilidade%'::text) OR ((cargo)::text ~~* '%contabilidade%'::text))
        Rows Removed by Filter: 6373
        Buffers: shared hit=4594
Planning:
  Buffers: shared hit=40
Planning Time: 1.324 ms
Execution Time: 22.431 ms
```

Contexto de amostra: usuario_id=1, matricula='alok.dj.god@gmail'