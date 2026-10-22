# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default Deny**: All unmatched paths in Firestore are strictly denied (`allow read, write: if false;`).
2. **Verified Authentication**: Every write operation requires an authenticated user with a verified email (`request.auth != null && request.auth.token.email_verified == true`).
3. **Path ID Hardening**: All single-document target operations (`get`, `create`, `update`, `delete`) validate document IDs using `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
4. **User Profile Isolation & RBAC Integrity**:
   - Users can only read/create/update their own `/users/{userId}` document (`request.auth.uid == userId`), or an admin (`isAdmin()`) can read/manage.
   - Self-assigned privilege escalation is blocked: non-admin users can only create a profile with `role == 'CLIENT'` and cannot modify `role`, `uid`, or `createdAt` on update.
5. **Loan Application Ownership & Terminal State Locking**:
   - An application in `/applications/{applicationId}` must have `ownerUid == request.auth.uid` on creation and initial `status == 'PENDING_REVIEW'`.
   - Terminal statuses (`CANCELLED`, `DISBURSED`, `REJECTED`) are locked against unauthorized client transitions. Once `status` is `CANCELLED` or `DISBURSED`, non-admin users cannot mutate the application.
   - `allow list` on `/applications` strictly enforces `resource.data.ownerUid == request.auth.uid || isAdmin()` so no blanket client-delegated list queries are possible.
6. **Temporal Integrity**: `createdAt == request.time` on creation and `updatedAt == request.time` on updates.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection on User Create**: `{ uid: "u1", name: "Alice", role: "CLIENT", branch: "Chennai", designation: "Borrower", createdAt: SERVER_TIME, updatedAt: SERVER_TIME, isSuperAdmin: true }` -> `PERMISSION_DENIED` (`hasOnly` check).
2. **Self-Assigned Admin Role on User Create**: `{ uid: "u1", name: "Alice", role: "MANAGER", branch: "Chennai", designation: "Manager", createdAt: SERVER_TIME, updatedAt: SERVER_TIME }` by non-admin -> `PERMISSION_DENIED`.
3. **Identity Spoofing on User Create**: Creating `/users/u2` while authenticated as `u1` -> `PERMISSION_DENIED`.
4. **Role Escalation on User Update**: Updating `/users/u1` with `{ role: "MANAGER", updatedAt: SERVER_TIME }` by non-admin -> `PERMISSION_DENIED` (`affectedKeys().hasOnly` & role immutability).
5. **Unverified Email Write**: Creating `/applications/app1` with `email_verified: false` -> `PERMISSION_DENIED`.
6. **Cross-User Application Create**: Creating `/applications/app1` where `ownerUid != request.auth.uid` -> `PERMISSION_DENIED`.
7. **State Shortcutting on Application Create**: Creating `/applications/app1` with `status: "APPROVED"` instead of `"PENDING_REVIEW"` -> `PERMISSION_DENIED`.
8. **Terminal State Bypass (Approving a Cancelled Loan)**: Updating `/applications/app1` from `status: "CANCELLED"` to `status: "APPROVED"` -> `PERMISSION_DENIED`.
9. **Client Self-Approval Attack**: Client (`ownerUid == request.auth.uid`, non-admin) updating `/applications/app1` to `status: "APPROVED"` -> `PERMISSION_DENIED` (clients can only transition their own active application to `"CANCELLED"`).
10. **Value Poisoning on Application Update**: Updating `statusReason` with a 10,000-character string -> `PERMISSION_DENIED` (`isValidApplication` enforces `statusReason.size() <= 500`).
11. **Timestamp Forgery**: Setting `updatedAt` to a past or future timestamp instead of `request.time` -> `PERMISSION_DENIED`.
12. **Unauthorized List Scraping**: Listing `/applications` without `where('ownerUid', '==', request.auth.uid)` as a non-admin -> `PERMISSION_DENIED`.
