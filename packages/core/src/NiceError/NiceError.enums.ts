// ---------------------------------------------------------------------------
// Context state — discriminated union tracking the lifecycle of context data
// ---------------------------------------------------------------------------

export enum EContextSerializedState {
  serde_unset = "serde_unset",
  unhydrated = "unhydrated",
  hydrated = "hydrated",
}

export enum EErrorPackType {
  msg_pack = "msg_pack",
  cause_pack = "cause_pack",
}
