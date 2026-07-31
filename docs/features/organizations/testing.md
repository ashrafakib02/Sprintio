# Organization Module — Test Suite

## Overview

The Organization module has **115 tests** across **4 test files**, covering unit, integration, and API-level testing. All tests use **Vitest** with mock isolation via `vi.mock()` and `vi.clearAllMocks()`.

## Test Files

| File                                                                                   | Type        | Tests | Focus                                                                     |
| -------------------------------------------------------------------------------------- | ----------- | ----- | ------------------------------------------------------------------------- |
| `apps/backend/src/__tests__/unit/modules/organization/organization.service.test.ts`    | Unit        | 49    | Service function logic, authorization, error paths                        |
| `apps/backend/src/__tests__/unit/modules/organization/organization.controller.test.ts` | Unit        | 31    | Controller handler delegation, validation, UUID checks, error propagation |
| `apps/backend/src/__tests__/integration/organization.service.test.ts`                  | Integration | 6     | Multi-step CRUD and member management lifecycles                          |
| `apps/backend/src/__tests__/api/organization.controller.test.ts`                       | API         | 29    | Full request → validation → service → response cycle                      |

## Running Tests

```bash
# All organization tests
pnpm vitest run apps/backend/src/__tests__/unit/modules/organization \
                apps/backend/src/__tests__/integration/organization \
                apps/backend/src/__tests__/api/organization

# All backend tests (includes non-org tests)
pnpm test

# With coverage
pnpm test -- --coverage
```

## Mock Strategy

All tests mock at the **repository boundary** (`@sprintio/db/repositories`) and **response utilities** (`../../utils/response.js`). The service and controller are imported unmocked to test real logic.

### Mock Setup Pattern

```typescript
vi.mock('@sprintio/db/repositories', () => ({
  organizationRepo: {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    // ... all repository methods
  },
}));

const repo = vi.mocked(organizationRepo);
```

### Key Mock Patterns

**Sequential mock calls** (for testing two-role-check flows):

```typescript
let callCount = 0;
repo.getMemberRole.mockImplementation(async () => {
  callCount++;
  return callCount === 1 ? 'admin' : undefined;
});
```

**Mock state isolation** — `vi.clearAllMocks()` between lifecycle steps:

```typescript
// CREATE
repo.findBySlug.mockResolvedValue(undefined);
repo.create.mockResolvedValue(makeOrg());
// ...

// GET — clear to prevent leaked state
vi.clearAllMocks();
repo.findById.mockResolvedValue(makeOrg());
repo.isMember.mockResolvedValue(true);
```

**AsyncHandler error propagation** — errors go to `next(err)`, not rejected promises:

```typescript
const next = createMockNext();
vi.mocked(organizationService.getOrganization).mockRejectedValue(AppError.notFound('Organization'));

await organizationController.getOrganization(req, res as never, next);

expect(next).toHaveBeenCalledWith(expect.any(AppError));
```

## Test Coverage by Function

### Service Layer (49 unit tests)

| Function                   | Tests | Scenarios                                                                                                                              |
| -------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `createOrganization`       | 5     | Success, duplicate slug (409), validation error (400)                                                                                  |
| `getOrganization`          | 3     | Success (member), not found (404), not a member (403)                                                                                  |
| `getUserOrganizations`     | 3     | Active only, include archived, empty result                                                                                            |
| `updateOrganization`       | 8     | Success (owner/admin), not found, not authorized, archived rejection, slug conflict, validation                                        |
| `archiveOrganization`      | 4     | Success, not found, not authorized, already archived                                                                                   |
| `restoreOrganization`      | 3     | Success, not found, not archived                                                                                                       |
| `deleteOrganization`       | 4     | Success (archived), not archived rejection, not found, not owner                                                                       |
| `addOrganizationMember`    | 8     | Success (owner assigns any role), admin assigns member, not authorized, already a member, can't assign owner, can't assign higher role |
| `removeOrganizationMember` | 5     | Success, can't remove owner, self-removal, member not found, not authorized                                                            |
| `getOrganizationMembers`   | 3     | Success, not found, not a member                                                                                                       |
| `getUserOrganizationRole`  | 2     | Success, not a member                                                                                                                  |

### Controller Layer (31 unit tests)

Tests verify:

- HTTP status codes (200, 201, 400)
- Request parameter extraction and UUID validation
- Schema validation delegation
- Service error propagation via `next()`
- Correct argument forwarding to service functions

### Integration Tests (6 tests)

| Lifecycle                       | Steps                                                     |
| ------------------------------- | --------------------------------------------------------- |
| Full CRUD lifecycle             | create → get → update → archive → restore → delete        |
| Member management lifecycle     | add → list → remove member                                |
| Role hierarchy enforcement      | owner assigns any role, member rejected for admin actions |
| Non-member access prevention    | getOrganization rejected, getMembers rejected             |
| Archive-before-delete lifecycle | active org rejected, archived org allowed                 |

### API Tests (29 tests)

Covers all 10 HTTP endpoints with:

- Success responses (200, 201) with correct body structure
- Validation errors (400) with error messages
- Conflict errors (409) via `asyncHandler → next(err)`
- Authorization errors (403) via `asyncHandler → next(err)`
- Not found errors (404) via `asyncHandler → next(err)`
- Invalid UUID param handling

## Test Helpers

Located at `apps/backend/src/__tests__/helpers.ts`:

```typescript
createMockReq({ body?, params?, query?, user? })  // Express Request mock
createMockRes()                                    // Express Response mock (captures status/json)
createMockNext()                                   // Express NextFunction mock (captures errors)
```

## Authorization Test Matrix

| Operation     | Owner | Admin    | Member   | Guest    | Non-Member |
| ------------- | ----- | -------- | -------- | -------- | ---------- |
| Create org    | ✅    | —        | —        | —        | —          |
| Get org       | ✅    | ✅       | ✅       | —        | ❌ (403)   |
| List orgs     | ✅    | ✅       | ✅       | —        | —          |
| Update org    | ✅    | ✅       | ❌ (403) | —        | ❌ (403)   |
| Archive org   | ✅    | ✅       | ❌ (403) | —        | ❌ (403)   |
| Restore org   | ✅    | ✅       | ❌ (403) | —        | ❌ (403)   |
| Delete org    | ✅    | ❌ (403) | ❌ (403) | —        | ❌ (403)   |
| Add member    | ✅    | ✅       | ❌ (403) | ❌ (403) | ❌ (403)   |
| Remove member | ✅    | ✅       | ❌ (403) | —        | —          |
| List members  | ✅    | ✅       | ✅       | —        | ❌ (403)   |

## Edge Cases Covered

1. **Slug collision** — duplicate org name returns 409
2. **Already archived** — archiving an archived org returns 400
3. **Not archived** — restoring/restoring an active org returns 400
4. **Active org delete** — must archive before permanent delete
5. **Self-removal** — owner cannot remove themselves
6. **Owner removal** — only owner can remove another owner
7. **Role escalation** — admin cannot assign owner role
8. **Higher role assignment** — cannot assign role equal to or higher than own
9. **Duplicate membership** — adding existing member returns 409
10. **Non-existent member removal** — returns 404

## Notes

- All tests use `vi.mock()` at the top level (required by Vitest hoisting)
- `mockResolvedValueOnce` is consumed sequentially — use `mockImplementation` with counter for multi-step flows
- The `asyncHandler` wrapper means controller errors go to `next()`, never to rejected promises
- Repository mocks return plain objects matching the `OrganizationRecord` / `OrganizationMemberRecord` shapes
