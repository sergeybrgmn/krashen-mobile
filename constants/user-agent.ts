import * as Application from 'expo-application';

/**
 * User-Agent for requests to third-party podcast CDNs (cover art, episode audio).
 *
 * Buzzsprout fronts both with Cloudflare, which 403s the literal `okhttp/x.y.z`
 * that Android's HTTP stack sends by default — and that is what both the image
 * loader and ExoPlayer use. The result was blank thumbnails and episodes stuck
 * loading forever, on Android only: iOS sends a CFNetwork agent and is let through.
 *
 * The rule rejects the okhttp signature and empty agents, not non-browsers, so
 * identifying ourselves honestly is enough — no browser spoofing required.
 */
export const MEDIA_USER_AGENT = `Krashen/${Application.nativeApplicationVersion ?? '1.0'} (+https://krashen.app)`;
