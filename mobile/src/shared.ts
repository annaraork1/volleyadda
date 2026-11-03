/**
 * Single entry point for modules shared with the Next.js app in ../lib.
 * Only pure, dependency-free files are imported here. Server-only files
 * (store, seasonStore, session, ...) are blocked in metro.config.js.
 */
export {
  computeAll,
  derive,
  formatFor,
  scoreLine,
  setsToWin,
  slotLabel,
  other,
  TIE_LABELS,
} from "../../lib/engine";
export type { Row, Resolved } from "../../lib/engine";

export { LIVE_POLL_MS, IDLE_POLL_MS, pollIntervalMs, nextPollDelayMs, anyMatchLive } from "../../lib/livePoll";

export { AWARD_IDS, AWARD_LABELS, emptyAwards, filledAwards, teamForPlayer } from "../../lib/awards";

export { stepForAmount } from "../../lib/auction";
export type { AuctionState, AuctionStatus, AuctionBid, AuctionTeamState } from "../../lib/auction";

export { defaultPracticeFormat } from "../../lib/practiceTypes";
export type {
  PracticeMatchPublic,
  PracticePlayer,
  PracticeScorerPublic,
  PracticeSummary,
  PracticeLiveRef,
} from "../../lib/practiceTypes";

export {
  filterCatalogPlayers,
  filterCatalogTeams,
  type CatalogPlayer,
  type CatalogTeam,
  type MasterCatalog,
} from "../../lib/catalog";

export {
  formatTargetsText,
  parseTargetsText,
  targetsFitBestOf,
  targetsPlaceholder,
  trimTargetsToBestOf,
} from "../../lib/targetsInput";

export type {
  AppState,
  Config,
  Fixture,
  Format,
  MatchDoc,
  MatchEvent,
  MatchState,
  Player,
  Settings,
  Side,
  SeasonStage,
  SetState,
  Team,
  TournamentMeta,
  AwardId,
  Awards,
  AuctionSettings,
  FixtureGenDay,
  FixtureGenSettings,
  RegistrationEntry,
  RegistrationSettings,
} from "../../lib/types";

export type { GalleryStatus } from "../../lib/galleryTypes";

export {
  pressureBallForSide,
  pressureBalls,
  PRESSURE_BALL_LABEL,
  type PressureBall,
} from "../../lib/pressureBall";

export {
  COARSE_LABELS,
  COARSE_RESULTS,
  enumeratePathsToRank,
  formatPathLabel,
  leagueResultsSig,
  projectRace,
  type CoarseResult,
  type OutcomeMap,
  type RacePath,
} from "../../lib/raceWhatIf";

export { PLAYOFF_QUALIFY } from "../../lib/qualify";
