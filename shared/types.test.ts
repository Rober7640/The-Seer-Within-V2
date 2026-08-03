import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isCommitmentGateVariant, isSlidingCloseVariant, COMMITMENT_GATE_VARIANT_ID } from './types';

describe('isCommitmentGateVariant', () => {
  it('is true only for the exact gate variant id', () => {
    assert.equal(isCommitmentGateVariant('35_palm_gate'), true);
    assert.equal(isCommitmentGateVariant(COMMITMENT_GATE_VARIANT_ID), true);
  });

  it('is false for every other id, including null/undefined/similar-looking ids', () => {
    assert.equal(isCommitmentGateVariant('35_palm_u47'), false);
    assert.equal(isCommitmentGateVariant('55-35_palm'), false);
    assert.equal(isCommitmentGateVariant(undefined), false);
    assert.equal(isCommitmentGateVariant(null), false);
    assert.equal(isCommitmentGateVariant(''), false);
  });

  it('never overlaps with isSlidingCloseVariant', () => {
    assert.equal(isSlidingCloseVariant(COMMITMENT_GATE_VARIANT_ID), false);
    assert.equal(isCommitmentGateVariant('55-35_palm'), false);
  });
});
