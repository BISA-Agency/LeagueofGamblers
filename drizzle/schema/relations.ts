import { relations } from "drizzle-orm";
import { activityFeed } from "./activity-feed";
import { auditLog } from "./audit-log";
import { badges } from "./badges";
import { betFlags } from "./bet-flags";
import { betSelections } from "./bet-selections";
import { bets } from "./bets";
import { challenges } from "./challenges";
import { events } from "./events";
import { feedReactions } from "./feed-reactions";
import { follows } from "./follows";
import { markets } from "./markets";
import { missionCompletions } from "./mission-completions";
import { missions } from "./missions";
import { notifications } from "./notifications";
import { oddsImports } from "./odds-imports";
import { outcomes } from "./outcomes";
import { payments } from "./payments";
import { challengeParticipants } from "./participants";
import { predictions } from "./predictions";
import { profiles } from "./profiles";
import { rankSnapshots } from "./rank-snapshots";
import { sanctions } from "./sanctions";
import { userBadges } from "./user-badges";
import { xpEvents } from "./xp-events";

export const profilesRelations = relations(profiles, ({ many }) => ({
  participations: many(challengeParticipants),
  createdChallenges: many(challenges),
  bets: many(bets),
  sanctions: many(sanctions),
  badges: many(userBadges),
  xpEvents: many(xpEvents),
  payments: many(payments),
  activityFeed: many(activityFeed),
  feedReactions: many(feedReactions),
  notifications: many(notifications),
  predictionsMade: many(predictions, { relationName: "predictor" }),
  predictedAsWinner: many(predictions, { relationName: "predictedWinner" }),
  rankSnapshots: many(rankSnapshots),
  // people I follow / who follow me
  following: many(follows, { relationName: "follower" }),
  followedBy: many(follows, { relationName: "following" }),
}));

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  creator: one(profiles, { fields: [challenges.createdBy], references: [profiles.id] }),
  participants: many(challengeParticipants),
  events: many(events),
  bets: many(bets),
  missions: many(missions),
  payments: many(payments),
  oddsImports: many(oddsImports),
  sanctions: many(sanctions),
}));

export const challengeParticipantsRelations = relations(challengeParticipants, ({ one }) => ({
  challenge: one(challenges, {
    fields: [challengeParticipants.challengeId],
    references: [challenges.id],
  }),
  user: one(profiles, { fields: [challengeParticipants.userId], references: [profiles.id] }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  challenge: one(challenges, { fields: [events.challengeId], references: [challenges.id] }),
  markets: many(markets),
}));

export const marketsRelations = relations(markets, ({ one, many }) => ({
  event: one(events, { fields: [markets.eventId], references: [events.id] }),
  outcomes: many(outcomes),
}));

export const outcomesRelations = relations(outcomes, ({ one }) => ({
  market: one(markets, { fields: [outcomes.marketId], references: [markets.id] }),
}));

export const oddsImportsRelations = relations(oddsImports, ({ one }) => ({
  challenge: one(challenges, { fields: [oddsImports.challengeId], references: [challenges.id] }),
  ranByProfile: one(profiles, { fields: [oddsImports.ranBy], references: [profiles.id] }),
}));

export const betsRelations = relations(bets, ({ one, many }) => ({
  challenge: one(challenges, { fields: [bets.challengeId], references: [challenges.id] }),
  user: one(profiles, { fields: [bets.userId], references: [profiles.id] }),
  selections: many(betSelections),
  flags: many(betFlags),
}));

export const betSelectionsRelations = relations(betSelections, ({ one }) => ({
  bet: one(bets, { fields: [betSelections.betId], references: [bets.id] }),
  outcome: one(outcomes, { fields: [betSelections.outcomeId], references: [outcomes.id] }),
}));

export const betFlagsRelations = relations(betFlags, ({ one }) => ({
  bet: one(bets, { fields: [betFlags.betId], references: [bets.id] }),
  flaggedByProfile: one(profiles, { fields: [betFlags.flaggedBy], references: [profiles.id] }),
}));

export const sanctionsRelations = relations(sanctions, ({ one }) => ({
  user: one(profiles, { fields: [sanctions.userId], references: [profiles.id] }),
  challenge: one(challenges, { fields: [sanctions.challengeId], references: [challenges.id] }),
  bet: one(bets, { fields: [sanctions.betId], references: [bets.id] }),
}));

export const missionsRelations = relations(missions, ({ one, many }) => ({
  challenge: one(challenges, { fields: [missions.challengeId], references: [challenges.id] }),
  rewardBadge: one(badges, { fields: [missions.rewardBadgeId], references: [badges.id] }),
  completions: many(missionCompletions),
}));

export const missionCompletionsRelations = relations(missionCompletions, ({ one }) => ({
  mission: one(missions, { fields: [missionCompletions.missionId], references: [missions.id] }),
  user: one(profiles, { fields: [missionCompletions.userId], references: [profiles.id] }),
  bet: one(bets, { fields: [missionCompletions.betId], references: [bets.id] }),
}));

export const badgesRelations = relations(badges, ({ many }) => ({
  userBadges: many(userBadges),
  missions: many(missions),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(profiles, { fields: [userBadges.userId], references: [profiles.id] }),
  badge: one(badges, { fields: [userBadges.badgeId], references: [badges.id] }),
  challenge: one(challenges, { fields: [userBadges.challengeId], references: [challenges.id] }),
}));

export const xpEventsRelations = relations(xpEvents, ({ one }) => ({
  user: one(profiles, { fields: [xpEvents.userId], references: [profiles.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  challenge: one(challenges, { fields: [payments.challengeId], references: [challenges.id] }),
  user: one(profiles, { fields: [payments.userId], references: [profiles.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(profiles, { fields: [auditLog.actorId], references: [profiles.id] }),
}));

export const rankSnapshotsRelations = relations(rankSnapshots, ({ one }) => ({
  challenge: one(challenges, { fields: [rankSnapshots.challengeId], references: [challenges.id] }),
  user: one(profiles, { fields: [rankSnapshots.userId], references: [profiles.id] }),
}));

export const activityFeedRelations = relations(activityFeed, ({ one, many }) => ({
  challenge: one(challenges, { fields: [activityFeed.challengeId], references: [challenges.id] }),
  user: one(profiles, { fields: [activityFeed.userId], references: [profiles.id] }),
  reactions: many(feedReactions),
}));

export const feedReactionsRelations = relations(feedReactions, ({ one }) => ({
  feed: one(activityFeed, { fields: [feedReactions.feedId], references: [activityFeed.id] }),
  user: one(profiles, { fields: [feedReactions.userId], references: [profiles.id] }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(profiles, {
    fields: [follows.followerId],
    references: [profiles.id],
    relationName: "follower",
  }),
  following: one(profiles, {
    fields: [follows.followingId],
    references: [profiles.id],
    relationName: "following",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(profiles, { fields: [notifications.userId], references: [profiles.id] }),
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  challenge: one(challenges, { fields: [predictions.challengeId], references: [challenges.id] }),
  user: one(profiles, {
    fields: [predictions.userId],
    references: [profiles.id],
    relationName: "predictor",
  }),
  predictedWinner: one(profiles, {
    fields: [predictions.predictedWinnerId],
    references: [profiles.id],
    relationName: "predictedWinner",
  }),
}));
