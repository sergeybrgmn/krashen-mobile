import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';

const PRIVACY_CONTENT = `# Privacy Policy

_Last updated: 2026-04-20_

This Privacy Policy explains what data Krashen ("we", "us") collects when you use the Krashen mobile apps and website (the "Service"), why we collect it, and what rights you have. If you have any questions, write to us at info@krashen.app.

## Who we are

Krashen is an interactive podcast player for language learners, operated by an individual sole proprietor ("autónomo") based in Spain. "Krashen" is a product name, not a registered legal entity. For any privacy-related request you can reach us at info@krashen.app.

## What we collect

**Account data.** When you sign in, our authentication provider (Clerk) processes your email address and, if you use Google sign-in, your name and Google account identifier.

**Audio recordings.** When you ask a voice question, your microphone audio is sent to our servers and to third-party speech-to-text providers for transcription. **We do not store the audio itself** — only the resulting text transcript.

**Question and answer transcripts.** The text of your questions and the AI-generated answers are stored so you can review them and so we can improve the Service.

**Listening activity.** We record which podcasts and episodes you play, which words you tap for explanation, question counts, and session timing. This is processed through our analytics provider (PostHog) and stored on our servers.

**Device and technical data.** Standard app logs: device model, operating system, app version, language, time zone, and error traces.

**Payment data.** If you subscribe to a paid plan, Apple or Google (and RevenueCat, which manages subscriptions on our behalf) handles your payment directly. We do not see or store your card details.

## Why we use it

- To provide the Service: play podcasts, transcribe your questions, return answers, manage your account.
- To bill paid subscriptions.
- To understand how the Service is used and improve it.
- To keep the Service secure, detect abuse, and meet legal obligations.

## Legal bases (EU/UK users)

- **Contract** — processing necessary to provide the Service you signed up for.
- **Legitimate interests** — product analytics, security, and service improvement.
- **Consent** — non-essential analytics in the EU/UK (you can withdraw at any time in the app).
- **Legal obligation** — tax, accounting, and responding to lawful requests.

## Who we share it with

We only share data with service providers that help us run the Service, under contractual data-protection terms:

- **Clerk** — authentication and session management.
- **PostHog** — product analytics.
- **OpenAI** — speech-to-text (Whisper) and large-language-model APIs that process your transcripts to generate answers. OpenAI does not use API data to train its models.
- **RevenueCat, Apple, Google** — subscription management and payments.
- **Hosting and infrastructure providers** — to run the servers.

We do not sell your personal data.

## International transfers

Our servers and service providers may be located in the United States and other countries outside the EU/UK. Where required, we rely on Standard Contractual Clauses or equivalent safeguards.

## How long we keep it

- Account data: while your account is active, plus up to 12 months after deletion for legal and backup reasons.
- Audio recordings: not stored.
- Question/answer transcripts: while your account is active, or until you delete them.
- Analytics events: up to 24 months.
- Billing records: for the period required by tax and accounting law.

## Your rights

If you are in the EU, UK, or California, you have the right to:

- Access the data we hold about you.
- Correct inaccurate data.
- Delete your data ("right to be forgotten").
- Restrict or object to certain processing.
- Receive your data in a portable format.
- Withdraw consent at any time.
- Lodge a complaint with your local data-protection authority.

To exercise any of these rights, write to info@krashen.app.

## Analytics and tracking

We use PostHog to understand how the app is used. In the EU/UK we do not send analytics events unless you opt in. You can change this at any time from the app's profile menu.

Krashen does not use third-party advertising SDKs and does not track you across other apps or websites.

## Age requirement

Krashen is intended for users aged **16 and over**. The Service is not directed at children, and we do not knowingly collect data from anyone under 16. If you believe a younger user has created an account, please contact us so we can remove it.

## Changes to this policy

We may update this policy from time to time. Material changes will be communicated in the app or by email. The "Last updated" date at the top always reflects the current version.

## Contact

Privacy questions and data-rights requests: info@krashen.app.
`;

const markdownStyles = {
  body: {
    ...Typography.base,
  },
  heading1: {
    ...Typography.title,
    marginBottom: 16,
    marginTop: 8,
  },
  heading2: {
    ...Typography.subtitle,
    marginBottom: 12,
    marginTop: 20,
  },
  heading3: {
    color: Colors.cyan,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
    marginTop: 16,
  },
  strong: {
    color: Colors.textPrimary,
    fontWeight: '600' as const,
  },
  em: {
    color: Colors.cyan,
    fontStyle: 'italic' as const,
  },
  link: {
    color: Colors.cyan,
  },
  list_item: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
  },
  bullet_list: {
    marginBottom: 8,
  },
  paragraph: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  code_inline: {
    backgroundColor: Colors.card,
    color: Colors.cyan,
    borderRadius: Radii.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontSize: 14,
  },
};

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()}>
          <ThemedText type="link" style={styles.backLink}>
            ← Back
          </ThemedText>
        </Pressable>

        <Markdown style={markdownStyles}>{PRIVACY_CONTENT}</Markdown>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },
  backLink: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    fontSize: 14,
  },
});
