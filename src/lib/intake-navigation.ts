import {
  intakeStepDefinitions,
  intakeStepIds,
  type IntakeStepId,
} from "@/lib/intake-steps";

export { intakeStepDefinitions, intakeStepIds, type IntakeStepId };
export const firstIntakeStepId = intakeStepIds[0];
export const finalIntakeStepId = intakeStepIds.at(-1)!;

export function getStepIndex(stepId: IntakeStepId): number {
  const index = intakeStepIds.indexOf(stepId);
  return index < 0 ? 0 : index;
}

export function getNextStepId(stepId: IntakeStepId): IntakeStepId {
  return intakeStepIds[
    Math.min(intakeStepIds.length - 1, getStepIndex(stepId) + 1)
  ]!;
}

export function getPreviousStepId(stepId: IntakeStepId): IntakeStepId {
  return intakeStepIds[Math.max(0, getStepIndex(stepId) - 1)]!;
}

export function canSelectIntakeStep(
  currentStepId: IntakeStepId,
  targetStepId: IntakeStepId,
): boolean {
  return getStepIndex(targetStepId) <= getStepIndex(currentStepId);
}

export function getIntakeProgress(stepId: IntakeStepId): number {
  return Math.round(((getStepIndex(stepId) + 1) / intakeStepIds.length) * 100);
}

export function isFinalIntakeStep(stepId: IntakeStepId): boolean {
  return stepId === finalIntakeStepId;
}
