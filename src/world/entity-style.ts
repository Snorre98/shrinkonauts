/**
 * Shared entity presentation values.
 *
 * The role resolver lives in `pack` so validation can use it without a
 * `pack -> world` dependency. This module keeps the world-facing constants and
 * re-exports the resolver for existing renderer imports.
 */

export {
  DEFAULT_ROLE_BY_ENTITY_TYPE,
  DEFAULT_ROLE_DISPLAY,
  DEFAULT_ROLE_FIDELITY,
  LEGACY_ENTITY_DISPLAY_SIZE as ENTITY_DISPLAY_SIZE,
  inferEntityRole,
  presentationSizeToDisplay,
  resolveEntityDisplay,
} from "../pack/entity-presentation";
export type {
  DisplaySize,
  ResolvedEntityDisplay,
} from "../pack/entity-presentation";

export const ENTITY_INTERACTION_TINT = 0xffe08a;
