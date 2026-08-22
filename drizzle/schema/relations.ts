import { relations } from "drizzle-orm";
import { challenges } from "./challenges";
import { challengeParticipants } from "./participants";
import { profiles } from "./profiles";

export const profilesRelations = relations(profiles, ({ many }) => ({
  participations: many(challengeParticipants),
  createdChallenges: many(challenges),
}));

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  creator: one(profiles, { fields: [challenges.createdBy], references: [profiles.id] }),
  participants: many(challengeParticipants),
}));

export const challengeParticipantsRelations = relations(challengeParticipants, ({ one }) => ({
  challenge: one(challenges, {
    fields: [challengeParticipants.challengeId],
    references: [challenges.id],
  }),
  user: one(profiles, { fields: [challengeParticipants.userId], references: [profiles.id] }),
}));
