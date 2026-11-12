// The small part of Discord's interaction payloads this integration reads. Type only: nothing here runs.
export const InteractionType = { Ping: 1, ApplicationCommand: 2 } as const;
export const ResponseType = { Pong: 1, ChannelMessage: 4, Deferred: 5 } as const;
/** Message flag: only the user who ran the command can see the reply. */
export const EPHEMERAL = 64;

export interface DiscordUser { id: string; username?: string; global_name?: string | null }
export interface CommandOption { name: string; type: number; value?: unknown; options?: CommandOption[] }

export interface Interaction {
  id?: string;
  type: number;
  application_id?: string;
  token?: string;
  guild_id?: string;
  member?: { user?: DiscordUser };
  user?: DiscordUser;
  data?: { name?: string; options?: CommandOption[] };
}

export interface MessageData {
  content: string;
  flags?: number;
  allowed_mentions?: { parse: string[] };
}
export interface InteractionResponse {
  type: number;
  data?: MessageData;
}
/** What a handler decides: answer now, or acknowledge now and finish the work afterwards. */
export type Outcome =
  | { kind: "respond"; body: InteractionResponse }
  | { kind: "deferred"; work: () => Promise<MessageData> };
