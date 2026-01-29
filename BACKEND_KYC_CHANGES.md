# Backend Changes Required for Auto-Approved LEVEL_1 KYC

## Overview
Since CPF/CNPJ is now mandatory upon registration, all new customers should automatically receive **LEVEL_1** KYC approval. This document outlines the required backend changes.

---

## Changes Required

### 1. **Registration Endpoint (`POST /auth/register`)**

#### Current Behavior
- Creates user account
- Creates customer record
- Sets `accountStatus` to `"not_requested"` or similar
- Sets `kycLevel` to `null` or `"LEVEL_1"`

#### Required Changes
When a new customer is created via registration:

```typescript
// After creating the customer record
customer.accountStatus = "approved";  // Auto-approve LEVEL_1
customer.kycLevel = "LEVEL_1";        // Set to LEVEL_1
customer.kycApprovedAt = new Date(); // Timestamp of auto-approval
```

**Validation:**
- Ensure CPF (for PF) or CNPJ (for PJ) is validated before auto-approval
- CPF/CNPJ must pass format validation
- CPF/CNPJ must not already exist in the database

---

### 2. **Customer Creation Logic**

Update the customer creation service/controller:

```typescript
async function createCustomer(data: CreateCustomerDto) {
  // Validate CPF/CNPJ
  if (data.type === "PF" && !isValidCPF(data.cpf)) {
    throw new Error("Invalid CPF");
  }

  if (data.type === "PJ" && !isValidCNPJ(data.cnpj)) {
    throw new Error("Invalid CNPJ");
  }

  // Check for duplicates
  const existing = await customerRepository.findByCpfOrCnpj(
    data.cpf || data.cnpj
  );

  if (existing) {
    throw new Error("CPF/CNPJ already registered");
  }

  // Create customer with auto-approved LEVEL_1
  const customer = await customerRepository.create({
    ...data,
    accountStatus: "approved",     // ✅ Auto-approve
    kycLevel: "LEVEL_1",           // ✅ Set LEVEL_1
    kycApprovedAt: new Date(),     // ✅ Timestamp
  });

  return customer;
}
```

---

### 3. **Database Schema Updates (if needed)**

Ensure the Customer model has these fields:

```prisma
model Customer {
  id              String   @id @default(uuid())
  type            CustomerType  // PF or PJ
  accountStatus   String   // "not_requested" | "in_review" | "approved" | "rejected"
  kycLevel        String?  // "LEVEL_1" | "LEVEL_2" | "LEVEL_3"
  kycApprovedAt   DateTime?
  kycRejectedAt   DateTime?
  kycRejectionReason String?

  // Tax IDs
  cpf             String?  @unique
  cnpj            String?  @unique

  // ... other fields
}
```

---

### 4. **Initial Limits Configuration**

When auto-approving LEVEL_1, ensure the customer gets the correct monthly limits:

```typescript
const LEVEL_1_LIMITS = {
  PF: {
    monthlyLimit: 30000,      // R$ 30,000
    singleTransfer: 5000,     // R$ 5,000
    dailyLimit: 10000,        // R$ 10,000
  },
  PJ: {
    monthlyLimit: 50000,      // R$ 50,000
    singleTransfer: 10000,    // R$ 10,000
    dailyLimit: 20000,        // R$ 20,000
  },
};

// Apply limits during customer creation
const limits = LEVEL_1_LIMITS[customer.type];
await limitsService.setCustomerLimits(customer.id, limits);
```

---

### 5. **API Response Updates**

**`POST /auth/register` Response:**

```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "CUSTOMER",
    "customerId": "uuid"
  },
  "customer": {
    "id": "uuid",
    "type": "PF",
    "accountStatus": "approved",
    "kycLevel": "LEVEL_1",
    "kycApprovedAt": "2026-01-29T10:00:00Z"
  }
}
```

**`GET /customers/me` Response:**

```json
{
  "id": "uuid",
  "type": "PF",
  "name": "João Silva",
  "email": "joao@example.com",
  "accountStatus": "approved",
  "kycLevel": "LEVEL_1",
  "kycApprovedAt": "2026-01-29T10:00:00Z",
  "cpf": "123.456.789-00",
  "createdAt": "2026-01-29T10:00:00Z"
}
```

---

### 6. **Didit Integration (Optional)**

