# A6 Admin Withdrawals — short plan

Steps (commit after each):
1. shape.ts, filters.ts, messages.ts, api.ts (lib/withdrawals/)
2. queries/withdrawals.ts + keys.ts update
3. Route handlers: GET /api/withdrawals, /api/withdrawals/[id], /api/withdrawals/batches, /api/withdrawals/batches/[id]
4. nav.ts + permissions.ts (enable nav, add withdrawals.override)
5. Server actions: approve/reject/bulkApprove/bulkReject/resolveReview/createBatch/pay/retry/markFailed
6. Components: WithdrawalStatusBadge, WithdrawalsTable (list + row selection + bulk), WithdrawalFilterForm
7. /withdrawals page.tsx
8. Components: WithdrawalDetail, PayoutAttempts, PayoutEvents, WithdrawalActions (dialogs)
9. /withdrawals/[id] page.tsx
10. Components: BatchesTable, BatchDetail
11. /withdrawals/batches page.tsx + /withdrawals/batches/[id] page.tsx
12. Tests: route handlers, actions, queries, nav/permissions
13. Merge main; typecheck/lint/test/build