Since LEVEL_1 is auto-approved, the Didit integration (`POST /customers/{id}/kyc/request`) is **no longer needed for LEVEL_1**.

**Options:**
1. **Remove the endpoint entirely** - Users start at LEVEL_1, no manual verification needed
2. **Keep it for re-verification** - If a user's KYC is rejected, they can re-verify via Didit
3. **Deprecate it** - Mark as deprecated in API docs

**Recommended:** Keep the endpoint but update the logic:

```typescript
async function requestKycVerification(customerId: string) {
  const customer = await customerRepository.findById(customerId);

  if (customer.kycLevel === "LEVEL_1" && customer.accountStatus === "approved") {
    throw new Error("LEVEL_1 is already auto-approved. Request upgrade to LEVEL_2 instead.");
  }

  // Existing Didit logic for re-verification cases
  // ...
}
```

---

### 7. **Migration Script**

For existing customers with `accountStatus: "not_requested"`:

```typescript
// Migration script
async function migrateExistingCustomers() {
  const customers = await customerRepository.findMany({
    where: {
      accountStatus: "not_requested",
      OR: [
        { cpf: { not: null } },
        { cnpj: { not: null } },
      ],
    },
  });

  for (const customer of customers) {
    await customerRepository.update(customer.id, {
      accountStatus: "approved",
      kycLevel: "LEVEL_1",
      kycApprovedAt: new Date(),
    });

    console.log(`✅ Migrated customer ${customer.id} to LEVEL_1`);
  }

  console.log(`✅ Migrated ${customers.length} customers to LEVEL_1`);
}
```

Run this migration once after deploying the changes.

---

### 8. **Admin Panel Updates**

Update the admin KYC management panel:

- **Display LEVEL_1 customers as "Auto-Approved"**
- Add a badge/indicator showing auto-approval
- Allow admins to manually upgrade customers to LEVEL_2/LEVEL_3
- Keep the ability to reject LEVEL_1 if fraud is detected

---

### 9. **Validation Rules**

Ensure these validation rules are enforced:

```typescript
// Registration validation
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(3),
  type: z.enum(["PF", "PJ"]),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
})
.refine((data) => {
  if (data.type === "PF" && !data.cpf) {
    return false; // CPF is required for PF
  }
  if (data.type === "PJ" && !data.cnpj) {
    return false; // CNPJ is required for PJ
  }
  return true;
}, {
  message: "CPF/CNPJ is required based on customer type",
});

// CPF validation
function isValidCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  // Validation algorithm
  // ... (implement CPF validation algorithm)

  return true;
}

// CNPJ validation
function isValidCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;

  // Validation algorithm
  // ... (implement CNPJ validation algorithm)

  return true;
}
```

---

### 10. **Testing Checklist**

- [ ] New PF registration with valid CPF creates LEVEL_1 approved customer
- [ ] New PJ registration with valid CNPJ creates LEVEL_1 approved customer
- [ ] Invalid CPF/CNPJ rejects registration
- [ ] Duplicate CPF/CNPJ rejects registration
- [ ] Customer can immediately access dashboard after registration
- [ ] Customer limits are correctly set for LEVEL_1
- [ ] Customer can request upgrade to LEVEL_2
- [ ] GET /customers/me returns correct accountStatus and kycLevel
- [ ] Migration script successfully updates existing customers
- [ ] Admin panel correctly displays LEVEL_1 auto-approved customers

---

## Summary

**Key Changes:**
1. ✅ Auto-approve LEVEL_1 upon registration when CPF/CNPJ is valid
2. ✅ Set `accountStatus = "approved"` and `kycLevel = "LEVEL_1"`
3. ✅ Remove or deprecate Didit verification for LEVEL_1
4. ✅ Set initial transaction limits for LEVEL_1
5. ✅ Run migration for existing customers
6. ✅ Update API responses to include KYC data
7. ✅ Update admin panel to show auto-approved status

**Benefits:**
- ✅ Faster onboarding - users can transact immediately
- ✅ Better UX - no waiting for manual approval
- ✅ Reduced support tickets - no "waiting for verification" complaints
- ✅ Scalable - no manual intervention needed for LEVEL_1
- ✅ Secure - CPF/CNPJ validation ensures legitimacy

---

## Questions?

Contact the frontend team or open an issue in the backend repository.

**Frontend PR:** `feature/auto-approve-kyc-level-1`
**Backend PR:** `TBD`
